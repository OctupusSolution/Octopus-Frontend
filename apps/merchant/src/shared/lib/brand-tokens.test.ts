import { describe, expect, it } from "vitest";
import { FONTS, PALETTES, THEME_TEMPLATES, fontStack, readableOn, styleTokens } from "./brand-tokens";
import { storefrontAsset, themeThumb } from "./storefront-assets";

describe("readableOn", () => {
  it("puts dark ink on a light brand colour and light ink on a dark one", () => {
    expect(readableOn("#FFFFFF")).toBe("#1D1D1D");
    expect(readableOn("#0D6EFD")).toBe("#FFFFFF");
  });

  it("falls back to dark ink for anything that is not a six-digit hex", () => {
    expect(readableOn("")).toBe("#1D1D1D");
    expect(readableOn("nonsense")).toBe("#1D1D1D");
  });
});

describe("fontStack", () => {
  it("honours the merchant's choice when it carries Arabic glyphs", () => {
    expect(fontStack("readex", "ar")).toBe("var(--font-arabic)");
  });

  it("swaps a Latin-only face for the Arabic face rather than showing tofu", () => {
    expect(fontStack("georgia", "ar")).toBe("var(--font-arabic)");
    expect(fontStack("georgia", "en")).toContain("Georgia");
  });

  it("falls back to the first face for an unknown id", () => {
    expect(fontStack("does-not-exist", "en")).toBe(FONTS[0].stack);
  });
});

describe("styleTokens", () => {
  it("gives elegant its uppercase, tight-radius treatment", () => {
    expect(styleTokens("elegant")).toMatchObject({ radius: "2px", headingTransform: "uppercase" });
  });

  it("falls back to the modern treatment for null and unknown ids", () => {
    expect(styleTokens(null)).toEqual(styleTokens("anything-else"));
  });
});

describe("catalogs", () => {
  it("keeps the palettes and theme templates the app already ships", () => {
    expect(PALETTES.map((p) => p.id)).toEqual(["crimson", "ocean", "amber", "graphite"]);
    expect(THEME_TEMPLATES.map((t) => t.id)).toEqual(["elegant", "modern", "warm"]);
  });
});

describe("asset urls", () => {
  it("points storefront photography at the customer app's public folder", () => {
    expect(storefrontAsset("all.png")).toContain("/customer/public/images/storefront/all.png");
  });

  it("has a real thumbnail for elegant and null for the rest", () => {
    expect(themeThumb("elegant")).toContain("onboarding-Themes");
    expect(themeThumb("modern")).toBeNull();
  });
});
