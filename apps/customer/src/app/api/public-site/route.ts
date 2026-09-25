import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { TENANT_SLUG_HEADER } from "@/entities/tenant";
import { fetchPublicSite } from "@/shared/api/public-api";

// PublicApi resolves the tenant from the *actual* Host header, which a plain
// rewrite cannot fake from local dev. This route reads the same public site the
// pages do (shared/api/public-api.ts sends the Host explicitly, which `fetch`
// cannot) for any client-side code that needs it.
export async function GET() {
  const slug = headers().get(TENANT_SLUG_HEADER) ?? "burger-house";
  const site = await fetchPublicSite(slug);
  return site ? NextResponse.json(site) : NextResponse.json({ error: "not-found" }, { status: 404 });
}
