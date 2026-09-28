import { describe, expect, it } from "vitest";
import type { CataloguesResponse, NavItemDto, PageDraftResponse, SectionDraftResponse, SiteOverviewResponse } from "@octopus/api-client";
import { EMPTY_SITE_DRAFT, type PublicLinkServer, type SiteDraft } from "@/entities/site-draft";
import { menuFromDocument, projectLiveSite, type LiveSiteInput } from "./live-site";

const catalogues = {
  eTag: "x",
  sectionTypes: [],
  pageTemplates: [],
  themes: [
    {
      key: "default",
      category: "classic",
      recommended: true,
      labelKey: "themes.default.name",
      previewImages: [],
      colors: { "core.primary": "#08589D", "background.surface": "#F8FAFC", "text.heading": "#0F172A", "text.body": "#334155" },
      fonts: { en: { heading: "poppins", body: "inter" }, ar: { heading: "cairo", body: "tajawal" } },
      layout: {},
      sectionVariants: {},
    },
  ],
  fonts: [
    { code: "inter", displayName: "Inter" },
    { code: "cairo", displayName: "Cairo" },
    { code: "tajawal", displayName: "Tajawal" },
    { code: "poppins", displayName: "Poppins" },
  ],
  colorTokens: [],
  languages: [],
  icons: [],
  socialNetworks: [],
  starters: [],
  limits: {} as CataloguesResponse["limits"],
  defaultThemeKey: "default",
} as CataloguesResponse;

const overview: SiteOverviewResponse = {
  address: { slug: "ocean", hostname: "ocean.octopus.app", url: null, slugChangeAllowedAtUtc: null },
  status: "Draft",
  live: null,
  everPublished: false,
  hasUnpublishedChanges: false,
  siteVersion: 3,
  settings: { defaultLanguage: "ar", enabledLanguages: ["ar", "en"] },
  themeKey: "default",
  brand: { displayName: { ar: "أوشن", en: "Ocean" }, logo: null, favicon: null, colors: {}, customSwatches: [], typography: {} },
  seo: { titleTemplate: null, description: {}, socialImage: null, hideFromSearchEngines: false },
  pages: [
    { pageId: "home", kind: "Home", isHome: true, title: { ar: "الرئيسية", en: "Home" }, path: "/", visibility: "visible", version: 1, sectionCount: 2, source: null, changedSinceLive: null },
    { pageId: "about", kind: "Standard", isHome: false, title: { ar: "من نحن", en: "About" }, path: "/about", visibility: "visible", version: 1, sectionCount: 1, source: null, changedSinceLive: null },
    { pageId: "secret", kind: "Standard", isHome: false, title: { ar: "سري" }, path: "/secret", visibility: "hidden", version: 1, sectionCount: 0, source: null, changedSinceLive: null },
  ],
  limits: { maxPages: 20, usedPages: 3, maxSectionsPerPage: 20, maxNavTopLevelItems: 8, maxDocumentBytes: 1, usedDocumentBytes: 0 },
  starter: { appliedCode: null, recommendedCode: null, eligible: true },
};

function section(patch: Partial<SectionDraftResponse>): SectionDraftResponse {
  return {
    sectionId: "s",
    type: "text",
    enabled: true,
    primary: false,
    anchor: null,
    hiddenOn: [],
    style: {},
    fields: {},
    source: null,
    sourceSettings: null,
    sourceState: null,
    ...patch,
  };
}

function page(pageId: string, sections: SectionDraftResponse[]): PageDraftResponse {
  const summary = overview.pages.find((p) => p.pageId === pageId)!;
  return {
    pageId,
    kind: summary.kind,
    isHome: summary.isHome,
    templateKey: null,
    title: summary.title,
    path: summary.path,
    previousPaths: [],
    visibility: summary.visibility,
    seo: { title: {}, description: {}, socialImage: null, hideFromSearchEngines: false },
    layout: { header: null, hideFooter: false },
    source: null,
    sourceState: null,
    sections,
    version: 1,
    siteVersion: 3,
  };
}

const home = page("home", [
  section({
    sectionId: "hero",
    type: "hero",
    fields: {
      title: { kind: "text", text: { ar: "أهلاً", en: "Welcome" } },
      subtitle: { kind: "text", text: { ar: "نص" } },
      primaryAction: { kind: "link", target: { kind: "page", pageId: "secret" }, label: { ar: "سر" } },
      background: { kind: "media", media: { assetId: "img1", kind: "image" } },
    },
  }),
  section({
    sectionId: "story",
    type: "about",
    anchor: "story",
    fields: {
      body: {
        kind: "richText",
        text: {
          ar: {
            blocks: [
              {
                kind: "p",
                inlines: [
                  { kind: "text", text: "قبل " },
                  { kind: "link", target: { kind: "page", pageId: "secret" }, runs: [{ text: "مخفي" }] },
                  { kind: "link", target: { kind: "page", pageId: "about" }, runs: [{ text: "عنا", bold: true }] },
                ],
              },
            ],
          },
        },
      },
    },
  }),
  section({ sectionId: "off", type: "cta", enabled: false }),
  section({ sectionId: "gone", type: "menu", source: { sourceKey: "menu", contentKey: "m1" }, sourceState: "unavailable" }),
]);

function server(patch: Partial<PublicLinkServer> = {}): PublicLinkServer {
  return {
    overview,
    catalogues,
    pages: { home },
    navigation: null,
    footer: null,
    review: null,
    sources: [],
    ...patch,
  };
}

function input(patch: Partial<LiveSiteInput> = {}): LiveSiteInput {
  const draft: SiteDraft = { ...EMPTY_SITE_DRAFT, brand: { ...EMPTY_SITE_DRAFT.brand, businessName: "" } };
  return {
    server: server(),
    draft,
    edits: {},
    pageId: null,
    language: "ar",
    mediaUrls: { img1: "https://cdn/img1.jpg" },
    fonts: catalogues.fonts,
    ...patch,
  };
}

describe("projectLiveSite", () => {
  it("serves enabled, available sections only, resolving fields for the language", () => {
    const site = projectLiveSite(input());
    expect(site.page?.sections.map((s) => s.sectionId)).toEqual(["hero", "story"]);
    const hero = site.page!.sections[0].fields;
    expect(hero.title).toBe("أهلاً");
    expect(hero.background).toEqual({ url: "https://cdn/img1.jpg", kind: "Image" });
    // A link to a hidden page is dropped, as the public read drops it.
    expect(hero.primaryAction).toBeUndefined();
  });

  it("falls back to the default language for a text missing in the response language", () => {
    const site = projectLiveSite(input({ language: "en" }));
    expect(site.page!.sections[0].fields.title).toBe("Welcome");
    expect(site.page!.sections[0].fields.subtitle).toBe("نص");
    expect(site.direction).toBe("ltr");
  });

  it("unwraps rich-text links to pages that are not served and resolves the rest", () => {
    const body = projectLiveSite(input()).page!.sections[1].fields.body as { inlines: unknown[] }[];
    expect(body[0].inlines).toEqual([
      { type: "text", text: "قبل " },
      { type: "text", text: "مخفي" },
      { type: "link", href: "/about", runs: [{ type: "text", text: "عنا", bold: true }] },
    ]);
  });

  it("lays unsaved edits over the saved section", () => {
    const site = projectLiveSite(
      input({ edits: { hero: { pageId: "home", fields: { title: { kind: "text", text: { ar: "جديد" } } }, hiddenOn: ["mobile"] } } })
    );
    expect(site.page!.sections[0].fields.title).toBe("جديد");
    expect(site.page!.sections[0].hiddenOn).toEqual(["mobile"]);
  });

  it("derives the header from the served pages when no navigation was built", () => {
    const site = projectLiveSite(input());
    expect(site.navigation.links.map((l) => [l.label, l.href])).toEqual([
      ["الرئيسية", "/"],
      ["من نحن", "/about"],
    ]);
  });

  it("keeps a group only while a child survives, flattening children after their parent", () => {
    const items: NavItemDto[] = [
      { label: { ar: "مجموعة" }, target: null, showInHeader: true, showInDrawer: true, children: [{ target: { kind: "page", pageId: "secret" }, showInHeader: true, showInDrawer: true }] },
      {
        label: { ar: "روابط" },
        target: null,
        showInHeader: true,
        showInDrawer: false,
        children: [
          { target: { kind: "page", pageId: "about" }, showInHeader: true, showInDrawer: true },
          { label: { ar: "خارجي" }, target: { kind: "external", url: "https://x.test", openInNewTab: true }, showInHeader: true, showInDrawer: true },
        ],
      },
      { target: { kind: "anchor", pageId: "home", sectionId: "story" }, label: { ar: "قصتنا" }, showInHeader: false, showInDrawer: true },
    ];
    const options = { stickyHeader: true, showActivePageIndicator: true, showIcons: false, openLinksInSameTab: false };
    const site = projectLiveSite(input({ server: server({ navigation: { items, options, versions: { siteVersion: 3, pageVersion: null, pageVersions: null }, warnings: [] } }) }));
    expect(site.navigation.options.stickyHeader).toBe(true);
    expect(site.navigation.links).toEqual([
      { label: "من نحن", href: "/about", openInNewTab: false, inHeader: true, inDrawer: true },
      { label: "خارجي", href: "https://x.test", openInNewTab: true, inHeader: true, inDrawer: true },
      { label: "قصتنا", href: "/#story", openInNewTab: false, inHeader: false, inDrawer: true },
    ]);
  });

  it("keeps outside links in the same tab when the site says so", () => {
    const items: NavItemDto[] = [{ label: { ar: "خارجي" }, target: { kind: "external", url: "https://x.test", openInNewTab: true }, showInHeader: true, showInDrawer: true }];
    const options = { stickyHeader: false, showActivePageIndicator: false, showIcons: false, openLinksInSameTab: true };
    const site = projectLiveSite(input({ server: server({ navigation: { items, options, versions: { siteVersion: 3, pageVersion: null, pageVersions: null }, warnings: [] } }) }));
    expect(site.navigation.links[0].openInNewTab).toBe(false);
  });

  it("drops footer links that go nowhere, and groups left empty", () => {
    const site = projectLiveSite(
      input({
        server: server({
          footer: {
            groups: [
              { title: { ar: "روابط" }, links: [{ label: { ar: "سري" }, target: { kind: "page", pageId: "secret" } }, { label: { ar: "اتصل" }, target: { kind: "phone", number: "+966" } }] },
              { title: { ar: "فارغة" }, links: [{ label: { ar: "سري" }, target: { kind: "page", pageId: "secret" } }] },
            ],
            socialLinks: [{ network: "instagram", url: "https://instagram.com/x" }],
            contact: { address: { ar: "الرياض" }, hours: null, phone: null },
            versions: { siteVersion: 3, pageVersion: null, pageVersions: null },
            warnings: [],
          },
        }),
      })
    );
    expect(site.footer.groups).toEqual([{ title: "روابط", links: [{ label: "اتصل", href: "tel:+966", openInNewTab: false }] }]);
    expect(site.footer.contact).toEqual({ address: "الرياض", hours: null, phone: null });
  });

  it("does not serve a hidden page, and reports a page that is still loading", () => {
    expect(projectLiveSite(input({ pageId: "secret" })).page).toBeNull();
    const loading = projectLiveSite(input({ pageId: "about" }));
    expect(loading.page).toBeNull();
    expect(loading.pageLoading).toBe(true);
  });

  it("resolves colours catalogue <- theme <- saved overrides <- the draft's swatches, and the body font", () => {
    const draft: SiteDraft = {
      ...EMPTY_SITE_DRAFT,
      brand: { ...EMPTY_SITE_DRAFT.brand, colors: { ...EMPTY_SITE_DRAFT.brand.colors, primary: "#FF0000", dark: "not-a-colour" } },
    };
    const site = projectLiveSite(input({ draft, server: server({ overview: { ...overview, brand: { ...overview.brand, colors: { "text.heading": "#111111" } } } }) }));
    expect(site.cssVars["--octo-brand"]).toBe("#FF0000");
    expect(site.cssVars["--octo-store-price"]).toBe("#FF0000");
    expect(site.cssVars["--octo-text-primary"]).toBe("#111111");
    expect(site.cssVars["--octo-text-secondary"]).toBe("#334155");
    expect(site.cssVars["--octo-card"]).toBe("#ffffff");
    expect(site.brandName).toBe("أوشن");
  });

  it("reads the menu document the way the storefront does", () => {
    const menu = menuFromDocument(
      {
        sections: [{ name: "Main", description: null, image: { assetId: "a", kind: "Image" }, displayStyle: "grid", color: null, entries: [{ ref: "i1", kind: "Item" }, { ref: "o1", kind: "Offer" }] }],
        items: {
          i1: { name: "Burger", description: null, image: null, video: null, tags: [], price: { amount: 25, currency: "SAR" }, facts: [], advisories: { labels: [], additionalInfo: null }, isAvailable: true, modifierGroupRefs: [] },
        },
      },
      (image) => (image?.assetId === "a" ? "https://cdn/a.jpg" : null),
      "/all.png"
    );
    expect(menu.categories).toEqual([{ id: "cat-1", slug: "main", name: "Main", imageUrl: "https://cdn/a.jpg" }]);
    expect(menu.items).toEqual([{ id: "cat-1-i1", categoryId: "cat-1", name: "Burger", description: "", price: 25, imageUrl: "/all.png" }]);
  });
});
