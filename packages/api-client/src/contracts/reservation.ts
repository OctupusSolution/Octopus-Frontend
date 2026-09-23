// Wire types for the Reservation module's AdminApi. Source of truth:
// E:\Octupus\octopus-backend\src\Modules\Reservation\Octopus.Modules.Reservation.Contracts\Dtos.
// Guid -> string, DateTimeOffset -> ISO string, DateOnly -> "yyyy-MM-dd", TimeOnly -> "HH:mm[:ss]".
import type { MoneyDto } from "./menu-admin";

/** Enum names arrive as PascalCase strings (e.g. "InService", "NoShow"). */
export type ReservationStatus =
  | "Pending"
  | "Confirmed"
  | "InService"
  | "Completed"
  | "Cancelled"
  | "Expired"
  | "NoShow";

export type ReservationRefundOutcome = "Full" | "Partial" | "None";
export type ReservationCancelledBy = "Customer" | "Staff";
export type ReservationDepositKind = "FixedPerReservation" | "PerAttendee";
export type ReservationNoShowDepositAction = "Retain" | "Refund";
/** System.DayOfWeek serialises as its name. */
export type ReservationDayOfWeek =
  | "Sunday"
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday";

// ---- Responses --------------------------------------------------------------------

export interface ReservationCustomerDto {
  name: string;
  /** E.164. */
  phone: string;
  email: string | null;
  externalRef: string | null;
}

export interface ReservationResourceRefDto {
  /** "floor-plan" today. */
  sourceKey: string;
  containerId: string;
  resourceId: string;
  code: string;
  displayName: string;
}

export interface ReservationTargetDto {
  resource: ReservationResourceRefDto | null;
  groupId: string | null;
  groupName: string | null;
}

export interface ReservationDepositTermsDto {
  required: boolean;
  amount: MoneyDto | null;
  paidAmount: MoneyDto | null;
  outstandingAmount: number;
  isFullyPaid: boolean;
}

export interface ReservationDuplicateWarningDto {
  reservationId: string;
  code: string;
  startUtc: string;
}

export interface ReservationSummaryResponse {
  id: string;
  code: string;
  channelCode: string;
  customer: ReservationCustomerDto;
  attendeeCount: number;
  startUtc: string;
  durationMinutes: number;
  target: ReservationTargetDto;
  status: ReservationStatus;
  needsReassignment: boolean;
  version: number;
}

export interface ReservationResponse {
  id: string;
  businessId: string;
  branchId: string | null;
  code: string;
  channelCode: string;
  channelDetail: string | null;
  customer: ReservationCustomerDto;
  attendeeCount: number;
  startUtc: string;
  durationMinutes: number;
  gapMinutes: number;
  target: ReservationTargetDto;
  status: ReservationStatus;
  autoConfirmApplied: boolean;
  paymentDueAtUtc: string | null;
  noShowAfterUtc: string;
  deposit: ReservationDepositTermsDto;
  customerNote: string | null;
  internalNote: string | null;
  labels: string[];
  needsReassignment: boolean;
  isHidden: boolean;
  version: number;
  createdAtUtc: string;
  /** Only present on the response to create. */
  duplicateWarning: ReservationDuplicateWarningDto | null;
}

export interface ReservationDaySummaryResponse {
  total: number;
  /** Count per status name; statuses with zero reservations are absent. */
  byStatus: Record<string, number>;
}

export interface ReservationActivityEntryResponse {
  id: string;
  occurredAtUtc: string;
  /** "Staff" | "Customer" | "System". */
  actorKind: string;
  actorUserId: string | null;
  /** Short code, e.g. "Confirmed", "Cancelled". */
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  summary: string;
}

export interface ReservationContactLinkResponse {
  /** https://wa.me/... */
  url: string;
  /** "whatsapp" today. */
  channel: string;
  renderedMessage: string;
}

export interface ReservationAvailableSlotResponse {
  startUtc: string;
}

export interface ReservationAvailabilityResponse {
  slots: ReservationAvailableSlotResponse[];
}

export interface ReservationCancellationPreviewResponse {
  outcome: ReservationRefundOutcome;
  amount: MoneyDto;
  bandDescription: string;
}

export interface ReservationDepositAttemptResponse {
  id: string;
  attemptNo: number;
  /** "Cash" | "OnlineCard". */
  method: string;
  amount: MoneyDto;
  /** Lifecycle state name (backend does not enumerate it in the DTO). */
  state: string;
  merchantReference: string;
  linkUrl: string | null;
  linkExpiresAtUtc: string | null;
  paidAtUtc: string | null;
  collectedByUserId: string | null;
  failureCode: string | null;
  lastCheckedAtUtc: string | null;
}

export interface ReservationDepositResponse {
  terms: ReservationDepositTermsDto;
  overriddenByUserId: string | null;
  overrideReason: string | null;
  attempts: ReservationDepositAttemptResponse[];
}

// ---- Settings ---------------------------------------------------------------------

export interface ReservationBookableWindowDto {
  days: ReservationDayOfWeek[];
  /** Local time "HH:mm" (server may echo "HH:mm:ss"). End at or before start crosses midnight. */
  start: string;
  end: string;
}

export interface ReservationRefundBandDto {
  minHoursBeforeStart: number;
  outcome: ReservationRefundOutcome;
  /** Set when outcome is "Partial". */
  percent: number | null;
}

export interface ReservationSettingsResponse {
  maxAdvanceDays: number;
  minNoticeMinutes: number;
  defaultDurationMinutes: number;
  gapMinutes: number;
  slotGranularityMinutes: number;
  minAttendees: number;
  maxAttendees: number;
  maxConcurrentGroupHolds: number;
  weeklyWindows: ReservationBookableWindowDto[];
  /** "yyyy-MM-dd". */
  closureDates: string[];
  depositsEnabled: boolean;
  depositKind: ReservationDepositKind;
  depositAmount: number;
  depositMinAttendees: number | null;
  paymentLeadHoursCash: number;
  paymentLeadHoursOnlineCard: number;
  paymentFloorMinutes: number;
  linkLifetimeHours: number;
  autoConfirmDefault: boolean;
  autoConfirmByChannel: Record<string, boolean>;
  noShowGraceMinutes: number;
  noShowAuto: boolean;
  noShowDepositAction: ReservationNoShowDepositAction;
  requireCancelReason: boolean;
  /** Must end in a catch-all at minHoursBeforeStart 0. */
  refundBands: ReservationRefundBandDto[];
  cancelReasonCodes: string[];
  /** IANA zone id. */
  timeZoneId: string;
  currency: string | null;
  /** Keyed by lowercase two-letter language code. */
  messageTemplates: Record<string, string>;
  /** Field names whose value differs from the platform default (IReadOnlySet -> array). */
  overriddenFields: string[];
}

/** PUT /settings replaces everything: send the full set. Same fields as the response minus overriddenFields. */
export type UpdateReservationSettingsRequest = Omit<ReservationSettingsResponse, "overriddenFields">;

export interface ReservationChannelResponse {
  code: string;
  displayName: string;
  isEnabled: boolean;
  isSeeded: boolean;
  sortOrder: number;
}

export interface UpdateReservationChannelDto {
  code: string;
  displayName: string;
  isEnabled: boolean;
  sortOrder: number;
}

// ---- Requests (route ids and businessId are filled by the client) ------------------

export interface ListReservationsParams {
  /** Local day "yyyy-MM-dd". */
  date?: string;
  fromUtc?: string;
  toUtc?: string;
  /** Repeated query key; matches the STORED status, not the effective one. */
  statuses?: ReservationStatus[];
  channelCodes?: string[];
  resourceGroupId?: string;
  search?: string;
  needsReassignment?: boolean;
  includeHidden?: boolean;
  page?: number;
  pageSize?: number;
}

/** Body of create. Name exactly one of resourceId / groupId. */
export interface CreateReservationRequest {
  branchId?: string | null;
  channelCode: string;
  channelDetail?: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  customerExternalRef?: string | null;
  attendeeCount: number;
  startUtc: string;
  durationMinutes?: number | null;
  resourceId?: string | null;
  groupId?: string | null;
  customerNote?: string | null;
  internalNote?: string | null;
  labels?: string[] | null;
}

export interface UpdateReservationRequest {
  customerNote?: string | null;
  internalNote?: string | null;
  labels?: string[] | null;
  attendeeCount?: number | null;
  expectedVersion: number;
}

export interface RescheduleReservationRequest {
  startUtc: string;
  /** Current duration when omitted. */
  durationMinutes?: number | null;
  expectedVersion: number;
}

export interface AssignReservationResourceRequest {
  resourceId: string;
  expectedVersion: number;
}

export interface ReservationExpectedVersionRequest {
  expectedVersion: number;
}

export interface CancelReservationRequest {
  cancelledBy: ReservationCancelledBy;
  /** Required when settings.requireCancelReason. */
  reasonCode?: string | null;
  note?: string | null;
  /** Needs deposits.refund permission. */
  overrideKind?: ReservationRefundOutcome | null;
  /** Required when overrideKind is set. */
  overrideAmount?: number | null;
  expectedVersion: number;
}

export interface IssueReservationPaymentLinkRequest {
  returnUrl: string;
  backUrl: string;
}

export interface OverrideReservationDepositRequest {
  /** false waives the deposit. */
  required: boolean;
  /** Required when required is true. */
  amount?: number | null;
  reason: string;
}

export interface ReservationAvailabilityParams {
  branchId?: string;
  /** "yyyy-MM-dd". */
  date: string;
  attendees: number;
  durationMinutes?: number;
  /** Name exactly one of resourceId / groupId. */
  resourceId?: string;
  groupId?: string;
}

export interface ReservationAlternativesParams {
  branchId?: string;
  attendees: number;
  startUtc: string;
  durationMinutes?: number;
  resourceId?: string;
  groupId?: string;
}
