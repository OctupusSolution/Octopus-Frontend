import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nScope } from "@/app/providers/i18n-provider";
import type { LiveSite } from "../_shared/live-site";
import { LiveSiteCanvas, type LiveDevice } from "./live-site-canvas";

const site: LiveSite = {
  language: "ar",
  direction: "rtl",
  languages: ["ar", "en"],
  brandName: "أوشن",
  logoUrl: null,
  cssVars: { "--octo-brand": "#FF0000" },
  fontName: "Cairo",
  headingFontName: "Poppins",
  navigation: {
    options: { stickyHeader: true, showActivePageIndicator: true, showIcons: false, openLinksInSameTab: false },
    links: [
      { label: "", href: "/", openInNewTab: false, inHeader: true, inDrawer: true },
      { label: "من نحن", href: "/about", openInNewTab: false, inHeader: true, inDrawer: true },
    ],
  },
  footer: {
    groups: [{ title: "روابط", links: [{ label: "اتصل", href: "tel:+966", openInNewTab: false }] }],
    socialLinks: [{ network: "instagram", url: "https://instagram.com/x" }],
    contact: { address: "الرياض", hours: null, phone: "+966" },
  },
  pages: [{ pageId: "home", path: "/", title: "الرئيسية", isHome: true }],
  page: {
    pageId: "home",
    path: "/",
    isHome: true,
    title: "الرئيسية",
    hideFooter: false,
    sections: [
      { sectionId: "h", type: "hero", anchor: null, hiddenOn: [], source: null, fields: { title: "أهلاً", primaryAction: { href: "/about", label: "اعرف أكثر" } } },
      { sectionId: "m", type: "menu", anchor: "menu", hiddenOn: [], source: { sourceKey: "menu", contentKey: "m1" }, fields: {} },
      { sectionId: "a", type: "about", anchor: "story", hiddenOn: ["mobile"], source: null, fields: { title: "قصتنا", body: [{ type: "p", inlines: [{ type: "text", text: "نص القصة" }] }] } },
      { sectionId: "c", type: "cta", anchor: null, hiddenOn: [], source: null, fields: { title: "احجز", action: { href: "https://x.test", label: "الآن" } } },
      { sectionId: "t", type: "testimonials", anchor: null, hiddenOn: [], source: null, fields: { items: [{ id: "1", fields: { quote: "رائع", author: "سارة" } }] } },
      { sectionId: "g", type: "gallery", anchor: null, hiddenOn: [], source: null, fields: { items: [{ id: "1", fields: { image: { url: "https://cdn/g.jpg" } } }] } },
      { sectionId: "k", type: "contact", anchor: null, hiddenOn: [], source: null, fields: { phone: "+966" } },
      { sectionId: "s", type: "social-feed", anchor: null, hiddenOn: [], source: null, fields: { profile: { href: "https://instagram.com/x" } } },
      { sectionId: "u", type: "unknown-type", anchor: null, hiddenOn: [], source: null, fields: {} },
    ],
  },
  pageLoading: false,
};

const menus = {
  m1: {
    categories: [{ id: "cat-1", slug: "main", name: "الأطباق", imageUrl: "/a.png" }],
    items: [{ id: "cat-1-i1", categoryId: "cat-1", name: "برجر", description: "لذيذ", price: 25, imageUrl: "/b.png" }],
  },
};

function render(device: LiveDevice, patch: Partial<LiveSite> = {}) {
  return renderToStaticMarkup(
    createElement(I18nScope, {
      locale: "ar",
      children: createElement(LiveSiteCanvas, { site: { ...site, ...patch }, device, menus, onNavigate: () => undefined, onLanguage: () => undefined }),
    })
  );
}

describe("LiveSiteCanvas", () => {
  it("draws every section type the storefront draws, at every device", () => {
    for (const device of ["desktop", "tablet", "mobile"] as const) {
      const html = render(device);
      for (const text of ["أهلاً", "الأطباق", "برجر", "25.00", "احجز", "رائع", "https://instagram.com/x", "الرياض", "روابط"]) {
        expect(html, `${device}: ${text}`).toContain(text);
      }
    }
  });

  it("hides a section on the devices it is hidden on", () => {
    expect(render("desktop")).toContain("نص القصة");
    expect(render("mobile")).not.toContain("نص القصة");
  });

  it("shows the header nav from md up and the drawer button below it", () => {
    expect(render("desktop")).toContain("من نحن");
    expect(render("mobile")).not.toContain("من نحن");
    expect(render("mobile")).toContain('aria-expanded="false"');
  });

  it("pins the header and marks the current page only when the site asks for it", () => {
    expect(render("desktop")).toMatch(/<header class="[^"]*sticky top-0/);
    const plain = render("desktop", { navigation: { ...site.navigation, options: { ...site.navigation.options, stickyHeader: false, showActivePageIndicator: false } } });
    expect(plain).not.toMatch(/<header class="[^"]*sticky/);
    expect(plain).not.toContain("after:bg-[var(--octo-brand)]");
  });

  it("says so when the page asked for is not on the site", () => {
    expect(render("desktop", { page: null })).toContain("غير ظاهرة");
  });
});
