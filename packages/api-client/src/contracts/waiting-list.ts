// Wire contracts for the WaitingList module's AdminApi (`/v1/businesses/{businessId}/waiting-list/...`).
// Source: Octopus.Modules.WaitingList.Contracts\Dtos. Guid -> string, DateTimeOffset/DateOnly -> string.

// Effective status, serialised with enum ToString(): PascalCase, exactly these.
export type WaitingEntryStatus = "Waiting" | "Ready" | "InService" | "Completed" | "Removed" | "NoShow";
export type WaitingEntrySort = "position" | "joined" | "attendees" | "name";
// Seeded source codes; businesses may add their own, hence the string fallback.
export type WaitingSourceCode = "onsite" | "phone" | "website" | "social-media" | (string & {});
// Seeded removal reasons; configurable per business in settings.
export type WaitingRemoveReasonCode = "cancelled" | "left" | "duplicate" | "no-show" | "other" | (string & {});

export interface WaitingCustomerContact {
  name: string;
  phone: string;
  email: string | null;
  externalRef: string | null;
}

export interface WaitingPreference {
  groupId: string | null;
  groupName: string | null;
  resourceId: string | null;
}

export interface WaitingResourceRef {
  sourceKey: string;
  containerId: string;
  resourceId: string;
  code: string;
  displayName: string;
}

export interface WaitingRemovalRecord {
  removedAtUtc: string;
  reasonCode: string;
  note: string | null;
  removedByUserId: string | null;
  approvedByAccountId: string;
}

export interface WaitEstimate {
  minMinutes: number;
  maxMinutes: number;
  basis: string;
}

export interface WaitingEntrySummaryResponse {
  id: string;
  code: string;
  sourceCode: string;
  customer: WaitingCustomerContact;
  attendeeCount: number;
  preference: WaitingPreference;
  status: WaitingEntryStatus;
  position: number | null;
  joinedAtUtc: string;
  version: number;
  estimate?: WaitEstimate | null;
}

export interface WaitingEntryResponse {
  id: string;
  businessId: string;
  branchId: string | null;
  code: string;
  sourceCode: string;
  customer: WaitingCustomerContact;
  attendeeCount: number;
  preference: WaitingPreference;
  resource: WaitingResourceRef | null;
  note: string | null;
  status: WaitingEntryStatus;
  position: number | null;
  positionInGroup: number | null;
  joinedAtUtc: string;
  readyAtUtc: string | null;
  noShowAfterUtc: string | null;
  serviceStartedAtUtc: string | null;
  completedAtUtc: string | null;
  removal: WaitingRemovalRecord | null;
  version: number;
  createdAtUtc: string;
  estimate?: WaitEstimate | null;
}

export interface WaitingDaySummaryResponse {
  date: string;
  waitingNow: number;
  inServiceToday: number;
  leftToday: number;
  averageWaitMinutes: number | null;
}

export interface WaitingActivityResponse {
  id: string;
  action: string;
  actorAccountId: string | null;
  actorDisplay: string | null;
  occurredAtUtc: string;
  changeSummary: Record<string, unknown>;
}

// ---- Query params --------------------------------------------------------------------

export interface ListWaitingEntriesParams {
  date?: string;
  search?: string;
  groupId?: string;
  attendeeCount?: number;
  minAttendees?: number;
  maxAttendees?: number;
  statuses?: readonly WaitingEntryStatus[];
  sourceCodes?: readonly string[];
  sort?: WaitingEntrySort;
  page?: number;
  pageSize?: number;
  includeEstimates?: boolean;
}

// ---- Requests (businessId is added by the client) ------------------------------------

export interface AddWaitingEntryRequest {
  branchId?: string | null;
  sourceCode: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  customerExternalRef?: string | null;
  attendeeCount: number;
  groupId?: string | null;
  resourceId?: string | null;
  note?: string | null;
}

export interface UpdateWaitingEntryRequest {
  attendeeCount: number;
  groupId: string | null;
  note: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  customerExternalRef: string | null;
  expectedVersion: number;
}

export interface WaitingExpectedVersionRequest {
  expectedVersion: number;
}

export interface StartWaitingServiceRequest {
  containerId?: string | null;
  resourceId?: string | null;
  expectedVersion: number;
}

export interface MoveWaitingEntryRequest {
  beforeEntryId?: string | null;
  afterEntryId?: string | null;
  expectedVersion: number;
}

export interface RemoveWaitingEntryRequest {
  reasonCode?: string | null;
  note?: string | null;
  approverAccountId: string;
  approvalPin: string;
  expectedVersion: number;
}

// ---- Settings ------------------------------------------------------------------------

export interface WaitingListSettingsResponse {
  noShowGraceMinutes: number;
  noShowAuto: boolean;
  defaultServiceMinutes: number;
  serviceMinutesByGroup: Record<string, number>;
  estimateSampleThreshold: number;
  minAttendees: number;
  maxAttendees: number;
  removeReasonCodes: string[];
  requireRemoveReason: boolean;
  timeZoneId: string;
  version: number;
}

export type UpdateWaitingListSettingsRequest = Omit<WaitingListSettingsResponse, "version"> & {
  expectedVersion: number;
};

export interface WaitingSourceResponse {
  code: string;
  displayName: string;
  isEnabled: boolean;
  isSeeded: boolean;
  sortOrder: number;
}

export interface UpdateWaitingSourceDto {
  code: string;
  displayName: string;
  isEnabled: boolean;
  sortOrder: number;
}

export interface UpdateWaitingSourcesRequest {
  sources: UpdateWaitingSourceDto[];
}
