// Real client for the PublicLink module. AdminApi: `/v1/businesses/{businessId}/public-link/...`;
// anonymous read: `GET /v1/public-site` (site resolved from the Host header).
// Source of truth: Octopus.Modules.PublicLink.Api (PublicLinkApiConstants.cs + endpoint files).
//
// Idempotency-Key is required on: publish, rollback, restore-draft. Everything else is plain.
// No command body embeds businessId (it is route-only). expectedVersion (= site.contentVersion) travels
// in the JSON body of every draft mutation, publish, rollback and restore-draft; on DELETE section it is a
// query param. Media upload/complete/get, slug, unpublish and reads take no expectedVersion.
import type {
  AddSectionInput,
  AddSectionRequest,
  ClaimSlugRequest,
  ColorTokenResponse,
  ContentSourceResponse,
  FontResponse,
  ListVersionsParams,
  PagedResult,
  PublishedSiteResponse,
  PublishRequest,
  PublishResponse,
  PublicSitePublicationResponse,
  PublicSiteResponse,
  ReorderSiteSectionsRequest,
  RequestSiteMediaUploadRequest,
  RestoreDraftRequest,
  RollbackRequest,
  SetSectionEnabledRequest,
  SiteMediaAssetResponse,
  SiteMediaUploadTicketResponse,
  SlugAvailabilityResponse,
  UpdateBrandInput,
  UpdateBrandRequest,
  UpdateSectionInput,
  UpdateSiteSectionRequest,
  VersionSummaryResponse,
} from "../contracts/public-link";
import { apiRequest } from "./http";

const base = (businessId: string) => `/v1/businesses/${businessId}/public-link`;

export function getPublicLinkSite(businessId: string): Promise<PublicSiteResponse> {
  return apiRequest<PublicSiteResponse>(base(businessId));
}

export function checkSlugAvailability(businessId: string, slug: string): Promise<SlugAvailabilityResponse> {
  return apiRequest<SlugAvailabilityResponse>(`${base(businessId)}/slug-availability`, { query: { slug } });
}

export function putSlug(businessId: string, slug: string): Promise<PublicSiteResponse> {
  const body: ClaimSlugRequest = { slug };
  return apiRequest<PublicSiteResponse>(`${base(businessId)}/slug`, { method: "PUT", body });
}

export function updateDraftBrand(
  businessId: string,
  expectedVersion: number,
  input: UpdateBrandInput,
): Promise<PublicSiteResponse> {
  const body: UpdateBrandRequest = { ...input, expectedVersion };
  return apiRequest<PublicSiteResponse>(`${base(businessId)}/draft/brand`, { method: "PUT", body });
}

export function listColorTokens(businessId: string): Promise<ColorTokenResponse[]> {
  return apiRequest<ColorTokenResponse[]>(`${base(businessId)}/brand/color-tokens`);
}

export function listFonts(businessId: string): Promise<FontResponse[]> {
  return apiRequest<FontResponse[]>(`${base(businessId)}/fonts`);
}

export function requestSiteMediaUpload(
  businessId: string,
  body: RequestSiteMediaUploadRequest,
): Promise<SiteMediaUploadTicketResponse> {
  return apiRequest<SiteMediaUploadTicketResponse>(`${base(businessId)}/media-uploads`, { method: "POST", body });
}

export function completeSiteMediaUpload(businessId: string, uploadId: string): Promise<SiteMediaAssetResponse> {
  return apiRequest<SiteMediaAssetResponse>(`${base(businessId)}/media-uploads/${uploadId}/complete`, {
    method: "POST",
  });
}

export function getSiteMediaAsset(businessId: string, assetId: string): Promise<SiteMediaAssetResponse> {
  return apiRequest<SiteMediaAssetResponse>(`${base(businessId)}/media-assets/${assetId}`);
}

export function listVersions(
  businessId: string,
  params: ListVersionsParams = {},
): Promise<PagedResult<VersionSummaryResponse>> {
  return apiRequest<PagedResult<VersionSummaryResponse>>(`${base(businessId)}/versions`, {
    query: {
      page: params.page === undefined ? undefined : String(params.page),
      pageSize: params.pageSize === undefined ? undefined : String(params.pageSize),
    },
  });
}

export function getVersion(businessId: string, publishedVersion: number): Promise<PublicSitePublicationResponse> {
  return apiRequest<PublicSitePublicationResponse>(`${base(businessId)}/versions/${publishedVersion}`);
}

export function rollbackSiteToVersion(
  businessId: string,
  publishedVersion: number,
  expectedVersion: number,
  idempotencyKey: string,
): Promise<PublicSitePublicationResponse> {
  const body: RollbackRequest = { expectedVersion };
  return apiRequest<PublicSitePublicationResponse>(`${base(businessId)}/versions/${publishedVersion}/rollback`, {
    method: "POST",
    body,
    idempotencyKey,
  });
}

export function restoreSiteVersionToDraft(
  businessId: string,
  publishedVersion: number,
  expectedVersion: number,
  idempotencyKey: string,
): Promise<PublicSiteResponse> {
  const body: RestoreDraftRequest = { expectedVersion };
  return apiRequest<PublicSiteResponse>(`${base(businessId)}/versions/${publishedVersion}/restore-draft`, {
    method: "POST",
    body,
    idempotencyKey,
  });
}

export function publishSite(
  businessId: string,
  expectedVersion: number,
  idempotencyKey: string,
): Promise<PublishResponse> {
  const body: PublishRequest = { expectedVersion };
  return apiRequest<PublishResponse>(`${base(businessId)}/publish`, { method: "POST", body, idempotencyKey });
}

export function unpublishSite(businessId: string): Promise<PublicSiteResponse> {
  return apiRequest<PublicSiteResponse>(`${base(businessId)}/unpublish`, { method: "POST" });
}

/** Anonymous; no businessId. The backend resolves the site from the request Host header. */
export function getPublishedSite(): Promise<PublishedSiteResponse> {
  return apiRequest<PublishedSiteResponse>("/v1/public-site");
}

export function addDraftSection(
  businessId: string,
  expectedVersion: number,
  input: AddSectionInput,
): Promise<PublicSiteResponse> {
  const body: AddSectionRequest = { ...input, expectedVersion };
  return apiRequest<PublicSiteResponse>(`${base(businessId)}/draft/sections`, { method: "POST", body });
}

export function updateDraftSection(
  businessId: string,
  sectionId: string,
  expectedVersion: number,
  input: UpdateSectionInput,
): Promise<PublicSiteResponse> {
  const body: UpdateSiteSectionRequest = { ...input, expectedVersion };
  return apiRequest<PublicSiteResponse>(`${base(businessId)}/draft/sections/${sectionId}`, { method: "PUT", body });
}

export function setDraftSectionEnabled(
  businessId: string,
  sectionId: string,
  expectedVersion: number,
  enabled: boolean,
): Promise<PublicSiteResponse> {
  const body: SetSectionEnabledRequest = { enabled, expectedVersion };
  return apiRequest<PublicSiteResponse>(`${base(businessId)}/draft/sections/${sectionId}/enabled`, {
    method: "PUT",
    body,
  });
}

export function removeDraftSection(
  businessId: string,
  sectionId: string,
  expectedVersion: number,
): Promise<PublicSiteResponse> {
  return apiRequest<PublicSiteResponse>(`${base(businessId)}/draft/sections/${sectionId}`, {
    method: "DELETE",
    query: { expectedVersion: String(expectedVersion) },
  });
}

export function reorderDraftSections(
  businessId: string,
  expectedVersion: number,
  orderedSectionIds: string[],
): Promise<PublicSiteResponse> {
  const body: ReorderSiteSectionsRequest = { orderedSectionIds, expectedVersion };
  return apiRequest<PublicSiteResponse>(`${base(businessId)}/draft/sections/order`, { method: "PUT", body });
}

export function listContentSources(businessId: string): Promise<ContentSourceResponse[]> {
  return apiRequest<ContentSourceResponse[]>(`${base(businessId)}/content-sources`);
}
