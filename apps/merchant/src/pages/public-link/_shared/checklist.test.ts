import { describe, expect, it } from "vitest";
import { EMPTY_SITE_DRAFT, type SiteDraft } from "./site-draft";
import { GO_LIVE_ITEMS, goLiveReady } from "./checklist";

function complete(): SiteDraft {
  return {
    ...EMPTY_SITE_DRAFT,
    brand: { ...EMPTY_SITE_DRAFT.brand, businessName: "Ocean Table", logoDataUrl: "data:image/png;base64,x" },
    preview: { ...EMPTY_SITE_DRAFT.preview, simulation: "done", completed: 7 },
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
});
