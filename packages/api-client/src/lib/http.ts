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

export function configureHttp(options: { basePath?: string; getAccessToken?: () => string | null }): void {
  if (options.basePath !== undefined) basePath = options.basePath;
  if (options.getAccessToken !== undefined) getAccessToken = options.getAccessToken;
}

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
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | undefined>;
  idempotencyKey?: string;
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
  const token = getAccessToken();
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.idempotencyKey) headers["Idempotency-Key"] = options.idempotencyKey;

  const res = await fetch(buildUrl(path, options.query), {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    let problem: ProblemDetails | null = null;
    try {
      problem = (await res.json()) as ProblemDetails;
    } catch {
      // Not a problem+json body (e.g. a proxy error page) — leave it null.
    }
    throw new ApiError(res.status, problem);
  }

  // Several endpoints (register, verify-email, forgot/reset-password, ...)
  // return 200/202 with an empty body — `res.json()` on an empty stream
  // throws, so check there is actually something to parse first.
  if (res.status === 204) return undefined as TResponse;
  const text = await res.text();
  if (!text) return undefined as TResponse;
  return JSON.parse(text) as TResponse;
}
