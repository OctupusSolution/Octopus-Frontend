// Real client for the PublicLink module (US-019 "Public Link website").
// AdminApi: `/v1/businesses/{businessId}/public-link/...`; PublicApi: `GET /v1/public-site[/pages]`.
// Source of truth: Octopus.Modules.PublicLink.Api (PublicLinkApiConstants.cs + *Endpoints.cs).
//
// Versions: site-level writes take the SITE's expectedVersion, page/section writes take THAT PAGE's
// (see contracts/public-link.ts). On DELETE page / DELETE section it travels as a query param.
// Idempotency-Key is required on: publish, rollback, restore-draft, apply-starter. Creating a preview
// link is deliberately NOT idempotent. No body carries businessId (route-only).
import type {
  ApplyStarterRequest,
  ApplyThemeRequest,
  ApplyThemeResponse,
  AddPageSectionInput,
  AddPageSectionRequest,
  BrandWriteResponse,
  CataloguesResponse,
  ClaimSlugRequest,
  ContentSourceResponse,
  CreatePageInput,
  CreatePageRequest,
  CreatePageResponse,
  CreatePreviewLinkRequest,
  CreatePreviewLinkResponse,
  DeletePageResponse,
  FooterResponse,
  ListPreviewLinksParams,
  ListSiteMediaParams,
  ListVersionsParams,
  NavigationResponse,
  PageDraftResponse,
  PageListResponse,
  PageWriteResponse,
  PreviewLinkResponse,
  PublicLinkList,
  PublishedPageResponse,
  PublishedSiteResponse,
  PublishRequest,
  PublishResponse,
  ReorderPageSectionsRequest,
  ReorderPagesRequest,
  ReorderPagesResponse,
  ReplaceFooterInput,
  ReplaceFooterRequest,
  ReplaceNavigationInput,
  ReplaceNavigationRequest,
  RequestSiteMediaUploadRequest,
  ResetThemeRequest,
  ResetThemeResponse,
  RestoreDraftRequest,
  ReviewResponse,
  RevokeAllPreviewLinksResponse,
  RevokePreviewLinkResponse,
  RollbackRequest,
  RollbackResponse,
  SectionWriteResponse,
  SetPageSectionEnabledRequest,
  SiteMediaAssetDetailResponse,
  SiteMediaAssetResponse,
  SiteMediaLibraryItemResponse,
  SiteMediaUploadTicketResponse,
  SiteOverviewResponse,
  SiteSeoWriteResponse,
  SiteSettingsWriteResponse,
  SiteStatusResponse,
  SlugAvailabilityResponse,
  UpdateBrandInput,
  UpdateBrandRequest,
  UpdatePageInput,
  UpdatePageRequest,
  UpdatePageSectionInput,
  UpdatePageSectionRequest,
  UpdateSiteSeoInput,
  UpdateSiteSeoRequest,
  UpdateSiteSettingsRequest,
  VersionDocumentResponse,
  VersionSummaryResponse,
} from "../contracts/public-link";
import { apiRequest } from "./http";

const base = (businessId: string) => `/v1/businesses/${businessId}/public-link`;
const num = (value: number | undefined) => (value === undefined ? undefined : String(value));

// ---- site, address, settings, brand, theme, SEO -------------------------------------------------

/** The owner's own site. Never writes; a business with no content shows a virtual Home at version 0. */
export function getPublicLinkSite(businessId: string): Promise<SiteOverviewResponse> {
  return apiRequest<SiteOverviewResponse>(base(businessId));
}

export function checkSlugAvailability(businessId: string, slug: string): Promise<SlugAvailabilityResponse> {
  return apiRequest<SlugAvailabilityResponse>(`${base(businessId)}/slug-availability`, { query: { slug } });
}

export function putSlug(businessId: string, slug: string): Promise<SiteStatusResponse> {
  const body: ClaimSlugRequest = { slug };
  return apiRequest<SiteStatusResponse>(`${base(businessId)}/slug`, { method: "PUT", body });
}

export function updateSiteSettings(
  businessId: string,
  expectedVersion: number,
  defaultLanguage: string,
  enabledLanguages: string[],
): Promise<SiteSettingsWriteResponse> {
  const body: UpdateSiteSettingsRequest = { expectedVersion, defaultLanguage, enabledLanguages };
  return apiRequest<SiteSettingsWriteResponse>(`${base(businessId)}/draft/settings`, { method: "PUT", body });
}

/** Full replacement of identity + overrides (site version). */
export function updateDraftBrand(
  businessId: string,
  expectedVersion: number,
  input: UpdateBrandInput,
): Promise<BrandWriteResponse> {
  const body: UpdateBrandRequest = { ...input, expectedVersion };
  return apiRequest<BrandWriteResponse>(`${base(businessId)}/draft/brand`, { method: "PUT", body });
}

export function applyDraftTheme(businessId: string, expectedVersion: number, themeKey: string): Promise<ApplyThemeResponse> {
  const body: ApplyThemeRequest = { expectedVersion, themeKey };
  return apiRequest<ApplyThemeResponse>(`${base(businessId)}/draft/theme`, { method: "PUT", body });
}

export function resetDraftTheme(businessId: string, expectedVersion: number): Promise<ResetThemeResponse> {
  const body: ResetThemeRequest = { expectedVersion };
  return apiRequest<ResetThemeResponse>(`${base(businessId)}/draft/theme/reset`, { method: "POST", body });
}

export function updateSiteSeo(businessId: string, expectedVersion: number, input: UpdateSiteSeoInput): Promise<SiteSeoWriteResponse> {
  const body: UpdateSiteSeoRequest = { ...input, expectedVersion };
  return apiRequest<SiteSeoWriteResponse>(`${base(businessId)}/draft/seo`, { method: "PUT", body });
}

// ---- navigation and footer ----------------------------------------------------------------------

export function getDraftNavigation(businessId: string): Promise<NavigationResponse> {
  return apiRequest<NavigationResponse>(`${base(businessId)}/draft/navigation`);
}

export function replaceDraftNavigation(
  businessId: string,
  expectedVersion: number,
  input: ReplaceNavigationInput,
): Promise<NavigationResponse> {
  const body: ReplaceNavigationRequest = { ...input, expectedVersion };
  return apiRequest<NavigationResponse>(`${base(businessId)}/draft/navigation`, { method: "PUT", body });
}

export function getDraftFooter(businessId: string): Promise<FooterResponse> {
  return apiRequest<FooterResponse>(`${base(businessId)}/draft/footer`);
}

export function replaceDraftFooter(businessId: string, expectedVersion: number, input: ReplaceFooterInput): Promise<FooterResponse> {
  const body: ReplaceFooterRequest = { ...input, expectedVersion };
  return apiRequest<FooterResponse>(`${base(businessId)}/draft/footer`, { method: "PUT", body });
}

// ---- pages ----------------------------------------------------------------------------------------

export function listDraftPages(businessId: string): Promise<PageListResponse> {
  return apiRequest<PageListResponse>(`${base(businessId)}/draft/pages`);
}

/** Site-level change (states the site version). `templateKey` XOR `source`. */
export function createDraftPage(businessId: string, expectedVersion: number, input: CreatePageInput): Promise<CreatePageResponse> {
  const body: CreatePageRequest = { ...input, expectedVersion };
  return apiRequest<CreatePageResponse>(`${base(businessId)}/draft/pages`, { method: "POST", body });
}

export function getDraftPage(businessId: string, pageId: string): Promise<PageDraftResponse> {
  return apiRequest<PageDraftResponse>(`${base(businessId)}/draft/pages/${pageId}`);
}

/** Full replacement of a page's settings (states the PAGE version). */
export function updateDraftPage(
  businessId: string,
  pageId: string,
  expectedVersion: number,
  input: UpdatePageInput,
): Promise<PageWriteResponse> {
  const body: UpdatePageRequest = { ...input, expectedVersion };
  return apiRequest<PageWriteResponse>(`${base(businessId)}/draft/pages/${pageId}`, { method: "PUT", body });
}

/** Site-level change: `expectedVersion` is the SITE version, sent as a query param. */
export function deleteDraftPage(businessId: string, pageId: string, expectedVersion: number): Promise<DeletePageResponse> {
  return apiRequest<DeletePageResponse>(`${base(businessId)}/draft/pages/${pageId}`, {
    method: "DELETE",
    query: { expectedVersion: String(expectedVersion) },
  });
}

/** `orderedPageIds` lists every page except Home. */
export function reorderDraftPages(businessId: string, expectedVersion: number, orderedPageIds: string[]): Promise<ReorderPagesResponse> {
  const body: ReorderPagesRequest = { expectedVersion, orderedPageIds };
  return apiRequest<ReorderPagesResponse>(`${base(businessId)}/draft/pages/order`, { method: "PUT", body });
}

// ---- sections (page-scoped; every call states the PAGE version) ---------------------------------

export function addPageSection(
  businessId: string,
  pageId: string,
  expectedVersion: number,
  input: AddPageSectionInput,
): Promise<SectionWriteResponse> {
  const body: AddPageSectionRequest = { ...input, expectedVersion };
  return apiRequest<SectionWriteResponse>(`${base(businessId)}/draft/pages/${pageId}/sections`, { method: "POST", body });
}

export function updatePageSection(
  businessId: string,
  pageId: string,
  sectionId: string,
  expectedVersion: number,
  input: UpdatePageSectionInput,
): Promise<SectionWriteResponse> {
  const body: UpdatePageSectionRequest = { ...input, expectedVersion };
  return apiRequest<SectionWriteResponse>(`${base(businessId)}/draft/pages/${pageId}/sections/${sectionId}`, {
    method: "PUT",
    body,
  });
}

export function setPageSectionEnabled(
  businessId: string,
  pageId: string,
  sectionId: string,
  expectedVersion: number,
  enabled: boolean,
): Promise<SectionWriteResponse> {
  const body: SetPageSectionEnabledRequest = { expectedVersion, enabled };
  return apiRequest<SectionWriteResponse>(`${base(businessId)}/draft/pages/${pageId}/sections/${sectionId}/enabled`, {
    method: "PUT",
    body,
  });
}

export function removePageSection(
  businessId: string,
  pageId: string,
  sectionId: string,
  expectedVersion: number,
): Promise<SectionWriteResponse> {
  return apiRequest<SectionWriteResponse>(`${base(businessId)}/draft/pages/${pageId}/sections/${sectionId}`, {
    method: "DELETE",
    query: { expectedVersion: String(expectedVersion) },
  });
}

export function reorderPageSections(
  businessId: string,
  pageId: string,
  expectedVersion: number,
  orderedSectionIds: string[],
): Promise<SectionWriteResponse> {
  const body: ReorderPageSectionsRequest = { expectedVersion, orderedSectionIds };
  return apiRequest<SectionWriteResponse>(`${base(businessId)}/draft/pages/${pageId}/sections/order`, { method: "PUT", body });
}

// ---- review, catalogues, content sources ---------------------------------------------------------

/** The inspector publish uses; `reviewToken` is what `publishSite` must present. */
export function getDraftReview(businessId: string): Promise<ReviewResponse> {
  return apiRequest<ReviewResponse>(`${base(businessId)}/draft/review`);
}

/** Replaces the retired `/fonts` and `/brand/color-tokens`. */
export function getCatalogues(businessId: string): Promise<CataloguesResponse> {
  return apiRequest<CataloguesResponse>(`${base(businessId)}/catalogues`);
}

/** A bare array (not an envelope). Rate-limited: it fans out to every provider. */
export function listContentSources(businessId: string): Promise<ContentSourceResponse[]> {
  return apiRequest<ContentSourceResponse[]>(`${base(businessId)}/content-sources`);
}

// ---- media ----------------------------------------------------------------------------------------

export function requestSiteMediaUpload(
  businessId: string,
  body: RequestSiteMediaUploadRequest,
): Promise<SiteMediaUploadTicketResponse> {
  return apiRequest<SiteMediaUploadTicketResponse>(`${base(businessId)}/media-uploads`, { method: "POST", body });
}

export function completeSiteMediaUpload(businessId: string, uploadId: string): Promise<SiteMediaAssetResponse> {
  return apiRequest<SiteMediaAssetResponse>(`${base(businessId)}/media-uploads/${uploadId}/complete`, { method: "POST" });
}

export function listSiteMediaAssets(
  businessId: string,
  params: ListSiteMediaParams = {},
): Promise<PublicLinkList<SiteMediaLibraryItemResponse>> {
  return apiRequest<PublicLinkList<SiteMediaLibraryItemResponse>>(`${base(businessId)}/media-assets`, {
    query: { kind: params.kind, purpose: params.purpose, sort: params.sort, page: num(params.page), pageSize: num(params.pageSize) },
  });
}

export function getSiteMediaAsset(businessId: string, assetId: string): Promise<SiteMediaAssetDetailResponse> {
  return apiRequest<SiteMediaAssetDetailResponse>(`${base(businessId)}/media-assets/${assetId}`);
}

/** 204 on success; 409 `publiclink.media.asset-in-use` while anything still shows it. */
export function deleteSiteMediaAsset(businessId: string, assetId: string): Promise<void> {
  return apiRequest<void>(`${base(businessId)}/media-assets/${assetId}`, { method: "DELETE" });
}

// ---- starters -----------------------------------------------------------------------------------

/** Replaces pages, navigation, footer, search defaults and theme. 409 once the site was ever published. */
export function applyStarter(
  businessId: string,
  starterKey: string,
  expectedVersion: number,
  idempotencyKey: string,
): Promise<SiteOverviewResponse> {
  const body: ApplyStarterRequest = { starterKey, expectedVersion };
  return apiRequest<SiteOverviewResponse>(`${base(businessId)}/draft/apply-starter`, { method: "POST", body, idempotencyKey });
}

// ---- publishing and history -------------------------------------------------------------------------

export function publishSite(businessId: string, reviewToken: string, idempotencyKey: string): Promise<PublishResponse> {
  const body: PublishRequest = { reviewToken };
  return apiRequest<PublishResponse>(`${base(businessId)}/publish`, { method: "POST", body, idempotencyKey });
}

export function unpublishSite(businessId: string): Promise<SiteStatusResponse> {
  return apiRequest<SiteStatusResponse>(`${base(businessId)}/unpublish`, { method: "POST" });
}

export function listVersions(
  businessId: string,
  params: ListVersionsParams = {},
): Promise<PublicLinkList<VersionSummaryResponse>> {
  return apiRequest<PublicLinkList<VersionSummaryResponse>>(`${base(businessId)}/versions`, {
    query: { page: num(params.page), pageSize: num(params.pageSize) },
  });
}

export function getVersion(businessId: string, publishedVersion: number): Promise<VersionDocumentResponse> {
  return apiRequest<VersionDocumentResponse>(`${base(businessId)}/versions/${publishedVersion}`);
}

/** Copies an old publication forward as a new live version (site version). The draft is untouched. */
export function rollbackSiteToVersion(
  businessId: string,
  publishedVersion: number,
  expectedVersion: number,
  idempotencyKey: string,
): Promise<RollbackResponse> {
  const body: RollbackRequest = { expectedVersion };
  return apiRequest<RollbackResponse>(`${base(businessId)}/versions/${publishedVersion}/rollback`, {
    method: "POST",
    body,
    idempotencyKey,
  });
}

/** Copies a publication's pages back into the draft (site version); answers the new overview (+ setAside). */
export function restoreSiteVersionToDraft(
  businessId: string,
  publishedVersion: number,
  expectedVersion: number,
  idempotencyKey: string,
): Promise<SiteOverviewResponse> {
  const body: RestoreDraftRequest = { expectedVersion };
  return apiRequest<SiteOverviewResponse>(`${base(businessId)}/versions/${publishedVersion}/restore-draft`, {
    method: "POST",
    body,
    idempotencyKey,
  });
}

// ---- preview links ------------------------------------------------------------------------------

/** 201; the token is returned once. 409 `publiclink.preview-link.limit-reached` at five active. */
export function createPreviewLink(businessId: string, input: CreatePreviewLinkRequest = {}): Promise<CreatePreviewLinkResponse> {
  return apiRequest<CreatePreviewLinkResponse>(`${base(businessId)}/preview-links`, { method: "POST", body: input });
}

export function listPreviewLinks(
  businessId: string,
  params: ListPreviewLinksParams = {},
): Promise<PublicLinkList<PreviewLinkResponse>> {
  return apiRequest<PublicLinkList<PreviewLinkResponse>>(`${base(businessId)}/preview-links`, {
    query: { status: params.status, page: num(params.page), pageSize: num(params.pageSize) },
  });
}

export function revokePreviewLink(businessId: string, linkId: string): Promise<RevokePreviewLinkResponse> {
  return apiRequest<RevokePreviewLinkResponse>(`${base(businessId)}/preview-links/${linkId}/revoke`, { method: "POST" });
}

export function revokeAllPreviewLinks(businessId: string): Promise<RevokeAllPreviewLinksResponse> {
  return apiRequest<RevokeAllPreviewLinksResponse>(`${base(businessId)}/preview-links/revoke-all`, { method: "POST" });
}

// ---- anonymous public read ------------------------------------------------------------------------
// The site is resolved from the request's Host header. The draft-preview reads
// (`/public-site/preview*`) need an `X-Preview-Token` header, which apiRequest cannot send; the
// storefront (apps/customer) issues those itself.

export function getPublishedSite(lang?: string): Promise<PublishedSiteResponse> {
  return apiRequest<PublishedSiteResponse>("/v1/public-site", { query: { lang } });
}

export function getPublishedPage(path: string, lang?: string): Promise<PublishedPageResponse> {
  return apiRequest<PublishedPageResponse>("/v1/public-site/pages", { query: { path, lang } });
}
