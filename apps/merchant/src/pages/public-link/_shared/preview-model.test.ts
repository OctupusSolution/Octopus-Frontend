import { describe, expect, it } from "vitest";
import { EMPTY_SITE_DRAFT } from "./site-draft";
import { SITE_THEMES } from "./theme-catalog";
import { previewModelFromSite } from "./preview-model";

const t = (key: string) => key;

describe("previewModelFromSite", () => {
  it("shows only the sections that are switched on, in the draft's order", () => {
    const draft = {
      ...EMPTY_SITE_DRAFT,
      sections: [
        { id: "offers", enabled: true },
        { id: "hero", enabled: false },
        { id: "menu", enabled: true },
      ],
    };
    expect(previewModelFromSite(draft, "desktop", t, "en").sections).toEqual(["offers", "menu"]);
  });

  it("drops sections the widget cannot draw, even when enabled", () => {
    const draft = {
      ...EMPTY_SITE_DRAFT,
      sections: [
        { id: "hero", enabled: true },
        { id: "reservations", enabled: true },
        { id: "reservationsCta", enabled: true },
        { id: "menu", enabled: true },
        { id: "events", enabled: true },
        { id: "testimonials", enabled: true },
        { id: "instagram", enabled: true },
        { id: "offers", enabled: true },
        { id: "waitlist", enabled: true },
      ],
    };
    expect(previewModelFromSite(draft, "desktop", t, "en").sections).toEqual(["hero", "menu", "offers"]);
  });

  it("carries the theme's style id, not the theme id, so the token function understands it", () => {
    const theme = SITE_THEMES.find((entry) => entry.styleId === "warm")!;
    const draft = { ...EMPTY_SITE_DRAFT, theme: { ...EMPTY_SITE_DRAFT.theme, id: theme.id } };
    expect(previewModelFromSite(draft, "desktop", t, "en").themeTemplate).toBe("warm");
  });

  it("drops pages hidden on the navigation step from the nav", () => {
    const id = EMPTY_SITE_DRAFT.pages[1].id;
    const draft = { ...EMPTY_SITE_DRAFT, navigation: { ...EMPTY_SITE_DRAFT.navigation, hidden: [id] } };
    const nav = previewModelFromSite(draft, "desktop", t, "en").navItems;
    expect(nav.find((item) => item.labelKey.includes(id))?.visible ?? true).toBe(false);
  });

  it("drops pages the merchant took out of the nav on the pages step", () => {
    const pages = EMPTY_SITE_DRAFT.pages.map((page, i) => (i === 2 ? { ...page, inNav: false } : page));
    const nav = previewModelFromSite({ ...EMPTY_SITE_DRAFT, pages }, "desktop", t, "en").navItems;
    expect(nav).toHaveLength(EMPTY_SITE_DRAFT.pages.filter((p) => p.inNav).length - 1);
  });

  it("prefers the merchant's hero copy and falls back to the default headline", () => {
    const withCopy = {
      ...EMPTY_SITE_DRAFT,
      sectionSettings: {
        ...EMPTY_SITE_DRAFT.sectionSettings,
        hero: { ...EMPTY_SITE_DRAFT.sectionSettings.hero, heading: "Made with love" },
      },
    };
    expect(previewModelFromSite(withCopy, "desktop", t, "en").hero.headline).toBe("Made with love");
    expect(previewModelFromSite(EMPTY_SITE_DRAFT, "desktop", t, "en").hero.headline)
      .toBe(t("publicLink.hero.defaultHeadline"));
  });

  it("builds the hostname from the business name and falls back when it is empty", () => {
    expect(previewModelFromSite(EMPTY_SITE_DRAFT, "desktop", t, "en").url).toBe("restaurant.octopus.app");
    const named = { ...EMPTY_SITE_DRAFT, brand: { ...EMPTY_SITE_DRAFT.brand, businessName: "Ocean Table" } };
    expect(previewModelFromSite(named, "desktop", t, "en").url).toBe("ocean-table.octopus.app");
  });

  it("never hands the widget an empty categories or price array, even with no sections at all", () => {
    const draft = { ...EMPTY_SITE_DRAFT, sections: [] };
    const model = previewModelFromSite(draft, "desktop", t, "en");
    expect(model.categories.length).toBeGreaterThan(0);
    expect(model.samplePrices.length).toBeGreaterThan(0);
    expect(model.sampleWasPrices.length).toBeGreaterThan(0);
  });
});
