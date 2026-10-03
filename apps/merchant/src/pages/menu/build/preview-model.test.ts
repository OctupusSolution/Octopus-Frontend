import { describe, expect, it } from "vitest";
import {
  OFFERS_SECTION_ID,
  blankItem,
  blankMenu,
  blankOffer,
  blankSection,
  addItem,
  addSection,
  updateItem,
  type Menu,
} from "@/entities/menu";
import { EMPTY_SITE_DRAFT, type SiteDraft } from "@/entities/site-draft";
import { toPreviewModel } from "./preview-model";

const NOW = "2026-09-10T08:00:00.000Z";

function menuWithSections() {
  let menu = blankMenu("m1", "jeddah-corniche", NOW);
  menu = addSection(menu, blankSection("s1", "items", "Breakfast", null));
  menu = addSection(menu, blankSection("s2", "items", "Desserts", null));
  menu = addItem(menu, "s1", blankItem("i1", "Classic Breakfast"));
  menu = updateItem(menu, "s1", "i1", { pricing: { price: 90, vatRate: 0.15 } });
  return menu;
}

function patchSection(menu: Menu, id: string, patch: Partial<Menu["sections"][number]>): Menu {
  return { ...menu, sections: menu.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)) };
}

describe("toPreviewModel", () => {
  it("passes section names through as literal labels, not i18n keys", () => {
    const model = toPreviewModel(menuWithSections(), "desktop");
    expect(model.categoryLabels).toEqual(["Breakfast", "Desserts"]);
  });

  it("leaves the built-in offers section out of the category strip", () => {
    const model = toPreviewModel(menuWithSections(), "desktop");
    expect(model.categoryLabels).not.toContain("Offers");
  });

  it("omits hidden sections", () => {
    const menu = patchSection(menuWithSections(), "s2", { visibility: "hidden" });
    expect(toPreviewModel(menu, "desktop").categoryLabels).toEqual(["Breakfast"]);
  });

  it("formats item prices from the draft rather than sampling", () => {
    const model = toPreviewModel(menuWithSections(), "desktop");
    expect(model.samplePrices[0]).toContain("90");
  });

  it("carries the device through", () => {
    expect(toPreviewModel(menuWithSections(), "mobile").device).toBe("mobile");
  });

  it("draws no repeated label for an empty menu, but keeps the key fallbacks non-empty", () => {
    const model = toPreviewModel(blankMenu("m2", "b1", NOW), "desktop");
    expect(model.categoryLabels).toEqual([]);
    expect(model.categories.length).toBeGreaterThan(0);
    expect(model.categoryImages.length).toBeGreaterThan(0);
  });

  it("uses the site draft's logo, colours, fonts and hero", () => {
    const site: SiteDraft = {
      ...EMPTY_SITE_DRAFT,
      brand: {
        ...EMPTY_SITE_DRAFT.brand,
        logoDataUrl: "data:image/png;base64,AAA",
        colors: { primary: "#112233", light: "#ffffff", accent: "#445566", dark: "#000000" },
        typography: {
          en: { titles: "georgia", body: "tahoma" },
          ar: { titles: "readex", body: "readex" },
        },
      },
      sectionSettings: {
        ...EMPTY_SITE_DRAFT.sectionSettings,
        hero: { ...EMPTY_SITE_DRAFT.sectionSettings.hero, heading: "Welcome", imageDataUrl: "data:image/png;base64,BBB" },
      },
    };
    const model = toPreviewModel(menuWithSections(), "desktop", "menu", "Ocean", { site, locale: "en" });
    expect(model.logoDataUrl).toBe("data:image/png;base64,AAA");
    expect(model.primary).toBe("#112233");
    expect(model.font).toBe("georgia");
    expect(model.bodyFont).toBe("tahoma");
    expect(model.hero.headline).toBe("Welcome");
    expect(model.hero.imageUrl).toBe("data:image/png;base64,BBB");
    expect(toPreviewModel(menuWithSections(), "desktop", "menu", "", { site, locale: "ar" }).font).toBe("readex");
  });

  it("falls back to the preset's palette without a site draft", () => {
    const menu = { ...menuWithSections(), theme: { ...menuWithSections().theme, presetId: "natural" } };
    expect(toPreviewModel(menu, "desktop").primary).toBe("#3F7D3A");
  });

  it("uses a section's uploaded image verbatim, so data URLs survive", () => {
    const menu = patchSection(menuWithSections(), "s1", { image: "data:image/png;base64,CCC" });
    expect(toPreviewModel(menu, "desktop").categoryImageUrls).toEqual(["data:image/png;base64,CCC", null]);
  });

  it("carries section colour and display style into the menu groups", () => {
    const menu = patchSection(menuWithSections(), "s2", { color: "#aa0000", displayStyle: "carousel" });
    const groups = toPreviewModel(menu, "desktop", "menu").menuGroups!;
    expect(groups.map((g) => g.label)).toEqual(["Breakfast", "Desserts"]);
    expect(groups[0].products).toEqual([0]);
    expect(groups[1]).toMatchObject({ color: "#aa0000", layout: "carousel", products: [] });
  });

  it("carries every theme option through", () => {
    const base = menuWithSections();
    const menu: Menu = {
      ...base,
      theme: {
        ...base.theme,
        navStyle: "bottom-bar",
        categoryStyle: "image-text",
        cardStyle: "image-left",
        stickyAddToCart: false,
        showItemTags: false,
      },
    };
    const model = toPreviewModel(menu, "desktop", "menu");
    expect(model).toMatchObject({
      navStyle: "bottom-bar",
      categoryStyle: "image-text",
      cardStyle: "image-left",
      stickyAddToCart: false,
      showItemTags: false,
      showHeaderNav: false,
    });
  });

  it("labels item tags through the host's translator", () => {
    const menu = updateItem(menuWithSections(), "s1", "i1", { tags: ["top-selling"] });
    const model = toPreviewModel(menu, "desktop", "menu", "", { tagLabel: (tag) => `tag:${tag}` });
    expect(model.productTags).toEqual([["tag:top-selling"]]);
  });

  it("lists real offer names and prices", () => {
    const base = menuWithSections();
    const offer = { ...blankOffer("o1", "Family Combo"), pricing: { ...blankOffer("o1", "x").pricing, offerPrice: 120 } };
    const menu = patchSection(base, OFFERS_SECTION_ID, { entries: [offer] });
    const model = toPreviewModel(menu, "desktop");
    expect(model.offers).toEqual([{ name: "Family Combo", price: "SAR 120", image: null }]);
    expect(model.sections).toContain("offers");
  });
});
