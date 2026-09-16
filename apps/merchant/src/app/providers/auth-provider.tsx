// Session state for the merchant console, backed by the real Identity module
// (POST /v1/auth/login, /v1/accounts/register, ...) via @octopus/api-client.
//
// Two gaps this still papers over (see FRONTEND_INTEGRATION_GAPS.md 1.1/1.2):
// there is no GET /v1/accounts/me, so `name`/`role` are not something the
// backend returns after login — `name` is derived from the email locally
// (same heuristic the old mock used) and `role` stays a fixed client-side
// literal until a real roles system exists (see gap 4.1, which blocks that
// anyway). There is also no logout/revoke endpoint, so `signOut` only drops
// the local token — the refresh token stays valid server-side until it
// expires on its own.
//
// Never store a password here — only the tokens the backend issued.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { login as apiLogin, type TokenResponse } from "@octopus/api-client";

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
}

interface AuthContextValue {
  isAuthenticated: boolean;
  user: SessionUser | null;
  /** Calls the real /auth/login endpoint. Throws ApiError on failure (bad
   *  credentials, unverified email, network) — callers show that message. */
  signInWithPassword: (email: string, password: string) => Promise<void>;
  /** For the two paths that already hold a token from another real call
   *  (post-registration verify+auto-login, social sign-in once that's wired)
   *  rather than calling /auth/login again. */
  signInWithTokens: (email: string, tokens: TokenResponse) => void;
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
  const [user, setUser] = useState<SessionUser | null>(readSession);

  useEffect(() => {
    if (user) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  const value: AuthContextValue = {
    isAuthenticated: user !== null,
    user,
    signInWithPassword: async (email: string, password: string) => {
      const tokens = await apiLogin({ email: email.trim(), password });
      setUser(sessionFromTokens(email.trim(), tokens));
    },
    signInWithTokens: (email: string, tokens: TokenResponse) => {
      setUser(sessionFromTokens(email, tokens));
    },
    // No revoke endpoint exists yet (gap 1.2) — this only forgets the token
    // locally, it does not invalidate it server-side.
    signOut: () => setUser(null),
    needsPassword: false,
    setPasswordSet: () => setUser((prev) => (prev ? { ...prev, passwordSet: true } : prev)),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
