import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import {
  DEFAULT_PREVIEW_MAX_AGE_S,
  MAX_PREVIEW_MAX_AGE_S,
  PREVIEW_COOKIE_NAME,
  UNUSABLE_TOKEN,
  planApiRequest,
  previewCookieMaxAge,
  sanitizePreviewToken,
} from "./preview";
import { applyPreviewHeaders, handlePreviewRoute } from "./preview-middleware";
import { NextResponse } from "next/server";

const TOKEN = "plpv_AbCdEfGhIjKlMnOpQrStUvWxYz0123456789-_abcd";
const req = (url: string, cookie?: string) =>
  new NextRequest(url, { headers: cookie ? { cookie } : {} });

describe("planApiRequest", () => {
  it("leaves published reads untouched and cacheable without a token", () => {
    expect(planApiRequest("/v1/public-site?lang=ar", null)).toEqual({ path: "/v1/public-site?lang=ar", headers: {}, cacheable: true });
    expect(planApiRequest("/v1/public-site/pages?path=%2F", undefined).cacheable).toBe(true);
  });

  it("sends the shell and pages to the preview endpoints with the secret in X-Preview-Token, uncached", () => {
    expect(planApiRequest("/v1/public-site?lang=ar", TOKEN)).toEqual({
      path: "/v1/public-site/preview?lang=ar",
      headers: { "X-Preview-Token": TOKEN },
      cacheable: false,
    });
    expect(planApiRequest("/v1/public-site", TOKEN).path).toBe("/v1/public-site/preview");
    expect(planApiRequest("/v1/public-site/pages?path=%2Fabout&lang=en", TOKEN)).toEqual({
      path: "/v1/public-site/preview/pages?path=%2Fabout&lang=en",
      headers: { "X-Preview-Token": TOKEN },
      cacheable: false,
    });
  });

  it("never puts the secret in the path or query", () => {
    const plan = planApiRequest("/v1/public-site/pages?path=%2F", TOKEN);
    expect(plan.path).not.toContain(TOKEN);
  });

  it("keeps the site menu on its own endpoint, without the secret, and uncached", () => {
    expect(planApiRequest("/v1/public/site-menu/k1?lang=ar", TOKEN)).toEqual({
      path: "/v1/public/site-menu/k1?lang=ar",
      headers: {},
      cacheable: false,
    });
  });
});

describe("sanitizePreviewToken", () => {
  it("keeps a URL-safe secret", () => expect(sanitizePreviewToken(TOKEN)).toBe(TOKEN));
  it("replaces anything else with an unusable value", () => {
    expect(sanitizePreviewToken("a b")).toBe(UNUSABLE_TOKEN);
    expect(sanitizePreviewToken("x\r\nSet-Cookie: y")).toBe(UNUSABLE_TOKEN);
    expect(sanitizePreviewToken("x".repeat(300))).toBe(UNUSABLE_TOKEN);
  });
});

describe("previewCookieMaxAge", () => {
  const now = Date.parse("2026-09-25T00:00:00Z");
  it("defaults to a few hours", () => expect(previewCookieMaxAge(null, now)).toBe(DEFAULT_PREVIEW_MAX_AGE_S));
  it("follows a known expiry (ISO or Unix seconds)", () => {
    expect(previewCookieMaxAge("2026-09-26T00:00:00Z", now)).toBe(86_400);
    expect(previewCookieMaxAge(String(now / 1000 + 3600), now)).toBe(3600);
  });
  it("is clamped to 30 days and ignores garbage", () => {
    expect(previewCookieMaxAge("2027-09-26T00:00:00Z", now)).toBe(MAX_PREVIEW_MAX_AGE_S);
    expect(previewCookieMaxAge("soon", now)).toBe(DEFAULT_PREVIEW_MAX_AGE_S);
  });
});

describe("handlePreviewRoute", () => {
  it("moves the token into an httpOnly cookie and redirects home without it", () => {
    const res = handlePreviewRoute(req(`http://octopus-burger.localhost:3000/_preview?token=${TOKEN}`))!;
    expect(res.status).toBe(303);
    const location = res.headers.get("location")!;
    expect(new URL(location).pathname).toBe("/");
    expect(location).not.toContain(TOKEN);
    const setCookie = res.headers.get("set-cookie")!;
    expect(setCookie).toContain(`${PREVIEW_COOKIE_NAME}=${TOKEN}`);
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=lax/i);
    expect(setCookie).toMatch(/Path=\//);
    expect(setCookie).toContain(`Max-Age=${DEFAULT_PREVIEW_MAX_AGE_S}`);
    expect(res.headers.get("referrer-policy")).toBe("no-referrer");
    expect(res.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });

  it("stores a malformed token as unusable so it fails like any other", () => {
    const res = handlePreviewRoute(req("http://s.localhost:3000/_preview?token=%3Cscript%3E"))!;
    expect(res.headers.get("set-cookie")).toContain(`${PREVIEW_COOKIE_NAME}=${UNUSABLE_TOKEN}`);
  });

  it("exit clears the cookie and redirects home, or answers 204 when quiet", () => {
    const res = handlePreviewRoute(req("http://s.localhost:3000/_preview/exit", `${PREVIEW_COOKIE_NAME}=${TOKEN}`))!;
    expect(res.status).toBe(303);
    expect(res.headers.get("set-cookie")).toMatch(new RegExp(`${PREVIEW_COOKIE_NAME}=;.*Max-Age=0`, "i"));
    const quiet = handlePreviewRoute(req("http://s.localhost:3000/_preview/exit?quiet=1"))!;
    expect(quiet.status).toBe(204);
    expect(quiet.headers.get("set-cookie")).toMatch(/Max-Age=0/);
  });

  it("ignores every other path", () => {
    expect(handlePreviewRoute(req("http://s.localhost:3000/about?token=x"))).toBeNull();
    expect(handlePreviewRoute(req("http://s.localhost:3000/_previewer"))).toBeNull();
  });

  it("marks responses for a preview visitor only", () => {
    const withCookie = applyPreviewHeaders(req("http://s.localhost:3000/", `${PREVIEW_COOKIE_NAME}=${TOKEN}`), NextResponse.next());
    expect(withCookie.headers.get("referrer-policy")).toBe("no-referrer");
    expect(withCookie.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    const plain = applyPreviewHeaders(req("http://s.localhost:3000/"), NextResponse.next());
    expect(plain.headers.get("x-robots-tag")).toBeNull();
  });
});

describe("preview framing", () => {
  it("marks every preview response with frame-ancestors", () => {
    const res = applyPreviewHeaders(req("https://x.octopus.app/", `${PREVIEW_COOKIE_NAME}=${TOKEN}`), NextResponse.next());
    expect(res.headers.get("Content-Security-Policy")).toMatch(/^frame-ancestors 'self'/);
  });
});
