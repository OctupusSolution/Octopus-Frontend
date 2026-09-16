// Real client for the PublicLink module's admin endpoints — AdminApi,
// `/v1/businesses/{businessId}/public-link/...`. See
// E:\Octupus\octopus-backend\src\Modules\PublicLink\...\Sites\PublicLinkAdminEndpoints.cs
// for the source of truth; ../contracts/public-link.ts mirrors its DTOs.
import type {
  ClaimSlugRequest,
  ConnectableContentSummary,
  ConnectContentRequest,
  PublicSiteResponse,
  SlugAvailabilityResponse,
  UpdateBrandRequest,
} from "../contracts/public-link";
import { apiRequest } from "./http";

function base(businessId: string): string {
  return `/v1/businesses/${businessId}/public-link`;
}

export function getPublicLink(businessId: string): Promise<PublicSiteResponse> {
  return apiRequest<PublicSiteResponse>(base(businessId));
}

export function checkSlugAvailability(businessId: string, slug: string): Promise<SlugAvailabilityResponse> {
  return apiRequest<SlugAvailabilityResponse>(`${base(businessId)}/slug-availability`, { query: { slug } });
}

export function updateSlug(businessId: string, slug: string): Promise<PublicSiteResponse> {
  const body: ClaimSlugRequest = { slug };
  return apiRequest<PublicSiteResponse>(`${base(businessId)}/slug`, { method: "PUT", body });
}

export function updateBrand(businessId: string, patch: UpdateBrandRequest): Promise<PublicSiteResponse> {
  return apiRequest<PublicSiteResponse>(`${base(businessId)}/brand`, { method: "PUT", body: patch });
}

export function publishSite(businessId: string): Promise<PublicSiteResponse> {
  return apiRequest<PublicSiteResponse>(`${base(businessId)}/publish`, { method: "POST" });
}

export function unpublishSite(businessId: string): Promise<PublicSiteResponse> {
  return apiRequest<PublicSiteResponse>(`${base(businessId)}/unpublish`, { method: "POST" });
}

export function getConnectableContent(businessId: string): Promise<ConnectableContentSummary[]> {
  return apiRequest<ConnectableContentSummary[]>(`${base(businessId)}/connectable-content`);
}

export function connectContent(businessId: string, contentKey: string): Promise<PublicSiteResponse> {
  const body: ConnectContentRequest = { contentKey };
  return apiRequest<PublicSiteResponse>(`${base(businessId)}/content`, { method: "PUT", body });
}

export function disconnectContent(businessId: string): Promise<PublicSiteResponse> {
  return apiRequest<PublicSiteResponse>(`${base(businessId)}/content`, { method: "DELETE" });
}
