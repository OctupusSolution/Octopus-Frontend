import { describe, expect, it } from "vitest";
import { styleTokens } from "@/shared/lib/brand-tokens";
import { EMPTY_SITE_DRAFT } from "./site-draft";
import { SITE_THEMES, THEME_FILTERS } from "./theme-catalog";
import { PAGE_IDS, PAGE_MODULES } from "./page-catalog";
import { SECTION_IDS, SITE_SECTIONS, SECTION_FOR_PAGE } from "./section-catalog";

describe("theme catalog", () => {
  it("offers the six themes the frames show", () => {
    expect(SITE_THEMES).toHaveLength(6);
  });

  it("recommends exactly one theme", () => {
    expect(SITE_THEMES.filter((theme) => theme.recommended)).toHaveLength(1);
  });

  it("maps every theme onto a style the token function actually distinguishes", () => {
    const fallback = styleTokens(null);
    for (const theme of SITE_THEMES) {
      expect(["elegant", "modern", "warm"], theme.id).toContain(theme.styleId);
      if (theme.styleId !== "modern") {
        expect(styleTokens(theme.styleId), theme.id).not.toEqual(fallback);
      }
    }
  });

  it("gives every theme at least one filter, and every filter at least one theme", () => {
    for (const theme of SITE_THEMES) expect(theme.filters.length, theme.id).toBeGreaterThan(0);
    for (const filter of THEME_FILTERS) {
      if (filter.id === "all") continue;
      expect(SITE_THEMES.some((t) => t.filters.includes(filter.id)), filter.id).toBe(true);
    }
  });

  it("starts the draft on a theme that exists", () => {
    expect(SITE_THEMES.some((t) => t.id === EMPTY_SITE_DRAFT.theme.id)).toBe(true);
  });
});

describe("page catalog", () => {
  it("lists nine page modules", () => {
    expect(PAGE_MODULES).toHaveLength(9);
    expect(PAGE_IDS).toEqual(PAGE_MODULES.map((p) => p.id));
  });

  it("seeds the draft with exactly those pages, in the same order", () => {
    expect(EMPTY_SITE_DRAFT.pages.map((p) => p.id)).toEqual([...PAGE_IDS]);
  });

  it("has no duplicate ids", () => {
    expect(new Set(PAGE_IDS).size).toBe(PAGE_IDS.length);
  });
});

describe("section catalog", () => {
  it("seeds the draft only with sections the catalog knows", () => {
    for (const entry of EMPTY_SITE_DRAFT.sections) {
      expect(SECTION_IDS, entry.id).toContain(entry.id);
    }
  });

  it("opens on a section that exists", () => {
    expect(SECTION_IDS).toContain(EMPTY_SITE_DRAFT.selectedSection);
  });

  it("gives every generic section the fields its panel will render", () => {
    for (const section of SITE_SECTIONS) {
      if (section.inspector !== "generic") continue;
      expect(section.fields?.length, section.id).toBeGreaterThan(0);
    }
  });

  it("uses each module inspector exactly once", () => {
    for (const kind of ["hero", "reservations", "waitlist", "menu", "offers"] as const) {
      expect(SITE_SECTIONS.filter((s) => s.inspector === kind), kind).toHaveLength(1);
    }
  });
});

describe("SECTION_FOR_PAGE (Ruling C)", () => {
  it("maps only real page ids to real section ids", () => {
    for (const [pageId, sectionId] of Object.entries(SECTION_FOR_PAGE)) {
      expect(PAGE_IDS, pageId).toContain(pageId);
      expect(SECTION_IDS, sectionId).toContain(sectionId);
    }
  });
});
