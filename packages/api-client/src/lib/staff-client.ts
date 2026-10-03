// Real client for the Staff module AdminApi: `/v1/businesses/{businessId}/staff/...`.
// Source of truth: Octopus.Modules.Staff.Api (StaffApiConstants.cs + endpoint files).
//
// Idempotency-Key is required on every create POST (member, role, role duplicate, shift definition,
// single assignment, time-off type/request/grant, job title, department). Bulk assign, copy, clear,
// approve/reject and the state transitions are not idempotent.
// Bodies that embed businessId (route guard 400s on mismatch) get it filled here. Body-less POSTs and
// DELETEs carry expectedVersion in the query string (deactivate, reactivate, delete, revoke, role
// activate/deactivate); the login/lock/resend POSTs carry it in an optional body.
import type { ListEnvelope } from "../contracts/menu-admin";
import type {
  AcceptInvitationResponse,
  AssignMemberRoleRequest,
  AssignRoleToMembersResponse,
  AssignShiftRequest,
  AssignableRoleResponse,
  AvailabilityRowResponse,
  BulkAssignShiftsRequest,
  BulkAssignmentResultResponse,
  ClearScheduleWeekRequest,
  ClearScheduleWeekResponse,
  CopyScheduleWeekRequest,
  CopyScheduleWeekResponse,
  CreateShiftDefinitionRequest,
  CreateStaffCatalogEntryRequest,
  CreateStaffMemberRequest,
  CreateStaffRoleRequest,
  CreateTimeOffRequestRequest,
  DecideTimeOffRequest,
  DuplicateStaffRoleRequest,
  GetStaffAvailabilityParams,
  GetStaffScheduleParams,
  GrantTimeOffRequest,
  InvitationIssuedResponse,
  ListStaffMembersParams,
  ListStaffRolesParams,
  ListTimeOffRequestsParams,
  PermissionCatalogResponse,
  RoleResponse,
  RoleSummaryResponse,
  ScheduleResponse,
  SetRolePermissionsRequest,
  ShiftAssignmentResponse,
  ShiftDefinitionResponse,
  StaffActivityResponse,
  StaffCatalogEntryResponse,
  StaffMemberProfileResponse,
  StaffMemberResponse,
  StaffMemberSummaryResponse,
  StaffSettingsResponse,
  TimeOffRequestResponse,
  TimeOffTypeResponse,
  UpdateMemberAccessRequest,
  UpdateShiftAssignmentRequest,
  UpdateShiftDefinitionRequest,
  UpdateStaffCatalogEntryRequest,
  UpdateStaffMemberRequest,
  UpdateStaffRoleRequest,
  UpdateStaffSettingsRequest,
  UpdateTimeOffTypeRequest,
} from "../contracts/staff";
import { apiRequest } from "./http";

const base = (businessId: string) => `/v1/businesses/${businessId}/staff`;
const member = (businessId: string, memberId: string) => `${base(businessId)}/members/${memberId}`;
const role = (businessId: string, roleId: string) => `${base(businessId)}/roles/${roleId}`;

function qs(entries: Record<string, string | number | boolean | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(entries)) if (v !== undefined) p.append(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
}

const versionQuery = (expectedVersion?: number) => ({ expectedVersion: expectedVersion?.toString() });

// ---- Members ----

export function listStaffMembers(
  businessId: string,
  params: ListStaffMembersParams = {}
): Promise<ListEnvelope<StaffMemberSummaryResponse>> {
  return apiRequest(`${base(businessId)}/members${qs({ ...params })}`);
}

export function createStaffMember(
  businessId: string,
  request: CreateStaffMemberRequest,
  idempotencyKey: string
): Promise<StaffMemberResponse> {
  return apiRequest(`${base(businessId)}/members`, {
    method: "POST",
    body: { ...request, businessId },
    idempotencyKey,
  });
}

export function getStaffMember(businessId: string, memberId: string): Promise<StaffMemberProfileResponse> {
  return apiRequest(member(businessId, memberId));
}

export function updateStaffMember(
  businessId: string,
  memberId: string,
  request: UpdateStaffMemberRequest
): Promise<StaffMemberResponse> {
  return apiRequest(member(businessId, memberId), { method: "PUT", body: request });
}

export function deleteStaffMember(businessId: string, memberId: string, expectedVersion?: number): Promise<void> {
  return apiRequest(member(businessId, memberId), { method: "DELETE", query: versionQuery(expectedVersion) });
}

export function deactivateStaffMember(
  businessId: string,
  memberId: string,
  expectedVersion?: number
): Promise<StaffMemberResponse> {
  return apiRequest(`${member(businessId, memberId)}/deactivate`, {
    method: "POST",
    query: versionQuery(expectedVersion),
  });
}

export function reactivateStaffMember(
  businessId: string,
  memberId: string,
  expectedVersion?: number
): Promise<StaffMemberResponse> {
  return apiRequest(`${member(businessId, memberId)}/reactivate`, {
    method: "POST",
    query: versionQuery(expectedVersion),
  });
}

export function assignStaffMemberRole(
  businessId: string,
  memberId: string,
  request: AssignMemberRoleRequest
): Promise<StaffMemberResponse> {
  return apiRequest(`${member(businessId, memberId)}/role`, { method: "PUT", body: request });
}

export function updateStaffMemberAccess(
  businessId: string,
  memberId: string,
  request: UpdateMemberAccessRequest
): Promise<StaffMemberResponse> {
  return apiRequest(`${member(businessId, memberId)}/access`, { method: "PUT", body: request });
}

export function listStaffMemberActivity(
  businessId: string,
  memberId: string,
  params: { page?: number; pageSize?: number } = {}
): Promise<ListEnvelope<StaffActivityResponse>> {
  return apiRequest(`${member(businessId, memberId)}/activity${qs({ ...params })}`);
}

// ---- Login / lock / invitations (optional body { expectedVersion }) ----

const membershipPost =
  <T>(path: string) =>
  (businessId: string, memberId: string, expectedVersion?: number): Promise<T> =>
    apiRequest(`${member(businessId, memberId)}/${path}`, {
      method: "POST",
      body: { expectedVersion: expectedVersion ?? null },
    });

export const enableStaffMemberLogin = membershipPost<InvitationIssuedResponse>("login/enable");
export const disableStaffMemberLogin = membershipPost<StaffMemberResponse>("login/disable");
export const lockStaffMember = membershipPost<StaffMemberResponse>("lock");
export const unlockStaffMember = membershipPost<StaffMemberResponse>("unlock");
export const resendStaffInvitation = membershipPost<InvitationIssuedResponse>("invitations/resend");

export function revokeStaffInvitation(businessId: string, memberId: string, expectedVersion?: number): Promise<void> {
  return apiRequest(`${member(businessId, memberId)}/invitations`, {
    method: "DELETE",
    query: versionQuery(expectedVersion),
  });
}

/** The only Staff route outside a business: `/v1/staff/invitations/accept`.
 *  Authenticated by an ACCOUNT session (the invitee is not a member of anything
 *  yet), so callers holding a business token pass the account token explicitly.
 *  Every negative answers 404 `staff.invitation.unavailable`; 429 when throttled. */
export function acceptStaffInvitation(token: string, accountToken?: string): Promise<AcceptInvitationResponse> {
  return apiRequest(`/v1/staff/invitations/accept`, {
    method: "POST",
    body: { token },
    ...(accountToken !== undefined ? { token: accountToken } : {}),
  });
}

// ---- Roles ----

export function listStaffRoles(
  businessId: string,
  params: ListStaffRolesParams = {}
): Promise<ListEnvelope<RoleSummaryResponse>> {
  return apiRequest(`${base(businessId)}/roles${qs({ ...params })}`);
}

export function listAssignableStaffRoles(businessId: string): Promise<AssignableRoleResponse[]> {
  return apiRequest(`${base(businessId)}/roles/assignable`);
}

export function createStaffRole(
  businessId: string,
  request: CreateStaffRoleRequest,
  idempotencyKey: string
): Promise<RoleResponse> {
  return apiRequest(`${base(businessId)}/roles`, {
    method: "POST",
    body: { ...request, businessId },
    idempotencyKey,
  });
}

export function getStaffRole(businessId: string, roleId: string): Promise<RoleResponse> {
  return apiRequest(role(businessId, roleId));
}

export function updateStaffRole(
  businessId: string,
  roleId: string,
  request: UpdateStaffRoleRequest
): Promise<RoleResponse> {
  return apiRequest(role(businessId, roleId), { method: "PUT", body: request });
}

export function deleteStaffRole(businessId: string, roleId: string, expectedVersion?: number): Promise<void> {
  return apiRequest(role(businessId, roleId), { method: "DELETE", query: versionQuery(expectedVersion) });
}

export function setStaffRolePermissions(
  businessId: string,
  roleId: string,
  request: SetRolePermissionsRequest
): Promise<RoleResponse> {
  return apiRequest(`${role(businessId, roleId)}/permissions`, { method: "PUT", body: request });
}

export function duplicateStaffRole(
  businessId: string,
  roleId: string,
  request: DuplicateStaffRoleRequest,
  idempotencyKey: string
): Promise<RoleResponse> {
  return apiRequest(`${role(businessId, roleId)}/duplicate`, {
    method: "POST",
    body: { ...request, businessId, roleId },
    idempotencyKey,
  });
}

export function activateStaffRole(businessId: string, roleId: string, expectedVersion?: number): Promise<RoleResponse> {
  return apiRequest(`${role(businessId, roleId)}/activate`, { method: "POST", query: versionQuery(expectedVersion) });
}

export function deactivateStaffRole(
  businessId: string,
  roleId: string,
  expectedVersion?: number
): Promise<RoleResponse> {
  return apiRequest(`${role(businessId, roleId)}/deactivate`, {
    method: "POST",
    query: versionQuery(expectedVersion),
  });
}

export function assignRoleToStaffMembers(
  businessId: string,
  roleId: string,
  staffMemberIds: string[]
): Promise<AssignRoleToMembersResponse> {
  return apiRequest(`${role(businessId, roleId)}/members`, { method: "POST", body: { staffMemberIds } });
}

export function getStaffPermissionCatalog(businessId: string): Promise<PermissionCatalogResponse> {
  return apiRequest(`${base(businessId)}/permission-catalog`);
}

// ---- Shift definitions ----

export function listShiftDefinitions(businessId: string, includeInactive?: boolean): Promise<ShiftDefinitionResponse[]> {
  return apiRequest(`${base(businessId)}/shift-definitions${qs({ includeInactive })}`);
}

export function createShiftDefinition(
  businessId: string,
  request: CreateShiftDefinitionRequest,
  idempotencyKey: string
): Promise<ShiftDefinitionResponse> {
  return apiRequest(`${base(businessId)}/shift-definitions`, {
    method: "POST",
    body: { ...request, businessId },
    idempotencyKey,
  });
}

export function updateShiftDefinition(
  businessId: string,
  shiftDefinitionId: string,
  request: UpdateShiftDefinitionRequest
): Promise<ShiftDefinitionResponse> {
  return apiRequest(`${base(businessId)}/shift-definitions/${shiftDefinitionId}`, { method: "PUT", body: request });
}

export function deleteShiftDefinition(
  businessId: string,
  shiftDefinitionId: string,
  expectedVersion?: number
): Promise<void> {
  return apiRequest(`${base(businessId)}/shift-definitions/${shiftDefinitionId}`, {
    method: "DELETE",
    query: versionQuery(expectedVersion),
  });
}

// ---- Schedule ----

export function getStaffSchedule(businessId: string, params: GetStaffScheduleParams): Promise<ScheduleResponse> {
  return apiRequest(`${base(businessId)}/schedule${qs({ ...params })}`);
}

export function createShiftAssignment(
  businessId: string,
  request: AssignShiftRequest,
  idempotencyKey: string
): Promise<ShiftAssignmentResponse> {
  return apiRequest(`${base(businessId)}/assignments`, {
    method: "POST",
    body: { ...request, businessId },
    idempotencyKey,
  });
}

export function bulkAssignShifts(
  businessId: string,
  request: BulkAssignShiftsRequest
): Promise<BulkAssignmentResultResponse> {
  return apiRequest(`${base(businessId)}/assignments/bulk`, { method: "POST", body: { ...request, businessId } });
}

export function updateShiftAssignment(
  businessId: string,
  assignmentId: string,
  request: UpdateShiftAssignmentRequest
): Promise<ShiftAssignmentResponse> {
  return apiRequest(`${base(businessId)}/assignments/${assignmentId}`, { method: "PUT", body: request });
}

export function deleteShiftAssignment(
  businessId: string,
  assignmentId: string,
  expectedVersion?: number
): Promise<void> {
  return apiRequest(`${base(businessId)}/assignments/${assignmentId}`, {
    method: "DELETE",
    query: versionQuery(expectedVersion),
  });
}

export function copyScheduleWeek(
  businessId: string,
  request: CopyScheduleWeekRequest
): Promise<CopyScheduleWeekResponse> {
  return apiRequest(`${base(businessId)}/schedule/copy`, { method: "POST", body: { ...request, businessId } });
}

export function clearScheduleWeek(
  businessId: string,
  request: ClearScheduleWeekRequest
): Promise<ClearScheduleWeekResponse> {
  return apiRequest(`${base(businessId)}/schedule/clear`, { method: "POST", body: { ...request, businessId } });
}

// ---- Time off ----

export function listTimeOffTypes(businessId: string, includeInactive?: boolean): Promise<TimeOffTypeResponse[]> {
  return apiRequest(`${base(businessId)}/time-off/types${qs({ includeInactive })}`);
}

export function createTimeOffType(
  businessId: string,
  request: CreateStaffCatalogEntryRequest,
  idempotencyKey: string
): Promise<TimeOffTypeResponse> {
  return apiRequest(`${base(businessId)}/time-off/types`, {
    method: "POST",
    body: { ...request, businessId },
    idempotencyKey,
  });
}

export function updateTimeOffType(
  businessId: string,
  timeOffTypeId: string,
  request: UpdateTimeOffTypeRequest
): Promise<TimeOffTypeResponse> {
  return apiRequest(`${base(businessId)}/time-off/types/${timeOffTypeId}`, { method: "PUT", body: request });
}

export function deleteTimeOffType(businessId: string, timeOffTypeId: string, expectedVersion?: number): Promise<void> {
  return apiRequest(`${base(businessId)}/time-off/types/${timeOffTypeId}`, {
    method: "DELETE",
    query: versionQuery(expectedVersion),
  });
}

export function listTimeOffRequests(
  businessId: string,
  params: ListTimeOffRequestsParams = {}
): Promise<ListEnvelope<TimeOffRequestResponse>> {
  return apiRequest(`${base(businessId)}/time-off/requests${qs({ ...params })}`);
}

export function createTimeOffRequest(
  businessId: string,
  request: CreateTimeOffRequestRequest,
  idempotencyKey: string
): Promise<TimeOffRequestResponse> {
  return apiRequest(`${base(businessId)}/time-off/requests`, {
    method: "POST",
    body: { ...request, businessId },
    idempotencyKey,
  });
}

export function approveTimeOffRequest(
  businessId: string,
  requestId: string,
  request: DecideTimeOffRequest = {}
): Promise<TimeOffRequestResponse> {
  return apiRequest(`${base(businessId)}/time-off/requests/${requestId}/approve`, { method: "POST", body: request });
}

export function rejectTimeOffRequest(
  businessId: string,
  requestId: string,
  request: DecideTimeOffRequest = {}
): Promise<TimeOffRequestResponse> {
  return apiRequest(`${base(businessId)}/time-off/requests/${requestId}/reject`, { method: "POST", body: request });
}

export function grantTimeOff(
  businessId: string,
  request: GrantTimeOffRequest,
  idempotencyKey: string
): Promise<TimeOffRequestResponse> {
  return apiRequest(`${base(businessId)}/time-off/grants`, {
    method: "POST",
    body: { ...request, businessId },
    idempotencyKey,
  });
}

// ---- Settings, job titles, departments ----

export function getStaffSettings(businessId: string): Promise<StaffSettingsResponse> {
  return apiRequest(`${base(businessId)}/settings`);
}

export function updateStaffSettings(
  businessId: string,
  request: UpdateStaffSettingsRequest
): Promise<StaffSettingsResponse> {
  return apiRequest(`${base(businessId)}/settings`, { method: "PUT", body: request });
}

const catalog = (segment: "job-titles" | "departments") => ({
  list: (businessId: string, includeInactive?: boolean): Promise<StaffCatalogEntryResponse[]> =>
    apiRequest(`${base(businessId)}/${segment}${qs({ includeInactive })}`),
  create: (
    businessId: string,
    request: CreateStaffCatalogEntryRequest,
    idempotencyKey: string
  ): Promise<StaffCatalogEntryResponse> =>
    apiRequest(`${base(businessId)}/${segment}`, { method: "POST", body: { ...request, businessId }, idempotencyKey }),
  update: (
    businessId: string,
    id: string,
    request: UpdateStaffCatalogEntryRequest
  ): Promise<StaffCatalogEntryResponse> =>
    apiRequest(`${base(businessId)}/${segment}/${id}`, { method: "PUT", body: request }),
  remove: (businessId: string, id: string, expectedVersion?: number): Promise<void> =>
    apiRequest(`${base(businessId)}/${segment}/${id}`, { method: "DELETE", query: versionQuery(expectedVersion) }),
});

const jobTitles = catalog("job-titles");
const departments = catalog("departments");

export const listStaffJobTitles = jobTitles.list;
export const createStaffJobTitle = jobTitles.create;
export const updateStaffJobTitle = jobTitles.update;
export const deleteStaffJobTitle = jobTitles.remove;
export const listStaffDepartments = departments.list;
export const createStaffDepartment = departments.create;
export const updateStaffDepartment = departments.update;
export const deleteStaffDepartment = departments.remove;

// ---- Availability ----

export function getStaffAvailability(
  businessId: string,
  params: GetStaffAvailabilityParams
): Promise<ListEnvelope<AvailabilityRowResponse>> {
  return apiRequest(`${base(businessId)}/availability${qs({ ...params })}`);
}
