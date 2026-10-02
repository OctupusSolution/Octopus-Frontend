// Real client for the CRM module's AdminApi: `/v1/businesses/{businessId}/crm/...`.
// Source of truth: E:\Octupus\octopus-backend\src\Modules\Crm\Octopus.Modules.Crm.Api
// (CrmApiConstants.cs has every route string).
//
// Every call needs the `crm:core` feature and
// the matching permission (customers.read/create/manage/block/delete/merge,
// tags.manage); without them the backend answers 403
// `entitlements.feature-disabled` / `authorization.forbidden`.
//
// Idempotency-Key is required on createCrmCustomer only. Bodies that bind to a
// backend command carry businessId; the route guard 400s if it disagrees with the
// URL, so createCrmCustomer fills it in and callers never pass it.
// expectedVersion is REQUIRED on every customer mutation that takes one.
import type { ListEnvelope } from "../contracts/menu-admin";
import type {
  BulkDeleteCrmCustomersRequest,
  BulkTagCrmCustomersRequest,
  BulkTagCrmCustomersResponse,
  CreateCrmCampaignDraftRequest,
  CreateCrmCustomerRequest,
  CreateCrmSegmentRequest,
  CreateCrmTagRequest,
  CrmAudienceEstimateResponse,
  CrmCampaignPreviewResponse,
  CrmCampaignResponse,
  CrmChannelAvailabilityResponse,
  CrmCustomerActivityResponse,
  CrmCustomerCreatedResponse,
  CrmCustomerListItemResponse,
  CrmCustomerProfileResponse,
  CrmCustomerResponse,
  CrmCustomerTransactionResponse,
  CrmDashboardResponse,
  CrmMergeResultResponse,
  CrmNoteResponse,
  CrmSegmentResponse,
  CrmSegmentSummaryResponse,
  CrmTagResponse,
  EstimateCrmAudienceRequest,
  ExportCrmCustomersRequest,
  ListCrmCustomersParams,
  MergeCrmCustomersRequest,
  UpdateCrmCustomerPreferencesRequest,
  UpdateCrmCustomerRequest,
} from "../contracts/crm";
import { apiDownload, apiRequest, type ApiDownload } from "./http";

const base = (businessId: string) => `/v1/businesses/${businessId}/crm`;
const customer = (businessId: string, customerId: string) => `${base(businessId)}/customers/${customerId}`;

// ---- Customers --------------------------------------------------------------

export function listCrmCustomers(
  businessId: string,
  params: ListCrmCustomersParams = {}
): Promise<ListEnvelope<CrmCustomerListItemResponse>> {
  // tagIds/status bind as repeated keys, which apiRequest's single-value `query` cannot
  // express, so the whole query string is built here.
  const qs = new URLSearchParams();
  const add = (key: string, value: string | undefined) => {
    if (value !== undefined) qs.append(key, value);
  };
  add("search", params.search);
  params.tagIds?.forEach((id) => add("tagIds", id));
  add("visitsMin", params.visitsMin?.toString());
  add("visitsMax", params.visitsMax?.toString());
  add("spendMin", params.spendMin?.toString());
  add("spendMax", params.spendMax?.toString());
  add("lastVisitFrom", params.lastVisitFrom);
  add("lastVisitTo", params.lastVisitTo);
  add("customerSinceFrom", params.customerSinceFrom);
  add("customerSinceTo", params.customerSinceTo);
  params.status?.forEach((s) => add("status", s));
  add("sort", params.sort);
  add("sortDirection", params.sortDirection);
  add("page", params.page?.toString());
  add("pageSize", params.pageSize?.toString());
  const suffix = qs.toString();
  return apiRequest(`${base(businessId)}/customers${suffix ? `?${suffix}` : ""}`);
}

export function getCrmCustomer(businessId: string, customerId: string): Promise<CrmCustomerProfileResponse> {
  return apiRequest(customer(businessId, customerId));
}

export function createCrmCustomer(
  businessId: string,
  request: CreateCrmCustomerRequest,
  idempotencyKey: string
): Promise<CrmCustomerCreatedResponse> {
  return apiRequest(`${base(businessId)}/customers`, {
    method: "POST",
    body: { ...request, businessId },
    idempotencyKey,
  });
}

export function updateCrmCustomer(
  businessId: string,
  customerId: string,
  request: UpdateCrmCustomerRequest
): Promise<CrmCustomerResponse> {
  return apiRequest(customer(businessId, customerId), { method: "PUT", body: request });
}

export function updateCrmCustomerPreferences(
  businessId: string,
  customerId: string,
  request: UpdateCrmCustomerPreferencesRequest
): Promise<CrmCustomerResponse> {
  return apiRequest(`${customer(businessId, customerId)}/preferences`, { method: "PUT", body: request });
}

export function blockCrmCustomer(
  businessId: string,
  customerId: string,
  expectedVersion: number,
  reasonCode: string | null = null
): Promise<CrmCustomerResponse> {
  return apiRequest(`${customer(businessId, customerId)}/block`, {
    method: "POST",
    body: { expectedVersion, reasonCode },
  });
}

export function unblockCrmCustomer(
  businessId: string,
  customerId: string,
  expectedVersion: number
): Promise<CrmCustomerResponse> {
  return apiRequest(`${customer(businessId, customerId)}/unblock`, { method: "POST", body: { expectedVersion } });
}

export function deleteCrmCustomer(businessId: string, customerId: string, expectedVersion: number): Promise<void> {
  return apiRequest(customer(businessId, customerId), {
    method: "DELETE",
    query: { expectedVersion: expectedVersion.toString() },
  });
}

// ---- Bulk -------------------------------------------------------------------
// Multi-id requests are all or nothing: one missing, merged or deleted id refuses the whole call.

export function bulkTagCrmCustomers(
  businessId: string,
  request: BulkTagCrmCustomersRequest
): Promise<BulkTagCrmCustomersResponse> {
  return apiRequest(`${base(businessId)}/customers/tags/bulk`, { method: "POST", body: request });
}

export function bulkDeleteCrmCustomers(
  businessId: string,
  request: BulkDeleteCrmCustomersRequest
): Promise<{ deletedCount: number }> {
  return apiRequest(`${base(businessId)}/customers/delete/bulk`, { method: "POST", body: request });
}

export function mergeCrmCustomers(
  businessId: string,
  request: MergeCrmCustomersRequest
): Promise<CrmMergeResultResponse> {
  return apiRequest(`${base(businessId)}/customers/merge`, { method: "POST", body: request });
}

// ---- Notes ------------------------------------------------------------------

export function listCrmCustomerNotes(
  businessId: string,
  customerId: string,
  params: { page?: number; pageSize?: number } = {}
): Promise<ListEnvelope<CrmNoteResponse>> {
  return apiRequest(`${customer(businessId, customerId)}/notes`, {
    query: { page: params.page?.toString(), pageSize: params.pageSize?.toString() },
  });
}

export function addCrmCustomerNote(businessId: string, customerId: string, text: string): Promise<CrmNoteResponse> {
  return apiRequest(`${customer(businessId, customerId)}/notes`, { method: "POST", body: { text } });
}

// ---- Tags -------------------------------------------------------------------

export function listCrmTags(
  businessId: string,
  params: { page?: number; pageSize?: number } = {}
): Promise<ListEnvelope<CrmTagResponse>> {
  return apiRequest(`${base(businessId)}/tags`, {
    query: { page: params.page?.toString(), pageSize: params.pageSize?.toString() },
  });
}

export function createCrmTag(businessId: string, request: CreateCrmTagRequest): Promise<CrmTagResponse> {
  return apiRequest(`${base(businessId)}/tags`, { method: "POST", body: request });
}

// ---- History ----------------------------------------------------------------

export function listCrmCustomerActivities(
  businessId: string,
  customerId: string,
  params: { kind?: "Engagement" | "Purchase"; page?: number; pageSize?: number } = {}
): Promise<ListEnvelope<CrmCustomerActivityResponse>> {
  return apiRequest(`${customer(businessId, customerId)}/activities`, {
    query: { kind: params.kind, page: params.page?.toString(), pageSize: params.pageSize?.toString() },
  });
}

export function listCrmCustomerTransactions(
  businessId: string,
  customerId: string,
  params: { page?: number; pageSize?: number } = {}
): Promise<ListEnvelope<CrmCustomerTransactionResponse>> {
  return apiRequest(`${customer(businessId, customerId)}/transactions`, {
    query: { page: params.page?.toString(), pageSize: params.pageSize?.toString() },
  });
}

// ---- Dashboard --------------------------------------------------------------

/** Needs the insights.read permission. */
export function getCrmDashboard(businessId: string): Promise<CrmDashboardResponse> {
  return apiRequest(`${base(businessId)}/dashboard`);
}

// ---- Segments and audiences (feature crm:segments) --------------------------

export function listCrmSegments(
  businessId: string,
  params: { page?: number; pageSize?: number } = {}
): Promise<ListEnvelope<CrmSegmentSummaryResponse>> {
  return apiRequest(`${base(businessId)}/segments`, {
    query: { page: params.page?.toString(), pageSize: params.pageSize?.toString() },
  });
}

export function createCrmSegment(businessId: string, request: CreateCrmSegmentRequest): Promise<CrmSegmentResponse> {
  return apiRequest(`${base(businessId)}/segments`, { method: "POST", body: request });
}

/** A query sent as a POST because its body is structured; it changes nothing. */
export function estimateCrmAudience(
  businessId: string,
  request: EstimateCrmAudienceRequest
): Promise<CrmAudienceEstimateResponse> {
  return apiRequest(`${base(businessId)}/audiences/estimate`, { method: "POST", body: request });
}

// ---- Export -----------------------------------------------------------------

/** The file itself, named by the server (crm-customers-yyyyMMdd.ext). Rate-limited. */
export function exportCrmCustomers(businessId: string, request: ExportCrmCustomersRequest): Promise<ApiDownload> {
  return apiDownload(`${base(businessId)}/customers/export`, { method: "POST", body: request });
}

// ---- Campaigns (feature crm:campaigns) --------------------------------------
// Idempotency-Key is required on sendCrmCampaign. Its body carries businessId and
// campaignId under the route guard, so the function fills them in.

export function getCrmChannels(businessId: string): Promise<CrmChannelAvailabilityResponse> {
  return apiRequest(`${base(businessId)}/channels`);
}

export function createCrmCampaignDraft(
  businessId: string,
  request: CreateCrmCampaignDraftRequest
): Promise<CrmCampaignResponse> {
  return apiRequest(`${base(businessId)}/campaigns`, { method: "POST", body: request });
}

export function previewCrmCampaign(businessId: string, campaignId: string): Promise<CrmCampaignPreviewResponse> {
  return apiRequest(`${base(businessId)}/campaigns/${campaignId}/preview`, { method: "POST", body: {} });
}

export function sendCrmCampaign(
  businessId: string,
  campaignId: string,
  expectedVersion: number,
  idempotencyKey: string
): Promise<CrmCampaignResponse> {
  return apiRequest(`${base(businessId)}/campaigns/${campaignId}/send`, {
    method: "POST",
    body: { businessId, campaignId, expectedVersion },
    idempotencyKey,
  });
}

/** Only a Draft may be deleted (409 `crm.campaign.not-editable` otherwise). */
export function deleteCrmCampaignDraft(businessId: string, campaignId: string, expectedVersion: number): Promise<void> {
  return apiRequest(`${base(businessId)}/campaigns/${campaignId}`, {
    method: "DELETE",
    query: { expectedVersion: expectedVersion.toString() },
  });
}
