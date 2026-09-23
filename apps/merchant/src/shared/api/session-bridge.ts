// Connects @octopus/api-client (plain module state, no React) to the session
// held by AuthProvider (React state). AuthProvider registers itself on first
// render; the api-client then asks it for the token to send and for a renewal
// when a request comes back 401 (see configureHttp in packages/api-client).
//
// Replaces the temporary dev-backend-session.ts that hand-fed a pasted token.
import { configureHttp } from "@octopus/api-client";

export interface SessionBridge {
  /** The token every request should carry: the business token when a business
   *  is selected, otherwise the account token, or null when signed out. */
  getToken: () => string | null;
  /** Renews the session (refresh token, then business-session again if a
   *  business is selected). Resolves with the new token to send, or null if the
   *  session is gone — the caller is then signed out. */
  refresh: () => Promise<string | null>;
}

let bridge: SessionBridge | null = null;

export function registerSessionBridge(next: SessionBridge | null): void {
  bridge = next;
}

/** Called once at bootstrap (main.tsx), before anything renders. */
export function initApiClient(): void {
  configureHttp({
    basePath: "/api",
    getAccessToken: () => bridge?.getToken() ?? null,
    onUnauthorized: () => (bridge ? bridge.refresh() : Promise.resolve(null)),
  });
}
