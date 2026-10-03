// The merchant console origins the storefront trusts: they may frame a draft preview and drive
// the builder's live preview canvas (/preview/builder) with postMessage. Pure helpers (no next/* imports),
// shared by the middleware, the canvas route and the tests.
import { BUILDER_PREVIEW_PATH, MENU_PREVIEW_PATH } from "@octopus/api-client";

/** The merchant app's Vite dev server (apps/merchant/vite.config.ts `server.port`). */
export const DEV_MERCHANT_ORIGINS: readonly string[] = ["http://localhost:5290", "http://127.0.0.1:5290"];

const ORIGIN = /^https?:\/\/[a-z0-9.-]+(:\d+)?$/i;

/** `configured` is MERCHANT_APP_ORIGINS: origins separated by spaces or commas; anything else is ignored.
 *  Lowercased, since `event.origin` is always lowercase and origin checks must match it exactly. */
export function merchantOrigins(configured: string | null | undefined, production: boolean): string[] {
  const listed = (configured ?? "")
    .split(/[\s,]+/)
    .map((o) => o.trim().replace(/\/+$/, "").toLowerCase())
    .filter((o) => ORIGIN.test(o));
  return [...new Set(production ? listed : [...listed, ...DEV_MERCHANT_ORIGINS])];
}

export const currentMerchantOrigins = (): string[] =>
  merchantOrigins(process.env.MERCHANT_APP_ORIGINS, process.env.NODE_ENV === "production");

export const frameAncestors = (origins: readonly string[]): string => ["frame-ancestors 'self'", ...origins].join(" ");

/** Set by middleware on the canvas route's request, so the root layout renders a bare document. */
export const BUILDER_CANVAS_HEADER = "x-octo-builder-canvas";

export const isBuilderCanvasPath = (pathname: string): boolean => (pathname.replace(/\/+$/, "") || "/") === BUILDER_PREVIEW_PATH;

const trimmed = (pathname: string) => pathname.replace(/\/+$/, "") || "/";

/** The two builder canvases (Public Link and menu): framable by the merchant console only. */
export const isCanvasPath = (pathname: string): boolean => {
  const path = trimmed(pathname);
  return path === BUILDER_PREVIEW_PATH || path === MENU_PREVIEW_PATH;
};

/** Pages drawn without the site's chrome and without resolving a tenant from the host: the canvases and the QR menu. */
export const isBareDocumentPath = (pathname: string): boolean => isCanvasPath(pathname) || /^\/c\/[^/]+/.test(pathname);

export function builderCanvasResponseHeaders(origins: readonly string[]): Record<string, string> {
  return {
    "Content-Security-Policy": frameAncestors(origins),
    "Cache-Control": "private, no-store",
    "X-Robots-Tag": "noindex, nofollow",
    "Referrer-Policy": "no-referrer",
  };
}
