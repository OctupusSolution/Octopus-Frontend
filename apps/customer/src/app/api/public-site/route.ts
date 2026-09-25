import { NextResponse } from "next/server";
import { getStorefront } from "@/entities/tenant/load";

// PublicApi resolves the site from the *actual* Host header, which a plain
// rewrite cannot fake from local dev. This route returns the same published
// shell the pages render from (shared/api/public-api.ts sends the Host
// explicitly, which `fetch` cannot) for any client-side code that needs it.
export async function GET() {
  const { shell } = await getStorefront();
  return shell ? NextResponse.json(shell) : NextResponse.json({ error: "not-found" }, { status: 404 });
}
