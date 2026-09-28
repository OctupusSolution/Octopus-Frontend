import { describe, expect, it } from "vitest";
import type { PublicSiteShell } from "@octopus/api-client";
import { navLinks } from "./nav-links";

const shell = {
  pages: [
    { path: "/", title: "الرئيسية", isHome: true, noIndex: false, lastModifiedUtc: "" },
    { path: "/about", title: "من نحن", isHome: false, noIndex: false, lastModifiedUtc: "" },
  ],
  navigation: {
    options: { stickyHeader: false, showActivePageIndicator: false, showIcons: false, openLinksInSameTab: true },
    items: [
      { label: "", iconKey: null, href: "/", kind: "Page", openInNewTab: false, showInHeader: true, showInDrawer: true, children: [] },
      {
        label: "روابط",
        iconKey: null,
        href: null,
        kind: "Group",
        openInNewTab: false,
        showInHeader: true,
        showInDrawer: true,
        children: [
          { label: "", iconKey: null, href: "/about", kind: "Page", openInNewTab: false, showInHeader: true, showInDrawer: false, children: [] },
          { label: "خارجي", iconKey: null, href: "https://x.test", kind: "External", openInNewTab: true, showInHeader: true, showInDrawer: true, children: [] },
        ],
      },
    ],
  },
} as unknown as PublicSiteShell;

describe("navLinks", () => {
  it("flattens children after their parent, labels pages by title and home by the home label", () => {
    expect(navLinks(shell, "Home")).toEqual([
      { label: "الرئيسية", href: "/", openInNewTab: false, inHeader: true, inDrawer: true },
      { label: "من نحن", href: "/about", openInNewTab: false, inHeader: true, inDrawer: false },
      // openLinksInSameTab wins over the item's own new-tab flag.
      { label: "خارجي", href: "https://x.test", openInNewTab: false, inHeader: true, inDrawer: true },
    ]);
  });
});
