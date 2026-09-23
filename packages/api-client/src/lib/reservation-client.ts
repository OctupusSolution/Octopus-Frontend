// Real client for the Reservation module's AdminApi: `/v1/businesses/{businessId}/reservations/...`.
// Source of truth: E:\Octupus\octopus-backend\src\Modules\Reservation\Octopus.Modules.Reservation.Api
// (ReservationApiConstants.cs has every route string).
//
// Idempotency-Key is required on exactly these calls: createReservation, recordReservationCashDeposit,
// issueReservationPaymentLink, issueReservationDepositRefund. Every other write is a plain call.
//
// Bodies that bind to a backend command carry businessId/reservationId; the route guard 400s if they
// disagree with the URL, so these functions fill them in and callers never pass them.
// expectedVersion is REQUIRED on every mutation that takes one (unlike Floor Plan / Menu).
import type { ListEnvelope } from "../contracts/menu-admin";
import type {
  AssignReservationResourceRequest,
  CancelReservationRequest,
  CreateReservationRequest,
  IssueReservationPaymentLinkRequest,
  ListReservationsParams,
  OverrideReservationDepositRequest,
  RescheduleReservationRequest,
  ReservationActivityEntryResponse,
  ReservationAlternativesParams,
  ReservationAvailabilityParams,
  ReservationAvailabilityResponse,
  ReservationCancellationPreviewResponse,
  ReservationChannelResponse,
  ReservationContactLinkResponse,
  ReservationDaySummaryResponse,
  ReservationDepositResponse,
  ReservationExpectedVersionRequest,
  ReservationResponse,
  ReservationSettingsResponse,
  ReservationSummaryResponse,
  UpdateReservationChannelDto,
  UpdateReservationRequest,
  UpdateReservationSettingsRequest,
} from "../contracts/reservation";
import { apiRequest } from "./http";

const base = (businessId: string) => `/v1/businesses/${businessId}/reservations`;
const one = (businessId: string, reservationId: string) => `${base(businessId)}/${reservationId}`;

// ---- Working list -----------------------------------------------------------------

export function listReservations(
  businessId: string,
  params: ListReservationsParams = {}
): Promise<ListEnvelope<ReservationSummaryResponse>> {
  // statuses/channelCodes bind as repeated keys, which apiRequest's single-value `query` cannot
  // express, so the whole query string is built here.
  const qs = new URLSearchParams();
  const add = (key: string, value: string | undefined) => {
    if (value !== undefined) qs.append(key, value);
  };
  add("date", params.date);
  add("fromUtc", params.fromUtc);
  add("toUtc", params.toUtc);
  params.statuses?.forEach((s) => add("statuses", s));
  params.channelCodes?.forEach((c) => add("channelCodes", c));
  add("resourceGroupId", params.resourceGroupId);
  add("search", params.search);
  add("needsReassignment", params.needsReassignment?.toString());
  add("includeHidden", params.includeHidden?.toString());
  add("page", params.page?.toString());
  add("pageSize", params.pageSize?.toString());
  const suffix = qs.toString();
  return apiRequest(`${base(businessId)}${suffix ? `?${suffix}` : ""}`);
}

export function getReservation(businessId: string, reservationId: string): Promise<ReservationResponse> {
  return apiRequest(one(businessId, reservationId));
}

export function createReservation(
  businessId: string,
  request: CreateReservationRequest,
  idempotencyKey: string
): Promise<ReservationResponse> {
  return apiRequest(base(businessId), {
    method: "POST",
    body: { ...request, businessId },
    idempotencyKey,
  });
}

export function updateReservation(
  businessId: string,
  reservationId: string,
  request: UpdateReservationRequest
): Promise<ReservationResponse> {
  return apiRequest(one(businessId, reservationId), { method: "PATCH", body: request });
}

/** Counters for one local day. */
export function getReservationDaySummary(businessId: string, date: string): Promise<ReservationDaySummaryResponse> {
  return apiRequest(`${base(businessId)}/summary`, { query: { date } });
}

export function rescheduleReservation(
  businessId: string,
  reservationId: string,
  request: RescheduleReservationRequest
): Promise<ReservationResponse> {
  return apiRequest(`${one(businessId, reservationId)}/reschedule`, { method: "POST", body: request });
}

export function assignReservationResource(
  businessId: string,
  reservationId: string,
  request: AssignReservationResourceRequest
): Promise<ReservationResponse> {
  return apiRequest(`${one(businessId, reservationId)}/resource`, { method: "PUT", body: request });
}

// ---- Lifecycle --------------------------------------------------------------------

function lifecycle(action: string) {
  return (
    businessId: string,
    reservationId: string,
    request: ReservationExpectedVersionRequest
  ): Promise<ReservationResponse> =>
    apiRequest(`${one(businessId, reservationId)}/${action}`, { method: "POST", body: request });
}

export const confirmReservation = lifecycle("confirm");
export const startReservationService = lifecycle("start-service");
export const completeReservation = lifecycle("complete");
export const markReservationNoShow = lifecycle("no-show");
export const recoverReservationNoShow = lifecycle("recover-no-show");
export const reinstateReservation = lifecycle("reinstate");

/** No body and no expectedVersion: the backend takes none for hide/unhide. */
export function hideReservation(businessId: string, reservationId: string): Promise<ReservationResponse> {
  return apiRequest(`${one(businessId, reservationId)}/hide`, { method: "POST" });
}

export function unhideReservation(businessId: string, reservationId: string): Promise<ReservationResponse> {
  return apiRequest(`${one(businessId, reservationId)}/unhide`, { method: "POST" });
}

// ---- Cancellation -----------------------------------------------------------------

export function previewReservationCancellation(
  businessId: string,
  reservationId: string
): Promise<ReservationCancellationPreviewResponse> {
  return apiRequest(`${one(businessId, reservationId)}/cancellation-preview`);
}

export function cancelReservation(
  businessId: string,
  reservationId: string,
  request: CancelReservationRequest
): Promise<ReservationResponse> {
  return apiRequest(`${one(businessId, reservationId)}/cancel`, {
    method: "POST",
    body: { ...request, businessId, reservationId },
  });
}

// ---- Deposits ---------------------------------------------------------------------

export function getReservationDeposit(businessId: string, reservationId: string): Promise<ReservationDepositResponse> {
  return apiRequest(`${one(businessId, reservationId)}/deposit`);
}

export function recordReservationCashDeposit(
  businessId: string,
  reservationId: string,
  idempotencyKey: string
): Promise<ReservationResponse> {
  return apiRequest(`${one(businessId, reservationId)}/deposit/cash`, {
    method: "POST",
    body: { businessId, reservationId },
    idempotencyKey,
  });
}

export function issueReservationPaymentLink(
  businessId: string,
  reservationId: string,
  request: IssueReservationPaymentLinkRequest,
  idempotencyKey: string
): Promise<ReservationResponse> {
  return apiRequest(`${one(businessId, reservationId)}/deposit/link`, {
    method: "POST",
    body: { ...request, businessId, reservationId },
    idempotencyKey,
  });
}

export function refreshReservationDeposit(businessId: string, reservationId: string): Promise<ReservationResponse> {
  return apiRequest(`${one(businessId, reservationId)}/deposit/refresh`, { method: "POST" });
}

export function overrideReservationDeposit(
  businessId: string,
  reservationId: string,
  request: OverrideReservationDepositRequest
): Promise<ReservationResponse> {
  return apiRequest(`${one(businessId, reservationId)}/deposit/override`, { method: "POST", body: request });
}

export function issueReservationDepositRefund(
  businessId: string,
  reservationId: string,
  idempotencyKey: string
): Promise<ReservationResponse> {
  return apiRequest(`${one(businessId, reservationId)}/deposit/refund`, {
    method: "POST",
    body: { businessId, reservationId },
    idempotencyKey,
  });
}

export function settleReservationCashRefund(
  businessId: string,
  reservationId: string,
  refundId: string
): Promise<ReservationResponse> {
  return apiRequest(`${one(businessId, reservationId)}/deposit/refund/${refundId}/settle`, { method: "POST" });
}

// ---- Availability -----------------------------------------------------------------

export function getReservationAvailability(
  businessId: string,
  params: ReservationAvailabilityParams
): Promise<ReservationAvailabilityResponse> {
  return apiRequest(`${base(businessId)}/availability`, {
    query: {
      branchId: params.branchId,
      date: params.date,
      attendees: params.attendees.toString(),
      durationMinutes: params.durationMinutes?.toString(),
      resourceId: params.resourceId,
      groupId: params.groupId,
    },
  });
}

export function getReservationAlternatives(
  businessId: string,
  params: ReservationAlternativesParams
): Promise<ReservationAvailabilityResponse> {
  return apiRequest(`${base(businessId)}/availability/alternatives`, {
    query: {
      branchId: params.branchId,
      attendees: params.attendees.toString(),
      startUtc: params.startUtc,
      durationMinutes: params.durationMinutes?.toString(),
      resourceId: params.resourceId,
      groupId: params.groupId,
    },
  });
}

// ---- Activity + contact link ------------------------------------------------------

export function listReservationActivity(
  businessId: string,
  reservationId: string,
  params: { page?: number; pageSize?: number } = {}
): Promise<ListEnvelope<ReservationActivityEntryResponse>> {
  return apiRequest(`${one(businessId, reservationId)}/activity`, {
    query: { page: params.page?.toString(), pageSize: params.pageSize?.toString() },
  });
}

export function getReservationContactLink(
  businessId: string,
  reservationId: string,
  language?: string
): Promise<ReservationContactLinkResponse> {
  return apiRequest(`${one(businessId, reservationId)}/contact-link`, { query: { language } });
}

// ---- Settings ---------------------------------------------------------------------

export function getReservationSettings(businessId: string): Promise<ReservationSettingsResponse> {
  return apiRequest(`${base(businessId)}/settings`);
}

export function updateReservationSettings(
  businessId: string,
  request: UpdateReservationSettingsRequest
): Promise<ReservationSettingsResponse> {
  return apiRequest(`${base(businessId)}/settings`, { method: "PUT", body: request });
}

export function getReservationChannels(businessId: string): Promise<ReservationChannelResponse[]> {
  return apiRequest(`${base(businessId)}/settings/channels`);
}

export function updateReservationChannels(
  businessId: string,
  channels: UpdateReservationChannelDto[]
): Promise<ReservationChannelResponse[]> {
  return apiRequest(`${base(businessId)}/settings/channels`, { method: "PUT", body: { channels } });
}
