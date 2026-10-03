// Bridge between the Staff API and the Staff screens' in-memory model.
//
// The screens edit a rich `Employee` + `MemberProfile` (most of it mock-only:
// iqama, salary bands, attendance...) and a role list. The API knows a leaner
// member and a role with flat permission codes. `loadAll` turns the API into the
// screens' shape; `pushMember` / `pushRole` turn a local edit back into the
// minimal API calls, comparing against what the server last reported so a save
// that changed nothing the API stores sends nothing.
import {
  ApiError,
  activateStaffRole,
  assignStaffMemberRole,
  createStaffMember,
  createStaffRole,
  deactivateStaffMember,
  deactivateStaffRole,
  deleteStaffMember,
  deleteStaffRole,
  disableStaffMemberLogin,
  enableStaffMemberLogin,
  getStaffMember,
  listStaffMembers,
  listStaffRoles,
  lockStaffMember,
  reactivateStaffMember,
  unlockStaffMember,
  updateStaffMember,
  updateStaffMemberAccess,
  updateStaffRole,
  type RoleResponse,
  type StaffAccessScope,
  type StaffAccountAccess,
  type StaffEmploymentType,
  type StaffMemberResponse,
  type RoleSummaryResponse,
} from "@octopus/api-client";
import { branches, type ContractType, type Employee, type MemberProfile, type StaffRole } from "@/shared/api/mock-staff";
import type { RoleRecord } from "./staff-store";

const key = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export function describeStaffError(err: unknown): string {
  if (err instanceof ApiError) return err.problem?.detail ?? err.problem?.errorCode ?? err.message;
  return err instanceof Error ? err.message : "Request failed";
}

/** local id -> server id, for rows created in this session. */
const memberIds = new Map<string, string>();
const roleIds = new Map<string, string>();
export const serverMemberId = (id: string) => memberIds.get(id) ?? id;
export const serverRoleId = (id: string) => roleIds.get(id) ?? id;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isServerId = (id: string) => UUID.test(id);

interface MemberBaseline {
  body: string;
  roleId: string | null;
  inactive: boolean;
  locked: boolean;
  login: boolean;
  /** Whether the member may act across the whole business (accessScope = Business). */
  businessScope: boolean;
  version: number;
}
const members = new Map<string, MemberBaseline>();

/** What the screens need from the server that the mock profile has no field for. */
export interface MemberMeta {
  accountAccess: StaffAccountAccess;
  accessScope: StaffAccessScope;
  jobTitleId: string | null;
  departmentId: string | null;
}
const metaOf = (m: StaffMemberResponse): MemberMeta => ({
  accountAccess: m.accountAccess,
  accessScope: m.accessScope,
  jobTitleId: m.jobTitleId,
  departmentId: m.departmentId,
});
let roleNameCache = new Map<string, string>();
const roleVersions = new Map<string, { version: number; name: string; description: string; active: boolean }>();

// ---- mapping ------------------------------------------------------------------

const EMPLOYMENT_FROM_API: Record<StaffEmploymentType, MemberProfile["employmentType"]> = {
  FullTime: "Full time",
  PartTime: "Part time",
  Contract: "Full time",
  Temporary: "Part time",
};

const COUNTRIES: Record<string, string> = {
  "saudi arabia": "SA", saudi: "SA", egypt: "EG", jordan: "JO", yemen: "YE", sudan: "SD", syria: "SY", lebanon: "LB",
  india: "IN", pakistan: "PK", bangladesh: "BD", philippines: "PH", indonesia: "ID", nepal: "NP", "sri lanka": "LK",
  uae: "AE", "united arab emirates": "AE", kuwait: "KW", qatar: "QA", bahrain: "BH", oman: "OM", morocco: "MA",
  tunisia: "TN", palestine: "PS", iraq: "IQ",
};
const COUNTRY_NAMES = new Map(Object.entries(COUNTRIES).reverse().map(([name, code]) => [code, name.replace(/\w/g, (c) => c.toUpperCase())]));
const LANGUAGES: Record<string, string> = { english: "en", arabic: "ar", urdu: "ur", hindi: "hi", tagalog: "tl", bengali: "bn" };
const LANGUAGE_NAMES = new Map(Object.entries(LANGUAGES).map(([name, code]) => [code, name[0].toUpperCase() + name.slice(1)]));

/** The API keeps ISO codes; the form takes free text. Unknown names cannot be sent. */
const countryCode = (text: string): string | null => {
  const t = text.trim();
  if (/^[a-z]{2}$/i.test(t)) return t.toUpperCase();
  return COUNTRIES[t.toLowerCase()] ?? null;
};
const languageCodes = (text: string): string[] =>
  text
    .split(",")
    .map((l) => l.trim().toLowerCase())
    .map((l) => (/^[a-z]{2}$/.test(l) ? l : LANGUAGES[l]))
    .filter((l): l is string => Boolean(l));

const compactPhone = (phone: string) => phone.replace(/\s+/g, "");

function toEmployee(m: StaffMemberResponse, roleNames: Map<string, string>): Employee {
  const contract: ContractType = m.employmentType === "PartTime" ? "Part-time" : m.employmentType === "Temporary" ? "Seasonal" : "Full-time";
  return {
    id: m.id,
    name: `${m.firstName} ${m.lastName}`.trim(),
    nameAr: "",
    phone: m.phoneNumber,
    role: (m.roleId ? (roleNames.get(m.roleId) ?? "") : "") as StaffRole,
    // The API only carries a branch id and there is no branches endpoint yet.
    branch: branches[0],
    status: "Off Duty",
    todayShift: "—",
    hoursThisWeek: 0,
    attendance: 0,
    hireDate: m.hireDate ?? m.createdAtUtc.slice(0, 10),
    iqamaExpiry: "",
    contractType: contract,
    salaryBandMin: 0,
    salaryBandMax: 0,
    emergencyContactName: "",
    emergencyContactPhone: "",
    documents: [],
  };
}

function toProfilePatch(m: StaffMemberResponse): Partial<MemberProfile> {
  return {
    employeeCode: m.memberCode,
    firstName: m.firstName,
    lastName: m.lastName,
    email: m.email ?? "",
    dateOfBirth: m.dateOfBirth ?? "",
    gender: m.gender === "Female" ? "Female" : "Male",
    nationality: m.nationalityCode ? (COUNTRY_NAMES.get(m.nationalityCode) ?? m.nationalityCode) : "",
    languages: m.languageCodes.map((c) => LANGUAGE_NAMES.get(c) ?? c).join(", "),
    employmentType: EMPLOYMENT_FROM_API[m.employmentType] ?? "Full time",
    jobTitle: m.jobTitleId ?? "",
    department: m.departmentId ?? "",
    assignedRole: m.roleId ?? "",
    accessLevel: m.accessLevel === "Full" ? "Full Access" : "Limited",
    allowSystemLogin: m.accountAccess === "Invited" || m.accountAccess === "Enabled",
    allowAccessOutsideBranch: m.accessScope === "Business",
    locked: m.accountAccess === "Locked",
  };
}

function baselineOf(m: StaffMemberResponse, body: string): MemberBaseline {
  return {
    body,
    roleId: m.roleId,
    inactive: m.employmentStatus === "Inactive",
    locked: m.accountAccess === "Locked",
    login: m.accountAccess === "Invited" || m.accountAccess === "Enabled",
    businessScope: m.accessScope === "Business",
    version: m.version,
  };
}

/** A member must belong to a branch, and the API has no branches to list yet, so
 *  the business's own id stands in for its single main branch. */
function bodyOf(employee: Employee, profile: MemberProfile, branchId: string) {
  const [firstName, ...rest] = employee.name.trim().split(/\s+/);
  return {
    firstName: profile.firstName || firstName || "",
    lastName: profile.lastName || rest.join(" "),
    branchId,
    phoneNumber: compactPhone(employee.phone),
    email: profile.email.trim() || null,
    dateOfBirth: profile.dateOfBirth || null,
    gender: profile.gender,
    nationalityCode: countryCode(profile.nationality),
    languageCodes: languageCodes(profile.languages),
    // Job title and department are the business's own catalogs (GET /job-titles, /departments).
    jobTitleId: isServerId(profile.jobTitle) ? profile.jobTitle : null,
    departmentId: isServerId(profile.department) ? profile.department : null,
    hireDate: employee.hireDate || null,
    employmentType: (profile.employmentType === "Part time" ? "PartTime" : "FullTime") as StaffEmploymentType,
  };
}

export interface Loaded {
  employees: Employee[];
  profiles: Record<string, Partial<MemberProfile>>;
  inactive: string[];
  roles: RoleRecord[];
  meta: Record<string, MemberMeta>;
}

const roleRecord = (r: RoleSummaryResponse): RoleRecord => ({
  id: r.id,
  name: r.name,
  description: r.description ?? "",
  isSystemRole: r.isSystemRole,
  active: r.isActive,
});

export async function loadAll(businessId: string): Promise<Loaded> {
  const roleRows: RoleSummaryResponse[] = [];
  for (let page = 1; ; page += 1) {
    const res = await listStaffRoles(businessId, { page, pageSize: 100 });
    roleRows.push(...res.data);
    if (res.data.length < 100) break;
  }
  roleRows.forEach((r) => roleVersions.set(r.id, { version: r.version, name: r.name, description: r.description ?? "", active: r.isActive }));
  const roleNames = new Map(roleRows.map((r) => [r.id, r.name]));
  roleNameCache = roleNames;

  const summaries = [];
  for (let page = 1; ; page += 1) {
    const res = await listStaffMembers(businessId, { page, pageSize: 100 });
    summaries.push(...res.data);
    if (res.data.length < 100) break;
  }
  const full = await Promise.all(summaries.map((s) => getStaffMember(businessId, s.id)));

  const out: Loaded = { employees: [], profiles: {}, inactive: [], roles: roleRows.map(roleRecord), meta: {} };
  for (const { member: m } of full) {
    const employee = toEmployee(m, roleNames);
    out.employees.push(employee);
    out.profiles[m.id] = toProfilePatch(m);
    if (m.employmentStatus === "Inactive") out.inactive.push(m.id);
    out.meta[m.id] = metaOf(m);
    const profileBody = JSON.stringify(bodyOf(employee, { ...(toProfilePatch(m) as MemberProfile), employee }, businessId));
    members.set(m.id, baselineOf(m, profileBody));
  }
  return out;
}

// ---- members ------------------------------------------------------------------

export interface MemberState {
  employee: Employee;
  profile: MemberProfile;
  inactive: boolean;
}

/** Brings the server's copy of one member in line with the screen's. */
export async function pushMember(businessId: string, localId: string, state: MemberState): Promise<void> {
  const { employee, profile, inactive } = state;
  const body = bodyOf(employee, profile, businessId);
  const roleId = profile.assignedRole ? serverRoleId(profile.assignedRole) : null;
  let sid = memberIds.get(localId) ?? (isServerId(localId) ? localId : null);
  let base = sid ? members.get(sid) : undefined;

  if (!sid) {
    const created = await createStaffMember(businessId, body, key());
    sid = created.id;
    memberIds.set(localId, sid);
    base = baselineOf(created, JSON.stringify(body));
    members.set(sid, base);
  } else if (base && base.body !== JSON.stringify(body)) {
    const res = await updateStaffMember(businessId, sid, { ...body, expectedVersion: base.version });
    base = { ...base, body: JSON.stringify(body), version: res.version };
    members.set(sid, base);
  }
  if (!base) return;

  if ((roleId ?? null) !== (base.roleId ?? null) && isServerId(roleId ?? sid)) {
    const res = await assignStaffMemberRole(businessId, sid, { roleId, expectedVersion: base.version });
    base = { ...base, roleId: res.roleId, version: res.version };
  }
  if (inactive !== base.inactive) {
    const res = inactive ? await deactivateStaffMember(businessId, sid, base.version) : await reactivateStaffMember(businessId, sid, base.version);
    base = { ...base, inactive, version: res.version };
  }
  // Enabling sign-in sends an invitation, which the API refuses without an
  // email; a member added without one stays sign-in-less until it is set.
  const canSignIn = !profile.allowSystemLogin || body.email !== null;
  if (profile.allowSystemLogin !== base.login && canSignIn) {
    if (profile.allowSystemLogin) await enableStaffMemberLogin(businessId, sid, base.version);
    else await disableStaffMemberLogin(businessId, sid, base.version);
    // These answer with something other than the member, so re-read its version.
    const fresh = (await getStaffMember(businessId, sid)).member;
    base = { ...base, login: profile.allowSystemLogin, version: fresh.version };
  }
  if (profile.locked !== base.locked && base.login) {
    const res = profile.locked ? await lockStaffMember(businessId, sid, base.version) : await unlockStaffMember(businessId, sid, base.version);
    base = { ...base, locked: profile.locked, version: res.version };
  }
  // Where the member may act: PUT /members/{id}/access. The branch is the same
  // stand-in the member body sends (no branches endpoint yet, BACKEND_GAPS 6.9).
  if (profile.allowAccessOutsideBranch !== base.businessScope) {
    const res = await updateStaffMemberAccess(businessId, sid, {
      accessScope: profile.allowAccessOutsideBranch ? "Business" : "AssignedBranch",
      branchId: businessId,
      expectedVersion: base.version,
    });
    base = { ...base, businessScope: res.accessScope === "Business", version: res.version };
  }
  members.set(sid, base);
}

/** The server id of a member row, or null while it only exists on screen. */
export function serverMemberIdOrNull(localId: string): string | null {
  return memberIds.get(localId) ?? (isServerId(localId) ? localId : null);
}

/** The version the next write to this member must carry. */
export function memberVersion(localId: string): number | undefined {
  const sid = serverMemberIdOrNull(localId);
  return sid ? members.get(sid)?.version : undefined;
}

export interface RefreshedMember {
  profile: Partial<MemberProfile>;
  meta: MemberMeta;
  inactive: boolean;
}

/** Re-reads a member after a write made outside `pushMember` (invitations, bulk
 *  role assignment), so the next save starts from the server's version. */
export async function refreshMember(businessId: string, localId: string): Promise<RefreshedMember | null> {
  const sid = serverMemberIdOrNull(localId);
  if (!sid) return null;
  const { member: m } = await getStaffMember(businessId, sid);
  const patch = toProfilePatch(m);
  const employee = toEmployee(m, roleNameCache);
  const body = JSON.stringify(bodyOf(employee, { ...(patch as MemberProfile), employee }, businessId));
  members.set(sid, baselineOf(m, body));
  return { profile: patch, meta: metaOf(m), inactive: m.employmentStatus === "Inactive" };
}

export async function dropMember(businessId: string, localId: string): Promise<void> {
  const sid = memberIds.get(localId) ?? (isServerId(localId) ? localId : null);
  if (!sid) return;
  await deleteStaffMember(businessId, sid, members.get(sid)?.version);
  members.delete(sid);
}

// ---- roles --------------------------------------------------------------------

export async function pushRole(businessId: string, role: RoleRecord): Promise<void> {
  let sid = roleIds.get(role.id) ?? (isServerId(role.id) ? role.id : null);
  if (!sid) {
    const created = await createStaffRole(businessId, { name: role.name, description: role.description }, key());
    sid = created.id;
    roleIds.set(role.id, sid);
    roleVersions.set(sid, { version: created.version, name: created.name, description: created.description ?? "", active: created.isActive });
  }
  let base = roleVersions.get(sid);
  if (!base) return;
  if (base.name !== role.name || base.description !== role.description) {
    const res = await updateStaffRole(businessId, sid, { name: role.name, description: role.description, expectedVersion: base.version });
    base = { ...base, name: res.name, description: res.description ?? "", version: res.version };
  }
  if (base.active !== role.active) {
    const res = role.active ? await activateStaffRole(businessId, sid, base.version) : await deactivateStaffRole(businessId, sid, base.version);
    base = { ...base, active: role.active, version: res.version };
  }
  roleVersions.set(sid, base);
}

/** Records a role the screens created or copied directly (create / duplicate). */
export function rememberRole(r: RoleResponse): RoleRecord {
  roleVersions.set(r.id, { version: r.version, name: r.name, description: r.description ?? "", active: r.isActive });
  roleNameCache.set(r.id, r.name);
  return { id: r.id, name: r.name, description: r.description ?? "", isSystemRole: r.isSystemRole, active: r.isActive };
}

/** A permission save bumps the role's version; the next rename must carry it. */
export function noteRoleVersion(localId: string, version: number): void {
  const sid = serverRoleId(localId);
  const base = roleVersions.get(sid);
  if (base) roleVersions.set(sid, { ...base, version });
}

export async function dropRole(businessId: string, localId: string): Promise<void> {
  const sid = roleIds.get(localId) ?? (isServerId(localId) ? localId : null);
  if (!sid) return;
  await deleteStaffRole(businessId, sid, roleVersions.get(sid)?.version);
  roleVersions.delete(sid);
}
