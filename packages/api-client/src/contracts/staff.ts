// Wire contracts for the Staff module AdminApi. Source: Octopus.Modules.Staff.Contracts (Dtos) and the
// Application command records that are bound directly as request bodies.
// Guid -> string, DateOnly -> "YYYY-MM-DD", TimeOnly -> "HH:mm:ss", DateTimeOffset -> ISO string.

export type StaffEmploymentStatus = "Active" | "Inactive";
export type StaffAccountAccess = "None" | "Invited" | "Enabled" | "Disabled" | "Locked";
export type StaffAccessScope = "AssignedBranch" | "Business";
export type StaffAccessLevel = "Full" | "Limited";
export type StaffEmploymentType = "FullTime" | "PartTime" | "Contract" | "Temporary";
export type StaffGender = "Female" | "Male" | "Other";
export type StaffTimeOffStatus = "Pending" | "Approved" | "Rejected";
export type StaffTimeOffOrigin = "SelfRequested" | "RaisedOnBehalf" | "DirectGrant";
export type StaffWeekDay = "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";
export type StaffAvailabilityStatus = "Available" | "NotAvailable";

export interface StaffMemberSummaryResponse {
  id: string;
  memberCode: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  jobTitleId: string | null;
  branchId: string | null;
  employmentStatus: StaffEmploymentStatus;
  accountAccess: StaffAccountAccess;
  roleId: string | null;
  lastUpdatedAtUtc: string;
  version: number;
  accountId?: string | null;
}

export interface StaffMemberResponse {
  id: string;
  memberCode: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string | null;
  dateOfBirth: string | null;
  gender: StaffGender | null;
  nationalityCode: string | null;
  languageCodes: string[];
  jobTitleId: string | null;
  departmentId: string | null;
  reportsToStaffMemberId: string | null;
  hireDate: string | null;
  employmentType: StaffEmploymentType;
  employmentStatus: StaffEmploymentStatus;
  accountAccess: StaffAccountAccess;
  accessScope: StaffAccessScope;
  accessLevel: StaffAccessLevel;
  branchId: string | null;
  roleId: string | null;
  roleAssignedAtUtc: string | null;
  canActInBusiness: boolean;
  createdAtUtc: string;
  version: number;
  accountId?: string | null;
}

export interface StaffMemberProfileResponse {
  member: StaffMemberResponse;
  modulesAccess: string[];
}

export interface StaffActivityResponse {
  id: string;
  action: string;
  actorAccountId: string | null;
  actorDisplay: string | null;
  occurredAtUtc: string;
  changeSummary: Record<string, unknown>;
}

export interface ListStaffMembersParams {
  search?: string;
  branchId?: string;
  status?: StaffEmploymentStatus;
  roleId?: string;
  departmentId?: string;
  employmentType?: StaffEmploymentType;
  page?: number;
  pageSize?: number;
}

/** businessId is filled by the client. */
export interface CreateStaffMemberRequest {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  branchId?: string | null;
  email?: string | null;
  dateOfBirth?: string | null;
  gender?: StaffGender | null;
  nationalityCode?: string | null;
  languageCodes?: string[] | null;
  jobTitleId?: string | null;
  departmentId?: string | null;
  reportsToStaffMemberId?: string | null;
  hireDate?: string | null;
  employmentType?: StaffEmploymentType | null;
}

export interface UpdateStaffMemberRequest {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string | null;
  dateOfBirth?: string | null;
  gender?: StaffGender | null;
  nationalityCode?: string | null;
  languageCodes?: string[] | null;
  jobTitleId?: string | null;
  departmentId?: string | null;
  reportsToStaffMemberId?: string | null;
  hireDate?: string | null;
  employmentType?: StaffEmploymentType | null;
  branchId?: string | null;
  expectedVersion?: number | null;
}

export interface AssignMemberRoleRequest {
  roleId: string | null;
  expectedVersion?: number | null;
}

export interface UpdateMemberAccessRequest {
  accessScope: StaffAccessScope;
  branchId?: string | null;
  expectedVersion?: number | null;
}

export interface AssignRoleToMembersResponse {
  roleId: string;
  assignedCount: number;
}

export interface InvitationIssuedResponse {
  staffMemberId: string;
  invitationIssued: boolean;
  expiresAtUtc: string | null;
  maskedEmail: string | null;
  accountAccess: StaffAccountAccess;
  version: number;
}

export interface AcceptInvitationResponse {
  businessId: string;
  staffMemberId: string;
}

export interface RoleSummaryResponse {
  id: string;
  name: string;
  description: string | null;
  isSystemRole: boolean;
  isActive: boolean;
  permissionCount: number;
  memberCount: number;
  version: number;
}

export interface RoleResponse {
  id: string;
  name: string;
  description: string | null;
  isSystemRole: boolean;
  isActive: boolean;
  permissions: string[];
  memberCount: number;
  version: number;
}

export interface AssignableRoleResponse {
  id: string;
  name: string;
  description: string | null;
}

export interface ListStaffRolesParams {
  search?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

export interface CreateStaffRoleRequest {
  name: string;
  description?: string | null;
}

export interface UpdateStaffRoleRequest {
  name: string;
  description?: string | null;
  expectedVersion?: number | null;
}

export interface DuplicateStaffRoleRequest {
  name: string;
  description?: string | null;
}

export interface SetRolePermissionsRequest {
  permissions: string[];
  expectedVersion?: number | null;
}

export interface PermissionCatalogEntryResponse {
  id: string;
  displayNameKey: string;
  descriptionKey: string;
}

export interface PermissionCatalogCapabilityResponse {
  id: string;
  displayNameKey: string;
  descriptionKey: string;
  permissions: PermissionCatalogEntryResponse[];
}

export interface PermissionCatalogModuleResponse {
  code: string;
  displayNameKey: string;
  capabilities: PermissionCatalogCapabilityResponse[];
  ungatedPermissions: PermissionCatalogEntryResponse[];
}

export interface PermissionCatalogResponse {
  modules: PermissionCatalogModuleResponse[];
}

export interface StaffCatalogEntryResponse {
  id: string;
  nameAr: string;
  nameEn: string;
  sortOrder: number;
  isActive: boolean;
  version: number;
}

export interface CreateStaffCatalogEntryRequest {
  nameAr: string;
  nameEn: string;
  sortOrder?: number | null;
}

export interface UpdateStaffCatalogEntryRequest {
  nameAr: string;
  nameEn: string;
  sortOrder?: number | null;
  isActive?: boolean | null;
  expectedVersion?: number | null;
}

export type UpdateTimeOffTypeRequest = UpdateStaffCatalogEntryRequest;

export interface ShiftDefinitionResponse {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  spansMidnight: boolean;
  workingDays: StaffWeekDay[];
  breakMinutes: number;
  paidHours: number;
  colorToken: string | null;
  isActive: boolean;
  version: number;
}

export interface CreateShiftDefinitionRequest {
  name: string;
  startTime: string;
  endTime: string;
  workingDays: StaffWeekDay[];
  breakMinutes: number;
  colorToken?: string | null;
}

export interface UpdateShiftDefinitionRequest {
  name: string;
  startTime: string;
  endTime: string;
  workingDays: StaffWeekDay[];
  breakMinutes: number;
  colorToken?: string | null;
  isActive?: boolean | null;
  expectedVersion?: number | null;
}

export interface ShiftAssignmentResponse {
  id: string;
  shiftDefinitionId: string;
  shiftName: string;
  colorToken: string | null;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  isOverridden: boolean;
  spansMidnight: boolean;
  paidHours: number;
  notes: string | null;
  version: number;
}

export interface ScheduleDayResponse {
  date: string;
  dayOfWeek: StaffWeekDay;
  assignment: ShiftAssignmentResponse | null;
}

export interface ScheduleMemberRowResponse {
  staffMemberId: string;
  memberCode: string;
  firstName: string;
  lastName: string;
  branchId: string | null;
  days: ScheduleDayResponse[];
  scheduledHours: number;
}

export interface ScheduleResponse {
  from: string;
  to: string;
  weekStartsOn: StaffWeekDay;
  members: ScheduleMemberRowResponse[];
  totalScheduledHours: number;
  scheduledMemberCount: number;
}

export interface GetStaffScheduleParams {
  from: string;
  to: string;
  branchId?: string;
  staffMemberId?: string;
  shiftDefinitionId?: string;
}

/** businessId is filled by the client. */
export interface AssignShiftRequest {
  staffMemberId: string;
  date: string;
  shiftDefinitionId: string;
  startOverride?: string | null;
  endOverride?: string | null;
  breakMinutesOverride?: number | null;
  notes?: string | null;
}

export interface BulkAssignShiftsRequest {
  staffMemberIds: string[];
  dates: string[];
  shiftDefinitionId: string;
  startOverride?: string | null;
  endOverride?: string | null;
  breakMinutesOverride?: number | null;
}

export interface UpdateShiftAssignmentRequest {
  shiftDefinitionId: string;
  startOverride?: string | null;
  endOverride?: string | null;
  breakMinutesOverride?: number | null;
  notes?: string | null;
  expectedVersion?: number | null;
}

export interface BulkAssignmentSkipResponse {
  staffMemberId: string;
  date: string;
  reason: string;
}

export interface BulkAssignmentResultResponse {
  created: number;
  skipped: BulkAssignmentSkipResponse[];
}

export interface CopyScheduleWeekRequest {
  staffMemberId?: string | null;
  fromStart: string;
  toStart: string;
}

export interface CopyScheduleWeekResponse {
  created: number;
  skipped: BulkAssignmentSkipResponse[];
}

export interface ClearScheduleWeekRequest {
  staffMemberId?: string | null;
  from: string;
  to: string;
}

export interface ClearScheduleWeekResponse {
  removed: number;
}

export interface TimeOffTypeResponse {
  id: string;
  nameAr: string;
  nameEn: string;
  sortOrder: number;
  isActive: boolean;
  version: number;
}

export interface TimeOffRequestResponse {
  id: string;
  staffMemberId: string;
  memberCode: string;
  firstName: string;
  lastName: string;
  timeOffTypeId: string;
  typeNameAr: string;
  typeNameEn: string;
  startDate: string;
  endDate: string;
  dayCount: number;
  status: StaffTimeOffStatus;
  origin: StaffTimeOffOrigin;
  decidedAtUtc: string | null;
  decidedBy: string | null;
  decisionNote: string | null;
  version: number;
}

export interface ListTimeOffRequestsParams {
  staffMemberId?: string;
  status?: StaffTimeOffStatus;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

/** businessId is filled by the client. staffMemberId omitted = raised for the caller's own member. */
export interface CreateTimeOffRequestRequest {
  staffMemberId?: string | null;
  timeOffTypeId: string;
  startDate: string;
  endDate: string;
}

export interface GrantTimeOffRequest {
  staffMemberId: string;
  timeOffTypeId: string;
  startDate: string;
  endDate: string;
  note?: string | null;
}

export interface DecideTimeOffRequest {
  note?: string | null;
  expectedVersion?: number | null;
}

export interface StaffSettingsResponse {
  weekStartDay: StaffWeekDay;
  invitationTtlDays: number;
  seedProfileCode: string | null;
  seededAtUtc: string | null;
  version: number;
}

export interface UpdateStaffSettingsRequest {
  weekStartDay?: StaffWeekDay | null;
  invitationTtlDays?: number | null;
  expectedVersion?: number | null;
}

export interface AvailabilityRowResponse {
  staffMemberId: string;
  memberCode: string;
  firstName: string;
  lastName: string;
  branchId: string | null;
  status: StaffAvailabilityStatus;
  shiftDefinitionId: string | null;
  shiftName: string | null;
  shiftStart: string | null;
  shiftEnd: string | null;
  timeOffTypeNameAr: string | null;
  timeOffTypeNameEn: string | null;
}

export interface GetStaffAvailabilityParams {
  date: string;
  branchId?: string;
  page?: number;
  pageSize?: number;
}
