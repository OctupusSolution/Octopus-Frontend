import { NextResponse, type NextRequest } from "next/server";
import { SAMPLE_STOREFRONT_HEADER, SAMPLE_TENANT_SLUG, TENANT_SLUG_HEADER } from "@/entities/tenant";
import { applyPreviewHeaders, handlePreviewRoute } from "@/shared/lib/preview-middleware";
import { BUILDER_CANVAS_HEADER, builderCanvasResponseHeaders, currentMerchantOrigins, isBareDocumentPath, isCanvasPath } from "@/shared/lib/merchant-origins";

/** A host with no subdomain (plain `localhost`, an IP address) is local development
 *  of the storefront itself: it renders the built-in sample tenant. Any subdomain
 *  (`dhd.localhost`, `dhd.octopus.app`) is a real business's published site. */
function isBareDevHost(hostname: string): boolean {
  return hostname === "localhost" || /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname === "[::1]";
}

export function middleware(request: NextRequest) {
  // Draft preview links: /_preview?token=… and /_preview/exit (shared/lib/preview.ts).
  const preview = handlePreviewRoute(request);
  if (preview) return preview;

  // Bare documents: the builder's live preview canvases (postMessage-filled, no tenant, framed
  // by the console only) and the QR menu (/c/*, no tenant resolved from the host either).
  if (isBareDocumentPath(request.nextUrl.pathname)) {
    const bareHeaders = new Headers(request.headers);
    bareHeaders.set(BUILDER_CANVAS_HEADER, "1");
    bareHeaders.delete(TENANT_SLUG_HEADER);
    bareHeaders.delete(SAMPLE_STOREFRONT_HEADER);
    const res = NextResponse.next({ request: { headers: bareHeaders } });
    if (isCanvasPath(request.nextUrl.pathname)) {
      for (const [k, v] of Object.entries(builderCanvasResponseHeaders(currentMerchantOrigins()))) res.headers.set(k, v);
    }
    return res;
  }

  const hostname = (request.headers.get("host") ?? "").replace(/:\d+$/, "").toLowerCase();
  const sample = hostname === "" || isBareDevHost(hostname);
  const slug = sample ? SAMPLE_TENANT_SLUG : hostname.split(".")[0];

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(TENANT_SLUG_HEADER, slug);
  requestHeaders.delete(BUILDER_CANVAS_HEADER);
  if (sample) requestHeaders.set(SAMPLE_STOREFRONT_HEADER, "1");
  else requestHeaders.delete(SAMPLE_STOREFRONT_HEADER);

  return applyPreviewHeaders(request, NextResponse.next({ request: { headers: requestHeaders } }));
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
