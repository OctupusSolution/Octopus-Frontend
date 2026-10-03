import type { PublicSiteNavItem, PublicSiteShell } from "@octopus/api-client";
import type { SiteNavLink } from "./site-header";

/** The published navigation, flattened for the header (children follow their parent). */
export function navLinks(shell: PublicSiteShell, homeLabel: string): SiteNavLink[] {
  const titleOf = (href: string) => shell.pages.find((p) => p.path === href)?.title;
  const out: SiteNavLink[] = [];
  const walk = (items: PublicSiteNavItem[]) => {
    for (const item of items) {
      if (item.href) {
        const label = item.label || titleOf(item.href) || (item.href === "/" ? homeLabel : "");
        if (label) {
          out.push({
            label,
            href: item.href,
            openInNewTab: item.openInNewTab && !shell.navigation.options.openLinksInSameTab,
            inHeader: item.showInHeader,
            inDrawer: item.showInDrawer,
          });
        }
      }
      walk(item.children);
    }
  };
  walk(shell.navigation.items);
  return out;
}
