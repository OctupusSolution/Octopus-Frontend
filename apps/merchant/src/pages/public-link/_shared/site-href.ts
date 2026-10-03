// Where a published site's address actually opens. The displayed URL is always
// the real one (`https://{slug}.octopus.app`), but in local development there
// is no DNS for it: the customer app serves the same site at
// `http://{slug}.localhost:3000` and forwards the host to PublicApi itself.
// `VITE_PUBLIC_SITE_DEV_ORIGIN` overrides that origin (e.g. another port).

const PLATFORM_SUFFIX = ".octopus.app";
const DEV_ORIGIN = (import.meta.env.VITE_PUBLIC_SITE_DEV_ORIGIN as string | undefined) || "http://localhost:3000";

/** The href that opens `liveUrl` (optionally at `path`) from this environment. */
export function siteHref(liveUrl: string, path = ""): string {
  const url = new URL(liveUrl);
  if (import.meta.env.DEV && url.hostname.endsWith(PLATFORM_SUFFIX)) {
    const slug = url.hostname.slice(0, -PLATFORM_SUFFIX.length);
    const dev = new URL(DEV_ORIGIN);
    url.protocol = dev.protocol;
    url.hostname = `${slug}.${dev.hostname}`;
    url.port = dev.port;
  }
  url.pathname = path || "/";
  return url.toString().replace(/\/$/, "");
}
