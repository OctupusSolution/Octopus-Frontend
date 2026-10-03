// Shifts, schedule and time-off against the Staff API.
//
// Shift roles are the API's shift definitions; a schedule cell is a shift
// assignment (member + date + definition, with optional start/end overrides);
// a leave request is a time-off request. The screens edit whole maps/lists and
// hand over the new value, so each `push*` here compares the old and new value
// and sends only the difference.
//
// Days off ("offDays") are a planning marker the API has no field for, so they
// stay local.
import {
  approveTimeOffRequest,
  createShiftAssignment,
  createShiftDefinition,
  createTimeOffRequest,
  createTimeOffType,
  deleteShiftAssignment,
  deleteShiftDefinition,
  getStaffSchedule,
  grantTimeOff,
  listShiftDefinitions,
  listTimeOffRequests,
  listTimeOffTypes,
  rejectTimeOffRequest,
  updateShiftAssignment,
  updateShiftDefinition,
  type ShiftDefinitionResponse,
  type StaffWeekDay,
  type TimeOffRequestResponse,
  type TimeOffTypeResponse,
} from "@octopus/api-client";
import { setToday } from "@/shared/api/mock-staff";
import { serverMemberId } from "./staff-sync";
import type { LeaveRequest, Schedule, ShiftCell, ShiftRoleRecord } from "./staff-store";

// The screens' "today" was a fixed mock day; on real data it is the real one.
{
  const d = new Date();
  setToday(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
}

const key = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const DAYS: StaffWeekDay[] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const hhmm = (t: string) => t.slice(0, 5);
const hhmmss = (t: string) => (t.length === 5 ? `${t}:00` : t);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isServerId = (id: string) => UUID.test(id);
const stamp = () => new Date().toISOString().slice(0, 16);

// ---- shift roles (definitions) ----------------------------------------------

const roleIds = new Map<string, string>();
const roleVersions = new Map<string, number>();
export const serverShiftRoleId = (id: string) => roleIds.get(id) ?? id;

const toShiftRole = (d: ShiftDefinitionResponse): ShiftRoleRecord => ({
  id: d.id,
  name: d.name,
  start: hhmm(d.startTime),
  end: hhmm(d.endTime),
  days: d.workingDays.map((w) => DAYS.indexOf(w)).filter((i) => i >= 0),
  active: d.isActive,
  updatedAt: stamp(),
});

export async function pushShiftRole(businessId: string, role: ShiftRoleRecord): Promise<void> {
  const body = {
    name: role.name,
    startTime: hhmmss(role.start),
    endTime: hhmmss(role.end),
    workingDays: role.days.map((i) => DAYS[i]),
    breakMinutes: 0,
  };
  const sid = roleIds.get(role.id) ?? (isServerId(role.id) ? role.id : null);
  if (!sid) {
    const created = await createShiftDefinition(businessId, body, key());
    roleIds.set(role.id, created.id);
    roleVersions.set(created.id, created.version);
    if (!role.active) {
      const off = await updateShiftDefinition(businessId, created.id, { ...body, isActive: false, expectedVersion: created.version });
      roleVersions.set(created.id, off.version);
    }
    return;
  }
  const res = await updateShiftDefinition(businessId, sid, {
    ...body,
    isActive: role.active,
    expectedVersion: roleVersions.get(sid) ?? null,
  });
  roleVersions.set(sid, res.version);
}

export async function dropShiftRole(businessId: string, id: string): Promise<void> {
  const sid = roleIds.get(id) ?? (isServerId(id) ? id : null);
  if (sid) await deleteShiftDefinition(businessId, sid, roleVersions.get(sid));
}

// ---- schedule (assignments) --------------------------------------------------

interface Assignment {
  id: string;
  version: number;
}
const assignments = new Map<string, Assignment>();
const shiftKey = (memberId: string, date: string) => `${memberId}|${date}`;

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** The window the schedule screens can reach without another fetch. */
function reach(): { from: string; to: string } {
  const now = Date.now();
  const day = 86_400_000;
  return { from: iso(new Date(now - 14 * day)), to: iso(new Date(now + 40 * day)) };
}

export interface LoadedShifts {
  shiftRoles: ShiftRoleRecord[];
  schedule: Schedule;
  leaveRequests: LeaveRequest[];
  timeOffTypes: TimeOffTypeResponse[];
}

/** Reads every assignment the screens can reach and makes it the known set —
 *  used on load and after the bulk operations (bulk assign, copy, clear), which
 *  answer with counts rather than the rows they wrote. */
export async function reloadSchedule(businessId: string): Promise<Record<string, ShiftCell>> {
  const shifts: Record<string, ShiftCell> = {};
  const schedule = await getStaffSchedule(businessId, reach());
  assignments.clear();
  for (const row of schedule.members) {
    for (const day of row.days) {
      const a = day.assignment;
      if (!a) continue;
      shifts[shiftKey(row.staffMemberId, day.date)] = { start: hhmm(a.startTime), end: hhmm(a.endTime), roleId: a.shiftDefinitionId };
      assignments.set(shiftKey(row.staffMemberId, day.date), { id: a.id, version: a.version });
    }
  }
  return shifts;
}

export async function loadShifts(businessId: string): Promise<LoadedShifts> {
  const defs = await listShiftDefinitions(businessId, true);
  defs.forEach((d) => roleVersions.set(d.id, d.version));

  const shifts = await reloadSchedule(businessId);
  const timeOffTypes = await listTimeOffTypes(businessId, true);

  const leaves: LeaveRequest[] = [];
  for (let page = 1; ; page += 1) {
    const res = await listTimeOffRequests(businessId, { page, pageSize: 100 });
    res.data.forEach((r) => {
      leaveVersions.set(r.id, r.version);
      leaves.push(toLeave(r));
    });
    if (res.data.length < 100) break;
  }
  return { shiftRoles: defs.map(toShiftRole), schedule: { shifts, offDays: {} }, leaveRequests: leaves, timeOffTypes };
}

/** Sends the difference between two schedules. `roles` are the current shift roles. */
export async function pushSchedule(
  businessId: string,
  prev: Schedule,
  next: Schedule,
  roles: readonly ShiftRoleRecord[]
): Promise<void> {
  const roleById = new Map(roles.map((r) => [r.id, r]));
  const fallback = roles.find((r) => r.active) ?? roles[0];

  const definitionOf = (cell: ShiftCell) => roleById.get(cell.roleId) ?? fallback;
  const overrides = (cell: ShiftCell) => {
    const def = definitionOf(cell);
    return {
      startOverride: def && hhmm(def.start) === cell.start ? null : hhmmss(cell.start),
      endOverride: def && hhmm(def.end) === cell.end ? null : hhmmss(cell.end),
    };
  };

  for (const [k, cell] of Object.entries(next.shifts)) {
    const before = prev.shifts[k];
    if (before && before.start === cell.start && before.end === cell.end && before.roleId === cell.roleId) continue;
    const def = definitionOf(cell);
    if (!def) throw new Error("Create a shift role before assigning shifts.");
    const shiftDefinitionId = serverShiftRoleId(def.id);
    const [memberLocal, date] = k.split("|");
    const known = assignments.get(k);
    if (known) {
      const res = await updateShiftAssignment(businessId, known.id, {
        shiftDefinitionId,
        ...overrides(cell),
        expectedVersion: known.version,
      });
      assignments.set(k, { id: res.id, version: res.version });
    } else {
      const res = await createShiftAssignment(
        businessId,
        { staffMemberId: serverMemberId(memberLocal), date, shiftDefinitionId, ...overrides(cell) },
        key()
      );
      assignments.set(k, { id: res.id, version: res.version });
    }
  }
  for (const k of Object.keys(prev.shifts)) {
    if (next.shifts[k]) continue;
    const known = assignments.get(k);
    if (known) {
      await deleteShiftAssignment(businessId, known.id, known.version);
      assignments.delete(k);
    }
  }
}

// ---- time off -----------------------------------------------------------------

const leaveVersions = new Map<string, number>();
const leaveIds = new Map<string, string>();

function toLeave(r: TimeOffRequestResponse): LeaveRequest {
  return {
    id: r.id,
    employeeId: r.staffMemberId,
    employeeName: `${r.firstName} ${r.lastName}`.trim(),
    typeId: r.timeOffTypeId,
    type: r.typeNameEn,
    typeAr: r.typeNameAr,
    start: r.startDate,
    end: r.endDate,
    status: r.status.toLowerCase() as LeaveRequest["status"],
    origin: r.origin,
  };
}

/** A request picked from the business's own types carries the id; an older
 *  screen path that only has a name finds (or first creates) the type. */
async function typeIdFor(businessId: string, r: LeaveRequest): Promise<string> {
  if (r.typeId) return r.typeId;
  const types = await listTimeOffTypes(businessId, true);
  const hit = types.find((t) => t.nameEn === r.type);
  if (hit) return hit.id;
  return (await createTimeOffType(businessId, { nameEn: r.type, nameAr: r.typeAr || r.type }, key())).id;
}

export async function pushLeave(businessId: string, prev: readonly LeaveRequest[], next: readonly LeaveRequest[]): Promise<void> {
  const before = new Map(prev.map((r) => [r.id, r]));
  for (const r of next) {
    const old = before.get(r.id);
    if (!old) {
      if (!r.employeeId) continue;
      const body = {
        staffMemberId: serverMemberId(r.employeeId),
        timeOffTypeId: await typeIdFor(businessId, r),
        startDate: r.start,
        endDate: r.end,
      };
      // POST /time-off/grants: given directly, approved on creation (origin DirectGrant).
      const res = r.origin === "DirectGrant"
        ? await grantTimeOff(businessId, { ...body, note: r.note?.trim() || null }, key())
        : await createTimeOffRequest(businessId, body, key());
      leaveIds.set(r.id, res.id);
      leaveVersions.set(res.id, res.version);
      if (r.origin !== "DirectGrant" && r.status !== "pending") await decide(businessId, res.id, r.status);
    } else if (old.status !== r.status && r.status !== "pending") {
      await decide(businessId, leaveIds.get(r.id) ?? r.id, r.status);
    }
  }
}

async function decide(businessId: string, id: string, status: "approved" | "rejected") {
  const body = { expectedVersion: leaveVersions.get(id) ?? null };
  const res = status === "approved" ? await approveTimeOffRequest(businessId, id, body) : await rejectTimeOffRequest(businessId, id, body);
  leaveVersions.set(id, res.version);
}
