import { describe, expect, it } from "vitest";
import { EMPTY_SITE_DRAFT, type SiteDraft } from "./site-draft";
import { GO_LIVE_ITEMS, goLiveReady } from "./checklist";

function complete(): SiteDraft {
  return {
    ...EMPTY_SITE_DRAFT,
    brand: { ...EMPTY_SITE_DRAFT.brand, businessName: "Ocean Table", logoDataUrl: "data:image/png;base64,x" },
    preview: { ...EMPTY_SITE_DRAFT.preview, simulation: "done", completed: 7 },
    sectionSettings: {
      ...EMPTY_SITE_DRAFT.sectionSettings,
      menu: { ...EMPTY_SITE_DRAFT.sectionSettings.menu, connectedMenuId: "menu-1" },
      reservations: { ...EMPTY_SITE_DRAFT.sectionSettings.reservations, enabled: true },
      waitlist: { ...EMPTY_SITE_DRAFT.sectionSettings.waitlist, enabled: true },
    },
    publish: {
      ...EMPTY_SITE_DRAFT.publish,
      seo: { title: "Ocean Table", description: "Seafood in Jeddah", socialImageDataUrl: "data:image/png;base64,x" },
    },
  };
}

describe("go-live checklist", () => {
  it("lists the nine items the frame shows", () => {
    expect(GO_LIVE_ITEMS).toHaveLength(9);
  });

  it("is not ready on a fresh draft", () => {
    expect(goLiveReady(EMPTY_SITE_DRAFT)).toBe(false);
  });

  it("is ready once the draft actually carries what each item checks", () => {
    expect(goLiveReady(complete())).toBe(true);
  });

  it("fails the SEO item when the title is blank, rather than always showing green", () => {
    const draft = complete();
    const seo = GO_LIVE_ITEMS.find((item) => item.id === "seo")!;
    expect(seo.done(draft)).toBe(true);
    expect(seo.done({ ...draft, publish: { ...draft.publish, seo: { ...draft.publish.seo, title: "   " } } })).toBe(false);
  });

  it("fails the navigation item when every page is hidden", () => {
    const draft = complete();
    const nav = GO_LIVE_ITEMS.find((item) => item.id === "navigation")!;
    expect(nav.done({ ...draft, pages: draft.pages.map((p) => ({ ...p, inNav: false })) })).toBe(false);
  });

  it("fails the menu item when no menu is connected, rather than always showing green", () => {
    const draft = complete();
    const menu = GO_LIVE_ITEMS.find((item) => item.id === "menu")!;
    expect(menu.done(draft)).toBe(true);
    expect(
      menu.done({
        ...draft,
        sectionSettings: { ...draft.sectionSettings, menu: { ...draft.sectionSettings.menu, connectedMenuId: "" } },
      })
    ).toBe(false);
  });

  it("fails the reservations item when the module is disabled, rather than always showing green", () => {
    const draft = complete();
    const reservations = GO_LIVE_ITEMS.find((item) => item.id === "reservations")!;
    expect(reservations.done(draft)).toBe(true);
    expect(
      reservations.done({
        ...draft,
        sectionSettings: {
          ...draft.sectionSettings,
          reservations: { ...draft.sectionSettings.reservations, enabled: false },
        },
      })
    ).toBe(false);
  });

  it("fails the waitlist item when the module is disabled, rather than always showing green", () => {
    const draft = complete();
    const waitlist = GO_LIVE_ITEMS.find((item) => item.id === "waitlist")!;
    expect(waitlist.done(draft)).toBe(true);
    expect(
      waitlist.done({
        ...draft,
        sectionSettings: { ...draft.sectionSettings, waitlist: { ...draft.sectionSettings.waitlist, enabled: false } },
      })
    ).toBe(false);
  });
});
