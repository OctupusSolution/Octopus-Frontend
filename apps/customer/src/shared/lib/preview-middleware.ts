import { NextResponse, type NextRequest } from "next/server";
import {
  PREVIEW_COOKIE_NAME,
  PREVIEW_ENTER_PATH,
  PREVIEW_EXIT_PATH,
  PREVIEW_RESPONSE_HEADERS,
  previewCookieMaxAge,
  previewFrameAncestors,
  sanitizePreviewToken,
} from "./preview";

function withPreviewHeaders(res: NextResponse): NextResponse {
  for (const [k, v] of Object.entries(PREVIEW_RESPONSE_HEADERS)) res.headers.set(k, v);
  res.headers.set("Content-Security-Policy", previewFrameAncestors(process.env.PREVIEW_FRAME_ANCESTORS));
  return res;
}

function home(request: NextRequest): URL {
  const url = request.nextUrl.clone();
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url;
}

function clearCookie(res: NextResponse): NextResponse {
  res.cookies.set(PREVIEW_COOKIE_NAME, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}

/**
 * The two preview routes, handled before any page renders:
 *  - `/_preview?token=…[&exp=…]` stores the secret in an httpOnly cookie and redirects to `/`,
 *    so it does not stay in the address bar, the history or a Referer.
 *  - `/_preview/exit` clears it (a redirect home, or 204 with `?quiet=1`).
 * Anything else returns null.
 */
export function handlePreviewRoute(request: NextRequest): NextResponse | null {
  const { pathname, searchParams } = request.nextUrl;
  const path = pathname.replace(/\/+$/, "") || "/";

  if (path === PREVIEW_EXIT_PATH) {
    const res = searchParams.get("quiet") === "1" ? new NextResponse(null, { status: 204 }) : NextResponse.redirect(home(request), 303);
    return withPreviewHeaders(clearCookie(res));
  }

  if (path === PREVIEW_ENTER_PATH) {
    const res = NextResponse.redirect(home(request), 303);
    const raw = searchParams.get("token");
    if (raw === null || raw === "") {
      // Nothing to enter: an existing preview (if any) stays as it is.
      return withPreviewHeaders(res);
    }
    res.cookies.set(PREVIEW_COOKIE_NAME, sanitizePreviewToken(raw), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: request.nextUrl.protocol === "https:",
      maxAge: previewCookieMaxAge(searchParams.get("exp")),
    });
    return withPreviewHeaders(res);
  }

  return null;
}

/** Marks an ordinary response as a preview one when the visitor holds the cookie. */
export function applyPreviewHeaders(request: NextRequest, res: NextResponse): NextResponse {
  return request.cookies.get(PREVIEW_COOKIE_NAME)?.value ? withPreviewHeaders(res) : res;
}
