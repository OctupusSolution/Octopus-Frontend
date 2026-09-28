import { describe, expect, it } from "vitest";
import { builderCanvasResponseHeaders, DEV_MERCHANT_ORIGINS, frameAncestors, isBuilderCanvasPath, merchantOrigins } from "./merchant-origins";

describe("merchantOrigins", () => {
  it("keeps real origins only, without trailing slashes", () => {
    expect(merchantOrigins("https://app.octopus.app/, javascript:alert(1) * http://x.test:8080", true)).toEqual([
      "https://app.octopus.app",
      "http://x.test:8080",
    ]);
  });

  it("adds the merchant dev server outside production, and nothing in production", () => {
    expect(merchantOrigins(undefined, false)).toEqual(DEV_MERCHANT_ORIGINS);
    expect(merchantOrigins(undefined, true)).toEqual([]);
  });
});

describe("frameAncestors", () => {
  it("always allows the storefront itself, then the listed origins", () => {
    expect(frameAncestors([])).toBe("frame-ancestors 'self'");
    expect(frameAncestors(["https://app.octopus.app"])).toBe("frame-ancestors 'self' https://app.octopus.app");
  });
});

describe("the builder canvas route", () => {
  it("is /preview/builder, with or without a trailing slash, and nothing else", () => {
    expect(isBuilderCanvasPath("/preview/builder")).toBe(true);
    expect(isBuilderCanvasPath("/preview/builder/")).toBe(true);
    expect(isBuilderCanvasPath("/preview")).toBe(false);
    expect(isBuilderCanvasPath("/preview/builder/x")).toBe(false);
  });

  it("is framable by the merchant console only, never cached or indexed", () => {
    expect(builderCanvasResponseHeaders(["https://app.octopus.app"])).toEqual({
      "Content-Security-Policy": "frame-ancestors 'self' https://app.octopus.app",
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
      "Referrer-Policy": "no-referrer",
    });
  });
});
