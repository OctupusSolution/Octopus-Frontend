const PUBLIC_API_URL = process.env.PUBLIC_API_URL ?? "http://localhost:8082";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@octopus/api-client", "@octopus/ui", "@octopus/i18n"],
  // PublicApi has no CORS configured, so calls go through this dev proxy
  // instead of hitting http://localhost:8082 directly from the browser.
  // Frontend code should call fetch("/api/v1/...") and never the backend
  // origin directly.
  //
  // Exception: GET /v1/public-site resolves the tenant from the Host
  // header (subdomain), which a plain rewrite can't fake for local dev —
  // that one is proxied by app/api/public-site/route.ts instead, which
  // sets the Host header explicitly from DEV_TENANT_HOST.
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${PUBLIC_API_URL}/:path*` },
    ];
  },
};

export default nextConfig;
