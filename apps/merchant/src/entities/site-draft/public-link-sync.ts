// Bridges the Public Link Builder to the Public Link API (US-019 "Public Link website").
//
// The server now stores a whole multi-page site: settings/languages, identity + colour/font
// overrides on top of a catalogue theme, search defaults, pages (each with its own typed
// sections), navigation, footer, preview links, publications. This hook
//   - hydrates all of it (overview, catalogues, content sources, navigation, footer, the Home
//     page) and keeps it as `server`, the source of truth for steps 3-7 while connected;
//   - projects what the preview and checklist read into `draft.remote` (`setRemote`);
//   - keeps a debounced two-way sync for the parts still edited through the local draft:
//     the brand (name, four colours, typography, logo, favicon) and the site SEO;
//   - exposes one action per server write the steps call directly (pages, sections,
//     navigation, footer, theme, starter, settings, preview links, publish, history).
//
// Versions: site-level writes state `overview.siteVersion`, page/section writes the page's own
// version; every answer's `versions` is folded back in, and writes run strictly one at a time.
// A stale version (409 publiclink.concurrency.stale) reloads the server copy; the debounced brand
// push then retries once, an explicit action surfaces the conflict instead.
//
// Without a business session every action is a local no-op and the builder runs on the draft alone.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError,
  addPageSection,
  applyDraftTheme,
  applyStarter as applyStarterApi,
  checkSlugAvailability,
  createDraftPage,
  createPreviewLink as createPreviewLinkApi,
  deleteDraftPage,
  getCatalogues,
  getDraftFooter,
  getDraftNavigation,
  getDraftPage,
  getDraftReview,
  getPublicLinkSite,
  getVersion as getSiteVersion,
  listContentSources,
  listPreviewLinks as listPreviewLinksApi,
  listVersions as listSiteVersions,
  publishSite,
  putSlug,
  removePageSection,
  reorderDraftPages,
  reorderPageSections,
  replaceDraftFooter,
  replaceDraftNavigation,
  resetDraftTheme,
  restoreSiteVersionToDraft,
  revokeAllPreviewLinks as revokeAllPreviewLinksApi,
  revokePreviewLink as revokePreviewLinkApi,
  rollbackSiteToVersion,
  setPageSectionEnabled,
  unpublishSite,
  updateDraftBrand,
  updateDraftPage,
  updatePageSection,
  updateSiteSeo,
  updateSiteSettings,
  type AddPageSectionInput,
  type BrandDraftResponse,
  type CataloguesResponse,
  type ContentSourceResponse,
  type CreatePageInput,
  type CreatePreviewLinkResponse,
  type DraftVersionsResponse,
  type FontResponse,
  type FooterResponse,
  type LocalizedTextMap,
  type NavigationResponse,
  type PageDraftResponse,
  type PageMediaReference,
  type PreviewLinkResponse,
  type ReplaceFooterInput,
  type ReplaceNavigationInput,
  type ReviewFindingResponse,
  type ReviewResponse,
  type SiteOverviewResponse,
  type SiteStatusResponse,
  type UpdateBrandInput,
  type UpdatePageInput,
  type UpdatePageSectionInput,
  type UpdateSiteSeoInput,
  type VersionDocumentResponse,
  type VersionSummaryResponse,
} from "@octopus/api-client";
import { useAuth } from "@/app/providers/auth-provider";
import { useI18n } from "@/app/providers/i18n-provider";
import { useTenantConfig } from "@/app/providers/tenant-config-provider";
import { isLocalMedia, knownMedia, mediaUrl, uploadMedia, type SiteMediaPurpose } from "@/shared/api/media";
import type { SiteAction, SiteDraft, SiteRemote } from "./site-draft";
import { FALLBACK_SITE_FONTS, toFontCode } from "./site-fonts";

const SYNC_DEBOUNCE_MS = 900;
const newKey = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export type RemoteSyncStatus = "disconnected" | "loading" | "synced" | "saving" | "error";

export interface ConnectableContent {
  sourceKey: string;
  contentKey: string;
  displayName: string;
}

/** Everything the server holds that the builder reads. */
export interface PublicLinkServer {
  overview: SiteOverviewResponse;
  catalogues: CataloguesResponse | null;
  /** Page drafts loaded so far (Home always), by pageId. */
  pages: Record<string, PageDraftResponse>;
  navigation: NavigationResponse | null;
  footer: FooterResponse | null;
  /** The last review read (publish step); null until asked for. */
  review: ReviewResponse | null;
  sources: ContentSourceResponse[];
}

/** Publish refused before it was sent: the review has blocking findings. */
export class PublishBlockedError extends Error {
  readonly findings: ReviewFindingResponse[];
  constructor(findings: ReviewFindingResponse[]) {
    super("publiclink.publish.blocked");
    this.name = "PublishBlockedError";
    this.findings = findings;
  }
}

export interface PublicLinkSync {
  status: RemoteSyncStatus;
  error: string | null;
  clearError: () => void;
  /** True once a business session's site has loaded; steps switch to their server-backed UI. */
  connected: boolean;
  server: PublicLinkServer | null;
  /** The language owner-typed texts are written in (the site's default). */
  editLanguage: string;
  /** Publishes the draft, then reflects the result locally. Rejects on failure (callers must catch). */
  publish: () => Promise<void>;
  unpublish: () => Promise<void>;
  checkSlug: (slug: string) => Promise<{ isAvailable: boolean; reason: string | null }>;
  claimSlug: (slug: string) => Promise<void>;
  connectableContent: ConnectableContent[];
  listVersions: () => Promise<VersionSummaryResponse[]>;
  /** Brings a past version back as the draft (`POST /versions/{v}/restore-draft`). */
  restoreVersion: (version: number) => Promise<void>;
  getVersion: (version: number) => Promise<VersionDocumentResponse>;
  /** Makes an older version live again as a new version; the draft is untouched. */
  rollbackVersion: (version: number) => Promise<void>;
  /** The font catalogue (`GET /catalogues` fonts); the backend defaults until it loads. */
  fonts: readonly FontResponse[];
  // ---- US-019 surface ----
  applyTheme: (themeKey: string) => Promise<void>;
  resetTheme: () => Promise<void>;
  applyStarter: (starterKey: string) => Promise<void>;
  updateLanguages: (defaultLanguage: string, enabledLanguages: string[]) => Promise<void>;
  loadPage: (pageId: string) => Promise<PageDraftResponse | null>;
  createPage: (input: CreatePageInput) => Promise<PageDraftResponse | null>;
  updatePage: (pageId: string, input: UpdatePageInput) => Promise<void>;
  deletePage: (pageId: string) => Promise<void>;
  reorderPages: (orderedPageIds: string[]) => Promise<void>;
  addSection: (pageId: string, input: AddPageSectionInput) => Promise<string | null>;
  updateSection: (pageId: string, sectionId: string, input: UpdatePageSectionInput) => Promise<void>;
  setSectionEnabled: (pageId: string, sectionId: string, enabled: boolean) => Promise<void>;
  removeSection: (pageId: string, sectionId: string) => Promise<void>;
  reorderSections: (pageId: string, orderedSectionIds: string[]) => Promise<void>;
  saveNavigation: (input: ReplaceNavigationInput) => Promise<void>;
  saveFooter: (input: ReplaceFooterInput) => Promise<void>;
  refreshReview: () => Promise<ReviewResponse | null>;
  createPreviewLink: (label: string | null, expiresInDays: number) => Promise<CreatePreviewLinkResponse | null>;
  listPreviewLinks: () => Promise<PreviewLinkResponse[]>;
  revokePreviewLink: (linkId: string) => Promise<void>;
  revokeAllPreviewLinks: () => Promise<void>;
  /** Uploads a picked image into the site library; resolves to its reference and delivery URL. */
  uploadSiteImage: (src: string, purpose: SiteMediaPurpose) => Promise<{ assetId: string; kind: "image" | "video"; url: string }>;
  /** The delivery URL of a site asset (cached). */
  siteMediaUrl: (assetId: string) => Promise<string | null>;
}

// ---- pure mapping (exported for tests) ------------------------------------------------------------

/** The four local swatches, by the colour token each one sets. */
export const COLOR_TOKENS = {
  primary: "core.primary",
  light: "background.surface",
  accent: "core.accent",
  dark: "text.heading",
} as const;

/** The draft's two typography locales. */
const DRAFT_LANGS = ["en", "ar"] as const;

/** A text for display: the wanted language, else the fallback, else any. */
export function pickText(map: LocalizedTextMap | null | undefined, lang: string, fallback?: string): string {
  if (!map) return "";
  return map[lang] || (fallback ? map[fallback] : "") || Object.values(map).find(Boolean) || "";
}

/** Sets one language of a localized text, dropping it when blank (blank = absent on the server). */
export function withText(map: LocalizedTextMap | null | undefined, lang: string, value: string): LocalizedTextMap {
  const next: LocalizedTextMap = { ...(map ?? {}) };
  const trimmed = value.trim();
  if (trimmed) next[lang] = trimmed;
  else delete next[lang];
  return next;
}

/** Catalogue colour defaults <- the theme's colours (what `ThemeResolver` does before overrides). */
export function themeColors(catalogues: CataloguesResponse | null, themeKey: string): Record<string, string> {
  if (!catalogues) return {};
  const colors: Record<string, string> = {};
  for (const token of catalogues.colorTokens) colors[token.key] = token.defaultValue;
  const theme = catalogues.themes.find((t) => t.key === themeKey) ?? catalogues.themes.find((t) => t.key === catalogues.defaultThemeKey);
  Object.assign(colors, theme?.colors ?? {});
  return colors;
}

export function themeFonts(catalogues: CataloguesResponse | null, themeKey: string, lang: string): { heading: string | null; body: string | null } {
  const theme = catalogues?.themes.find((t) => t.key === themeKey) ?? catalogues?.themes.find((t) => t.key === catalogues?.defaultThemeKey);
  const pair = theme?.fonts?.[lang];
  return { heading: pair?.heading ?? null, body: pair?.body ?? null };
}

/** The local site title is stored as the template `{page} · {title}`; braces are not allowed in it. */
export const SEO_TITLE_SEPARATOR = " · ";
export function seoTitleToTemplate(title: string): string | null {
  const clean = title.replace(/[{}]/g, "").trim();
  return clean ? `{page}${SEO_TITLE_SEPARATOR}${clean}` : null;
}
export function seoTemplateToTitle(template: string | null | undefined): string {
  if (!template) return "";
  const prefix = `{page}${SEO_TITLE_SEPARATOR}`;
  return template.startsWith(prefix) ? template.slice(prefix.length) : template.replace(/\{(page|site)\}/g, "").replace(/^[\s·|\-–]+|[\s·|\-–]+$/g, "");
}

const normalizeRef = (ref: { assetId: string; kind: string } | null | undefined): PageMediaReference | null =>
  ref ? { assetId: ref.assetId, kind: ref.kind.toLowerCase() === "video" ? "Video" : "Image" } : null;

/** Stable JSON (sorted keys) so two equal inputs compare equal. */
export function stableJson(value: unknown): string {
  return JSON.stringify(value, (_k, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.keys(v as Record<string, unknown>)
          .sort()
          .reduce<Record<string, unknown>>((acc, k) => {
            acc[k] = (v as Record<string, unknown>)[k];
            return acc;
          }, {})
      : v
  );
}

/** What the server's brand is, as the input that would reproduce it. */
export function brandInputFromServer(brand: BrandDraftResponse): UpdateBrandInput {
  return {
    displayName: brand.displayName ?? {},
    colors: brand.colors ?? {},
    customSwatches: brand.customSwatches ?? [],
    typography: Object.fromEntries(
      Object.entries(brand.typography ?? {}).map(([lang, pair]) => [lang, { heading: pair.heading ?? null, body: pair.body ?? null }])
    ),
    logo: normalizeRef(brand.logo),
    favicon: normalizeRef(brand.favicon),
  };
}

/**
 * The brand write the local draft asks for. Colours and fonts are sent as overrides only where the
 * draft differs from the applied theme, so switching theme later still changes what was never
 * customised. The display name falls back to the business's own name (publish requires one in the
 * default language) and is written in every enabled language.
 */
export function brandInputFromDraft(
  draft: SiteDraft,
  ctx: {
    overview: SiteOverviewResponse;
    catalogues: CataloguesResponse | null;
    fallbackName: string | null;
    fontCodes: readonly string[];
    logo: PageMediaReference | null;
    favicon: PageMediaReference | null;
  }
): UpdateBrandInput {
  const { overview, catalogues } = ctx;
  const theme = themeColors(catalogues, overview.themeKey);
  const colors: Record<string, string> = { ...(overview.brand.colors ?? {}) };
  (Object.keys(COLOR_TOKENS) as (keyof typeof COLOR_TOKENS)[]).forEach((k) => {
    const token = COLOR_TOKENS[k];
    const value = draft.brand.colors[k];
    if (!/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(value ?? "")) return; // half-typed hex: leave as is
    if (theme[token] && theme[token].toLowerCase() === value.toLowerCase()) delete colors[token];
    else colors[token] = value.toUpperCase();
  });

  const typography: Record<string, { heading: string | null; body: string | null }> = {};
  for (const [lang, pair] of Object.entries(overview.brand.typography ?? {})) {
    if (!(DRAFT_LANGS as readonly string[]).includes(lang)) typography[lang] = { heading: pair.heading ?? null, body: pair.body ?? null };
  }
  for (const lang of DRAFT_LANGS) {
    const themed = themeFonts(catalogues, overview.themeKey, lang);
    // A value outside the catalogue is sent as unset rather than failing the save (brand.unknown-font).
    const pick = (value: string, themedValue: string | null) => {
      const code = toFontCode(value);
      if (!ctx.fontCodes.includes(code)) return null;
      return code === themedValue ? null : code;
    };
    const heading = pick(draft.brand.typography[lang].titles, themed.heading);
    const body = pick(draft.brand.typography[lang].body, themed.body);
    if (heading || body) typography[lang] = { heading, body };
  }

  const name = (draft.brand.businessName || ctx.fallbackName || "").trim();
  const displayName: LocalizedTextMap = {};
  const langs = overview.settings.enabledLanguages.length ? overview.settings.enabledLanguages : [overview.settings.defaultLanguage];
  if (name) for (const lang of langs) displayName[lang] = name;
  else Object.assign(displayName, overview.brand.displayName ?? {});

  return {
    displayName,
    colors,
    customSwatches: overview.brand.customSwatches ?? [],
    typography,
    logo: ctx.logo,
    favicon: ctx.favicon,
  };
}

/** The SEO write the local draft asks for; other languages' descriptions are kept. */
export function seoInputFromDraft(
  draft: SiteDraft,
  overview: SiteOverviewResponse,
  socialImage: PageMediaReference | null
): UpdateSiteSeoInput {
  const lang = overview.settings.defaultLanguage;
  return {
    titleTemplate: seoTitleToTemplate(draft.publish.seo.title),
    description: withText(overview.seo.description, lang, draft.publish.seo.description),
    socialImage,
    hideFromSearchEngines: draft.publish.seo.hideFromSearch ?? overview.seo.hideFromSearchEngines,
  };
}

export function seoInputFromServer(overview: SiteOverviewResponse): UpdateSiteSeoInput {
  return {
    titleTemplate: overview.seo.titleTemplate || null,
    description: overview.seo.description ?? {},
    socialImage: normalizeRef(overview.seo.socialImage),
    hideFromSearchEngines: overview.seo.hideFromSearchEngines,
  };
}

/** Preview widget ids for the server section types it can draw. */
function widgetIdFor(section: PageDraftResponse["sections"][number]): string | null {
  if (section.type === "hero") return "hero";
  const source = section.source?.sourceKey ?? section.type;
  if (source === "menu") return "menu";
  return null;
}

/** What the preview and checklist read, from the server copy. */
export function projectRemote(server: PublicLinkServer, lang: string, urls: Record<string, string>): SiteRemote {
  const { overview } = server;
  const fallback = overview.settings.defaultLanguage;
  const titleOf = (pageId: string | null | undefined) =>
    pickText(overview.pages.find((p) => p.pageId === pageId)?.title, lang, fallback);
  const visiblePages = overview.pages.filter((p) => p.visibility !== "hidden");
  const items = server.navigation?.items ?? [];
  const navItems = items.length
    ? items
        .map((item) => ({
          label: pickText(item.label, lang, fallback) || (item.target?.kind === "page" ? titleOf(item.target.pageId) : ""),
          visible: item.showInHeader,
          drawer: item.showInDrawer,
        }))
        .filter((item) => item.label)
    : visiblePages.map((p) => ({ label: pickText(p.title, lang, fallback), visible: true, drawer: true }));

  const homeSummary = overview.pages.find((p) => p.isHome);
  const home = homeSummary ? server.pages[homeSummary.pageId] : undefined;
  const enabled = home?.sections.filter((s) => s.enabled) ?? [];
  const heroSection = enabled.find((s) => s.type === "hero");
  let hero: SiteRemote["hero"] = null;
  if (heroSection) {
    const f = heroSection.fields ?? {};
    const text = (key: string) => {
      const v = f[key];
      return v && v.kind === "text" ? pickText(v.text, lang, fallback) || undefined : undefined;
    };
    const action = f.primaryAction;
    const bg = f.background;
    hero = {
      headline: text("title"),
      sub: text("subtitle"),
      primaryCta: action && action.kind === "link" ? pickText(action.label, lang, fallback) || undefined : undefined,
      imageUrl: bg && bg.kind === "media" && bg.media.kind === "image" ? urls[bg.media.assetId] : undefined,
    };
  }

  return {
    host: overview.address.hostname ?? null,
    status: overview.status,
    navItems,
    visiblePages: visiblePages.length,
    homeSections: enabled.map(widgetIdFor).filter((id): id is string => id !== null),
    hero,
    logoUrl: null,
  };
}

// ---- errors ---------------------------------------------------------------------------------------

const ERROR_TEXT: Record<"en" | "ar", Record<string, string>> = {
  en: {
    "publiclink.concurrency.stale": "The site was changed elsewhere. The latest copy has been loaded — please try again.",
    "publiclink.publish.blocked": "Publishing is blocked — fix the items marked as blocking in the review.",
    "publiclink.publish.display-name-missing": "Add your business name before publishing.",
    "publiclink.publish.slug-missing": "Claim your public link (address) in the Brand step before publishing.",
    "publiclink.publish.review-stale": "The site changed while publishing. Please press Publish again.",
    "publiclink.document.too-large": "The site is too large to publish. Remove some sections or images.",
    "publiclink.page.path-taken": "Another page already uses that address.",
    "publiclink.page.path-invalid": "Use lowercase letters, numbers and single hyphens for the page address.",
    "publiclink.page.path-reserved": "That page address is reserved. Choose another one.",
    "publiclink.page.too-many": "You have reached the maximum number of pages.",
    "publiclink.section.too-many": "This page already has the maximum number of sections.",
    "publiclink.section.too-many-of-type": "This page can hold only one section of that type.",
    "publiclink.starter.site-already-published": "Starter sites can only be applied before the first publish.",
    "publiclink.preview-link.limit-reached": "You already have five active preview links. Revoke one first.",
    "publiclink.version.same-as-current": "That version is already live.",
    "publiclink.seo.title-template-invalid": "The site title can't be used as a page title format.",
    "publiclink.language.not-enabled": "That language is turned off for this site.",
    "publiclink.slug.taken": "That address is taken.",
    "publiclink.slug.cooldown-active": "The address was changed recently and can't be changed again yet.",
    "entitlements.module-disabled": "Your plan does not include the Public Link website.",
    "authorization.forbidden": "You don't have permission to do that.",
  },
  ar: {
    "publiclink.concurrency.stale": "تم تعديل الموقع من مكان آخر. تم تحميل أحدث نسخة — حاول مرة أخرى.",
    "publiclink.publish.blocked": "النشر متوقف — عالج العناصر المانعة في المراجعة.",
    "publiclink.publish.display-name-missing": "أضف اسم نشاطك قبل النشر.",
    "publiclink.publish.slug-missing": "احجز رابطك العام في خطوة الهوية قبل النشر.",
    "publiclink.publish.review-stale": "تغيّر الموقع أثناء النشر. اضغط نشر مرة أخرى.",
    "publiclink.document.too-large": "الموقع أكبر من الحد المسموح للنشر. احذف بعض الأقسام أو الصور.",
    "publiclink.page.path-taken": "هناك صفحة أخرى تستخدم هذا العنوان.",
    "publiclink.page.path-invalid": "استخدم أحرفًا إنجليزية صغيرة وأرقامًا وشرطات مفردة لعنوان الصفحة.",
    "publiclink.page.path-reserved": "عنوان الصفحة هذا محجوز. اختر عنوانًا آخر.",
    "publiclink.page.too-many": "وصلت إلى الحد الأقصى لعدد الصفحات.",
    "publiclink.section.too-many": "وصلت هذه الصفحة إلى الحد الأقصى من الأقسام.",
    "publiclink.section.too-many-of-type": "لا تقبل هذه الصفحة إلا قسمًا واحدًا من هذا النوع.",
    "publiclink.starter.site-already-published": "لا يمكن تطبيق الموقع الجاهز إلا قبل أول نشر.",
    "publiclink.preview-link.limit-reached": "لديك خمسة روابط معاينة نشطة. ألغِ أحدها أولًا.",
    "publiclink.version.same-as-current": "هذه النسخة منشورة بالفعل.",
    "publiclink.seo.title-template-invalid": "لا يمكن استخدام عنوان الموقع كصيغة لعناوين الصفحات.",
    "publiclink.language.not-enabled": "هذه اللغة غير مفعّلة لهذا الموقع.",
    "publiclink.slug.taken": "هذا العنوان محجوز.",
    "publiclink.slug.cooldown-active": "تم تغيير العنوان مؤخرًا ولا يمكن تغييره الآن.",
    "entitlements.module-disabled": "باقتك لا تشمل موقع الرابط العام.",
    "authorization.forbidden": "ليست لديك صلاحية لهذا الإجراء.",
  },
};

export function describePublicLinkError(err: unknown, locale: string = "en"): string {
  const table = ERROR_TEXT[locale === "ar" ? "ar" : "en"];
  if (err instanceof PublishBlockedError) return table["publiclink.publish.blocked"];
  if (err instanceof ApiError) {
    const code = err.problem?.errorCode;
    if (code && table[code]) return table[code];
    return err.problem?.detail ?? code ?? err.message;
  }
  return err instanceof Error ? err.message : String(err);
}

const isStale = (err: unknown) => err instanceof ApiError && err.problem?.errorCode === "publiclink.concurrency.stale";
const isReviewStale = (err: unknown) => err instanceof ApiError && err.problem?.errorCode === "publiclink.publish.review-stale";

// ---- the hook ---------------------------------------------------------------------------------------

export function usePublicLinkSync(draft: SiteDraft, dispatch: (action: SiteAction) => void): PublicLinkSync {
  const { activeBusinessId: businessId } = useAuth();
  const { locale } = useI18n();
  // The API refuses to publish without a display name; the business's own name
  // stands in until the merchant types one in the Brand step.
  const { activeBusiness } = useTenantConfig();
  const fallbackName = useRef<string | null>(null);
  fallbackName.current = activeBusiness?.businessName ?? null;

  const [status, setStatus] = useState<RemoteSyncStatus>(businessId ? "loading" : "disconnected");
  const [error, setError] = useState<string | null>(null);
  const [server, setServer] = useState<PublicLinkServer | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const srv = useRef<PublicLinkServer | null>(null);
  const loaded = useRef(false);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const localeRef = useRef(locale);
  localeRef.current = locale;

  const commit = useCallback((update: (current: PublicLinkServer) => PublicLinkServer) => {
    if (!srv.current) return;
    srv.current = update(srv.current);
    setServer(srv.current);
  }, []);

  /** Folds a write's versions into the overview and the loaded pages. */
  const foldVersions = useCallback(
    (versions: DraftVersionsResponse, page?: PageDraftResponse) =>
      commit((s) => {
        const pages = { ...s.pages };
        if (page) pages[page.pageId] = page;
        for (const pv of versions.pageVersions ?? []) if (pages[pv.pageId]) pages[pv.pageId] = { ...pages[pv.pageId], version: pv.version };
        const summaries = s.overview.pages.map((p) => {
          const pv = versions.pageVersions?.find((x) => x.pageId === p.pageId);
          if (page && page.pageId === p.pageId)
            return { ...p, title: page.title, path: page.path, visibility: page.visibility, version: page.version, sectionCount: page.sections.length };
          return pv ? { ...p, version: pv.version } : p;
        });
        return { ...s, pages, overview: { ...s.overview, siteVersion: versions.siteVersion, pages: summaries, hasUnpublishedChanges: true } };
      }),
    [commit]
  );

  /** Runs one job at a time; every write's answer becomes the next write's version. */
  const run = useCallback(<T,>(job: () => Promise<T>): Promise<T> => {
    const next = queue.current.then(job);
    queue.current = next.then(
      () => undefined,
      () => undefined
    );
    return next;
  }, []);

  const fail = useCallback((err: unknown) => {
    setError(describePublicLinkError(err, localeRef.current));
    setStatus("error");
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setStatus((s) => (s === "error" ? "synced" : s));
  }, []);

  /** Mirrors what the server holds into the local draft (name, colours, fonts, slug, SEO, publish state). */
  const applyOverview = useCallback(
    (overview: SiteOverviewResponse, catalogues: CataloguesResponse | null) => {
      const lang = overview.settings.defaultLanguage;
      dispatch({ type: "patchSlug", slug: overview.address.slug ?? "" });
      const name = pickText(overview.brand.displayName, lang);
      if (name) dispatch({ type: "patchBrand", patch: { businessName: name } });
      if (catalogues) {
        const colors = { ...themeColors(catalogues, overview.themeKey), ...overview.brand.colors };
        dispatch({
          type: "patchColors",
          patch: {
            ...(colors[COLOR_TOKENS.primary] ? { primary: colors[COLOR_TOKENS.primary] } : {}),
            ...(colors[COLOR_TOKENS.light] ? { light: colors[COLOR_TOKENS.light] } : {}),
            ...(colors[COLOR_TOKENS.accent] ? { accent: colors[COLOR_TOKENS.accent] } : {}),
            ...(colors[COLOR_TOKENS.dark] ? { dark: colors[COLOR_TOKENS.dark] } : {}),
          },
        });
        for (const l of DRAFT_LANGS) {
          const themed = themeFonts(catalogues, overview.themeKey, l);
          const own = overview.brand.typography?.[l];
          const titles = own?.heading ?? themed.heading;
          const body = own?.body ?? themed.body;
          dispatch({ type: "patchTypography", locale: l, patch: { ...(titles ? { titles } : {}), ...(body ? { body } : {}) } });
        }
        dispatch({ type: "patchTheme", patch: { id: overview.themeKey } });
      }
      const seo = draftRef.current.publish.seo;
      dispatch({
        type: "patchPublish",
        patch: {
          published: overview.status === "Live",
          publishedAt: overview.live ? Date.parse(overview.live.publishedAtUtc) : null,
          seo: {
            ...seo,
            title: seoTemplateToTitle(overview.seo.titleTemplate),
            description: pickText(overview.seo.description, lang),
            hideFromSearch: overview.seo.hideFromSearchEngines,
          },
        },
      });
      // Logo / favicon / social image: show the stored asset unless a new pick is still uploading.
      const d = draftRef.current;
      const show = (ref: PageMediaReference | null, current: string | null, set: (url: string) => void) => {
        if (!ref || !businessId || isLocalMedia(current)) return;
        if (current && knownMedia(current)?.assetId === ref.assetId) return;
        mediaUrl(businessId, ref, "site").then((url) => url && set(url), () => undefined);
      };
      show(overview.brand.logo, d.brand.logoDataUrl, (logoDataUrl) => dispatch({ type: "patchBrand", patch: { logoDataUrl } }));
      show(overview.brand.favicon, d.brand.faviconDataUrl, (faviconDataUrl) => dispatch({ type: "patchBrand", patch: { faviconDataUrl } }));
      show(overview.seo.socialImage, d.publish.seo.socialImageDataUrl, (socialImageDataUrl) =>
        dispatch({ type: "patchPublish", patch: { seo: { ...draftRef.current.publish.seo, socialImageDataUrl } } })
      );
    },
    [businessId, dispatch]
  );

  /** Re-reads the whole server copy (after restore/starter, or a stale version). */
  const reload = useCallback(async () => {
    if (!businessId) return;
    const [overview, navigation, footer] = await Promise.all([
      getPublicLinkSite(businessId),
      getDraftNavigation(businessId).catch(() => null),
      getDraftFooter(businessId).catch(() => null),
    ]);
    const previous = srv.current;
    const keep = Object.keys(previous?.pages ?? {}).filter((id) => overview.pages.some((p) => p.pageId === id));
    const home = overview.pages.find((p) => p.isHome)?.pageId;
    const ids = Array.from(new Set([...(home ? [home] : []), ...keep]));
    const drafts = await Promise.all(ids.map((id) => getDraftPage(businessId, id).catch(() => null)));
    const pages: Record<string, PageDraftResponse> = {};
    drafts.forEach((p) => p && (pages[p.pageId] = p));
    srv.current = {
      overview,
      catalogues: previous?.catalogues ?? null,
      pages,
      navigation,
      footer,
      review: null,
      sources: previous?.sources ?? [],
    };
    setServer(srv.current);
    applyOverview(overview, srv.current.catalogues);
  }, [businessId, applyOverview]);

  // Hydrate: the server is the source of truth for whatever it holds.
  useEffect(() => {
    if (!businessId) {
      srv.current = null;
      setServer(null);
      setStatus("disconnected");
      dispatch({ type: "setRemote", remote: null });
      return;
    }
    let cancelled = false;
    loaded.current = false;
    setStatus("loading");
    (async () => {
      const [overview, catalogues, sources, navigation, footer] = await Promise.all([
        getPublicLinkSite(businessId),
        // A failed catalogue read keeps the fallback fonts/themes rather than blocking the builder.
        getCatalogues(businessId).catch(() => null),
        listContentSources(businessId).catch(() => [] as ContentSourceResponse[]),
        getDraftNavigation(businessId).catch(() => null),
        getDraftFooter(businessId).catch(() => null),
      ]);
      const homeId = overview.pages.find((p) => p.isHome)?.pageId;
      const home = homeId ? await getDraftPage(businessId, homeId).catch(() => null) : null;
      if (cancelled) return;
      srv.current = {
        overview,
        catalogues,
        pages: home ? { [home.pageId]: home } : {},
        navigation,
        footer,
        review: null,
        sources,
      };
      setServer(srv.current);
      applyOverview(overview, catalogues);
      loaded.current = true;
      setStatus("synced");
    })().catch((err) => !cancelled && fail(err));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  // Resolve delivery URLs of the assets the projection shows (the home hero background).
  useEffect(() => {
    if (!businessId || !server) return;
    const home = Object.values(server.pages).find((p) => p.isHome);
    const refs = (home?.sections ?? [])
      .map((s) => s.fields?.background)
      .filter((v): v is Extract<NonNullable<typeof v>, { kind: "media" }> => Boolean(v && v.kind === "media"))
      .map((v) => v.media.assetId)
      .filter((id) => !urls[id]);
    if (!refs.length) return;
    let cancelled = false;
    Promise.all(refs.map((id) => mediaUrl(businessId, { assetId: id, kind: "Image" }, "site").then((u) => [id, u] as const, () => [id, null] as const))).then(
      (pairs) => {
        if (cancelled) return;
        setUrls((prev) => {
          const next = { ...prev };
          for (const [id, u] of pairs) if (u) next[id] = u;
          return next;
        });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [businessId, server, urls]);

  // Project the server copy into the draft for the preview and checklist.
  const lastRemote = useRef<string>("");
  useEffect(() => {
    if (!server) return;
    const remote = projectRemote(server, locale, urls);
    const json = stableJson(remote);
    if (json === lastRemote.current) return;
    lastRemote.current = json;
    dispatch({ type: "setRemote", remote });
  }, [server, urls, locale, dispatch]);

  const fontCodes = useCallback(() => (srv.current?.catalogues?.fonts ?? FALLBACK_SITE_FONTS).map((f) => f.code), []);

  /**
   * Sends the brand and the SEO defaults when they differ from the server. Resolves to the first
   * image-upload failure (if any): a failed image keeps the previously saved asset so the rest of
   * the brand, the SEO and a publish still go through.
   */
  const pushOnce = useCallback(async (): Promise<unknown> => {
    const s = srv.current;
    if (!businessId || !s) return null;
    const d = draftRef.current;
    let uploadError: unknown = null;
    const media = async (src: string | null, purpose: SiteMediaPurpose, existing: PageMediaReference | null): Promise<PageMediaReference | null> => {
      if (!src) return null;
      if (isLocalMedia(src)) {
        try {
          const up = await uploadMedia(businessId, src, purpose, `${purpose}.png`, "site");
          return normalizeRef(up.ref);
        } catch (err) {
          uploadError ??= err;
          return normalizeRef(existing);
        }
      }
      return normalizeRef(knownMedia(src)) ?? normalizeRef(existing);
    };

    const brand = brandInputFromDraft(d, {
      overview: s.overview,
      catalogues: s.catalogues,
      fallbackName: fallbackName.current,
      fontCodes: fontCodes(),
      logo: await media(d.brand.logoDataUrl, "Logo", s.overview.brand.logo),
      favicon: await media(d.brand.faviconDataUrl, "Favicon", s.overview.brand.favicon),
    });
    if (stableJson(brand) !== stableJson(brandInputFromServer(s.overview.brand))) {
      const res = await updateDraftBrand(businessId, srv.current!.overview.siteVersion, brand);
      commit((c) => ({ ...c, overview: { ...c.overview, brand: res.brand } }));
      foldVersions(res.versions);
    }

    const current = srv.current!;
    const seo = seoInputFromDraft(d, current.overview, await media(d.publish.seo.socialImageDataUrl, "SocialImage", current.overview.seo.socialImage));
    if (stableJson(seo) !== stableJson(seoInputFromServer(current.overview))) {
      const res = await updateSiteSeo(businessId, current.overview.siteVersion, seo);
      commit((c) => ({ ...c, overview: { ...c.overview, seo: res.seo } }));
      foldVersions(res.versions);
    }
    return uploadError;
  }, [businessId, commit, foldVersions, fontCodes]);

  /** The push, retried once after a stale version reloads the server copy. */
  const push = useCallback(async (): Promise<unknown> => {
    try {
      return await pushOnce();
    } catch (err) {
      if (!isStale(err)) throw err;
      await reload();
      return pushOnce();
    }
  }, [pushOnce, reload]);

  // Debounced sync of what the local draft still edits (brand + SEO).
  const timer = useRef<number | null>(null);
  const fingerprint = JSON.stringify([draft.brand, draft.publish.seo]);
  useEffect(() => {
    if (!businessId || !loaded.current || !srv.current) return;
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setStatus("saving");
      run(push).then((uploadError) => (uploadError ? fail(uploadError) : setStatus("synced")), fail);
    }, SYNC_DEBOUNCE_MS);
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [businessId, fingerprint, run, push, fail]);

  /** Runs an explicit server write: queued, status tracked, stale versions reload, errors surfaced and rethrown. */
  const write = useCallback(
    async <T,>(job: (businessId: string, s: PublicLinkServer) => Promise<T>): Promise<T> => {
      if (!businessId || !srv.current) throw new Error("Public Link is not connected.");
      const b = businessId;
      setStatus("saving");
      try {
        const result = await run(() => job(b, srv.current!));
        setStatus("synced");
        return result;
      } catch (err) {
        fail(err);
        if (isStale(err)) await reload().catch(() => undefined);
        throw err;
      }
    },
    [businessId, run, fail, reload]
  );

  const applyStatus = useCallback(
    (st: SiteStatusResponse) => {
      commit((c) => ({
        ...c,
        overview: {
          ...c.overview,
          status: st.status,
          address: st.address,
          live: st.liveVersion !== null && st.lastPublishedAtUtc ? { version: st.liveVersion, publishedAtUtc: st.lastPublishedAtUtc, publishedBy: c.overview.live?.publishedBy ?? null } : c.overview.live,
        },
      }));
      dispatch({ type: "patchSlug", slug: st.address.slug ?? "" });
      dispatch({
        type: "patchPublish",
        patch: { published: st.status === "Live", publishedAt: st.lastPublishedAtUtc ? Date.parse(st.lastPublishedAtUtc) : null },
      });
    },
    [commit, dispatch]
  );

  // ---- publishing -------------------------------------------------------------------------------

  const publish = useCallback(async () => {
    if (!businessId || !srv.current) {
      dispatch({ type: "patchPublish", patch: { published: true, publishedAt: Date.now() } });
      return;
    }
    const b = businessId;
    setStatus("saving");
    try {
      const uploadError = await run(async () => {
        // Whatever is pending goes up first; a failed image does not stop the publish.
        const failed = await push();
        let review = await getDraftReview(b);
        commit((c) => ({ ...c, review }));
        const blocking = review.findings.filter((f) => f.severity === "Error");
        if (review.totals.blocking > 0) throw new PublishBlockedError(blocking);
        let res;
        try {
          res = await publishSite(b, review.reviewToken, newKey());
        } catch (err) {
          // Something moved between the review and the publish: review again, once.
          if (!isReviewStale(err)) throw err;
          review = await getDraftReview(b);
          commit((c) => ({ ...c, review }));
          if (review.totals.blocking > 0) throw new PublishBlockedError(review.findings.filter((f) => f.severity === "Error"));
          res = await publishSite(b, review.reviewToken, newKey());
        }
        applyStatus(res.status);
        const overview = await getPublicLinkSite(b).catch(() => null);
        if (overview) commit((c) => ({ ...c, overview }));
        return failed;
      });
      if (uploadError) fail(uploadError);
      else setStatus("synced");
    } catch (err) {
      fail(err);
      throw err;
    }
  }, [businessId, dispatch, run, push, commit, applyStatus, fail]);

  const unpublish = useCallback(async () => {
    if (!businessId || !srv.current) {
      dispatch({ type: "patchPublish", patch: { published: false, publishedAt: null } });
      return;
    }
    await write(async (b) => applyStatus(await unpublishSite(b)));
  }, [businessId, dispatch, write, applyStatus]);

  const listVersions = useCallback(async (): Promise<VersionSummaryResponse[]> => {
    if (!businessId) return [];
    const res = await listSiteVersions(businessId, { page: 1, pageSize: 50 });
    return res.data ?? [];
  }, [businessId]);

  const restoreVersion = useCallback(
    async (version: number): Promise<void> => {
      await write(async (b, s) => {
        await restoreSiteVersionToDraft(b, version, s.overview.siteVersion, newKey());
        await reload();
      });
    },
    [write, reload]
  );

  const getVersion = useCallback(
    async (version: number): Promise<VersionDocumentResponse> => {
      if (!businessId) throw new Error("No active business");
      return getSiteVersion(businessId, version);
    },
    [businessId]
  );

  const rollbackVersion = useCallback(
    async (version: number): Promise<void> => {
      await write(async (b, s) => {
        const res = await rollbackSiteToVersion(b, version, s.overview.siteVersion, newKey());
        applyStatus(res.status);
        const overview = await getPublicLinkSite(b).catch(() => null);
        if (overview) commit((c) => ({ ...c, overview }));
      });
    },
    [write, applyStatus, commit]
  );

  // ---- address ------------------------------------------------------------------------------------

  const checkSlug = useCallback(
    async (slug: string) => {
      if (!businessId) return { isAvailable: true, reason: null };
      const res = await checkSlugAvailability(businessId, slug);
      return { isAvailable: res.isAvailable, reason: res.reason };
    },
    [businessId]
  );

  const claimSlug = useCallback(
    async (slug: string) => {
      if (!businessId || !srv.current) {
        dispatch({ type: "patchSlug", slug });
        return;
      }
      await write(async (b) => applyStatus(await putSlug(b, slug)));
    },
    [businessId, dispatch, write, applyStatus]
  );

  // ---- theme, starter, languages ------------------------------------------------------------------

  const applyTheme = useCallback(
    async (themeKey: string) => {
      if (!businessId || !srv.current) {
        dispatch({ type: "patchTheme", patch: { id: themeKey } });
        return;
      }
      await write(async (b, s) => {
        const res = await applyDraftTheme(b, s.overview.siteVersion, themeKey);
        commit((c) => ({ ...c, overview: { ...c.overview, themeKey: res.themeKey } }));
        foldVersions(res.versions);
        applyOverview(srv.current!.overview, srv.current!.catalogues);
      });
    },
    [businessId, dispatch, write, commit, foldVersions, applyOverview]
  );

  const resetTheme = useCallback(async () => {
    await write(async (b, s) => {
      const res = await resetDraftTheme(b, s.overview.siteVersion);
      commit((c) => ({ ...c, overview: { ...c.overview, brand: res.brand } }));
      foldVersions(res.versions);
      // Section styles changed on every page: re-read the loaded ones.
      const ids = Object.keys(srv.current!.pages);
      const fresh = await Promise.all(ids.map((id) => getDraftPage(b, id).catch(() => null)));
      commit((c) => {
        const pages = { ...c.pages };
        fresh.forEach((p) => p && (pages[p.pageId] = p));
        return { ...c, pages };
      });
      applyOverview(srv.current!.overview, srv.current!.catalogues);
    });
  }, [write, commit, foldVersions, applyOverview]);

  const applyStarter = useCallback(
    async (starterKey: string) => {
      await write(async (b, s) => {
        await applyStarterApi(b, starterKey, s.overview.siteVersion, newKey());
        await reload();
      });
    },
    [write, reload]
  );

  const updateLanguages = useCallback(
    async (defaultLanguage: string, enabledLanguages: string[]) => {
      await write(async (b, s) => {
        const res = await updateSiteSettings(b, s.overview.siteVersion, defaultLanguage, enabledLanguages);
        commit((c) => ({ ...c, overview: { ...c.overview, settings: res.settings } }));
        foldVersions(res.versions);
      });
    },
    [write, commit, foldVersions]
  );

  // ---- pages --------------------------------------------------------------------------------------

  const loadPage = useCallback(
    async (pageId: string): Promise<PageDraftResponse | null> => {
      if (!businessId || !srv.current) return null;
      const page = await getDraftPage(businessId, pageId);
      commit((c) => ({ ...c, pages: { ...c.pages, [page.pageId]: page } }));
      return page;
    },
    [businessId, commit]
  );

  const refreshNavigationAndFooter = useCallback(
    async (b: string) => {
      const [navigation, footer] = await Promise.all([getDraftNavigation(b).catch(() => null), getDraftFooter(b).catch(() => null)]);
      commit((c) => ({ ...c, navigation: navigation ?? c.navigation, footer: footer ?? c.footer }));
    },
    [commit]
  );

  const createPage = useCallback(
    async (input: CreatePageInput) =>
      write(async (b, s) => {
        const res = await createDraftPage(b, s.overview.siteVersion, input);
        commit((c) => ({ ...c, overview: { ...c.overview, pages: res.pages }, pages: { ...c.pages, [res.page.pageId]: res.page } }));
        foldVersions(res.versions);
        if (input.addToNavigation) await refreshNavigationAndFooter(b);
        return res.page;
      }),
    [write, commit, foldVersions, refreshNavigationAndFooter]
  );

  /** A page's current version, loading the page first if needed. */
  const pageVersion = useCallback(async (b: string, pageId: string) => {
    const known = srv.current?.pages[pageId];
    if (known) return known.version;
    const page = await getDraftPage(b, pageId);
    srv.current = srv.current ? { ...srv.current, pages: { ...srv.current.pages, [pageId]: page } } : srv.current;
    return page.version;
  }, []);

  const updatePage = useCallback(
    async (pageId: string, input: UpdatePageInput) => {
      await write(async (b) => {
        const res = await updateDraftPage(b, pageId, await pageVersion(b, pageId), input);
        foldVersions(res.versions, res.page);
      });
    },
    [write, pageVersion, foldVersions]
  );

  const deletePage = useCallback(
    async (pageId: string) => {
      await write(async (b, s) => {
        const res = await deleteDraftPage(b, pageId, s.overview.siteVersion);
        commit((c) => {
          const pages = { ...c.pages };
          delete pages[pageId];
          return { ...c, pages, overview: { ...c.overview, pages: res.pages } };
        });
        foldVersions(res.versions);
        if (res.removedNavigationItems || res.removedFooterLinks) await refreshNavigationAndFooter(b);
      });
    },
    [write, commit, foldVersions, refreshNavigationAndFooter]
  );

  const reorderPages = useCallback(
    async (orderedPageIds: string[]) => {
      await write(async (b, s) => {
        const home = s.overview.pages.find((p) => p.isHome)?.pageId;
        const res = await reorderDraftPages(b, s.overview.siteVersion, orderedPageIds.filter((id) => id !== home));
        commit((c) => ({ ...c, overview: { ...c.overview, pages: res.pages } }));
        foldVersions(res.versions);
      });
    },
    [write, commit, foldVersions]
  );

  // ---- sections -----------------------------------------------------------------------------------

  const addSection = useCallback(
    async (pageId: string, input: AddPageSectionInput) =>
      write(async (b) => {
        const res = await addPageSection(b, pageId, await pageVersion(b, pageId), input);
        foldVersions(res.versions, res.page);
        return res.sectionId;
      }),
    [write, pageVersion, foldVersions]
  );

  const updateSection = useCallback(
    async (pageId: string, sectionId: string, input: UpdatePageSectionInput) => {
      await write(async (b) => {
        const res = await updatePageSection(b, pageId, sectionId, await pageVersion(b, pageId), input);
        foldVersions(res.versions, res.page);
      });
    },
    [write, pageVersion, foldVersions]
  );

  const setSectionEnabled = useCallback(
    async (pageId: string, sectionId: string, enabled: boolean) => {
      await write(async (b) => {
        const res = await setPageSectionEnabled(b, pageId, sectionId, await pageVersion(b, pageId), enabled);
        foldVersions(res.versions, res.page);
      });
    },
    [write, pageVersion, foldVersions]
  );

  const removeSection = useCallback(
    async (pageId: string, sectionId: string) => {
      await write(async (b) => {
        const res = await removePageSection(b, pageId, sectionId, await pageVersion(b, pageId));
        foldVersions(res.versions, res.page);
      });
    },
    [write, pageVersion, foldVersions]
  );

  const reorderSections = useCallback(
    async (pageId: string, orderedSectionIds: string[]) => {
      await write(async (b) => {
        const res = await reorderPageSections(b, pageId, await pageVersion(b, pageId), orderedSectionIds);
        foldVersions(res.versions, res.page);
      });
    },
    [write, pageVersion, foldVersions]
  );

  // ---- navigation and footer ----------------------------------------------------------------------

  const saveNavigation = useCallback(
    async (input: ReplaceNavigationInput) => {
      await write(async (b, s) => {
        const res = await replaceDraftNavigation(b, s.overview.siteVersion, input);
        commit((c) => ({ ...c, navigation: res }));
        foldVersions(res.versions);
      });
    },
    [write, commit, foldVersions]
  );

  const saveFooter = useCallback(
    async (input: ReplaceFooterInput) => {
      await write(async (b, s) => {
        const res = await replaceDraftFooter(b, s.overview.siteVersion, input);
        commit((c) => ({ ...c, footer: res }));
        foldVersions(res.versions);
      });
    },
    [write, commit, foldVersions]
  );

  // ---- review and preview links -------------------------------------------------------------------

  const refreshReview = useCallback(async (): Promise<ReviewResponse | null> => {
    if (!businessId || !srv.current) return null;
    const b = businessId;
    // Queued behind any pending write, so the review sees it.
    const review = await run(() => getDraftReview(b));
    commit((c) => ({ ...c, review }));
    return review;
  }, [businessId, run, commit]);

  const createPreviewLink = useCallback(
    async (label: string | null, expiresInDays: number) => {
      if (!businessId || !srv.current) return null;
      const b = businessId;
      try {
        // Flush pending brand edits so the shared draft is the one on screen.
        return await run(async () => {
          await push();
          return createPreviewLinkApi(b, { label, expiresInDays });
        });
      } catch (err) {
        fail(err);
        throw err;
      }
    },
    [businessId, run, push, fail]
  );

  const listPreviewLinks = useCallback(async (): Promise<PreviewLinkResponse[]> => {
    if (!businessId) return [];
    const res = await listPreviewLinksApi(businessId, { status: "active", page: 1, pageSize: 20 });
    return res.data ?? [];
  }, [businessId]);

  const revokePreviewLink = useCallback(
    async (linkId: string) => {
      await write(async (b) => {
        await revokePreviewLinkApi(b, linkId);
      });
    },
    [write]
  );

  const revokeAllPreviewLinks = useCallback(async () => {
    await write(async (b) => {
      await revokeAllPreviewLinksApi(b);
    });
  }, [write]);

  // ---- media --------------------------------------------------------------------------------------

  const uploadSiteImage = useCallback(
    async (src: string, purpose: SiteMediaPurpose) => {
      if (!businessId) throw new Error("No active business");
      const up = await uploadMedia(businessId, src, purpose, `${purpose}.png`, "site");
      setUrls((prev) => ({ ...prev, [up.ref.assetId]: up.url }));
      return { assetId: up.ref.assetId, kind: (up.ref.kind.toLowerCase() === "video" ? "video" : "image") as "image" | "video", url: up.url };
    },
    [businessId]
  );

  const siteMediaUrl = useCallback(
    async (assetId: string) => {
      if (!businessId) return null;
      if (urls[assetId]) return urls[assetId];
      const url = await mediaUrl(businessId, { assetId, kind: "Image" }, "site").catch(() => null);
      if (url) setUrls((prev) => ({ ...prev, [assetId]: url }));
      return url;
    },
    [businessId, urls]
  );

  const connectableContent = useMemo(
    () =>
      (server?.sources ?? []).flatMap((s) =>
        s.items.map((i) => ({ sourceKey: s.sourceKey, contentKey: i.contentKey, displayName: i.displayName }))
      ),
    [server?.sources]
  );

  const fonts = server?.catalogues?.fonts?.length ? server.catalogues.fonts : FALLBACK_SITE_FONTS;

  return {
    status,
    error,
    clearError,
    connected: Boolean(businessId && server),
    server,
    editLanguage: server?.overview.settings.defaultLanguage ?? (locale === "ar" ? "ar" : "en"),
    publish,
    unpublish,
    checkSlug,
    claimSlug,
    connectableContent,
    listVersions,
    restoreVersion,
    getVersion,
    rollbackVersion,
    fonts,
    applyTheme,
    resetTheme,
    applyStarter,
    updateLanguages,
    loadPage,
    createPage,
    updatePage,
    deletePage,
    reorderPages,
    addSection,
    updateSection,
    setSectionEnabled,
    removeSection,
    reorderSections,
    saveNavigation,
    saveFooter,
    refreshReview,
    createPreviewLink,
    listPreviewLinks,
    revokePreviewLink,
    revokeAllPreviewLinks,
    uploadSiteImage,
    siteMediaUrl,
  };
}
