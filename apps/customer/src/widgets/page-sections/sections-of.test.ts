import { describe, expect, it } from "vitest";
import type { PublicSitePage } from "@octopus/api-client";
import { menuKeysOf, sectionsOf } from "./sections-of";

const base = { pageId: "p1", path: "/menu", isHome: false, kind: "SourceBound", title: "Menu", seo: {}, layout: { header: null, hideFooter: false }, lastModifiedUtc: "" };
const menuSource = { sourceKey: "menu", version: 1, publicLinkKey: "k1", settings: null };

describe("sectionsOf / menuKeysOf", () => {
  it("renders a menu-bound page with no Menu section of its own as one Menu section", () => {
    const page = { ...base, source: menuSource, sections: [] } as unknown as PublicSitePage;
    expect(sectionsOf(page).map((s) => [s.type, s.source?.publicLinkKey])).toEqual([["menu", "k1"]]);
    expect(menuKeysOf(page)).toEqual(["k1"]);
  });

  it("leaves a page that already has its Menu section unchanged, and lists each menu once", () => {
    const menu = { sectionId: "s", type: "menu", anchor: null, styleVariant: null, style: {}, fields: {}, source: menuSource };
    const page = { ...base, source: menuSource, sections: [menu, { ...menu, sectionId: "t" }] } as unknown as PublicSitePage;
    expect(sectionsOf(page)).toBe(page.sections);
    expect(menuKeysOf(page)).toEqual(["k1"]);
  });
});
