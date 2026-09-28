// Draft preview links (backend ADR-080, US-019 FR-073).
//
// The merchant app hands out `https://<site host>/_preview?token=plpv_…`. The first hit
// moves the secret out of the address bar into an httpOnly cookie and redirects to `/`
// (middleware.ts); from then on every PublicApi read for this visitor goes to the
// preview endpoints with the secret in the `X-Preview-Token` header — never the path or
// query, which end up in logs and referrers — and is never cached.
//
// Pure helpers only (no next/* imports) so the middleware, the API client and the
// tests can all share them.

/** The httpOnly cookie that carries the preview secret. */
export const PREVIEW_COOKIE_NAME = "octo_preview";
/** The request header PublicApi reads the secret from (PublicLinkApiConstants.PreviewTokenHeader). */
export const PREVIEW_TOKEN_HEADER = "X-Preview-Token";

/** Entry point: `/_preview?token=…[&exp=…]`. */
export const PREVIEW_ENTER_PATH = "/_preview";
/** Leaves preview: clears the cookie and goes home. `?quiet=1` answers 204 instead (used by the page itself). */
export const PREVIEW_EXIT_PATH = "/_preview/exit";

/** Without a known link expiry the cookie lives a few hours; the backend still enforces the link's own expiry. */
export const DEFAULT_PREVIEW_MAX_AGE_S = 4 * 60 * 60;
/** A link lives at most 30 days (backend: expiresInDays 1-30). */
export const MAX_PREVIEW_MAX_AGE_S = 30 * 24 * 60 * 60;
const MIN_PREVIEW_MAX_AGE_S = 60;

/** Stored for a secret that could never be valid, so it still ends in the same uniform 404. */
export const UNUSABLE_TOKEN = "invalid";

/**
 * The value to keep in the cookie. A preview secret is `plpv_` + base64url; anything that is
 * not a plain URL-safe token is replaced by a value that can never open a preview, so a
 * malformed link fails exactly like an unknown one (and nothing odd reaches a header).
 */
export function sanitizePreviewToken(raw: string | null | undefined): string {
  const token = (raw ?? "").trim();
  return /^[A-Za-z0-9_-]{1,256}$/.test(token) ? token : UNUSABLE_TOKEN;
}

/**
 * Cookie lifetime in seconds. `exp` (optional, from the link) is the link's expiry as an ISO
 * date or Unix seconds; the cookie never outlives it, nor 30 days.
 */
export function previewCookieMaxAge(exp: string | null | undefined, now: number = Date.now()): number {
  if (!exp) return DEFAULT_PREVIEW_MAX_AGE_S;
  const at = /^\d+$/.test(exp) ? Number(exp) * 1000 : Date.parse(exp);
  if (!Number.isFinite(at)) return DEFAULT_PREVIEW_MAX_AGE_S;
  const seconds = Math.floor((at - now) / 1000);
  return Math.min(MAX_PREVIEW_MAX_AGE_S, Math.max(MIN_PREVIEW_MAX_AGE_S, seconds));
}

// ---- which PublicApi call a read becomes ----------------------------------------------

const PUBLISHED_SHELL = "/v1/public-site";
const PUBLISHED_PAGES = "/v1/public-site/pages";
const PREVIEW_SHELL = "/v1/public-site/preview";
const PREVIEW_PAGES = "/v1/public-site/preview/pages";

export interface ApiRequestPlan {
  path: string;
  /** Extra headers beyond Host / Accept / Accept-Language. */
  headers: Record<string, string>;
  /** Whether the answer may go into (or come from) the in-memory cache. */
  cacheable: boolean;
}

/**
 * Maps a published read to what is actually sent. Without a preview token: unchanged and
 * cacheable. With one: the shell and page reads go to their preview twins with the secret in
 * `X-Preview-Token`; anything else (the site menu, which has no preview endpoint and is live
 * data anyway) keeps its path, never receives the secret, and is still not cached, since a
 * preview visitor must never fill the cache published visitors read from.
 */
export function planApiRequest(path: string, previewToken: string | null | undefined): ApiRequestPlan {
  if (!previewToken) return { path, headers: {}, cacheable: true };
  const [pathname, search = ""] = splitQuery(path);
  const qs = search ? `?${search}` : "";
  if (pathname === PUBLISHED_SHELL) {
    return { path: `${PREVIEW_SHELL}${qs}`, headers: { [PREVIEW_TOKEN_HEADER]: previewToken }, cacheable: false };
  }
  if (pathname === PUBLISHED_PAGES) {
    return { path: `${PREVIEW_PAGES}${qs}`, headers: { [PREVIEW_TOKEN_HEADER]: previewToken }, cacheable: false };
  }
  return { path, headers: {}, cacheable: false };
}

function splitQuery(path: string): [string, string] {
  const i = path.indexOf("?");
  return i < 0 ? [path, ""] : [path.slice(0, i), path.slice(i + 1)];
}

/** Headers every response rendered for a preview visitor carries (the API sends the same on its own). */
export const PREVIEW_RESPONSE_HEADERS: Readonly<Record<string, string>> = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
};
