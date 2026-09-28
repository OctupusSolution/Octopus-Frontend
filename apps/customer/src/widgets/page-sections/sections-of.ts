import type { PublicSitePage, PublicSiteSection } from "@octopus/api-client";

/** A page's sections as the storefront renders them: a module page bound to the menu as a whole
 *  (with no Menu section of its own) shows its menu as one Menu section. */
export function sectionsOf(page: PublicSitePage): PublicSiteSection[] {
  if (page.source?.sourceKey === "menu" && page.source.publicLinkKey && !page.sections.some((s) => s.type === "menu")) {
    return [
      ...page.sections,
      { sectionId: `page-${page.pageId}`, type: "menu", anchor: "menu", styleVariant: null, style: {}, fields: {}, source: page.source },
    ];
  }
  return page.sections;
}

/** The `publicLinkKey` of every menu the page shows, once each. */
export function menuKeysOf(page: PublicSitePage): string[] {
  const keys = new Set<string>();
  for (const s of sectionsOf(page)) if (s.source?.sourceKey === "menu" && s.source.publicLinkKey) keys.add(s.source.publicLinkKey);
  return [...keys];
}
