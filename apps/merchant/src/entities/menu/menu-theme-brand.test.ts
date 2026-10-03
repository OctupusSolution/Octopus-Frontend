import { describe, expect, it, vi, beforeEach } from "vitest";
import type { MediaReferenceDto } from "@octopus/api-client";
import type { MenuTheme } from "./menu";

const mediaUrl = vi.fn();
const knownMedia = vi.fn();
const uploadMedia = vi.fn();
const getMenuTheme = vi.fn();
const updateMenuTheme = vi.fn();

vi.mock("@/shared/api/media", () => ({
  isLocalMedia: (src: string | null | undefined): src is string => Boolean(src && (src.startsWith("data:") || src.startsWith("blob:"))),
  knownMedia: (...args: unknown[]) => knownMedia(...args),
  mediaUrl: (...args: unknown[]) => mediaUrl(...args),
  uploadMedia: (...args: unknown[]) => uploadMedia(...args),
}));

vi.mock("@octopus/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@octopus/api-client")>();
  return { ...actual, getMenuTheme: (...args: unknown[]) => getMenuTheme(...args), updateMenuTheme: (...args: unknown[]) => updateMenuTheme(...args) };
});

const { brandColorsToServer, themeTextToServer, themeImageRef, foldBrandMedia, brandFromServer, pushTheme } = await import("./menu-sync");

const current = { primaryColor: "#000000", lightColor: null, accentColor: null, darkColor: null };
const brand = {
  colors: { primary: "#aabbcc", light: "#ffffff", accent: "bad", dark: "#111" },
  logoUrl: null,
  heroUrl: null,
  logoRef: null,
  heroRef: null,
  heroText: "",
  heroSubtext: "",
  textLanguage: "en",
};

beforeEach(() => {
  mediaUrl.mockReset();
  knownMedia.mockReset();
  uploadMedia.mockReset();
  getMenuTheme.mockReset();
  updateMenuTheme.mockReset();
});

describe("menu brand to the server", () => {
  it("sends valid colours, keeps the server's for a malformed one, and keeps all when the brand is not loaded", () => {
    expect(brandColorsToServer(brand, current)).toEqual({ primaryColor: "#aabbcc", lightColor: "#ffffff", accentColor: null, darkColor: "#111" });
    expect(brandColorsToServer(undefined, current)).toEqual(current);
    expect(brandColorsToServer(null, current)).toEqual(current);
  });

  it("writes hero text into the builder's language and clears it when blank", () => {
    expect(themeTextToServer("Hello", "en", { ar: "أهلاً" })).toEqual({ ar: "أهلاً", en: "Hello" });
    expect(themeTextToServer("  ", "en", { en: "old", ar: "x" })).toEqual({ ar: "x" });
  });
});

describe("brandFromServer's textLanguage", () => {
  it("reads the display language's text and records it as textLanguage when the server has it", async () => {
    mediaUrl.mockResolvedValue(null);
    const t = { primaryColor: "#111111", lightColor: null, accentColor: null, darkColor: null, logo: null, hero: null, heroText: { en: "Hi", ar: "أهلاً" }, heroSubtext: {} };
    const result = await brandFromServer("biz-1", t as never, "en");
    expect(result?.textLanguage).toBe("en");
    expect(result?.heroText).toBe("Hi");
  });

  it("falls back to whichever language actually has text, not the caller's lang, when the display language has none", async () => {
    mediaUrl.mockResolvedValue(null);
    const t = { primaryColor: "#111111", lightColor: null, accentColor: null, darkColor: null, logo: null, hero: null, heroText: { ar: "أهلاً" }, heroSubtext: {} };
    const result = await brandFromServer("biz-1", t as never, "en");
    // The server has no "en" hero text; textLanguage must follow the text that exists (ar),
    // never silently default to the caller's "en" — a later save must write back into "ar".
    expect(result?.textLanguage).toBe("ar");
    expect(result?.heroText).toBe("أهلاً");
  });

  it("pushTheme writes hero text into brand.textLanguage, not the lang argument threaded from the builder's current locale", async () => {
    getMenuTheme.mockResolvedValue({
      presetCode: null, logo: null, hero: null, heroText: { en: "old English copy" }, heroSubtext: {},
      titleFontCode: null, bodyFontCode: null, primaryColor: null, lightColor: null, accentColor: null, darkColor: null,
      navigationStyle: "TopBar", sectionNavStyle: "IconAndText", cardStyle: "Classic", itemDetailsBehavior: "SamePage",
      stickyPrimaryAction: false, showItemTags: false, isConfigured: true,
    });
    updateMenuTheme.mockResolvedValue({});
    const theme = {
      presetId: "p", navStyle: "top-bar", categoryStyle: "icon-text", cardStyle: "classic", itemDetails: "same-page",
      stickyAddToCart: false, showItemTags: false,
      brand: { ...brand, heroText: "مرحبا", textLanguage: "ar" },
    } as never;
    // The builder's current display locale is "en", but the brand's own recorded language is "ar" —
    // the write must land in "ar", never "en".
    await pushTheme("biz-1", "menu-1", theme, "en");
    expect(updateMenuTheme).toHaveBeenCalledWith(
      "biz-1",
      "menu-1",
      expect.objectContaining({ heroText: { en: "old English copy", ar: "مرحبا" } })
    );
  });
});

describe("themeImageRef", () => {
  const REF: MediaReferenceDto = { assetId: "known-asset", kind: "Image" };

  it("keeps the ref when the URL is unresolved, instead of reading that as a removal", async () => {
    const result = await themeImageRef("biz-1", null, REF, "ThemeLogo", null);
    expect(result).toEqual({ ref: REF, url: null });
    expect(uploadMedia).not.toHaveBeenCalled();
  });

  it("sends null only when both the URL and the ref are null — a genuine removal", async () => {
    const result = await themeImageRef("biz-1", null, null, "ThemeHeroImage", REF);
    expect(result).toEqual({ ref: null, url: null });
  });

  it("uploads a freshly picked image and returns its delivery URL alongside the new ref", async () => {
    const uploaded = { ref: { assetId: "fresh", kind: "Image" }, url: "https://cdn.example/fresh.png" };
    uploadMedia.mockResolvedValue(uploaded);
    const result = await themeImageRef("biz-1", "data:image/png;base64,AAAA", null, "ThemeLogo", null);
    expect(result).toEqual({ ref: uploaded.ref, url: uploaded.url });
    expect(uploadMedia).toHaveBeenCalledWith("biz-1", "data:image/png;base64,AAAA", "ThemeLogo", "logo.png", "menu");
  });

  it("resolves an already-known delivery URL to its reference without uploading again", async () => {
    knownMedia.mockReturnValue(REF);
    const result = await themeImageRef("biz-1", "https://cdn.example/known.png", null, "ThemeLogo", null);
    expect(result).toEqual({ ref: REF, url: "https://cdn.example/known.png" });
    expect(knownMedia).toHaveBeenCalledWith("https://cdn.example/known.png", "menu");
    expect(uploadMedia).not.toHaveBeenCalled();
  });

  // A brand seeded from the Public Link site carries the site library's delivery URLs.
  const SITE_REF: MediaReferenceDto = { assetId: "site-asset", kind: "Image" };
  const SITE_URL = "https://cdn.example/site/logo.png";
  const siteOnly = (_src: unknown, library?: unknown) => (library === "menu" ? null : SITE_REF);

  it("never sends a Public Link (site) asset as a menu theme ref; re-uploads it to the menu library instead", async () => {
    knownMedia.mockImplementation(siteOnly);
    const uploaded = { ref: { assetId: "menu-copy", kind: "Image" }, url: "https://cdn.example/menu/copy.png" };
    uploadMedia.mockResolvedValue(uploaded);
    const result = await themeImageRef("biz-1", SITE_URL, null, "ThemeLogo", null);
    expect(result.ref).not.toEqual(SITE_REF);
    expect(result).toEqual({ ref: uploaded.ref, url: uploaded.url });
    expect(uploadMedia).toHaveBeenCalledWith("biz-1", SITE_URL, "ThemeLogo", "logo.png", "menu");
  });

  it("uploads an unknown remote URL as the hero image", async () => {
    knownMedia.mockReturnValue(null);
    const uploaded = { ref: { assetId: "menu-hero", kind: "Image" }, url: "https://cdn.example/menu/hero.png" };
    uploadMedia.mockResolvedValue(uploaded);
    const result = await themeImageRef("biz-1", "https://elsewhere.example/hero.jpg", null, "ThemeHeroImage", { assetId: "old", kind: "Image" });
    expect(result).toEqual({ ref: uploaded.ref, url: uploaded.url });
    expect(uploadMedia).toHaveBeenCalledWith("biz-1", "https://elsewhere.example/hero.jpg", "ThemeHeroImage", "hero.png", "menu");
  });

  it("keeps the brand's own ref for an unchanged URL without uploading", async () => {
    knownMedia.mockReturnValue(null);
    const result = await themeImageRef("biz-1", "https://cdn.example/menu/logo.png", REF, "ThemeLogo", null);
    expect(result).toEqual({ ref: REF, url: "https://cdn.example/menu/logo.png" });
    expect(uploadMedia).not.toHaveBeenCalled();
  });

  it("sends null for an image whose fetch or upload fails", async () => {
    knownMedia.mockImplementation(siteOnly);
    uploadMedia.mockRejectedValue(new Error("Image upload failed (500)"));
    const result = await themeImageRef("biz-1", SITE_URL, null, "ThemeLogo", SITE_REF);
    expect(result.ref).toBeNull();
  });

  it("pushTheme still saves the theme when a seeded image's upload fails", async () => {
    knownMedia.mockImplementation(siteOnly);
    uploadMedia.mockImplementation(async (_b: string, src: string) => {
      if (src === SITE_URL) throw new Error("could not fetch");
      return { ref: { assetId: "menu-hero", kind: "Image" }, url: "https://cdn.example/menu/hero.png" };
    });
    getMenuTheme.mockResolvedValue({
      presetCode: null, logo: null, hero: null, heroText: {}, heroSubtext: {},
      titleFontCode: null, bodyFontCode: null, primaryColor: null, lightColor: null, accentColor: null, darkColor: null,
      navigationStyle: "TopBar", sectionNavStyle: "IconAndText", cardStyle: "Classic", itemDetailsBehavior: "SamePage",
      stickyPrimaryAction: false, showItemTags: false, isConfigured: false,
    });
    updateMenuTheme.mockResolvedValue({});
    const theme = {
      presetId: "p", navStyle: "top-bar", categoryStyle: "icon-text", cardStyle: "classic", itemDetails: "same-page",
      stickyAddToCart: false, showItemTags: false,
      brand: { ...brand, logoUrl: SITE_URL, heroUrl: "https://cdn.example/site/hero.png" },
    } as never;
    await expect(pushTheme("biz-1", "menu-1", theme, "en")).resolves.not.toBeNull();
    expect(updateMenuTheme).toHaveBeenCalledWith(
      "biz-1",
      "menu-1",
      expect.objectContaining({ logo: null, hero: { assetId: "menu-hero", kind: "Image" } })
    );
  });
});

describe("foldBrandMedia", () => {
  const theme = {
    presetId: "p",
    navStyle: "top-bar",
    categoryStyle: "icon-text",
    cardStyle: "classic",
    itemDetails: "same-page",
    stickyAddToCart: false,
    showItemTags: false,
    brand: { ...brand, logoUrl: "data:image/png;base64,AAAA", heroUrl: null },
  } as unknown as MenuTheme;

  it("replaces an image field's URL/ref once uploaded, when the merchant left it untouched during the save", () => {
    const saved = { logoUrl: "https://cdn.example/fresh.png", heroUrl: null, logoRef: { assetId: "fresh", kind: "Image" }, heroRef: null };
    const folded = foldBrandMedia(theme, theme.brand, saved);
    expect(folded.brand?.logoUrl).toBe("https://cdn.example/fresh.png");
    expect(folded.brand?.logoRef).toEqual({ assetId: "fresh", kind: "Image" });
  });

  it("never overwrites an image the merchant changed while the save was in flight", () => {
    const editedDuringSave = { ...theme, brand: { ...theme.brand!, logoUrl: "data:image/png;base64,DIFFERENT" } };
    const saved = { logoUrl: "https://cdn.example/fresh.png", heroUrl: null, logoRef: { assetId: "fresh", kind: "Image" }, heroRef: null };
    // `sent` is what was actually pushed (the original pick), not the edited draft.
    const folded = foldBrandMedia(editedDuringSave, theme.brand, saved);
    expect(folded.brand?.logoUrl).toBe("data:image/png;base64,DIFFERENT");
  });
});
