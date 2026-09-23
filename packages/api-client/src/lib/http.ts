// Thin fetch wrapper shared by every real backend client in this package
// (public-link, and whatever follows once Identity/Setup/Menu are wired).
//
// Do not read import.meta.env or process.env here — this package is consumed
// by both a Vite app and a Next app and must not depend on either bundler's
// env mechanism (see orders-client.ts). Callers configure the base path and
// how to fetch a bearer token via configureHttp().
//
// Base path is a relative one ("/api" by default) — the actual backend host
// is never called directly from the browser, because AdminApi/PublicApi have
// no CORS configured. Each app's dev server proxies /api/* to the real
// backend (see apps/merchant/vite.config.ts and apps/customer/next.config.mjs).
let basePath = "/api";
let getAccessToken: () => string | null = () => null;
// Called once when a request that carried the configured token comes back 401.
// Returns a fresh token (the request is then retried once with it) or null when
// the session cannot be renewed (the 401 is then surfaced as an ApiError).
let onUnauthorized: (() => Promise<string | null>) | null = null;

export function configureHttp(options: {
  basePath?: string;
  getAccessToken?: () => string | null;
  onUnauthorized?: (() => Promise<string | null>) | null;
}): void {
  if (options.basePath !== undefined) basePath = options.basePath;
  if (options.getAccessToken !== undefined) getAccessToken = options.getAccessToken;
  if (options.onUnauthorized !== undefined) onUnauthorized = options.onUnauthorized;
}

// Endpoints whose 401 means "wrong credentials", not "expired token" — retrying
// them after a refresh would be wrong (and refresh itself must never recurse).
const NO_REFRESH_PATHS = [
  "/v1/auth/login",
  "/v1/auth/refresh",
  "/v1/accounts/register",
  "/v1/accounts/verify-email",
  "/v1/accounts/resend-verification-code",
];

// A wrong password on an authenticated call (e.g. approval-pin) is also a 401;
// replaying it would count the failed attempt twice.
const WRONG_CREDENTIALS = "identity.auth.invalid-credentials";

// RFC 9457 application/problem+json, as returned by BuildingBlocks.Web.
export interface ProblemDetails {
  title?: string;
  status?: number;
  errorCode?: string;
  correlationId?: string;
  timestampUtc?: string;
  errors?: Record<string, string[]>;
  detail?: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly problem: ProblemDetails | null;

  constructor(status: number, problem: ProblemDetails | null) {
    super(problem?.errorCode ?? problem?.title ?? `Request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.problem = problem;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | undefined>;
  idempotencyKey?: string;
  /** Sends this token instead of the configured one, and never auto-refreshes
   *  on 401 (the caller owns that token's lifecycle). Used by business-session,
   *  which the backend refuses when the caller already holds a business token. */
  token?: string | null;
}

function buildUrl(path: string, query?: Record<string, string | undefined>): string {
  const url = new URL(`${basePath}${path}`, "http://placeholder.local");
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, value);
    }
  }
  return `${url.pathname}${url.search}`;
}

/** Sends one request and parses a JSON body, or throws ApiError on failure.
 *  `TResponse` is `undefined` for the 200-with-no-body endpoints this backend
 *  has none of on PublicLink, but callers can still pass it for symmetry. */
export async function apiRequest<TResponse>(path: string, options: RequestOptions = {}): Promise<TResponse> {
  const explicitToken = options.token !== undefined;
  const send = (token: string | null): Promise<Response> => {
    const headers: Record<string, string> = {};
    if (options.body !== undefined) headers["Content-Type"] = "application/json";
    if (token) headers.Authorization = `Bearer ${token}`;
    if (options.idempotencyKey) headers["Idempotency-Key"] = options.idempotencyKey;
    return fetch(buildUrl(path, options.query), {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  };

  const token = explicitToken ? options.token ?? null : getAccessToken();
  let res = await send(token);
  let problem: ProblemDetails | null = null;
  if (!res.ok) {
    try {
      problem = (await res.json()) as ProblemDetails;
    } catch {
      // Not a problem+json body (e.g. a proxy error page) — leave it null.
    }
  }

  // An expired access token: renew once and replay. Only for requests that
  // actually carried the configured token, and never for credential endpoints.
  //
  // A truly expired JWT should fail authentication and come back 401, but on
  // this backend the endpoints wrapped in the MediatR authorization pipeline
  // (menu settings, and likely others behind the same behavior) never get
  // that far: JwtBearer logs "IDX10223: Lifetime validation failed" and the
  // request falls through as unauthenticated, which the app-level check then
  // reports as a plain "authorization.forbidden" 403 — not the 401 that would
  // trigger a refresh below. Retrying on that specific error code too is what
  // makes an idle tab recover on its own instead of misreporting a genuine
  // permission problem as a dead end requiring a manual re-login.
  const looksExpired =
    (res.status === 401 && problem?.errorCode !== WRONG_CREDENTIALS) ||
    (res.status === 403 && problem?.errorCode === "authorization.forbidden");
  if (looksExpired && token && !explicitToken && onUnauthorized && !NO_REFRESH_PATHS.some((prefix) => path.startsWith(prefix))) {
    const fresh = await onUnauthorized();
    if (fresh) {
      res = await send(fresh);
      problem = null;
      if (!res.ok) {
        try {
          problem = (await res.json()) as ProblemDetails;
        } catch {
          // Not a problem+json body — leave it null.
        }
      }
    }
  }

  if (!res.ok) throw new ApiError(res.status, problem);

  // Several endpoints (register, verify-email, forgot/reset-password, ...)
  // return 200/202 with an empty body — `res.json()` on an empty stream
  // throws, so check there is actually something to parse first.
  if (res.status === 204) return undefined as TResponse;
  const text = await res.text();
  if (!text) return undefined as TResponse;
  return JSON.parse(text) as TResponse;
}
