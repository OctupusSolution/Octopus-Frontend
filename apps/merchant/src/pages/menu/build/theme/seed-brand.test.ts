import { describe, expect, it } from "vitest";
import { EMPTY_SITE_DRAFT } from "@/entities/site-draft";
import { seedBrand } from "./seed-brand";

describe("seedBrand", () => {
  it("starts from the site's brand", () => {
    const site = { ...EMPTY_SITE_DRAFT, brand: { ...EMPTY_SITE_DRAFT.brand, logoDataUrl: "https://cdn/logo.png" } };
    site.sectionSettings = { ...site.sectionSettings, hero: { ...site.sectionSettings.hero, heading: "Welcome", imageDataUrl: "https://cdn/h.jpg" } };
    expect(seedBrand(site, null, "en")).toEqual({
      colors: site.brand.colors,
      logoUrl: "https://cdn/logo.png",
      heroUrl: "https://cdn/h.jpg",
      heroText: "Welcome",
      heroSubtext: site.sectionSettings.hero.subheading,
      textLanguage: "en",
      logoRef: null,
      heroRef: null,
    });
  });

  it("takes the preset's colours when one is chosen", () => {
    const preset = { id: "p", labelKey: "p", styleId: "modern", colors: { primary: "#111111", light: "#eeeeee", accent: "#ff0000", dark: "#000000" } };
    expect(seedBrand(EMPTY_SITE_DRAFT, preset as never, "en").colors).toEqual(preset.colors);
  });

  it("records the language its text is in", () => {
    expect(seedBrand(EMPTY_SITE_DRAFT, null, "ar").textLanguage).toBe("ar");
  });

  it("copies the colours rather than sharing the site's object", () => {
    const brand = seedBrand(EMPTY_SITE_DRAFT, null, "en");
    expect(brand.colors).not.toBe(EMPTY_SITE_DRAFT.brand.colors);
  });
});
