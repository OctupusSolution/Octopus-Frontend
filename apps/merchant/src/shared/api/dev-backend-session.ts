// DISABLED. This used to hand-feed a pasted business token + id to the old
// Public Link sync while auth was still mock. The real session now lives in
// auth-provider (business token minted by /auth/business-session) and reaches
// the api-client through session-bridge.ts.
//
// The old Public Link API this fed (single ConnectedContentKey, PUT /brand,
// POST /content, ...) was retired by the backend's US-014 rebuild, so
// public-link-sync.ts must not talk to it any more: it stays inert here
// (`hasDevSession()` is false) until Public Link is re-wired against the new
// sections/versions API, at which point this file and that hook go away.

export function getDevBusinessId(): string | null {
  return null;
}

export function hasDevSession(): boolean {
  return false;
}
