import { describe, expect, it } from "vitest";
import type { PublicMenuTheme } from "@octopus/api-client";
import { displayStyleOf, formatMoney, mediaUrl, menuFontStack, menuLayout, menuThemeStyle, safeColor } from "./menu-theme";

const theme: PublicMenuTheme = {
  presetCode: null, logo: null, hero: null, heroText: null, heroSubtext: null, titleFontCode: "cairo", bodyFontCode: "unknown-face",
  primaryColor: "#ff0000", lightColor: "#FFF", accentColor: "red", darkColor: null,
  navigationStyle: "SideDrawer", sectionNavStyle: "ImageAndText", cardStyle: "ImageLeft", itemDetailsBehavior: "Overlay",
  stickyPrimaryAction: true, showItemTags: true,
};

describe("menu theme", () => {
  it("maps the backend's enum strings, and unknown ones to the backend defaults", () => {
    expect(menuLayout(theme)).toEqual({ nav: "side-drawer", category: "image-text", card: "image-left", details: "overlay", stickyCart: true, showTags: true });
    expect(menuLayout({ ...theme, navigationStyle: "Floating", sectionNavStyle: "", cardStyle: "x", itemDetailsBehavior: "y" })).toMatchObject({
      nav: "top-bar", category: "icon-text", card: "classic", details: "same-page",
    });
    expect(displayStyleOf("Carousel")).toBe("carousel");
    expect(displayStyleOf("Masonry")).toBe("list");
  });

  it("turns valid colours into storefront variables and ignores malformed ones", () => {
    expect(safeColor("#FFF")).toBe("#FFF");
    expect(safeColor("red")).toBeNull();
    expect(safeColor(null)).toBeNull();
    expect(menuThemeStyle(theme)).toEqual({ "--octo-brand": "#ff0000", "--octo-store-price": "#ff0000", "--octo-store-page": "#FFF" });
  });

  it("uses a loaded face for a known font code and nothing for an unknown one", () => {
    expect(menuFontStack("cairo")).toContain("var(--font-cairo-loaded)");
    expect(menuFontStack("unknown-face")).toBeNull();
    expect(menuFontStack(null)).toBeNull();
  });

  it("formats money at the currency's precision and labels it", () => {
    const label = (code: string) => (code === "SAR" ? "ر.س" : code);
    expect(formatMoney({ amount: 12.5, currency: "SAR" }, { code: "SAR", minorUnits: 2 }, label)).toBe("12.50 ر.س");
    expect(formatMoney({ amount: 3, currency: "KWD" }, { code: "KWD", minorUnits: 3 }, label)).toBe("3.000 KWD");
    expect(formatMoney({ amount: 7, currency: "SAR" }, null, label)).toBe("7");
    expect(formatMoney(null, null, label)).toBe("");
  });

  it("prefers a resolved media URL and falls back otherwise", () => {
    expect(mediaUrl({ assetId: "a", kind: "Image", url: "https://cdn/a.jpg" }, "/x.png")).toBe("https://cdn/a.jpg");
    expect(mediaUrl({ assetId: "a", kind: "Image", url: null }, "/x.png")).toBe("/x.png");
    expect(mediaUrl(null, null)).toBeNull();
  });
});
