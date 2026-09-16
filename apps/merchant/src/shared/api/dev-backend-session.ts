// TEMPORARY bridge to a real backend session, until Identity is wired for
// real (see FRONTEND_INTEGRATION_GAPS.md — Identity is next in the
// integration order). auth-provider.tsx and tenant-config-provider.tsx are
// both mock today and hold no bearer token or real (GUID) business id, so
// there is nothing yet to feed a real endpoint's Authorization header or
// {businessId} path segment.
//
// This module fills that one gap just enough to wire and test Public Link
// now: a business-session JWT (from POST /v1/auth/business-session) and the
// real business GUID it was issued for, pasted in by hand for local testing
// via `setDevSession`. DELETE THIS FILE once auth-provider carries a real
// token and tenant-config-provider carries real business ids end to end —
// every call site here should switch to reading those instead.
import { configureHttp } from "@octopus/api-client";

const TOKEN_KEY = "octopus.dev.accessToken";
const BUSINESS_ID_KEY = "octopus.dev.businessId";

export function getDevAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getDevBusinessId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(BUSINESS_ID_KEY);
}

export function setDevSession(accessToken: string, businessId: string): void {
  window.localStorage.setItem(TOKEN_KEY, accessToken);
  window.localStorage.setItem(BUSINESS_ID_KEY, businessId);
}

export function clearDevSession(): void {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(BUSINESS_ID_KEY);
}

export function hasDevSession(): boolean {
  return getDevAccessToken() !== null && getDevBusinessId() !== null;
}

// Called once at app bootstrap (main.tsx) so every @octopus/api-client call
// picks up whatever token is currently stored, without each call site having
// to thread it through by hand.
export function initDevBackendSession(): void {
  configureHttp({ basePath: "/api", getAccessToken: getDevAccessToken });
}
