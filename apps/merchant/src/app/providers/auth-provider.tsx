// Session state for the merchant console, backed by the real Identity module
// (POST /v1/auth/login, /v1/auth/refresh, /v1/auth/business-session, ...) via
// @octopus/api-client.
//
// Two tokens live here, and the difference matters:
//   - the ACCOUNT token (accessToken/refreshToken) proves who the merchant is;
//     it is enough to list businesses, start a setup, or pick a business.
//   - the BUSINESS token (businessToken) is what every tenant-scoped endpoint
//     (Menu, Staff, Reservations, ...) needs — it carries the `octopus_tid`
//     claim for the selected business, and is minted from the account token by
//     POST /v1/auth/business-session. Access tokens live 15 minutes, so both
//     are renewed together (refresh the account token, then business-session).
//
// Two gaps this still papers over (see FRONTEND_INTEGRATION_GAPS.md 1.1/1.2):
// there is no GET /v1/accounts/me, so `name`/`role` are not something the
// backend returns after login — `name` is derived from the email locally and
// `role` stays a fixed client-side literal. There is also no logout/revoke
// endpoint, so `signOut` only drops the local tokens.
//
// Never store a password here — only the tokens the backend issued.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ApiError,
  businessSession,
  login as apiLogin,
  refresh as apiRefresh,
  type TokenResponse,
} from "@octopus/api-client";
import { registerSessionBridge } from "@/shared/api/session-bridge";

const STORAGE_KEY = "octopus.session";

export interface SessionUser {
  email: string;
  name: string;
  role: string;
  signedInAt: string;
  /** Whether a password was set — always true for a real account (the
   *  backend requires one at registration); kept only because the
   *  needsPassword gate below still reads it. */
  passwordSet: boolean;
  accessToken: string;
  refreshToken: string;
  /** Real business GUID picked on /select-business; absent until then. */
  businessId?: string;
  /** Business-scoped token for `businessId` (carries `octopus_tid`). */
  businessToken?: string;
}

/** Decodes a JWT's payload without verifying it — the token was already
 *  issued to us by the backend, so this is just reading a claim we need
 *  client-side (the account id, for step-up approval requests), never a
 *  trust boundary. Returns null on anything malformed rather than throwing. */
function decodeJwtSubject(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const claims = JSON.parse(json) as { sub?: string };
    return claims.sub ?? null;
  } catch {
    return null;
  }
}

interface AuthContextValue {
  isAuthenticated: boolean;
  user: SessionUser | null;
  /** The business the console is currently working in, or null before one is picked. */
  activeBusinessId: string | null;
  /** The signed-in account's id, decoded from its own token — used as the
   *  approver on step-up approval requests (e.g. Order module void/refund).
   *  Null before sign-in. */
  activeAccountId: string | null;
  /** Calls the real /auth/login endpoint. Throws ApiError on failure (bad
   *  credentials, unverified email, network) — callers show that message. */
  signInWithPassword: (email: string, password: string) => Promise<void>;
  /** For the two paths that already hold a token from another real call
   *  (post-registration verify+auto-login, social sign-in once that's wired)
   *  rather than calling /auth/login again. */
  signInWithTokens: (email: string, tokens: TokenResponse) => void;
  /** Mints the business token for `businessId` and makes it the active one.
   *  Throws ApiError if the business is not Active or not owned/accessible. */
  selectBusiness: (businessId: string) => Promise<void>;
  signOut: () => void;
  needsPassword: boolean;
  setPasswordSet: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readSession(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

function displayNameFromEmail(email: string): string {
  const local = email.split("@")[0];
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length === 0) return "Merchant";
  return parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function sessionFromTokens(email: string, tokens: TokenResponse): SessionUser {
  return {
    email,
    name: displayNameFromEmail(email),
    role: "owner",
    signedInAt: new Date().toISOString(),
    passwordSet: true,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<SessionUser | null>(readSession);

  // The api-client reads tokens outside React, so the latest session is also
  // kept in a ref that is updated synchronously with every change — a setState
  // alone would leave a just-refreshed token invisible until the next render.
  const sessionRef = useRef<SessionUser | null>(user);
  const setUser = useCallback((next: SessionUser | null) => {
    sessionRef.current = next;
    setUserState(next);
  }, []);

  useEffect(() => {
    if (user) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  // One refresh at a time: several requests can 401 together when a token
  // expires, and the refresh token rotates, so a second concurrent refresh
  // would present an already-used token and sign the merchant out.
  const inFlightRefresh = useRef<Promise<string | null> | null>(null);
  const refreshSession = useCallback((): Promise<string | null> => {
    if (inFlightRefresh.current) return inFlightRefresh.current;
    const run = (async (): Promise<string | null> => {
      const current = sessionRef.current;
      if (!current) return null;
      try {
        const tokens = await apiRefresh({ refreshToken: current.refreshToken });
        let next: SessionUser = { ...current, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
        if (current.businessId) {
          const business = await businessSession({ businessId: current.businessId }, tokens.accessToken);
          next = { ...next, businessToken: business.accessToken };
        }
        setUser(next);
        return next.businessToken ?? next.accessToken;
      } catch {
        // Refresh token expired/revoked (or the business is no longer
        // accessible): the session cannot be renewed — sign out.
        setUser(null);
        return null;
      }
    })().finally(() => {
      inFlightRefresh.current = null;
    });
    inFlightRefresh.current = run;
    return run;
  }, [setUser]);

  // Registered during the first render (not in an effect): children's data
  // effects run before a parent's, and their first request must already find
  // the bridge in place.
  const bridgeRegistered = useRef(false);
  if (!bridgeRegistered.current) {
    bridgeRegistered.current = true;
    registerSessionBridge({
      getToken: () => sessionRef.current?.businessToken ?? sessionRef.current?.accessToken ?? null,
      refresh: () => refreshSession(),
    });
  }

  const selectBusiness = useCallback(
    async (businessId: string) => {
      const attempt = () => {
        const current = sessionRef.current;
        if (!current) throw new Error("Not signed in");
        return businessSession({ businessId }, current.accessToken);
      };
      let business: TokenResponse;
      try {
        business = await attempt();
      } catch (err) {
        // business-session sends an explicit account token, which the shared
        // 401 handling deliberately does not renew — so renew here and retry once.
        if (err instanceof ApiError && err.status === 401 && (await refreshSession())) {
          business = await attempt();
        } else {
          throw err;
        }
      }
      const current = sessionRef.current;
      if (current) setUser({ ...current, businessId, businessToken: business.accessToken });
    },
    [refreshSession, setUser]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: user !== null,
      user,
      activeBusinessId: user?.businessId ?? null,
      activeAccountId: user ? decodeJwtSubject(user.accessToken) : null,
      signInWithPassword: async (email: string, password: string) => {
        const tokens = await apiLogin({ email: email.trim(), password });
        setUser(sessionFromTokens(email.trim(), tokens));
      },
      signInWithTokens: (email: string, tokens: TokenResponse) => {
        setUser(sessionFromTokens(email, tokens));
      },
      selectBusiness,
      // No revoke endpoint exists yet (gap 1.2) — this only forgets the token
      // locally, it does not invalidate it server-side.
      signOut: () => setUser(null),
      needsPassword: false,
      setPasswordSet: () => {
        const current = sessionRef.current;
        if (current) setUser({ ...current, passwordSet: true });
      },
    }),
    [user, selectBusiness, setUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
