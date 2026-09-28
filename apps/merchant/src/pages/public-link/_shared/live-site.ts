// The connected builder's preview model: what the customer storefront would render for the
// draft, right now, including edits that are not saved yet.
//
// This is a port of the backend's public read (PublicLink.Application/PublicRead/PublicProjector.cs)
// plus the two storefront adapters that sit on top of it (apps/customer app/layout.tsx `navLinks`
// and shared/api/brand-theme.ts `themeStyle`). The rules are the backend's, one for one:
//   - a page is served while it is visible and, for a module page, its content is available;
//   - a link to a page that is not served is dropped; an anchor to a disabled or unnamed section
//     falls back to its page; a navigation parent survives only while a child does;
//   - with no navigation built, the header lists every served page;
//   - a bound section whose content is unavailable is left out;
//   - a text resolves to the response language, else the site's default language.
// When the backend changes one of these, this file has to follow (live-site.test.ts pins them).
//
// Pure: no React, no fetching. The frame (ui/live-preview-frame.tsx) supplies media URLs and the
// menus bound sections show.
import type {
  CataloguesResponse,
  DeviceClass,
  LinkTargetDto,
  LocalizedTextMap,
  MenuPreviewResponse,
  NavItemDto,
  NavigationOptionsDto,
  PageDraftResponse,
  PageSummaryResponse,
  PublicSiteNavItem,
  PublicSitePage,
  PublicSiteSection,
  PublicSiteShell,
  RichBlock,
  RichInline,
  RichTextRun,
  SectionDraftResponse,
  SectionFieldValue,
} from "@octopus/api-client";
import {
  COLOR_TOKENS,
  themeColors,
  themeFonts,
  toFontCode,
  type PublicLinkServer,
  type SiteDraft,
} from "@/entities/site-draft";

// ---- output ---------------------------------------------------------------------------------------

export type LiveDirection = "ltr" | "rtl";

/** A resolved field, in the public read's shape (text a string, media `{url,alt}`, link `{href,label,openInNewTab}`, …). */
export type LiveFields = Record<string, unknown>;

export interface LiveSection {
  sectionId: string;
  type: string;
  anchor: string | null;
  /** Devices the section is hidden on (the storefront hides it at that breakpoint). */
  hiddenOn: DeviceClass[];
  fields: LiveFields;
  /** The bound content, for a bound section (menu id for the Menu source). */
  source: { sourceKey: string; contentKey: string } | null;
}

export interface LiveNavLink {
  label: string;
  href: string;
  openInNewTab: boolean;
  inHeader: boolean;
  inDrawer: boolean;
}

export interface LiveFooter {
  groups: { title: string; links: { label: string; href: string; openInNewTab: boolean }[] }[];
  socialLinks: { network: string; url: string }[];
  contact: { address: string | null; hours: string | null; phone: string | null };
}

export interface LivePage {
  pageId: string;
  path: string;
  isHome: boolean;
  title: string;
  hideFooter: boolean;
  sections: LiveSection[];
}

export interface LiveSite {
  language: string;
  direction: LiveDirection;
  languages: string[];
  brandName: string;
  logoUrl: string | null;
  /** The storefront CSS custom properties the theme drives, plus the storefront's own defaults. */
  cssVars: Record<string, string>;
  /** The body font's display name (the storefront sets every text in it), or null for the default faces. */
  fontName: string | null;
  /** The titles font's display name (the storefront sets h1-h3 in it), or null to keep the body face. */
  headingFontName: string | null;
  navigation: { options: NavigationOptionsDto; links: LiveNavLink[] };
  footer: LiveFooter;
  /** The served pages, in site order (the page switcher and nav clicks use it). */
  pages: { pageId: string; path: string; title: string; isHome: boolean }[];
  /** The page shown, or null when it is not served (hidden, or its content unavailable). */
  page: LivePage | null;
  /** The page asked for is still loading. */
  pageLoading: boolean;
}

// ---- input ----------------------------------------------------------------------------------------

/** An unsaved inspector edit of one section, laid over the server copy. */
export interface SectionEdit {
  pageId: string;
  fields?: SectionDraftResponse["fields"];
  style?: SectionDraftResponse["style"];
  hiddenOn?: DeviceClass[];
  anchor?: string | null;
}

export interface LiveSiteInput {
  server: PublicLinkServer;
  /** The local draft: brand name, colours, fonts and logo are edited there and reach the server later. */
  draft: SiteDraft;
  /** Unsaved section edits, by section id. */
  edits: Readonly<Record<string, SectionEdit>>;
  /** The page to show; null = home. */
  pageId: string | null;
  language: string;
  /** Delivery URLs of site assets, by asset id. */
  mediaUrls: Readonly<Record<string, string>>;
  /** Font catalogue (code -> display name). */
  fonts: readonly { code: string; displayName: string }[];
}

// ---- storefront defaults (apps/customer/src/app/globals.css) --------------------------------------

export const STOREFRONT_DEFAULT_VARS: Readonly<Record<string, string>> = {
  "--octo-brand": "#0D6EFD",
  "--octo-page-bg": "#e9eaec",
  "--octo-card": "#ffffff",
  "--octo-border-card": "#ececf0",
  "--octo-border-input": "#e8e8ec",
  "--octo-divider": "#f0f0f2",
  "--octo-hover": "#f8f8fa",
  "--octo-selected": "#eef4ff",
  "--octo-store-page": "#f7f8fa",
  "--octo-store-soft": "#f1f3f5",
  "--octo-store-footer": "#e7edf4",
  "--octo-store-price": "#004bb9",
  "--octo-text-primary": "#16161d",
  "--octo-text-secondary": "#6b6b74",
  "--octo-text-muted": "#8b8b93",
  "--octo-text-faint": "#a9a9b2",
};

/** Theme colour token -> the storefront CSS variables it drives (brand-theme.ts COLOR_VARS). */
const COLOR_VARS: Readonly<Record<string, readonly string[]>> = {
  "core.primary": ["--octo-brand", "--octo-store-price"],
  "background.surface": ["--octo-store-page"],
  "text.heading": ["--octo-text-primary"],
  "text.body": ["--octo-text-secondary"],
  "text.muted": ["--octo-text-muted"],
  "borders.default": ["--octo-border-card"],
};

const HEX = /^#[0-9a-f]{6}([0-9a-f]{2})?$/i;

const RTL_LANGUAGES = new Set(["ar", "he", "fa", "ur"]);
export const directionOf = (language: string): LiveDirection => (RTL_LANGUAGES.has(language) ? "rtl" : "ltr");

// ---- helpers --------------------------------------------------------------------------------------

/** The text in the language, else the default language's; null when there is none (LocalizedText.Resolve). */
function textOf(map: LocalizedTextMap | null | undefined, lang: string, fallback: string): string | null {
  if (!map) return null;
  const value = map[lang]?.trim() || map[fallback]?.trim();
  return value ? value : null;
}

interface Context {
  lang: string;
  fallback: string;
  pages: Map<string, PageSummaryResponse>;
  drafts: Readonly<Record<string, PageDraftResponse>>;
  mediaUrls: Readonly<Record<string, string>>;
  served: (page: PageSummaryResponse) => boolean;
}

/** The public path of a page; home is always `/`. */
const pathOf = (page: Pick<PageSummaryResponse, "path" | "isHome">) => (page.isHome ? "/" : page.path.startsWith("/") ? page.path : `/${page.path}`);

type Resolved = { href: string; kind: string };

/** PublicProjector.Link: an address, or null when the live site drops the link. */
function resolveLink(target: LinkTargetDto | null | undefined, ctx: Context): Resolved | null {
  if (!target) return null;
  switch (String(target.kind).toLowerCase()) {
    case "page": {
      const page = target.pageId ? ctx.pages.get(target.pageId) : undefined;
      return page && ctx.served(page) ? { href: pathOf(page), kind: "Page" } : null;
    }
    case "anchor": {
      const page = target.pageId ? ctx.pages.get(target.pageId) : undefined;
      if (!page || !ctx.served(page)) return null;
      // Only a loaded page's sections are known; an unknown one falls back to the page, as a disabled one does.
      const section = ctx.drafts[page.pageId]?.sections.find((s) => s.sectionId === target.sectionId && s.enabled);
      return section?.anchor ? { href: `${pathOf(page)}#${section.anchor}`, kind: "Anchor" } : { href: pathOf(page), kind: "Page" };
    }
    case "external":
      return target.url ? { href: target.url, kind: "External" } : null;
    case "email":
      return target.address ? { href: `mailto:${target.address}`, kind: "Email" } : null;
    case "phone":
      return target.number ? { href: `tel:${target.number}`, kind: "Phone" } : null;
    default:
      return null;
  }
}

function run(r: RichTextRun) {
  const node: Record<string, unknown> = { type: "text", text: r.text };
  if (r.bold) node.bold = true;
  if (r.italic) node.italic = true;
  if (r.underline) node.underline = true;
  return node;
}

function inlines(list: RichInline[] | undefined, ctx: Context): unknown[] {
  const out: unknown[] = [];
  for (const inline of list ?? []) {
    if (inline.kind === "br") out.push({ type: "br" });
    else if (inline.kind === "link") {
      const resolved = resolveLink(inline.target as LinkTargetDto, ctx);
      // A link to something no longer served is unwrapped: its text stays, the link goes.
      if (!resolved) inline.runs.forEach((r) => out.push(run(r)));
      else out.push({ type: "link", href: resolved.href, runs: inline.runs.map(run) });
    } else out.push(run(inline));
  }
  return out;
}

function block(b: RichBlock, ctx: Context): unknown {
  switch (b.kind) {
    case "p":
      return { type: "p", inlines: inlines(b.inlines, ctx) };
    case "h":
      return { type: "h", level: b.level, inlines: inlines(b.inlines, ctx) };
    case "quote":
      return { type: "quote", inlines: inlines(b.inlines, ctx) };
    case "list":
      return { type: "list", ordered: Boolean(b.ordered), items: b.items.map((item) => item.map((x) => block(x, ctx))) };
    default:
      return {};
  }
}

/** PublicProjector.Field: one typed value in the public read's shape; undefined = left out. */
function field(value: SectionFieldValue, ctx: Context): unknown {
  switch (value.kind) {
    case "text":
      return textOf(value.text, ctx.lang, ctx.fallback) ?? undefined;
    case "richText": {
      const doc = value.text?.[ctx.lang] ?? value.text?.[ctx.fallback];
      if (!doc || doc.blocks.length === 0) return undefined;
      return doc.blocks.map((b) => block(b, ctx));
    }
    case "media": {
      const url = ctx.mediaUrls[value.media.assetId];
      if (!url) return undefined;
      const node: Record<string, unknown> = { url, kind: value.media.kind === "video" ? "Video" : "Image" };
      const alt = textOf(value.alt, ctx.lang, ctx.fallback);
      if (alt) node.alt = alt;
      return node;
    }
    case "link": {
      const resolved = resolveLink(value.target as LinkTargetDto, ctx);
      if (!resolved) return undefined;
      const node: Record<string, unknown> = { href: resolved.href, kind: resolved.kind };
      const label = textOf(value.label, ctx.lang, ctx.fallback);
      if (label) node.label = label;
      if (value.target.kind === "external" && value.target.openInNewTab) node.openInNewTab = true;
      return node;
    }
    case "choice":
      return value.key;
    case "toggle":
    case "number":
      return value.value;
    case "color":
      return { token: value.color.token ?? null, hex: value.color.hex ?? null };
    case "list":
      return value.items.map((item) => ({ id: item.id, fields: fields(item.fields, ctx) }));
    default:
      return undefined;
  }
}

function fields(values: Record<string, SectionFieldValue> | undefined, ctx: Context): LiveFields {
  const out: LiveFields = {};
  for (const [key, value] of Object.entries(values ?? {})) {
    const resolved = field(value, ctx);
    if (resolved !== undefined) out[key] = resolved;
  }
  return out;
}

/** Every media asset id a section's fields reference (the frame resolves their URLs). */
export function mediaIdsOf(values: Record<string, SectionFieldValue> | undefined, into: Set<string> = new Set()): Set<string> {
  for (const value of Object.values(values ?? {})) {
    if (value.kind === "media") into.add(value.media.assetId);
    else if (value.kind === "list") value.items.forEach((item) => mediaIdsOf(item.fields, into));
  }
  return into;
}

const available = (section: Pick<SectionDraftResponse, "sourceState">) => section.sourceState !== "unavailable";

/** A section as the inspector currently has it: the server copy with any unsaved edit laid over it. */
export function withEdit(section: SectionDraftResponse, edit: SectionEdit | undefined): SectionDraftResponse {
  if (!edit) return section;
  return {
    ...section,
    fields: edit.fields ?? section.fields,
    style: edit.style ?? section.style,
    hiddenOn: edit.hiddenOn ?? section.hiddenOn,
    anchor: edit.anchor === undefined ? section.anchor : edit.anchor,
  };
}

function navItem(item: NavItemDto, ctx: Context, options: NavigationOptionsDto): PublicSiteNavItem | null {
  const children = (item.children ?? []).map((child) => navItem(child, ctx, options)).filter((c): c is PublicSiteNavItem => c !== null);
  const label = textOf(item.label, ctx.lang, ctx.fallback) ?? "";
  const group = (): PublicSiteNavItem | null =>
    children.length === 0
      ? null
      : { label, iconKey: item.icon ?? null, href: null, kind: "Group", openInNewTab: false, showInHeader: item.showInHeader, showInDrawer: item.showInDrawer, children };
  if (!item.target) return group();
  const link = resolveLink(item.target, ctx);
  if (!link) return group();
  // NavigationOptions.OpensInNewTab: an outside link asked to, and the site does not keep links in the same tab.
  const newTab = String(item.target.kind).toLowerCase() === "external" && item.target.openInNewTab === true && !options.openLinksInSameTab;
  return { label, iconKey: item.icon ?? null, href: link.href, kind: link.kind, openInNewTab: newTab, showInHeader: item.showInHeader, showInDrawer: item.showInDrawer, children };
}

const DEFAULT_NAV_OPTIONS: NavigationOptionsDto = { stickyHeader: false, showActivePageIndicator: false, showIcons: false, openLinksInSameTab: false };

/** The colour tokens as the storefront would resolve them: catalogue <- theme <- saved overrides <- the draft's swatches. */
function resolvedColors(server: PublicLinkServer, draft: SiteDraft, catalogues: CataloguesResponse | null): Record<string, string> {
  const colors: Record<string, string> = { ...themeColors(catalogues, server.overview.themeKey), ...(server.overview.brand.colors ?? {}) };
  (Object.keys(COLOR_TOKENS) as (keyof typeof COLOR_TOKENS)[]).forEach((k) => {
    const value = draft.brand.colors[k];
    if (value && HEX.test(value)) colors[COLOR_TOKENS[k]] = value;
  });
  return colors;
}

/** A font code for a language: the draft's pick (en/ar), else the saved override, else the theme's. */
function fontCode(server: PublicLinkServer, draft: SiteDraft, lang: string, role: "body" | "heading", codes: readonly string[]): string | null {
  if (lang === "en" || lang === "ar") {
    const picked = toFontCode(draft.brand.typography[lang][role === "body" ? "body" : "titles"]);
    if (codes.includes(picked)) return picked;
  }
  return server.overview.brand.typography?.[lang]?.[role] ?? themeFonts(server.catalogues, server.overview.themeKey, lang)[role] ?? null;
}

/** A URL another origin can load: a blob: URL belongs to the builder's own document. */
const portableUrl = (url: string | null | undefined): string | null => (url && !url.startsWith("blob:") ? url : null);

/** Unused by rendering; a constant, so equal drafts give equal messages. */
const DRAFT_INSTANT = "1970-01-01T00:00:00.000Z";

export interface DraftPublicRead {
  shell: PublicSiteShell;
  page: PublicSitePage | null;
  /** The page asked for is still loading. */
  pageLoading: boolean;
  /** Page id by public path (the shell's page index carries paths only). */
  pageIds: Readonly<Record<string, string>>;
}

// ---- the projection -------------------------------------------------------------------------------

export function draftPublicRead(input: LiveSiteInput): DraftPublicRead {
  const { server, draft, edits, mediaUrls } = input;
  const { overview } = server;
  const fallback = overview.settings.defaultLanguage;
  const enabled = overview.settings.enabledLanguages.length ? overview.settings.enabledLanguages : [fallback];
  const lang = enabled.includes(input.language) ? input.language : fallback;

  const summaries = new Map(overview.pages.map((p) => [p.pageId, p]));
  const served = (page: PageSummaryResponse) => {
    if (page.visibility === "hidden") return false;
    // A module page is served while its bound content is available (its primary section, when loaded).
    const loaded = server.pages[page.pageId];
    const primary = loaded?.sections.find((s) => s.primary);
    return primary ? available(primary) : true;
  };

  // Unsaved edits apply to anchors too (an anchor link resolves against the edited section).
  const drafts: Record<string, PageDraftResponse> = {};
  for (const [id, page] of Object.entries(server.pages)) {
    drafts[id] = { ...page, sections: page.sections.map((s) => withEdit(s, edits[s.sectionId])) };
  }
  const ctx: Context = { lang, fallback, pages: summaries, drafts, mediaUrls, served };

  // Pages in site order, home first.
  const ordered = [...overview.pages.filter((p) => p.isHome), ...overview.pages.filter((p) => !p.isHome)];
  const servable = ordered.filter(served);

  const options = server.navigation?.options ?? DEFAULT_NAV_OPTIONS;
  const items = server.navigation?.items ?? [];
  const titleOf = (p: PageSummaryResponse) => textOf(p.title, lang, fallback) ?? "";
  const navigationItems: PublicSiteNavItem[] =
    items.length === 0
      ? servable.map((p) => ({ label: titleOf(p), iconKey: null, href: pathOf(p), kind: "Page", openInNewTab: false, showInHeader: true, showInDrawer: true, children: [] }))
      : items.map((item) => navItem(item, ctx, options)).filter((x): x is PublicSiteNavItem => x !== null);

  // Footer (PublicProjector.Footer).
  const footer = server.footer;
  const shellFooter: PublicSiteShell["footer"] = {
    groups: (footer?.groups ?? [])
      .map((group) => ({
        title: textOf(group.title, lang, fallback) ?? "",
        links: (group.links ?? []).flatMap((link) => {
          const resolved = resolveLink(link.target, ctx);
          return resolved
            ? [{ label: textOf(link.label, lang, fallback) ?? "", href: resolved.href, kind: resolved.kind, openInNewTab: String(link.target.kind).toLowerCase() === "external" && link.target.openInNewTab === true }]
            : [];
        }),
      }))
      .filter((group) => group.links.length > 0),
    socialLinks: (footer?.socialLinks ?? []).map((s) => ({ network: s.network, url: s.url })),
    contact: {
      address: textOf(footer?.contact?.address, lang, fallback),
      hours: textOf(footer?.contact?.hours, lang, fallback),
      phone: textOf(footer?.contact?.phone, lang, fallback),
    },
  };

  const theme = server.catalogues?.themes.find((t) => t.key === overview.themeKey);
  const variantOf = (s: SectionDraftResponse): string | null =>
    s.style?.variant ?? theme?.sectionVariants?.[s.type] ?? server.catalogues?.sectionTypes.find((t) => t.key === s.type)?.defaultVariant ?? null;
  const sourceOf = (s: Pick<SectionDraftResponse, "source" | "sourceSettings">) =>
    s.source ? { sourceKey: s.source.sourceKey, version: null, publicLinkKey: s.source.contentKey, settings: s.sourceSettings ?? null } : null;

  // The page (PublicProjector.Page): the one asked for, else home.
  const home = ordered.find((p) => p.isHome) ?? ordered[0];
  const wanted = (input.pageId && summaries.get(input.pageId)) || home;
  const loaded = wanted ? drafts[wanted.pageId] : undefined;
  const host = overview.address.hostname ?? "";
  let page: PublicSitePage | null = null;
  if (wanted && loaded && served(wanted)) {
    const title = textOf(loaded.title, lang, fallback) ?? "";
    const path = pathOf(wanted);
    const primary = loaded.sections.find((s) => s.primary);
    page = {
      pageId: wanted.pageId,
      path,
      isHome: wanted.isHome,
      kind: wanted.isHome ? "Home" : primary?.source ? "SourceBound" : "Standard",
      title,
      seo: { title, description: null, socialImageUrl: null, noIndex: true, canonicalUrl: host ? `https://${host}${path}` : path },
      layout: { header: loaded.layout?.header ?? null, hideFooter: loaded.layout?.hideFooter ?? false },
      source: primary ? sourceOf(primary) : null,
      sections: loaded.sections
        .filter((s) => s.enabled && (!s.source || available(s)))
        .map(
          (s): PublicSiteSection => ({
            sectionId: s.sectionId,
            type: s.type,
            anchor: s.anchor,
            styleVariant: variantOf(s),
            style: (s.style ?? {}) as Record<string, unknown>,
            fields: fields(s.fields, ctx),
            source: sourceOf(s),
            hiddenOn: s.hiddenOn ?? [],
          })
        ),
      lastModifiedUtc: DRAFT_INSTANT,
    };
  }

  const colors = resolvedColors(server, draft, server.catalogues);
  const codes = input.fonts.map((f) => f.code);
  const typography = Object.fromEntries(
    enabled.map((l) => [l, { heading: fontCode(server, draft, l, "heading", codes), body: fontCode(server, draft, l, "body", codes) }])
  );
  const name = draft.brand.businessName.trim() || textOf(overview.brand.displayName, lang, fallback) || "";
  const logo = portableUrl(draft.brand.logoDataUrl);

  const shell: PublicSiteShell = {
    host,
    canonicalBaseUrl: host ? `https://${host}` : "",
    language: lang,
    direction: directionOf(lang),
    defaultLanguage: fallback,
    languages: enabled.map((code) => ({ code, direction: directionOf(code) })),
    theme: { key: overview.themeKey, colors, typography, layout: {} },
    brand: { displayName: name, logo: logo ? { url: logo } : null, favicon: null },
    seo: { titleTemplate: overview.seo.titleTemplate, defaultTitle: name, defaultDescription: textOf(overview.seo.description, lang, fallback), socialImageUrl: null, noIndex: true },
    navigation: { options, items: navigationItems },
    footer: shellFooter,
    pages: servable.map((p) => ({ path: pathOf(p), title: titleOf(p), isHome: p.isHome, noIndex: false, lastModifiedUtc: DRAFT_INSTANT })),
    isPreview: true,
    preview: null,
  };

  return {
    shell,
    page,
    pageLoading: Boolean(wanted && !loaded),
    pageIds: Object.fromEntries(servable.map((p) => [pathOf(p), p.pageId])),
  };
}

/** The mirror's model (live-site-canvas.tsx) from the public read — the storefront's own layout.tsx and brand-theme.ts steps. */
export function liveSiteFromRead(read: DraftPublicRead, fonts: readonly { code: string; displayName: string }[]): LiveSite {
  const { shell, page, pageLoading, pageIds } = read;
  const titleByPath = (href: string) => shell.pages.find((p) => p.path === href)?.title ?? "";
  const links: LiveNavLink[] = [];
  const walk = (items: PublicSiteNavItem[]) => {
    for (const item of items) {
      if (item.href) {
        const label = item.label || titleByPath(item.href);
        if (label || item.href === "/") links.push({ label, href: item.href, openInNewTab: item.openInNewTab, inHeader: item.showInHeader, inDrawer: item.showInDrawer });
      }
      walk(item.children);
    }
  };
  walk(shell.navigation.items);

  const cssVars: Record<string, string> = { ...STOREFRONT_DEFAULT_VARS };
  for (const [token, vars] of Object.entries(COLOR_VARS)) {
    const v = shell.theme.colors[token];
    if (v && HEX.test(v)) for (const name of vars) cssVars[name] = v;
  }
  const pair = shell.theme.typography[shell.language];
  const nameOf = (code: string | null | undefined) => (code ? (fonts.find((f) => f.code === code)?.displayName ?? null) : null);

  return {
    language: shell.language,
    direction: shell.direction,
    languages: shell.languages.map((l) => l.code),
    brandName: shell.brand.displayName,
    logoUrl: shell.brand.logo?.url ?? null,
    cssVars,
    fontName: nameOf(pair?.body),
    headingFontName: nameOf(pair?.heading),
    navigation: { options: shell.navigation.options, links },
    footer: {
      groups: shell.footer.groups.map((g) => ({ title: g.title, links: g.links.map((l) => ({ label: l.label, href: l.href, openInNewTab: l.openInNewTab })) })),
      socialLinks: shell.footer.socialLinks,
      contact: shell.footer.contact,
    },
    pages: shell.pages.map((p) => ({ pageId: pageIds[p.path], path: p.path, title: p.title, isHome: p.isHome })),
    page: page && {
      pageId: page.pageId,
      path: page.path,
      isHome: page.isHome,
      title: page.title,
      hideFooter: page.layout.hideFooter,
      sections: page.sections.map((s) => ({
        sectionId: s.sectionId,
        type: s.type,
        anchor: s.anchor,
        hiddenOn: (s.hiddenOn ?? []) as DeviceClass[],
        fields: s.fields,
        source: s.source ? { sourceKey: s.source.sourceKey, contentKey: s.source.publicLinkKey ?? "" } : null,
      })),
    },
    pageLoading,
  };
}

export function projectLiveSite(input: LiveSiteInput): LiveSite {
  return liveSiteFromRead(draftPublicRead(input), input.fonts);
}

// ---- the menu a Menu section shows (public-api.ts menuFromDocument) --------------------------------

export interface LiveMenu {
  categories: { id: string; slug: string; name: string; imageUrl: string }[];
  items: { id: string; categoryId: string; name: string; description: string; price: number; imageUrl: string }[];
}

function slugify(name: string, index: number): string {
  const ascii = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return ascii || `section-${index + 1}`;
}

/** Every media asset id a menu document references (the draft read gives ids, not URLs). */
export function menuMediaIds(doc: Pick<MenuPreviewResponse, "sections" | "items">): string[] {
  const ids = new Set<string>();
  for (const s of doc.sections) if (s.image?.assetId) ids.add(s.image.assetId);
  for (const i of Object.values(doc.items)) if (i.image?.assetId) ids.add(i.image.assetId);
  return [...ids];
}

/**
 * The menu document as the storefront reads it (public-api.ts menuFromDocument). `imageUrl` turns an
 * image into its delivery URL; `placeholder` is the storefront's stock photograph for one without.
 */
export function menuFromDocument(
  doc: Pick<MenuPreviewResponse, "sections" | "items">,
  imageUrl: (image: { assetId: string } | null) => string | null,
  placeholder: string
): LiveMenu {
  const categories: LiveMenu["categories"] = [];
  const items: LiveMenu["items"] = [];
  doc.sections.forEach((section, index) => {
    const category = { id: `cat-${index + 1}`, slug: slugify(section.name, index), name: section.name, imageUrl: imageUrl(section.image) ?? placeholder };
    categories.push(category);
    for (const entry of section.entries) {
      if (entry.kind !== "Item") continue;
      const item = doc.items[entry.ref];
      if (!item) continue;
      items.push({
        id: `${category.id}-${entry.ref}`,
        categoryId: category.id,
        name: item.name,
        description: item.description ?? "",
        price: item.price?.amount ?? 0,
        imageUrl: imageUrl(item.image) ?? placeholder,
      });
    }
  });
  return { categories, items };
}
