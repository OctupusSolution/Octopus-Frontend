import { describe, expect, it } from "vitest";
import { EMPTY_SITE_DRAFT, STEP_COUNT, siteDraftReducer, type SiteDraft } from "./site-draft";

function run(draft: SiteDraft, ...actions: Parameters<typeof siteDraftReducer>[1][]): SiteDraft {
  return actions.reduce(siteDraftReducer, draft);
}

describe("step movement", () => {
  it("walks forward and back", () => {
    expect(run(EMPTY_SITE_DRAFT, { type: "next" }).step).toBe(2);
    expect(run(EMPTY_SITE_DRAFT, { type: "next" }, { type: "back" }).step).toBe(1);
  });

  it("does not walk off either end", () => {
    expect(run(EMPTY_SITE_DRAFT, { type: "back" }).step).toBe(1);
    const last = run(EMPTY_SITE_DRAFT, { type: "goTo", step: STEP_COUNT }, { type: "next" });
    expect(last.step).toBe(STEP_COUNT);
  });
});

describe("brand patches", () => {
  it("merges colours without dropping the others", () => {
    const next = run(EMPTY_SITE_DRAFT, { type: "patchColors", patch: { primary: "#123456" } });
    expect(next.brand.colors.primary).toBe("#123456");
    expect(next.brand.colors.dark).toBe(EMPTY_SITE_DRAFT.brand.colors.dark);
  });

  it("keeps English and Arabic typography independent", () => {
    const next = run(EMPTY_SITE_DRAFT, { type: "patchTypography", locale: "ar", patch: { titles: "readex" } });
    expect(next.brand.typography.ar.titles).toBe("readex");
    expect(next.brand.typography.en.titles).toBe(EMPTY_SITE_DRAFT.brand.typography.en.titles);
  });
});

describe("pages", () => {
  it("flips one flag on one page and leaves its neighbours alone", () => {
    const id = EMPTY_SITE_DRAFT.pages[1].id;
    const next = run(EMPTY_SITE_DRAFT, { type: "togglePageFlag", id, flag: "onHome" });
    expect(next.pages[1].onHome).toBe(!EMPTY_SITE_DRAFT.pages[1].onHome);
    expect(next.pages[0]).toEqual(EMPTY_SITE_DRAFT.pages[0]);
  });

  it("reorders by replacing the list", () => {
    const reversed = [...EMPTY_SITE_DRAFT.pages].reverse();
    expect(run(EMPTY_SITE_DRAFT, { type: "setPages", pages: reversed }).pages[0].id)
      .toBe(reversed[0].id);
  });
});

describe("navigation visibility", () => {
  it("hides and unhides a page without touching the page list", () => {
    const id = EMPTY_SITE_DRAFT.pages[0].id;
    const hidden = run(EMPTY_SITE_DRAFT, { type: "toggleNavHidden", id });
    expect(hidden.navigation.hidden).toContain(id);
    expect(hidden.pages).toEqual(EMPTY_SITE_DRAFT.pages);
    expect(run(hidden, { type: "toggleNavHidden", id }).navigation.hidden).not.toContain(id);
  });
});

describe("sections", () => {
  it("toggles one section's enabled flag", () => {
    const id = EMPTY_SITE_DRAFT.sections[0].id;
    expect(run(EMPTY_SITE_DRAFT, { type: "toggleSection", id }).sections[0].enabled)
      .toBe(!EMPTY_SITE_DRAFT.sections[0].enabled);
  });

  it("patches one inspector's settings without disturbing the others", () => {
    const next = run(EMPTY_SITE_DRAFT, { type: "patchSection", section: "hero", patch: { heading: "Hello" } });
    expect(next.sectionSettings.hero.heading).toBe("Hello");
    expect(next.sectionSettings.offers).toEqual(EMPTY_SITE_DRAFT.sectionSettings.offers);
  });

  it("selects a section for the inspector", () => {
    expect(run(EMPTY_SITE_DRAFT, { type: "selectSection", id: "offers" }).selectedSection).toBe("offers");
  });
});

describe("publish", () => {
  it("records SEO copy", () => {
    const next = run(EMPTY_SITE_DRAFT, { type: "patchPublish", patch: { seo: { ...EMPTY_SITE_DRAFT.publish.seo, title: "Ocean Table" } } });
    expect(next.publish.seo.title).toBe("Ocean Table");
  });
});

describe("immutability", () => {
  it("never mutates the draft it was given", () => {
    const before = JSON.stringify(EMPTY_SITE_DRAFT);
    run(EMPTY_SITE_DRAFT, { type: "next" }, { type: "toggleSection", id: EMPTY_SITE_DRAFT.sections[0].id });
    expect(JSON.stringify(EMPTY_SITE_DRAFT)).toBe(before);
  });
});
