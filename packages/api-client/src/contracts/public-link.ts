// Mirrors Octopus.Modules.PublicLink.Contracts (US-019 "Public Link website"), camelCase JSON.
// Guid -> string, DateTimeOffset -> ISO string, JsonElement -> unknown/typed JSON.
//
// Versions (contracts/http-endpoints.md "Conventions"):
//   - site-level writes (settings, brand, theme, SEO, navigation, footer, create/delete/reorder
//     pages, apply-starter, rollback, restore-draft) state the SITE's `expectedVersion`
//     (`SiteOverviewResponse.siteVersion`, then `versions.siteVersion` of every write answer);
//   - page-scoped writes (a page's settings, its sections) state THAT PAGE's `expectedVersion`
//     (`PageDraftResponse.version`, then `versions.pageVersion`);
//   - publish states the review token (`ReviewResponse.reviewToken`).
// A stale value answers 409 `publiclink.concurrency.stale` carrying `currentVersion`.
import type { ListEnvelope } from "./menu-admin";

/** A text per language: `{ "ar": "…", "en": "…" }`. A blank text is absent, not "". */
export type LocalizedTextMap = Record<string, string>;

export type PublicSiteStatus = "Draft" | "Live";
/** Section-field media kinds are lowercase; `PageMediaReference.kind` is the enum name. */
export type SiteMediaKind = "Image" | "Video";
export type SiteMediaPurpose = "Logo" | "Favicon" | "HeroBackground" | "SectionImage" | "SocialImage" | "SectionVideo";
export type PageVisibility = "visible" | "hidden";
export type PageKind = "Home" | "Standard" | "SourceBound";
export type DeviceClass = "mobile" | "tablet" | "desktop";
export type LinkKind = "page" | "anchor" | "external" | "email" | "phone";
export type ReviewSeverity = "Error" | "Warning" | "Recommendation";

// ---- shared shapes ------------------------------------------------------------------------------

/** A media reference on a site-level or page-level setting (logo, favicon, social image). */
export interface PageMediaReference {
  assetId: string;
  /** "Image" | "Video" on the way out; parsed case-insensitively on the way in. */
  kind: SiteMediaKind | string;
}

export interface PageVersionEntry {
  pageId: string;
  version: number;
}

/** What every write answers with: the site's new version and, for page-scoped writes, the page's. */
export interface DraftVersionsResponse {
  siteVersion: number;
  pageVersion: number | null;
  pageVersions: PageVersionEntry[] | null;
}

/** Navigation/footer link target. Kinds are lowercase on the wire (`page`, `anchor`, `external`, `email`, `phone`). */
export interface LinkTargetDto {
  kind: LinkKind | string;
  pageId?: string | null;
  sectionId?: string | null;
  url?: string | null;
  openInNewTab?: boolean | null;
  address?: string | null;
  number?: string | null;
}

export interface ChromeWarningResponse {
  code: string;
  itemId: string | null;
}

// ---- slug / status ------------------------------------------------------------------------------

export interface ClaimSlugRequest {
  slug: string;
}

export interface SlugAvailabilityResponse {
  slug: string;
  isAvailable: boolean;
  reason: string | null;
}

export interface SiteAddressResponse {
  slug: string | null;
  hostname: string | null;
  url: string | null;
  slugChangeAllowedAtUtc: string | null;
}

/** Answer of `PUT /slug`, `POST /unpublish` and `PublishResponse.status`. */
export interface SiteStatusResponse {
  businessId: string;
  status: PublicSiteStatus;
  address: SiteAddressResponse;
  liveVersion: number | null;
  lastPublishedAtUtc: string | null;
}

// ---- site overview ------------------------------------------------------------------------------

export interface LiveVersionResponse {
  version: number;
  publishedAtUtc: string;
  publishedBy: string | null;
}

export interface SiteSettingsResponse {
  defaultLanguage: string;
  enabledLanguages: string[];
}

export interface FontPairResponse {
  heading: string | null;
  body: string | null;
}

/** The site's identity plus the owner's explicit overrides (colours and fonts are overrides, not resolved values). */
export interface BrandDraftResponse {
  displayName: LocalizedTextMap;
  logo: PageMediaReference | null;
  favicon: PageMediaReference | null;
  /** Colour overrides keyed by catalogue colour token (e.g. `core.primary`). */
  colors: Record<string, string>;
  customSwatches: string[];
  /** Font overrides keyed by language. */
  typography: Record<string, FontPairResponse>;
}

export interface SiteSeoResponse {
  titleTemplate: string | null;
  description: LocalizedTextMap;
  socialImage: PageMediaReference | null;
  hideFromSearchEngines: boolean;
}

export interface SiteLimitsResponse {
  maxPages: number;
  usedPages: number;
  maxSectionsPerPage: number;
  maxNavTopLevelItems: number;
  maxDocumentBytes: number;
  usedDocumentBytes: number;
}

export interface StarterHintResponse {
  appliedCode: string | null;
  recommendedCode: string | null;
  eligible: boolean;
}

export interface SetAsideResponse {
  pageId: string;
  path: string;
  reason: string;
}

export interface PageSourceResponse {
  sourceKey: string;
  contentKey: string;
}

export interface PageSummaryResponse {
  pageId: string;
  kind: PageKind | string;
  isHome: boolean;
  title: LocalizedTextMap;
  path: string;
  visibility: PageVisibility | string;
  version: number;
  sectionCount: number;
  source: PageSourceResponse | null;
  changedSinceLive: boolean | null;
}

/** `GET /public-link` — never writes; a business that never wrote shows a virtual Home at version 0. */
export interface SiteOverviewResponse {
  address: SiteAddressResponse;
  status: PublicSiteStatus;
  live: LiveVersionResponse | null;
  everPublished: boolean;
  hasUnpublishedChanges: boolean;
  /** The `expectedVersion` of every site-level write. */
  siteVersion: number;
  settings: SiteSettingsResponse;
  themeKey: string;
  brand: BrandDraftResponse;
  seo: SiteSeoResponse;
  pages: PageSummaryResponse[];
  limits: SiteLimitsResponse;
  starter: StarterHintResponse;
  /** Only on restore-draft: pages that could not be placed back. */
  setAside?: SetAsideResponse[] | null;
}

// ---- settings, brand, theme, SEO ----------------------------------------------------------------

export interface UpdateSiteSettingsRequest {
  expectedVersion: number;
  defaultLanguage: string;
  enabledLanguages: string[];
}

export interface SiteSettingsWriteResponse {
  settings: SiteSettingsResponse;
  versions: DraftVersionsResponse;
}

export interface FontPairRequest {
  heading: string | null;
  body: string | null;
}

/** Client-facing brand replacement; expectedVersion is supplied separately to updateDraftBrand.
 *  A full replacement of the overrides: whatever is left out is cleared. */
export interface UpdateBrandInput {
  displayName: LocalizedTextMap | null;
  colors: Record<string, string> | null;
  customSwatches: string[] | null;
  typography: Record<string, FontPairRequest> | null;
  logo: PageMediaReference | null;
  favicon: PageMediaReference | null;
}

export interface UpdateBrandRequest extends UpdateBrandInput {
  expectedVersion: number;
}

export interface BrandWriteResponse {
  brand: BrandDraftResponse;
  versions: DraftVersionsResponse;
}

/** The tokens a theme resolves to (catalogue defaults <- theme <- overrides). Also the public shell's `theme`. */
export interface PublicThemeResponse {
  key: string;
  colors: Record<string, string>;
  typography: Record<string, FontPairResponse>;
  layout: Record<string, string>;
}

export interface ApplyThemeRequest {
  expectedVersion: number;
  themeKey: string;
}

export interface ApplyThemeResponse {
  themeKey: string;
  resolvedTokens: PublicThemeResponse;
  versions: DraftVersionsResponse;
}

export interface ResetThemeRequest {
  expectedVersion: number;
}

/** Reset moves every live page's version (`versions.pageVersions`). */
export interface ResetThemeResponse {
  brand: BrandDraftResponse;
  versions: DraftVersionsResponse;
}

export interface UpdateSiteSeoInput {
  /** Must contain `{page}`, may contain `{site}`; blank/null = the page title alone. */
  titleTemplate: string | null;
  description: LocalizedTextMap | null;
  socialImage: PageMediaReference | null;
  hideFromSearchEngines: boolean;
}

export interface UpdateSiteSeoRequest extends UpdateSiteSeoInput {
  expectedVersion: number;
}

export interface SiteSeoWriteResponse {
  seo: SiteSeoResponse;
  versions: DraftVersionsResponse;
}

// ---- pages and sections -------------------------------------------------------------------------

export interface PreviousPathResponse {
  path: string;
  retiredAtUtc: string;
}

export interface PageSeoResponse {
  title: LocalizedTextMap;
  description: LocalizedTextMap;
  socialImage: PageMediaReference | null;
  hideFromSearchEngines: boolean;
}

export interface PageLayoutResponse {
  header: string | null;
  hideFooter: boolean;
}

// Typed section field values (Domain FieldValue, `kind`-discriminated). Section-field media kinds
// and link kinds are lowercase.
export interface SectionMediaRef {
  assetId: string;
  kind: "image" | "video";
}

export type SectionLinkTarget =
  | { kind: "page"; pageId: string }
  | { kind: "anchor"; pageId: string; sectionId: string }
  | { kind: "external"; url: string; openInNewTab: boolean }
  | { kind: "email"; address: string }
  | { kind: "phone"; number: string };

/** Rich text: a closed block tree per language. */
export type RichInline =
  | { kind: "text"; text: string; bold: boolean; italic: boolean; underline: boolean }
  | { kind: "link"; target: SectionLinkTarget; runs: { kind?: "text"; text: string; bold: boolean; italic: boolean; underline: boolean }[] }
  | { kind: "br" };

export type RichBlock =
  | { kind: "p"; inlines: RichInline[] }
  | { kind: "h"; level: number; inlines: RichInline[] }
  | { kind: "list"; ordered: boolean; items: RichBlock[][] }
  | { kind: "quote"; inlines: RichInline[] };

export interface RichTextDocument {
  blocks: RichBlock[];
}

export interface ColorRefValue {
  token?: string | null;
  hex?: string | null;
}

export interface SectionListItem {
  id: string;
  fields: Record<string, SectionFieldValue>;
}

export type SectionFieldValue =
  | { kind: "text"; text: LocalizedTextMap }
  | { kind: "richText"; text: Record<string, RichTextDocument> }
  | { kind: "media"; media: SectionMediaRef; alt?: LocalizedTextMap }
  | { kind: "link"; target: SectionLinkTarget; label?: LocalizedTextMap }
  | { kind: "choice"; key: string }
  | { kind: "toggle"; value: boolean }
  | { kind: "number"; value: number }
  | { kind: "color"; color: ColorRefValue }
  | { kind: "list"; items: SectionListItem[] };

export type SectionFields = Record<string, SectionFieldValue>;

/** Every member optional; null = "the theme or variant default". */
export interface SectionStyle {
  variant?: string | null;
  background?: ColorRefValue | null;
  alignment?: "start" | "center" | "end" | null;
  spacingTop?: "none" | "small" | "medium" | "large" | null;
  spacingBottom?: "none" | "small" | "medium" | "large" | null;
  width?: "contained" | "wide" | "full" | null;
}

/** Opaque, provider-validated display settings of a bound section or module page. */
export type SourceSettingsJson = Record<string, unknown> | unknown[] | string | number | boolean | null;

export interface SectionDraftResponse {
  sectionId: string;
  /** A catalogue section type, or a bound section's sourceKey. */
  type: string;
  enabled: boolean;
  /** The non-removable bound body of a module page. */
  primary: boolean;
  anchor: string | null;
  hiddenOn: DeviceClass[];
  style: SectionStyle;
  fields: SectionFields;
  source: PageSourceResponse | null;
  sourceSettings: SourceSettingsJson | null;
  /** "available" | "unavailable" on reads, when known. */
  sourceState: string | null;
}

export interface PageDraftResponse {
  pageId: string;
  kind: PageKind | string;
  isHome: boolean;
  templateKey: string | null;
  title: LocalizedTextMap;
  path: string;
  previousPaths: PreviousPathResponse[];
  visibility: PageVisibility | string;
  seo: PageSeoResponse;
  layout: PageLayoutResponse;
  source: PageSourceResponse | null;
  sourceState: string | null;
  sections: SectionDraftResponse[];
  /** The `expectedVersion` of every write to this page. */
  version: number;
  siteVersion: number;
}

export interface PageListResponse {
  siteVersion: number;
  pages: PageSummaryResponse[];
}

export interface AddToNavigationRequest {
  header: boolean;
  drawer: boolean;
}

export interface PageSourceRequest {
  sourceKey: string;
  contentKey: string;
  settings?: SourceSettingsJson;
}

/** Client-facing create-page input: `templateKey` XOR `source`. */
export interface CreatePageInput {
  templateKey?: string | null;
  source?: PageSourceRequest | null;
  title?: LocalizedTextMap | null;
  path?: string | null;
  visibility?: PageVisibility | null;
  afterPageId?: string | null;
  addToNavigation?: AddToNavigationRequest | null;
}

export interface CreatePageRequest extends CreatePageInput {
  expectedVersion: number;
}

export interface CreatePageResponse {
  page: PageDraftResponse;
  pages: PageSummaryResponse[];
  versions: DraftVersionsResponse;
  warnings: string[];
}

export interface UpdatePageSeoRequest {
  title: LocalizedTextMap | null;
  description: LocalizedTextMap | null;
  socialImage: PageMediaReference | null;
  hideFromSearchEngines: boolean;
}

export interface UpdatePageLayoutRequest {
  header: string | null;
  hideFooter: boolean;
}

/** Full replacement of a page's settings; expectedVersion (the page's) supplied separately. */
export interface UpdatePageInput {
  title: LocalizedTextMap;
  path: string;
  visibility: PageVisibility;
  seo: UpdatePageSeoRequest | null;
  layout: UpdatePageLayoutRequest | null;
  removePreviousPaths?: string[] | null;
  sourceSettings?: SourceSettingsJson;
}

export interface UpdatePageRequest extends UpdatePageInput {
  expectedVersion: number;
}

export interface PageWriteResponse {
  page: PageDraftResponse;
  versions: DraftVersionsResponse;
}

export interface DeletePageResponse {
  pages: PageSummaryResponse[];
  versions: DraftVersionsResponse;
  removedNavigationItems: number;
  removedFooterLinks: number;
  danglingSectionLinks: number;
}

export interface ReorderPagesRequest {
  expectedVersion: number;
  /** Every page except Home. */
  orderedPageIds: string[];
}

export interface ReorderPagesResponse {
  pages: PageSummaryResponse[];
  versions: DraftVersionsResponse;
}

export interface AddPageSectionInput {
  /** A catalogue section type; for a bound section, the source key (or omitted). */
  type?: string | null;
  fields?: SectionFields | null;
  style?: SectionStyle | null;
  hiddenOn?: DeviceClass[] | null;
  anchor?: string | null;
  position?: number | null;
  source?: PageSourceRequest | null;
}

export interface AddPageSectionRequest extends AddPageSectionInput {
  expectedVersion: number;
}

/** Replaces the section's field set in full. A bound section sends `fields: {}` and its `sourceSettings`. */
export interface UpdatePageSectionInput {
  fields: SectionFields;
  style?: SectionStyle | null;
  hiddenOn?: DeviceClass[] | null;
  anchor?: string | null;
  sourceSettings?: SourceSettingsJson;
}

export interface UpdatePageSectionRequest extends UpdatePageSectionInput {
  expectedVersion: number;
}

export interface SetPageSectionEnabledRequest {
  expectedVersion: number;
  enabled: boolean;
}

export interface ReorderPageSectionsRequest {
  expectedVersion: number;
  orderedSectionIds: string[];
}

export interface SectionWriteResponse {
  page: PageDraftResponse;
  /** Set by add. */
  sectionId: string | null;
  versions: DraftVersionsResponse;
}

// ---- navigation and footer ----------------------------------------------------------------------

export interface NavigationOptionsDto {
  stickyHeader: boolean;
  showActivePageIndicator: boolean;
  showIcons: boolean;
  openLinksInSameTab: boolean;
}

export interface NavItemDto {
  /** Omit for a new item; the server assigns one. */
  id?: string | null;
  /** Empty = the target page's title. */
  label?: LocalizedTextMap | null;
  /** Null = a group (needs children). Navigation accepts page, anchor, external. */
  target?: LinkTargetDto | null;
  icon?: string | null;
  showInHeader: boolean;
  showInDrawer: boolean;
  /** One level only. */
  children?: NavItemDto[] | null;
}

export interface ReplaceNavigationInput {
  items: NavItemDto[];
  options: NavigationOptionsDto | null;
}

export interface ReplaceNavigationRequest extends ReplaceNavigationInput {
  expectedVersion: number;
}

export interface NavigationResponse {
  items: NavItemDto[];
  options: NavigationOptionsDto;
  versions: DraftVersionsResponse;
  warnings: ChromeWarningResponse[];
}

export interface FooterLinkDto {
  id?: string | null;
  label?: LocalizedTextMap | null;
  target: LinkTargetDto;
}

export interface FooterGroupDto {
  id?: string | null;
  title?: LocalizedTextMap | null;
  links?: FooterLinkDto[] | null;
}

export interface SocialLinkDto {
  /** A catalogue social network key. */
  network: string;
  /** https, on that network's host. */
  url: string;
}

export interface FooterContactDto {
  address?: LocalizedTextMap | null;
  hours?: LocalizedTextMap | null;
  phone?: LocalizedTextMap | null;
}

export interface ReplaceFooterInput {
  groups: FooterGroupDto[];
  socialLinks: SocialLinkDto[];
  contact: FooterContactDto | null;
}

export interface ReplaceFooterRequest extends ReplaceFooterInput {
  expectedVersion: number;
}

export interface FooterResponse {
  groups: FooterGroupDto[];
  socialLinks: SocialLinkDto[];
  contact: FooterContactDto;
  versions: DraftVersionsResponse;
  warnings: ChromeWarningResponse[];
}

// ---- review, catalogues, content sources ---------------------------------------------------------

export interface ReviewFindingResponse {
  code: string;
  severity: ReviewSeverity | string;
  subjectKind: string;
  pageId: string | null;
  sectionId: string | null;
  itemId: string | null;
  field: string | null;
  language: string | null;
  sourceKey: string | null;
  contentKey: string | null;
  details: Record<string, unknown> | null;
}

export interface ReviewTotalsResponse {
  blocking: number;
  warnings: number;
  recommendations: number;
}

export interface ReviewResponse {
  siteVersion: number;
  /** The draft fingerprint publish must present. */
  reviewToken: string;
  findings: ReviewFindingResponse[];
  totals: ReviewTotalsResponse;
  countsByCode: Record<string, number>;
  truncated: boolean;
}

export type CatalogueFieldKind =
  | "Text"
  | "RichText"
  | "Media"
  | "Link"
  | "Choice"
  | "Toggle"
  | "Number"
  | "Color"
  | "List";

export interface CatalogueChoice {
  key: string;
  labelKey: string;
}

export interface CatalogueFieldDefinition {
  key: string;
  /** Serialised enum name (e.g. "Text"); compare case-insensitively. */
  kind: CatalogueFieldKind | string;
  labelKey: string;
  required: boolean;
  maxLength: number | null;
  multiline: boolean;
  choices: CatalogueChoice[];
  min: number | null;
  max: number | null;
  step: number | null;
  mediaKinds: string[];
  mediaPurposes: string[];
  linkKinds: string[];
  allowCustomColor: boolean;
  maxItems: number | null;
  itemFields: CatalogueFieldDefinition[];
  default: unknown;
  legacyKeys: string[];
}

export interface CatalogueSectionType {
  key: string;
  labelKey: string;
  category: string;
  maxPerPage: number | null;
  variants: CatalogueChoice[];
  defaultVariant: string | null;
  fields: CatalogueFieldDefinition[];
}

export interface CataloguePageTemplate {
  key: string;
  labelKey: string;
  defaultTitle: LocalizedTextMap;
  defaultPath: string | null;
  sections: { type: string; variant: string | null; fields: Record<string, unknown> }[];
}

export interface CatalogueTheme {
  key: string;
  category: string;
  recommended: boolean;
  labelKey: string;
  previewImages: string[];
  colors: Record<string, string>;
  fonts: Record<string, { heading: string | null; body: string | null }>;
  layout: Record<string, string>;
  sectionVariants: Record<string, string>;
}

export interface CatalogueStarter {
  key: string;
  businessTypes: string[];
  themeKey: string;
  languages: { default: string; enabled: string[] };
  pages: { ref: string; template: string; title: LocalizedTextMap | null; path: string | null }[];
  navigation: unknown[];
  footer: unknown[];
}

export interface ColorTokenResponse {
  key: string;
  group: string;
  labelKey: string;
  defaultValue: string;
}

export interface FontResponse {
  code: string;
  displayName: string;
}

export interface CatalogueLanguage {
  code: string;
  direction: "ltr" | "rtl" | string;
}

export interface CatalogueLimits {
  maxPages: number;
  maxSectionsPerPage: number;
  maxNavTopLevelItems: number;
  maxNavChildren: number;
  maxFooterGroups: number;
  maxFooterLinksPerGroup: number;
  maxSocialLinks: number;
  maxPreviousPaths: number;
  maxCustomSwatches: number;
  maxDocumentBytes: number;
}

/** `GET /catalogues` — everything the builder offers. Replaces `/fonts` and `/brand/color-tokens`. */
export interface CataloguesResponse {
  eTag: string;
  sectionTypes: CatalogueSectionType[];
  pageTemplates: CataloguePageTemplate[];
  themes: CatalogueTheme[];
  fonts: FontResponse[];
  colorTokens: ColorTokenResponse[];
  languages: CatalogueLanguage[];
  icons: CatalogueChoice[];
  socialNetworks: { key: string; labelKey: string; allowedHosts: string[] }[];
  starters: CatalogueStarter[];
  limits: CatalogueLimits;
  defaultThemeKey: string;
}

export interface ContentUsageResponse {
  pageId: string | null;
  sectionCount: number;
}

export interface ConnectableContentItemResponse {
  contentKey: string;
  displayName: string;
  displayNames?: LocalizedTextMap | null;
  updatedAtUtc: string;
  entryCount: number;
  usage: ContentUsageResponse;
}

export interface ContentSourceDescriptorResponse {
  displayNameKey: string;
  iconKey: string;
  /** "Page" and/or "Section". */
  placements: string[];
  maxPagesPerContentKey: number;
  suggestedPathSegment: string | null;
}

export interface ContentSourceResponse {
  sourceKey: string;
  descriptor: ContentSourceDescriptorResponse;
  items: ConnectableContentItemResponse[];
}

// ---- media --------------------------------------------------------------------------------------

export interface RequestSiteMediaUploadRequest {
  purpose: SiteMediaPurpose;
  fileName: string;
  contentType: string;
  bytes: number;
}

export interface SiteMediaUploadTicketResponse {
  uploadId: string;
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  publicId: string;
  allowedFormats: string[];
  resourceType: string;
  expiresAtUtc: string;
}

export interface SiteMediaAssetResponse {
  assetId: string;
  kind: SiteMediaKind | string;
  format: string;
  bytes: number;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  deliveryUrl: string;
}

export interface SiteMediaLibraryItemResponse extends SiteMediaAssetResponse {
  purpose: SiteMediaPurpose | string | null;
  createdAtUtc: string;
}

export interface SiteMediaUsageResponse {
  draft: { pageId: string | null; sectionId: string | null; field: string }[];
  publishedVersions: number[];
}

export interface SiteMediaAssetDetailResponse extends SiteMediaLibraryItemResponse {
  usage: SiteMediaUsageResponse;
  isDeletable: boolean;
}

export interface ListSiteMediaParams {
  kind?: "image" | "video";
  purpose?: SiteMediaPurpose;
  /** `-createdAt` (default), `createdAt`, `-bytes`, `bytes`. */
  sort?: string;
  page?: number;
  pageSize?: number;
}

// ---- starters, publishing, history ----------------------------------------------------------------

export interface ApplyStarterRequest {
  starterKey: string;
  expectedVersion: number;
}

export interface VersionSummaryResponse {
  version: number;
  schemaVersion: number;
  publishedAtUtc: string;
  publishedBy: string | null;
  label: string | null;
  isLive: boolean;
}

export interface ListVersionsParams {
  page?: number;
  pageSize?: number;
}

/** The whole-site snapshot, upcast to schema 2: `{ schemaVersion, site, pages[] }`. Read defensively. */
export interface PublicationDocument {
  schemaVersion?: number;
  site?: {
    settings?: {
      languages?: { default?: string; enabled?: string[] };
      identity?: { displayName?: LocalizedTextMap; logo?: SectionMediaRef | null; favicon?: SectionMediaRef | null };
      theme?: {
        themeKey?: string;
        colorOverrides?: Record<string, string>;
        fontOverrides?: Record<string, { heading?: string | null; body?: string | null }>;
      };
    };
    pageOrder?: string[];
  };
  pages?: {
    id?: string;
    kind?: string;
    title?: LocalizedTextMap;
    path?: string;
    visibility?: string;
    sections?: { id?: string; type?: string; enabled?: boolean }[];
  }[];
}

export interface VersionDocumentResponse extends VersionSummaryResponse {
  contentHash: string;
  document: PublicationDocument;
}

export interface PublishRequest {
  reviewToken: string;
}

export interface PublishResponse {
  unchanged: boolean;
  publication: VersionSummaryResponse;
  warnings: ReviewFindingResponse[];
  status: SiteStatusResponse;
}

export interface RollbackRequest {
  expectedVersion: number;
}

export interface RollbackResponse {
  publication: VersionSummaryResponse;
  status: SiteStatusResponse;
  pagesChanged: string[];
}

export interface RestoreDraftRequest {
  expectedVersion: number;
}

// ---- preview links --------------------------------------------------------------------------------

export interface CreatePreviewLinkRequest {
  label?: string | null;
  /** 1–30, default 7. */
  expiresInDays?: number | null;
}

/** The secret (`token`, inside `previewUrl`) is returned once and never again. */
export interface CreatePreviewLinkResponse {
  linkId: string;
  token: string;
  previewUrl: string;
  expiresAtUtc: string;
}

export interface PreviewLinkResponse {
  linkId: string;
  label: string | null;
  createdAtUtc: string;
  createdBy: string | null;
  expiresAtUtc: string;
  revokedAtUtc: string | null;
  /** "active" | "expired" | "revoked". */
  status: string;
}

export interface ListPreviewLinksParams {
  status?: "active" | "all";
  page?: number;
  pageSize?: number;
}

export interface RevokePreviewLinkResponse {
  linkId: string;
  status: string;
}

export interface RevokeAllPreviewLinksResponse {
  revokedCount: number;
}

export type PublicLinkList<T> = ListEnvelope<T>;

// ---- anonymous public read (PublicApi) ------------------------------------------------------------
// Nothing here ever carries a contentKey; a bound section exposes only an opaque publicLinkKey.

export interface PublicLanguageResponse {
  code: string;
  direction: "ltr" | "rtl" | string;
}

export interface PublicMediaResponse {
  url: string;
  width: number | null;
  height: number | null;
}

export interface PublicBrandResponse {
  displayName: string;
  logo: PublicMediaResponse | null;
  favicon: PublicMediaResponse | null;
}

export interface PublicSeoResponse {
  titleTemplate: string | null;
  defaultTitle: string;
  defaultDescription: string | null;
  socialImageUrl: string | null;
  noIndex: boolean;
}

export interface PublicNavItemResponse {
  label: string;
  iconKey: string | null;
  href: string | null;
  kind: string;
  openInNewTab: boolean;
  showInHeader: boolean;
  showInDrawer: boolean;
  children: PublicNavItemResponse[];
}

export interface PublicNavigationResponse {
  options: NavigationOptionsDto;
  items: PublicNavItemResponse[];
}

export interface PublicFooterLinkResponse {
  label: string;
  href: string;
  kind: string;
  openInNewTab: boolean;
}

export interface PublicFooterResponse {
  groups: { title: string; links: PublicFooterLinkResponse[] }[];
  socialLinks: SocialLinkDto[];
  contact: { address: string | null; hours: string | null; phone: string | null };
}

export interface PublicPageIndexEntryResponse {
  path: string;
  title: string;
  isHome: boolean;
  noIndex: boolean;
  lastModifiedUtc: string;
}

export interface PreviewInfoResponse {
  siteVersion: number;
  expiresAtUtc: string;
}

/** `GET /v1/public-site?lang=` (and `/public-site/preview`) — the site shell, addressed by the Host header. */
export interface PublishedSiteResponse {
  host: string;
  canonicalBaseUrl: string;
  language: string;
  direction: "ltr" | "rtl" | string;
  defaultLanguage: string;
  languages: PublicLanguageResponse[];
  theme: PublicThemeResponse;
  brand: PublicBrandResponse;
  seo: PublicSeoResponse;
  navigation: PublicNavigationResponse;
  footer: PublicFooterResponse;
  pages: PublicPageIndexEntryResponse[];
  isPreview: boolean;
  preview?: PreviewInfoResponse | null;
}

export interface PublicSourceResponse {
  sourceKey: string;
  version: number | null;
  publicLinkKey: string | null;
  settings: SourceSettingsJson | null;
}

export interface PublicSectionResponse {
  sectionId: string;
  type: string;
  anchor: string | null;
  styleVariant: string | null;
  style: SectionStyle;
  fields: SectionFields;
  source: PublicSourceResponse | null;
}

export interface PublicPageResponse {
  pageId: string;
  path: string;
  isHome: boolean;
  kind: string;
  title: string;
  seo: { title: string; description: string | null; socialImageUrl: string | null; noIndex: boolean; canonicalUrl: string };
  layout: PageLayoutResponse;
  source: PublicSourceResponse | null;
  sections: PublicSectionResponse[];
  lastModifiedUtc: string;
}

/** `GET /v1/public-site/pages?path=&lang=` — a page, or a 200 redirect payload for an old/non-canonical path. */
export interface PublishedPageResponse {
  type: "page" | "redirect";
  language: string;
  page: PublicPageResponse | null;
  redirect: { location: string; permanent: boolean } | null;
  preview?: PreviewInfoResponse | null;
}
