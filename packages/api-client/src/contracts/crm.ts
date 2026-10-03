// Wire shapes of the CRM module's AdminApi (US-017).
// Source of truth: E:\Octupus\octopus-backend\src\Modules\Crm\Octopus.Modules.Crm.Contracts\Dtos
// and specs/007-crm/contracts/http-endpoints.md.
//
// Consent, avatar, settings, attributes, media and imports are not typed yet;
// they follow as each screen is wired.

/** Major units in the business's own currency — not always SAR. */
export interface CrmMoneyDto {
  amount: number;
  currency: string;
}

export type CrmCustomerStatus = "Active" | "Blocked" | "Deleted" | "Merged";
export type CrmConsentStatus = "Granted" | "Denied" | "Unknown";
/** Exact casing the backend accepts and returns ("Sms", not "SMS"). */
export type CrmChannel = "WhatsApp" | "Sms" | "Email";

export interface CrmConsentStateDto {
  status: CrmConsentStatus;
  source: string | null;
  changedAtUtc: string | null;
}

export interface CrmCustomerConsentDto {
  email: CrmConsentStateDto;
  sms: CrmConsentStateDto;
  whatsApp: CrmConsentStateDto;
}

export interface CrmCustomerTagDto {
  id: string;
  name: string;
  colorKey: string;
  assignedAtUtc: string;
}

export interface CrmCustomerAvatarDto {
  assetId: string;
  url: string;
  width: number | null;
  height: number | null;
}

export interface CrmLocationValueDto {
  kind: string;
  id: string;
  containerId: string;
}

/** One profile-defined attribute value; which keys exist depends on the
 *  business-type profile (GET /attributes), so nothing here is guaranteed. */
export interface CrmCustomerAttributeDto {
  key: string;
  type: string;
  group: string;
  text: string | null;
  number: number | null;
  date: string | null;
  bool: boolean | null;
  optionKeys: string[] | null;
  location: CrmLocationValueDto | null;
  locationLabel: string | null;
}

export interface CrmUpcomingDto {
  sourceKey: string;
  recordId: string;
  scheduledAtUtc: string;
  reference: string;
  paymentDue: boolean;
}

export interface CrmCustomerListItemResponse {
  id: string;
  version: number;
  firstName: string;
  lastName: string;
  phoneE164: string;
  email: string | null;
  status: CrmCustomerStatus;
  tags: CrmCustomerTagDto[];
  avatar: CrmCustomerAvatarDto | null;
  visits: number;
  totalSpend: CrmMoneyDto;
  lastVisitAtUtc: string | null;
  customerSince: string; // yyyy-MM-dd
  upcoming: CrmUpcomingDto | null;
  birthdayThisMonth: boolean;
}

export interface CrmCustomerResponse {
  id: string;
  version: number;
  firstName: string;
  lastName: string;
  phoneE164: string;
  email: string | null;
  dateOfBirth: string | null; // yyyy-MM-dd
  gender: string | null;
  preferredLanguage: string | null;
  sourceCode: string | null;
  referredBy: string | null;
  preferredBranchId: string | null;
  preferredChannels: string[];
  customerSinceExplicit: string | null;
  customerSince: string; // yyyy-MM-dd
  status: CrmCustomerStatus;
  blockedAtUtc: string | null;
  blockReasonCode: string | null;
  deletedAtUtc: string | null;
  mergedIntoId: string | null;
  consent: CrmCustomerConsentDto;
  birthdayThisMonth: boolean;
  tags: CrmCustomerTagDto[];
  attributes: CrmCustomerAttributeDto[];
  avatar: CrmCustomerAvatarDto | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

export interface CrmCustomerInsightsDto {
  visits: number;
  firstVisitAtUtc: string | null;
  lastVisitAtUtc: string | null;
  missedCount: number;
  cancelledCount: number;
  totalSpend: CrmMoneyDto;
  avgSpend: CrmMoneyDto | null;
  excludedCurrencyCount: number;
  lastActivityAtUtc: string | null;
}

export interface CrmCustomerIdentityDto {
  customerId: string;
  isCanonical: boolean;
  firstName: string;
  lastName: string;
  phoneE164: string;
  email: string | null;
  status: CrmCustomerStatus;
  mergedAtUtc: string | null;
}

export interface CrmCustomerSegmentDto {
  segmentId: string;
  name: string;
}

export interface CrmCustomerProfileResponse {
  customer: CrmCustomerResponse;
  /** Built by the Worker's projection — null until the customer has activity. */
  insights: CrmCustomerInsightsDto | null;
  upcoming: CrmUpcomingDto | null;
  vipSince: string | null;
  birthdayThisMonth: boolean;
  loyaltyPoints: number | null;
  identities: CrmCustomerIdentityDto[] | null;
  segments: CrmCustomerSegmentDto[] | null;
}

export interface CrmNoteResponse {
  id: string;
  customerId: string;
  text: string;
  authorAccountId: string;
  createdAtUtc: string;
}

export interface CrmTagResponse {
  id: string;
  version: number;
  name: string;
  colorKey: string;
  isSeeded: boolean;
  isVipTag: boolean;
}

export type CrmCustomerSort = "name" | "customerSince" | "visits" | "totalSpend" | "lastVisit";

export interface ListCrmCustomersParams {
  /** 2–100 characters; a shorter term is a 422, so callers must not send one. */
  search?: string;
  /** Matches a customer carrying any one of these. */
  tagIds?: string[];
  visitsMin?: number;
  visitsMax?: number;
  spendMin?: number;
  spendMax?: number;
  lastVisitFrom?: string;
  lastVisitTo?: string;
  customerSinceFrom?: string;
  customerSinceTo?: string;
  /** Defaults to Active + Blocked on the server. */
  status?: Exclude<CrmCustomerStatus, "Merged">[];
  sort?: CrmCustomerSort;
  sortDirection?: "asc" | "desc";
  /** 1-based. */
  page?: number;
  /** Default 25, max 100 — out of range is a 422. */
  pageSize?: number;
}

// ---- Writes -----------------------------------------------------------------
// expectedVersion is REQUIRED on every customer mutation that takes one; a stale
// one answers 409 `crm.concurrency.stale`. Notes and tags carry no customer version.

export interface CrmAttributeValueRequest {
  key: string;
  text?: string | null;
  number?: number | null;
  date?: string | null;
  bool?: boolean | null;
  optionKeys?: string[] | null;
  location?: { kind: string; id: string } | null;
}

/** Consent per channel at create; an omitted channel starts Unknown. */
export interface CrmCreateCustomerConsent {
  email?: CrmConsentStatus | null;
  sms?: CrmConsentStatus | null;
  whatsApp?: CrmConsentStatus | null;
}

export interface CreateCrmCustomerRequest {
  firstName: string;
  lastName: string;
  /** Any form staff type; stored as E.164. A taken number is a 409 `crm.customer.phone-taken`. */
  phone: string;
  email?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  preferredLanguage?: string | null;
  sourceCode?: string | null;
  referredBy?: string | null;
  preferredBranchId?: string | null;
  preferredChannels?: string[] | null;
  customerSinceExplicit?: string | null;
  consent?: CrmCreateCustomerConsent | null;
  tagIds?: string[] | null;
  note?: string | null;
  attributes?: CrmAttributeValueRequest[] | null;
}

export interface CrmPossibleDuplicateDto {
  customerId: string;
  matchedOn: string;
}

export interface CrmCustomerCreatedResponse {
  customer: CrmCustomerResponse;
  possibleDuplicates: CrmPossibleDuplicateDto[];
}

/** A full replace: an optional field left out is cleared. */
export interface UpdateCrmCustomerRequest {
  expectedVersion: number;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  preferredLanguage: string | null;
  sourceCode: string | null;
  referredBy: string | null;
  preferredBranchId: string | null;
  preferredChannels: string[] | null;
  customerSinceExplicit: string | null;
}

export interface UpdateCrmCustomerPreferencesRequest {
  expectedVersion: number;
  /** A listed key is replaced, a listed key with no value is cleared, an unlisted key is untouched. */
  values: CrmAttributeValueRequest[];
}

export interface BulkTagCrmCustomersRequest {
  customerIds: string[];
  addTagIds?: string[] | null;
  removeTagIds?: string[] | null;
}

export interface BulkTagCrmCustomersResponse {
  customerCount: number;
  added: number;
  removed: number;
}

export interface BulkDeleteCrmCustomersRequest {
  items: { customerId: string; expectedVersion: number }[];
}

export interface MergeCrmCustomersRequest {
  canonicalId: string;
  mergedIds: string[];
  /** One version per participant, the canonical included. */
  expectedVersions: Record<string, number>;
}

export interface CrmMergeResultResponse {
  canonicalCustomerId: string;
  version: number;
  mergedCustomerIds: string[];
}

export interface CreateCrmTagRequest {
  /** 1–32 characters, unique per business ignoring case (409 `crm.tag.name-taken`). */
  name: string;
  colorKey: string;
}

// ---- History ----------------------------------------------------------------

export interface CrmCustomerEngagementDto {
  state: string;
  scheduledAtUtc: string | null;
  endAtUtc: string | null;
  attendedAtUtc: string | null;
  attendeeCount: number | null;
  locationLabel: string | null;
  reference: string;
  statusCode: string;
}

export interface CrmCustomerPurchaseDto {
  reference: string;
  placedAtUtc: string | null;
  state: string;
  summary: string | null;
  total: CrmMoneyDto | null;
}

export interface CrmCustomerActivityResponse {
  id: string;
  sourceKey: string;
  recordId: string;
  kind: "Engagement" | "Purchase";
  customerId: string;
  engagement: CrmCustomerEngagementDto | null;
  purchase: CrmCustomerPurchaseDto | null;
  amountDue: CrmMoneyDto | null;
  asOfUtc: string;
}

/** No card data is ever returned. */
export interface CrmCustomerTransactionResponse {
  id: string;
  sourceKey: string;
  recordId: string;
  transactionId: string;
  kind: "Payment" | "Refund";
  /** Payment: Pending | Paid | Failed | Cancelled. Refund: Pending | Refunded | Failed. */
  state: string;
  amount: CrmMoneyDto;
  occurredAtUtc: string;
  methodCode: string | null;
  countsTowardSpend: boolean;
  inSettingsCurrency: boolean;
}

// ---- Dashboard --------------------------------------------------------------

export interface CrmDashboardKpiResponse {
  value: number;
  baseline: number;
  /** Null when the baseline is 0 and the value is not. */
  deltaPercent: number | null;
  comparedWith: "yesterday" | "previous-month-to-date";
}

export interface CrmDashboardMoneyKpiResponse {
  value: CrmMoneyDto;
  baseline: CrmMoneyDto;
  deltaPercent: number | null;
  comparedWith: "yesterday" | "previous-month-to-date";
}

export interface CrmDashboardResponse {
  asOfUtc: string;
  timeZoneId: string;
  currency: string;
  kpis: {
    totalCustomers: CrmDashboardKpiResponse;
    activeCustomers: CrmDashboardKpiResponse;
    newThisMonth: CrmDashboardKpiResponse;
    vipCustomers: CrmDashboardKpiResponse;
    returningCustomers: CrmDashboardKpiResponse;
    spendThisMonth: CrmDashboardMoneyKpiResponse;
  };
}

// ---- Criteria, segments and audiences ---------------------------------------
// Field keys and the operators each takes come from GET /criteria-fields
// (CoreCriteriaCatalog.cs). A body that does not fit answers 422 `crm.criteria.invalid`.

export type CrmCriteriaOperator =
  | "Equals"
  | "NotEquals"
  | "Gte"
  | "Lte"
  | "Between"
  | "In"
  | "NotIn"
  | "ContainsAny"
  | "ContainsAll"
  | "ContainsNone"
  | "WithinLastDays"
  | "NotWithinLastDays"
  | "IsSet"
  | "IsNotSet";

export type CrmCriteriaValueKind =
  | "none"
  | "int"
  | "ints"
  | "intRange"
  | "number"
  | "numberRange"
  | "money"
  | "moneyRange"
  | "date"
  | "dateRange"
  | "days"
  | "windowCount"
  | "strings"
  | "ids"
  | "bool";

/** `kind` names which of the other members carries the value. */
export interface CrmCriteriaValueDto {
  kind: CrmCriteriaValueKind;
  int?: number;
  ints?: number[];
  number?: number;
  amount?: number;
  date?: string;
  min?: number;
  max?: number;
  from?: string;
  to?: string;
  days?: number;
  includeNever?: boolean;
  values?: string[];
  ids?: string[];
  bool?: boolean;
}

export interface CrmCriteriaConditionDto {
  field: string;
  operator: CrmCriteriaOperator;
  value: CrmCriteriaValueDto;
}

/** At most 20 conditions. */
export interface CrmCustomerCriteriaDto {
  match: "All" | "Any";
  conditions: CrmCriteriaConditionDto[];
}

export interface CrmSegmentStatsDto {
  members: number;
  ofBasePercent: number;
  avgSpend: CrmMoneyDto | null;
  computedAtUtc: string;
}

export interface CrmSegmentSummaryResponse {
  id: string;
  version: number;
  name: string;
  criteria: CrmCustomerCriteriaDto;
  isSeeded: boolean;
  stats: CrmSegmentStatsDto | null;
  statsAsOf: string | null;
  trend: { localDate: string; members: number }[];
}

export interface CrmSegmentResponse {
  id: string;
  version: number;
  name: string;
  criteria: CrmCustomerCriteriaDto;
  isSeeded: boolean;
  stats: CrmSegmentStatsDto;
  trend: { localDate: string; members: number }[];
}

export interface CreateCrmSegmentRequest {
  /** ≤ 60 characters, unique per business (409 `crm.segment.name-taken`). */
  name: string;
  criteria: CrmCustomerCriteriaDto;
}

/** Exactly one of the two. Counts Active and Blocked matches. */
export interface EstimateCrmAudienceRequest {
  criteria?: CrmCustomerCriteriaDto | null;
  segmentIds?: string[] | null;
}

export interface CrmAudienceEstimateResponse {
  estimatedCount: number;
  ofBasePercent: number;
  avgSpend: CrmMoneyDto | null;
  computedAtUtc: string;
}

// ---- Export -----------------------------------------------------------------

/** By ids (all or nothing, ≤ 1,000), or by filter. */
export interface ExportCrmCustomersRequest {
  format: "xlsx" | "csv";
  customerIds?: string[] | null;
  criteria?: CrmCustomerCriteriaDto | null;
  search?: string | null;
  status?: string[] | null;
}

// ---- Campaigns --------------------------------------------------------------

export interface CrmCampaignAudienceDto {
  kind: "Criteria" | "Segments" | "Customers";
  criteria?: CrmCustomerCriteriaDto | null;
  segmentIds?: string[] | null;
  customerIds?: string[] | null;
}

export interface CrmCampaignContentDto {
  /** Required for Email. */
  subject?: string | null;
  body: string;
  variables?: { key: string; value: string; type: "Text" | "Date" | "Number" }[] | null;
  imageAssetId?: string | null;
  videoAssetId?: string | null;
  documentAssetId?: string | null;
  documentName?: string | null;
  button?: { label: string; url: string } | null;
  templateRef?: string | null;
}

export interface CrmCampaignDeliveryDto {
  mode: "Now" | "Scheduled" | "Paced";
  /** ≥ now + 1 min. */
  scheduledAt?: string | null;
  /** Paced: 1–1,000. */
  batchSize?: number | null;
  /** Paced: 5–1,440. */
  intervalMinutes?: number | null;
  startAt?: string | null;
}

export interface CreateCrmCampaignDraftRequest {
  /** ≤ 80 characters. */
  name: string;
  channel: CrmChannel;
  language: "ar" | "en";
  audience: CrmCampaignAudienceDto;
  content: CrmCampaignContentDto;
  delivery: CrmCampaignDeliveryDto;
}

export type CrmCampaignStatus =
  | "Draft"
  | "Queued"
  | "Sending"
  | "Paused"
  | "Completed"
  | "CompletedWithFailures"
  | "Cancelled";

export interface CrmCampaignResponse {
  id: string;
  version: number;
  name: string;
  channel: CrmChannel;
  language: string;
  audience: CrmCampaignAudienceDto;
  content: CrmCampaignContentDto;
  delivery: CrmCampaignDeliveryDto;
  status: CrmCampaignStatus;
  derivedStatus: "Overdue" | "Stalled" | null;
  pausedReason: string | null;
  counts: { total: number; pending: number; sent: number; failed: number; skipped: number };
  launchAtUtc: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

export interface CrmCampaignPreviewResponse {
  matchedCount: number;
  eligibleCount: number;
  excluded: { reason: string; count: number }[];
  sample: { subject: string | null; body: string };
  caps: { dailyRemaining: number; maxRecipients: number };
}

export interface CrmChannelAvailabilityResponse {
  channels: { code: CrmChannel; available: boolean; reason: string | null }[];
}
