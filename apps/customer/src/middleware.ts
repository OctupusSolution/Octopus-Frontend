import { NextResponse, type NextRequest } from "next/server";
import { TENANT_SLUG_HEADER } from "@/entities/tenant";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const slug = host.split(".")[0].split(":")[0] || "burger-house";

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(TENANT_SLUG_HEADER, slug);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
