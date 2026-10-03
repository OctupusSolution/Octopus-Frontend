import { describe, expect, it } from "vitest";
import type { CataloguesResponse, PageDraftResponse, SiteOverviewResponse } from "@octopus/api-client";
import { EMPTY_SITE_DRAFT, type SiteDraft } from "./site-draft";
import {
  brandInputFromDraft,
  brandInputFromServer,
  projectRemote,
  seoInputFromDraft,
  seoTemplateToTitle,
  seoTitleToTemplate,
  stableJson,
  withText,
  type PublicLinkServer,
} from "./public-link-sync";

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
      colors: { "core.primary": "#08589D", "core.accent": "#F59E0B", "background.surface": "#F8FAFC", "text.heading": "#0F172A" },
      fonts: { en: { heading: "inter", body: "inter" }, ar: { heading: "cairo", body: "cairo" } },
      layout: {},
      sectionVariants: {},
    },
  ],
  fonts: [
    { code: "inter", displayName: "Inter" },
    { code: "cairo", displayName: "Cairo" },
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

function overview(patch: Partial<SiteOverviewResponse> = {}): SiteOverviewResponse {
  return {
    address: { slug: null, hostname: null, url: null, slugChangeAllowedAtUtc: null },
    status: "Draft",
    live: null,
    everPublished: false,
    hasUnpublishedChanges: false,
    siteVersion: 3,
    settings: { defaultLanguage: "en", enabledLanguages: ["ar", "en"] },
    themeKey: "default",
    brand: { displayName: {}, logo: null, favicon: null, colors: {}, customSwatches: [], typography: {} },
    seo: { titleTemplate: null, description: {}, socialImage: null, hideFromSearchEngines: false },
    pages: [
      { pageId: "home", kind: "Home", isHome: true, title: { en: "Home" }, path: "/", visibility: "visible", version: 1, sectionCount: 1, source: null, changedSinceLive: null },
      { pageId: "about", kind: "Standard", isHome: false, title: { en: "About" }, path: "/about", visibility: "visible", version: 1, sectionCount: 0, source: null, changedSinceLive: null },
      { pageId: "secret", kind: "Standard", isHome: false, title: { en: "Secret" }, path: "/secret", visibility: "hidden", version: 1, sectionCount: 0, source: null, changedSinceLive: null },
    ],
    limits: { maxPages: 20, usedPages: 3, maxSectionsPerPage: 20, maxNavTopLevelItems: 8, maxDocumentBytes: 1, usedDocumentBytes: 0 },
    starter: { appliedCode: null, recommendedCode: null, eligible: true },
    ...patch,
  };
}

const ctx = (o: SiteOverviewResponse, fallbackName: string | null = null) => ({
  overview: o,
  catalogues,
  fallbackName,
  fontCodes: catalogues.fonts.map((f) => f.code),
  logo: null,
  favicon: null,
});

function draftWith(patch: Partial<SiteDraft["brand"]>): SiteDraft {
  return { ...EMPTY_SITE_DRAFT, brand: { ...EMPTY_SITE_DRAFT.brand, ...patch } };
}

describe("brandInputFromDraft", () => {
  it("sends a colour as an override only where it differs from the applied theme", () => {
    const draft = draftWith({ colors: { primary: "#08589d", light: "#F8FAFC", accent: "#123456", dark: "#0F172A" } });
    const input = brandInputFromDraft(draft, ctx(overview()));
    expect(input.colors).toEqual({ "core.accent": "#123456" });
  });

  it("drops an override the merchant set back to the theme's value", () => {
    const o = overview({ brand: { ...overview().brand, colors: { "core.primary": "#FF0000", "custom.token": "#111111" } } });
    const draft = draftWith({ colors: { primary: "#08589D", light: "#F8FAFC", accent: "#F59E0B", dark: "#0F172A" } });
    expect(brandInputFromDraft(draft, ctx(o)).colors).toEqual({ "custom.token": "#111111" });
  });

  it("falls back to the business's own name, written in every enabled language", () => {
    const input = brandInputFromDraft(draftWith({ businessName: "" }), ctx(overview(), "Ocean Table"));
    expect(input.displayName).toEqual({ ar: "Ocean Table", en: "Ocean Table" });
    const own = brandInputFromDraft(draftWith({ businessName: "Blue Fin" }), ctx(overview(), "Ocean Table"));
    expect(own.displayName).toEqual({ ar: "Blue Fin", en: "Blue Fin" });
  });

  it("sends fonts as overrides only when they differ from the theme, and never an unknown code", () => {
    const draft = draftWith({
      typography: { en: { titles: "poppins", body: "inter" }, ar: { titles: "cairo", body: "not-a-font" } },
    });
    expect(brandInputFromDraft(draft, ctx(overview())).typography).toEqual({ en: { heading: "poppins", body: null } });
  });

  it("round-trips: a draft mirroring the server produces the server's own brand", () => {
    const o = overview({ brand: { ...overview().brand, displayName: { ar: "Ocean", en: "Ocean" } } });
    const draft = draftWith({
      businessName: "Ocean",
      colors: { primary: "#08589D", light: "#F8FAFC", accent: "#F59E0B", dark: "#0F172A" },
      typography: { en: { titles: "inter", body: "inter" }, ar: { titles: "cairo", body: "cairo" } },
    });
    expect(stableJson(brandInputFromDraft(draft, ctx(o)))).toBe(stableJson(brandInputFromServer(o.brand)));
  });
});

describe("site SEO mapping", () => {
  it("stores the site title as a {page} template and reads it back", () => {
    expect(seoTitleToTemplate("Ocean {Table}")).toBe("{page} · Ocean Table");
    expect(seoTitleToTemplate("   ")).toBeNull();
    expect(seoTemplateToTitle("{page} · Ocean Table")).toBe("Ocean Table");
    expect(seoTemplateToTitle("{site} | {page}")).toBe("");
  });

  it("writes the description in the default language and keeps the others", () => {
    const o = overview({ seo: { titleTemplate: null, description: { ar: "وصف" }, socialImage: null, hideFromSearchEngines: true } });
    const draft = { ...EMPTY_SITE_DRAFT, publish: { ...EMPTY_SITE_DRAFT.publish, seo: { title: "Ocean", description: "Seafood", socialImageDataUrl: null } } };
    expect(seoInputFromDraft(draft, o, null)).toEqual({
      titleTemplate: "{page} · Ocean",
      description: { ar: "وصف", en: "Seafood" },
      socialImage: null,
      hideFromSearchEngines: true,
    });
  });

  it("treats a blank text as absent", () => {
    expect(withText({ en: "x", ar: "y" }, "en", "  ")).toEqual({ ar: "y" });
  });
});

describe("projectRemote", () => {
  const home: PageDraftResponse = {
    pageId: "home",
    kind: "Home",
    isHome: true,
    templateKey: "home",
    title: { en: "Home" },
    path: "/",
    previousPaths: [],
    visibility: "visible",
    seo: { title: {}, description: {}, socialImage: null, hideFromSearchEngines: false },
    layout: { header: null, hideFooter: false },
    source: null,
    sourceState: null,
    version: 2,
    siteVersion: 3,
    sections: [
      {
        sectionId: "s1",
        type: "hero",
        enabled: true,
        primary: false,
        anchor: null,
        hiddenOn: [],
        style: {},
        fields: {
          title: { kind: "text", text: { en: "Welcome" } },
          background: { kind: "media", media: { assetId: "a1", kind: "image" } },
          primaryAction: { kind: "link", target: { kind: "page", pageId: "about" }, label: { en: "Book" } },
        },
        source: null,
        sourceSettings: null,
        sourceState: null,
      },
      { sectionId: "s2", type: "menu", enabled: true, primary: false, anchor: null, hiddenOn: [], style: {}, fields: {}, source: { sourceKey: "menu", contentKey: "m" }, sourceSettings: null, sourceState: "available" },
      { sectionId: "s3", type: "about", enabled: true, primary: false, anchor: null, hiddenOn: [], style: {}, fields: {}, source: null, sourceSettings: null, sourceState: null },
    ],
  };
  const server = (patch: Partial<PublicLinkServer> = {}): PublicLinkServer => ({
    overview: overview({ address: { slug: "ocean", hostname: "ocean.octopus.app", url: "https://ocean.octopus.app", slugChangeAllowedAtUtc: null } }),
    catalogues,
    pages: { home },
    navigation: null,
    footer: null,
    review: null,
    sources: [],
    ...patch,
  });

  it("takes the address from the server's hostname", () => {
    expect(projectRemote(server(), "en", {}).host).toBe("ocean.octopus.app");
  });

  it("derives the header from visible pages when the menu has no items", () => {
    expect(projectRemote(server(), "en", {}).navItems.map((i) => i.label)).toEqual(["Home", "About"]);
  });

  it("uses the explicit menu, labelled from the target page when the item has no label", () => {
    const navigation = {
      items: [{ id: "n1", label: null, target: { kind: "page", pageId: "about" }, icon: null, showInHeader: false, showInDrawer: true, children: [] }],
      options: { stickyHeader: false, showActivePageIndicator: false, showIcons: false, openLinksInSameTab: false },
      versions: { siteVersion: 3, pageVersion: null, pageVersions: null },
      warnings: [],
    };
    expect(projectRemote(server({ navigation }), "en", {}).navItems).toEqual([{ label: "About", visible: false, drawer: true }]);
  });

  it("projects the home hero and the drawable sections", () => {
    const remote = projectRemote(server(), "en", { a1: "https://cdn/x.jpg" });
    expect(remote.homeSections).toEqual(["hero", "menu"]);
    expect(remote.hero).toEqual({ headline: "Welcome", sub: undefined, primaryCta: "Book", imageUrl: "https://cdn/x.jpg" });
    expect(remote.visiblePages).toBe(2);
  });
});
