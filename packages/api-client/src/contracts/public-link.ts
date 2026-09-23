// Mirrors Octopus.Modules.PublicLink.Contracts (camelCase JSON). Guid -> string, DateTimeOffset -> ISO string.
// Every draft-mutating body carries expectedVersion = PublicSiteResponse.contentVersion.

export type PublicSiteStatus = "Draft" | "Live";
export type SiteMediaKind = "Image" | "Video";
export type SiteMediaPurpose = "Logo" | "Favicon" | "HeroBackground" | "SectionImage";
/** Built-in section codes; a source-bound section uses its sourceKey (e.g. "menu") as type instead. */
export type BuiltInSectionType = "hero" | "about" | "contact" | "cta" | "testimonials" | "gallery" | "social-feed";

export interface ClaimSlugRequest {
  slug: string;
}

export interface SlugAvailabilityResponse {
  slug: string;
  isAvailable: boolean;
  reason: string | null;
}

export interface MediaReferenceRequest {
  assetId: string;
  kind: SiteMediaKind;
}

export interface MediaReferenceResponse {
  assetId: string;
  kind: SiteMediaKind;
  /** Resolved only on the published read (and public-site); null on the draft. */
  url: string | null;
}

export interface TypographyRequest {
  titleEnglish?: string | null;
  bodyEnglish?: string | null;
  titleArabic?: string | null;
  bodyArabic?: string | null;
}

export interface TypographyResponse {
  titleEnglish: string | null;
  bodyEnglish: string | null;
  titleArabic: string | null;
  bodyArabic: string | null;
}

export interface BrandResponse {
  displayName: string | null;
  /** Keyed by ColorTokenResponse.key. */
  colors: Record<string, string>;
  customSwatches: string[];
  typography: TypographyResponse;
  logo: MediaReferenceResponse | null;
  favicon: MediaReferenceResponse | null;
  heroBackground: MediaReferenceResponse | null;
}

/** Client-facing brand patch; expectedVersion is supplied separately to updateDraftBrand. */
export interface UpdateBrandInput {
  displayName?: string | null;
  colors?: Record<string, string> | null;
  customSwatches?: string[] | null;
  typography?: TypographyRequest | null;
  /** null clears the media reference. */
  logo?: MediaReferenceRequest | null;
  favicon?: MediaReferenceRequest | null;
  heroBackground?: MediaReferenceRequest | null;
}

export interface UpdateBrandRequest extends UpdateBrandInput {
  expectedVersion: number;
}

export interface SectionBindingResponse {
  sourceKey: string;
  contentKey: string;
}

/** content/style/sourceSettings are opaque JSON (JsonElement). */
export type SectionJson = Record<string, unknown> | unknown[] | string | number | boolean | null;

export interface SiteSectionResponse {
  sectionId: string;
  type: string;
  enabled: boolean;
  content: SectionJson | null;
  style: SectionJson | null;
  binding: SectionBindingResponse | null;
  sourceSettings: SectionJson | null;
}

export interface PublicSiteResponse {
  businessId: string;
  slug: string | null;
  publicHostname: string | null;
  publicUrl: string | null;
  status: PublicSiteStatus;
  /** Required as expectedVersion on every draft mutation, publish, rollback and restore-draft. */
  contentVersion: number;
  hasUnpublishedChanges: boolean;
  currentPublicationVersion: number | null;
  brand: BrandResponse;
  sections: SiteSectionResponse[];
  lastPublishedAtUtc: string | null;
  slugChangeAllowedAtUtc: string | null;
}

export interface AddSectionInput {
  type: string;
  content?: SectionJson | null;
  style?: SectionJson | null;
  /** sourceKey + contentKey together bind the section to another module's content. */
  sourceKey?: string | null;
  contentKey?: string | null;
  sourceSettings?: SectionJson | null;
}

export interface AddSectionRequest extends AddSectionInput {
  expectedVersion: number;
}

export interface UpdateSectionInput {
  content?: SectionJson | null;
  style?: SectionJson | null;
  sourceSettings?: SectionJson | null;
}

export interface UpdateSiteSectionRequest extends UpdateSectionInput {
  expectedVersion: number;
}

export interface SetSectionEnabledRequest {
  enabled: boolean;
  expectedVersion: number;
}

export interface ReorderSiteSectionsRequest {
  orderedSectionIds: string[];
  expectedVersion: number;
}

export interface ConnectableContentItemResponse {
  contentKey: string;
  displayName: string;
  updatedAtUtc: string;
  entryCount: number;
}

export interface ContentSourceResponse {
  sourceKey: string;
  items: ConnectableContentItemResponse[];
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
  kind: SiteMediaKind;
  format: string;
  bytes: number;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  deliveryUrl: string;
}

export interface VersionSummaryResponse {
  version: number;
  publishedAtUtc: string;
  publishedBy: string | null;
  label: string | null;
  isLive: boolean;
}

/** Raw paged shape (NOT the ListEnvelope used by other modules). */
export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface ListVersionsParams {
  page?: number;
  pageSize?: number;
}

export interface PublicSitePublicationResponse {
  version: number;
  schemaVersion: number;
  brand: BrandResponse;
  sections: SiteSectionResponse[];
  contentHash: string;
  sourceVersion: number | null;
  label: string | null;
  publishedAtUtc: string;
  publishedBy: string | null;
  isLive: boolean;
}

export interface PublishResponse {
  unchanged: boolean;
  publication: PublicSitePublicationResponse;
  site: PublicSiteResponse;
}

export interface PublishRequest {
  expectedVersion: number;
}
export interface RollbackRequest {
  expectedVersion: number;
}
export interface RestoreDraftRequest {
  expectedVersion: number;
}

/** Anonymous read; brand media carry resolved urls, sections are enabled + available only. */
export interface PublishedSiteResponse {
  slug: string;
  publicHostname: string;
  brand: BrandResponse;
  sections: SiteSectionResponse[];
}
