import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { TENANT_SLUG_HEADER } from "@/entities/tenant";

// PublicApi resolves the tenant from the *actual* Host header (a subdomain
// under Platform:BaseDomainSuffix, e.g. burger-house.octopus.app) — there is
// no CORS and no way to pick a tenant by query string or a forwarded header,
// so a plain Next.js rewrite (see next.config.mjs) can't reach this endpoint
// from local dev, where the browser's real Host is just localhost:3000.
//
// This route stands in for that: it reuses the same dev tenant slug the rest
// of the app already falls back to (x-tenant-slug, set by middleware.ts from
// the request's subdomain, default "burger-house"), builds the fake
// production-shaped Host, and forwards the request to PublicApi with that
// Host header set explicitly.
const PUBLIC_API_URL = process.env.PUBLIC_API_URL ?? "http://localhost:8082";
const BASE_DOMAIN_SUFFIX = process.env.DEV_TENANT_DOMAIN_SUFFIX ?? "octopus.app";

export async function GET() {
  const slug = headers().get(TENANT_SLUG_HEADER) ?? "burger-house";
  const devHost = `${slug}.${BASE_DOMAIN_SUFFIX}`;

  const res = await fetch(`${PUBLIC_API_URL}/v1/public-site`, {
    headers: { Host: devHost },
    cache: "no-store",
  });

  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
}
