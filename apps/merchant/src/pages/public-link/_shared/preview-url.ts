// The address a private preview link opens: the customer storefront's own preview entry point on the
// site's host — `https://<host>/_preview?token=<secret>[&exp=<expiry>]` — which moves the secret into
// an httpOnly cookie and serves the draft (apps/customer, shared/lib/preview.ts). In local
// development (the merchant app itself on localhost) the storefront runs at
// `http://<slug>.localhost:3000`.
//
// The backend's own `previewUrl` (`PublicLink:Preview:PageUrlTemplate`, secret in the fragment) is
// only the fallback for a site with no known host outside development.

export interface PreviewUrlContext {
  /** The claimed address's hostname, e.g. `cookdoor.octopus.app` (SiteAddressResponse.hostname). */
  host: string | null | undefined;
  /** The claimed slug (SiteAddressResponse.slug). */
  slug: string | null | undefined;
  /** `window.location.hostname` of the merchant app. */
  currentHostname: string;
  /** The link's expiry (ISO); lets the storefront's cookie end with the link. */
  expiresAtUtc?: string | null;
  /** The backend's `previewUrl`, used when no storefront host is known. */
  fallback: string;
}

export const DEV_STOREFRONT_PORT = 3000;

export function isLocalDevHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h.endsWith(".localhost");
}

/** The storefront origin the preview opens on, or null when none is known. */
export function storefrontOrigin(ctx: Pick<PreviewUrlContext, "host" | "slug" | "currentHostname">): string | null {
  const slug = (ctx.slug ?? "").trim().toLowerCase();
  if (isLocalDevHost(ctx.currentHostname)) return `http://${slug ? `${slug}.` : ""}localhost:${DEV_STOREFRONT_PORT}`;
  const host = (ctx.host ?? "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return host ? `https://${host}` : null;
}

export function storefrontPreviewUrl(token: string, ctx: PreviewUrlContext): string {
  const origin = storefrontOrigin(ctx);
  if (!origin) return ctx.fallback;
  const exp = ctx.expiresAtUtc ? `&exp=${encodeURIComponent(ctx.expiresAtUtc)}` : "";
  return `${origin}/_preview?token=${encodeURIComponent(token)}${exp}`;
}
