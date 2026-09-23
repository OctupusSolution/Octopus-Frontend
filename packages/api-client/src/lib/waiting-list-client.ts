// Real client for the WaitingList module's AdminApi: `/v1/businesses/{businessId}/waiting-list/...`.
// Source of truth: Octopus.Modules.WaitingList.Api (WaitingListApiConstants.cs).
//
// Idempotency-Key is required on exactly one call: addWaitingEntry. removeWaitingEntry is deliberately
// NOT idempotent (it carries an approver PIN). addWaitingEntry's body carries businessId (route guard
// 400s on mismatch), so it is filled here. expectedVersion is required on every entry mutation.
import type { ListEnvelope } from "../contracts/menu-admin";
import type {
  AddWaitingEntryRequest,
  ListWaitingEntriesParams,
  MoveWaitingEntryRequest,
  RemoveWaitingEntryRequest,
  StartWaitingServiceRequest,
  UpdateWaitingEntryRequest,
  UpdateWaitingListSettingsRequest,
  UpdateWaitingSourcesRequest,
  WaitingActivityResponse,
  WaitingDaySummaryResponse,
  WaitingEntryResponse,
  WaitingEntrySummaryResponse,
  WaitingExpectedVersionRequest,
  WaitingListSettingsResponse,
  WaitingSourceResponse,
} from "../contracts/waiting-list";
import { apiRequest } from "./http";

const base = (businessId: string) => `/v1/businesses/${businessId}/waiting-list`;
const one = (businessId: string, entryId: string) => `${base(businessId)}/entries/${entryId}`;

export function getWaitingSummary(businessId: string, date?: string): Promise<WaitingDaySummaryResponse> {
  return apiRequest(`${base(businessId)}/summary`, { query: { date } });
}

export function listWaitingEntries(
  businessId: string,
  params: ListWaitingEntriesParams = {}
): Promise<ListEnvelope<WaitingEntrySummaryResponse>> {
  // statuses/sourceCodes bind as repeated keys, so the query string is built here.
  const qs = new URLSearchParams();
  const add = (key: string, value: string | undefined) => {
    if (value !== undefined) qs.append(key, value);
  };
  add("date", params.date);
  add("search", params.search);
  add("groupId", params.groupId);
  add("attendeeCount", params.attendeeCount?.toString());
  add("minAttendees", params.minAttendees?.toString());
  add("maxAttendees", params.maxAttendees?.toString());
  params.statuses?.forEach((s) => add("statuses", s));
  params.sourceCodes?.forEach((c) => add("sourceCodes", c));
  add("sort", params.sort);
  add("page", params.page?.toString());
  add("pageSize", params.pageSize?.toString());
  add("includeEstimates", params.includeEstimates?.toString());
  const suffix = qs.toString();
  return apiRequest(`${base(businessId)}/entries${suffix ? `?${suffix}` : ""}`);
}

export function addWaitingEntry(
  businessId: string,
  request: AddWaitingEntryRequest,
  idempotencyKey: string
): Promise<WaitingEntryResponse> {
  return apiRequest(`${base(businessId)}/entries`, {
    method: "POST",
    body: { ...request, businessId },
    idempotencyKey,
  });
}

export function getWaitingEntry(
  businessId: string,
  entryId: string,
  includeEstimate?: boolean
): Promise<WaitingEntryResponse> {
  return apiRequest(one(businessId, entryId), { query: { includeEstimate: includeEstimate?.toString() } });
}

export function updateWaitingEntry(
  businessId: string,
  entryId: string,
  request: UpdateWaitingEntryRequest
): Promise<WaitingEntryResponse> {
  return apiRequest(one(businessId, entryId), { method: "PATCH", body: request });
}

export function startWaitingService(
  businessId: string,
  entryId: string,
  request: StartWaitingServiceRequest
): Promise<WaitingEntryResponse> {
  return apiRequest(`${one(businessId, entryId)}/start-service`, { method: "POST", body: request });
}

const versioned =
  (action: string) =>
  (businessId: string, entryId: string, request: WaitingExpectedVersionRequest): Promise<WaitingEntryResponse> =>
    apiRequest(`${one(businessId, entryId)}/${action}`, { method: "POST", body: request });

export const completeWaitingEntry = versioned("complete");
export const markWaitingEntryReady = versioned("ready");
export const revertWaitingEntryReady = versioned("revert-ready");
export const reinstateWaitingEntry = versioned("reinstate");

export function moveWaitingEntry(
  businessId: string,
  entryId: string,
  request: MoveWaitingEntryRequest
): Promise<WaitingEntryResponse> {
  return apiRequest(`${one(businessId, entryId)}/move`, { method: "POST", body: request });
}

export function removeWaitingEntry(
  businessId: string,
  entryId: string,
  request: RemoveWaitingEntryRequest
): Promise<WaitingEntryResponse> {
  return apiRequest(`${one(businessId, entryId)}/remove`, { method: "POST", body: request });
}

export function listWaitingEntryActivity(
  businessId: string,
  entryId: string,
  params: { page?: number; pageSize?: number } = {}
): Promise<ListEnvelope<WaitingActivityResponse>> {
  return apiRequest(`${one(businessId, entryId)}/activity`, {
    query: { page: params.page?.toString(), pageSize: params.pageSize?.toString() },
  });
}

export function getWaitingListSettings(businessId: string): Promise<WaitingListSettingsResponse> {
  return apiRequest(`${base(businessId)}/settings`);
}

export function updateWaitingListSettings(
  businessId: string,
  request: UpdateWaitingListSettingsRequest
): Promise<WaitingListSettingsResponse> {
  return apiRequest(`${base(businessId)}/settings`, { method: "PUT", body: request });
}

export function getWaitingSources(businessId: string): Promise<WaitingSourceResponse[]> {
  return apiRequest(`${base(businessId)}/settings/sources`);
}

export function updateWaitingSources(
  businessId: string,
  request: UpdateWaitingSourcesRequest
): Promise<WaitingSourceResponse[]> {
  return apiRequest(`${base(businessId)}/settings/sources`, { method: "PUT", body: request });
}
