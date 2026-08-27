// Session state for the merchant console. MOCK AUTH — the backend does not
// exist yet, so a sign-in just writes a fake session to localStorage and the
// route guard keys off its presence. Swap this for a real /auth/session call
// when the API is published (see architecture PDF, Section 9).
//
// Never store a password here — this is a prototype gate, not security.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "octopus.session";

export interface SessionUser {
  email: string;
  name: string;
  role: string;
  signedInAt: string;
  /** Whether a password was set at signup — never the password itself, just the flag. */
  passwordSet: boolean;
}

interface AuthContextValue {
  isAuthenticated: boolean;
  user: SessionUser | null;
  /** `passwordSet` defaults to true (email/social sign-in already implies credentials); the onboarding account step passes it explicitly. */
  signIn: (email: string, passwordSet?: boolean) => void;
  signOut: () => void;
  /** True once signed in without a password — the shell blocks on this until `setPasswordSet` runs. */
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
    signIn: (email: string, passwordSet = true) =>
      setUser({
        email,
        name: displayNameFromEmail(email),
        role: "owner",
        signedInAt: new Date().toISOString(),
        passwordSet,
      }),
    signOut: () => setUser(null),
    needsPassword: user !== null && !user.passwordSet,
    setPasswordSet: () => setUser((prev) => (prev ? { ...prev, passwordSet: true } : prev)),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}


export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
