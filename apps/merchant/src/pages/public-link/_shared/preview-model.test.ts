import { describe, expect, it } from "vitest";
import { EMPTY_SITE_DRAFT } from "./site-draft";
import { SITE_THEMES } from "./theme-catalog";
import { previewModelFromSite } from "./preview-model";
import { encodeQr } from "../ui/qr-encode";

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

  it("pairs a section's heading to its own id, not to whatever page sits at the same index", () => {
    // The draft's enabled section order ("offers" first) deliberately does not
    // match the page order ("home" first), so an index-based pairing between
    // `sections` and `navItems` would put a page's label on the wrong block.
    const draft = {
      ...EMPTY_SITE_DRAFT,
      sections: [
        { id: "offers", enabled: true },
        { id: "hero", enabled: false },
        { id: "menu", enabled: true },
      ],
    };
    const model = previewModelFromSite(draft, "desktop", t, "en");
    expect(model.sections).toEqual(["offers", "menu"]);
    expect(model.sectionLabelKeys.offers).toBe("publicLink.section.offers");
    expect(model.sectionLabelKeys.menu).toBe("publicLink.section.menu");
    // Not any page module's label (e.g. "home", which sits first in navItems).
    expect(model.sectionLabelKeys.offers).not.toBe(model.navItems[0]?.labelKey);
  });

  it("never hands the widget an empty categories or price array, even with no sections at all", () => {
    const draft = { ...EMPTY_SITE_DRAFT, sections: [] };
    const model = previewModelFromSite(draft, "desktop", t, "en");
    expect(model.categories.length).toBeGreaterThan(0);
    expect(model.samplePrices.length).toBeGreaterThan(0);
    expect(model.sampleWasPrices.length).toBeGreaterThan(0);
  });

  // Final review finding F4: every category used to fall through to the same
  // "all.png" photo because the widget guessed the filename from a key
  // string it did not own. `categoryImages` is now supplied explicitly,
  // parallel to `categories`.
  it("supplies one image per category, and they are not all the same photo", () => {
    const model = previewModelFromSite(EMPTY_SITE_DRAFT, "desktop", t, "en");
    expect(model.categoryImages).toHaveLength(model.categories.length);
    expect(new Set(model.categoryImages).size).toBeGreaterThan(1);
  });

  // Final review finding F1: a long business name used to blank the whole
  // app because nothing capped the slug built from it, and `encodeQr` throws
  // above 78 bytes. The Preview step's QR encodes
  // `https://{slug}.octopus.app?preview=test`, whose fixed characters are
  // exactly 33 bytes, so the slug alone must stay at or under 45.
  it("caps the hostname slug so the preview step's QR code never exceeds its byte budget", () => {
    const longName = "a".repeat(200);
    const draft = { ...EMPTY_SITE_DRAFT, brand: { ...EMPTY_SITE_DRAFT.brand, businessName: longName } };
    const model = previewModelFromSite(draft, "desktop", t, "en");
    const slug = model.url.replace(/\.octopus\.app$/, "");
    expect(slug.length).toBeLessThanOrEqual(45);

    const previewUrl = `https://${model.url}?preview=test`;
    expect(new TextEncoder().encode(previewUrl).length).toBeLessThanOrEqual(78);
    expect(() => encodeQr(previewUrl)).not.toThrow();
  });

  // Final review finding F2: a stored draft can carry a page id this build's
  // catalog no longer knows (an old draft, or a hand-edited one). The lookup
  // used to crash the whole app on mount instead of skipping it, the same
  // way every comparable lookup elsewhere in this feature already does.
  it("skips a page id the catalog does not recognise instead of crashing", () => {
    const pages = [...EMPTY_SITE_DRAFT.pages, { id: "not-a-real-page", inNav: true, onHome: false }];
    const draft = { ...EMPTY_SITE_DRAFT, pages };
    expect(() => previewModelFromSite(draft, "desktop", t, "en")).not.toThrow();
    const model = previewModelFromSite(draft, "desktop", t, "en");
    expect(model.navItems.some((item) => item.labelKey === undefined)).toBe(false);
    expect(model.navItems).toHaveLength(EMPTY_SITE_DRAFT.pages.filter((p) => p.inNav).length);
  });

  it("hides the header nav entirely when Show in Header is off", () => {
    const draft = { ...EMPTY_SITE_DRAFT, navigation: { ...EMPTY_SITE_DRAFT.navigation, showInHeader: false } };
    expect(previewModelFromSite(draft, "desktop", t, "en").showHeaderNav).toBe(false);
    expect(previewModelFromSite(EMPTY_SITE_DRAFT, "desktop", t, "en").showHeaderNav).toBe(true);
  });
});
