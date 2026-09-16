// One in-memory store for the whole Staff module, so the three tabs agree with
// each other (a role's member count follows the Staff tab's role changes) and
// nothing a merchant edits is lost when they switch tabs. Mock data only: no
// request leaves the page until the staff API lands.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/app/providers/auth-provider";
import {
  employees as seedEmployees,
  toMemberProfile,
  staffRoleDefs,
  defaultPermissionMatrix,
  leaveRequestRows,
  MODULES,
  MODULE_FEATURES,
  PERMISSION_ACTIONS,
  scheduleShifts,
  TODAY,
  type Employee,
  type LeaveType,
  type MemberProfile,
  type ModuleId,
  type PermissionAction,
  type ShiftType,
} from "@/shared/api/mock-staff";
import { addDays, fromISO, toISO } from "./format";

export type LeaveStatus = "pending" | "approved" | "rejected";

export interface LeaveRequest {
  id: string;
  employeeId: string | null;
  employeeName: string;
  type: LeaveType;
  start: string;
  end: string;
  status: LeaveStatus;
}

/** A shift definition the schedule is built from (Morning Shift, 08:00–16:00, Sun–Thu). */
export interface ShiftRoleRecord {
  id: string;
  name: string;
  start: string;
  end: string;
  /** Weekday indexes, 0 = Sunday. */
  days: number[];
  active: boolean;
  updatedAt: string;
}

export const CUSTOM_SHIFT = "custom";

export interface ShiftCell {
  start: string;
  end: string;
  roleId: string;
}

/**
 * A day is in one of three states: a shift is scheduled, it is an explicit day
 * off, or nobody has planned it yet. Only the last one shows "Assign Shift".
 */
export interface Schedule {
  shifts: Record<string, ShiftCell>;
  offDays: Record<string, true>;
}

export type AuditKind =
  | "login"
  | "created"
  | "profileUpdated"
  | "roleUpdated"
  | "accessUpdated"
  | "pinReset"
  | "locked"
  | "unlocked"
  | "activated"
  | "deactivated";

export interface AuditEntry {
  id: string;
  kind: AuditKind;
  /** ISO date-time, minutes precision. */
  at: string;
  actor?: string;
  device?: string;
  ip?: string;
}

export type ActionFlags = Record<PermissionAction, boolean>;
export type RolePermissions = Record<ModuleId, Record<string, ActionFlags>>;

export interface RoleRecord {
  id: string;
  name: string;
  description: string;
  isSystemRole: boolean;
  active: boolean;
}

function hashOf(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) >>> 0;
  return h;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function actionFlags(value: boolean): ActionFlags {
  return Object.fromEntries(PERMISSION_ACTIONS.map((a) => [a, value])) as ActionFlags;
}

export function uniformPermissions(value: boolean): RolePermissions {
  return Object.fromEntries(
    MODULES.map((m) => [m.id, Object.fromEntries(MODULE_FEATURES[m.id].map((f) => [f, actionFlags(value)]))])
  ) as RolePermissions;
}

export function clonePermissions(source: RolePermissions): RolePermissions {
  return JSON.parse(JSON.stringify(source)) as RolePermissions;
}

function seedPermissions(): Record<string, RolePermissions> {
  return Object.fromEntries(
    staffRoleDefs.map((role) => [
      role.id,
      Object.fromEntries(
        MODULES.map((m) => [
          m.id,
          Object.fromEntries(MODULE_FEATURES[m.id].map((f) => [f, { ...defaultPermissionMatrix[role.id][m.id] }])),
        ])
      ) as RolePermissions,
    ])
  );
}

const SEED_SHIFT_ROLES: ShiftRoleRecord[] = [
  { id: "morning", name: "Morning Shift", start: "08:00", end: "16:00", days: [0, 1, 2, 3, 4], active: true, updatedAt: "2026-05-12T10:30" },
  { id: "evening", name: "Evening Shift", start: "16:00", end: "00:00", days: [0, 1, 2, 3, 4], active: true, updatedAt: "2026-05-12T10:30" },
  { id: "night", name: "Night Shift", start: "00:00", end: "08:00", days: [0, 1, 2, 3, 4], active: true, updatedAt: "2026-05-12T10:30" },
];

const TYPE_ROLE: Record<ShiftType, string> = { Morning: "morning", Evening: "evening", Night: "night" };

function seedSchedule(): Schedule {
  const roles = new Map(SEED_SHIFT_ROLES.map((r) => [r.id, r]));
  const shifts: Record<string, ShiftCell> = {};
  const offDays: Record<string, true> = {};
  const staffIds = new Set<string>();
  let first = "9999-12-31";
  let last = "0000-01-01";
  for (const s of scheduleShifts) {
    const role = roles.get(TYPE_ROLE[s.type])!;
    shifts[`${s.employeeId}|${s.date}`] = { start: role.start, end: role.end, roleId: role.id };
    staffIds.add(s.employeeId);
    if (s.date < first) first = s.date;
    if (s.date > last) last = s.date;
  }
  // Inside the weeks the mock schedule covers, a day without a shift was
  // planned as a day off; outside them nothing has been planned yet.
  for (const id of staffIds) {
    for (let d = fromISO(first); toISO(d) <= last; d = addDays(d, 1)) {
      const key = `${id}|${toISO(d)}`;
      if (!shifts[key]) offDays[key] = true;
    }
  }
  // The newest hire's current week is only half planned, so the grid opens
  // with a few unassigned days to fill, as in the Assign Shift frames.
  const newest = [...staffIds].pop();
  if (newest) {
    for (let i = -3; i <= 0; i++) {
      const key = `${newest}|${toISO(addDays(fromISO(TODAY), i))}`;
      delete shifts[key];
      delete offDays[key];
    }
  }
  return { shifts, offDays };
}

function seedLeaveRequests(): LeaveRequest[] {
  return leaveRequestRows.map((r) => ({
    id: r.id,
    employeeId: seedEmployees.find((e) => e.name === r.employee)?.id ?? null,
    employeeName: r.employee,
    type: r.type,
    start: r.startDate,
    end: r.endDate,
    status: r.status.toLowerCase() as LeaveStatus,
  }));
}

/** Weekday-indexed (0 = Sunday); roughly half the team has one standing day they can't work. */
function seedAvailability(): Record<string, boolean[]> {
  return Object.fromEntries(
    seedEmployees.map((e) => {
      const h = hashOf(e.id);
      return [e.id, Array.from({ length: 7 }, (_, day) => !(h % 2 === 0 && day === h % 7))];
    })
  );
}

const SEED_ACTOR = "Abdulrahman Al-Faisal";

function seedAudit(p: MemberProfile): AuditEntry[] {
  const id = p.employee.id;
  const h = hashOf(id);
  const yesterday = toISO(addDays(fromISO(TODAY), -1));
  const entries: AuditEntry[] = [
    { id: `${id}-created`, kind: "created", at: `${p.employee.hireDate}T10:10`, actor: SEED_ACTOR },
  ];
  if (p.employee.role === "Owner") return entries;
  const pinDate = `2026-${pad(1 + (h % 6))}-${pad(1 + (h % 27))}`;
  return [
    ...(p.lastAccess ? [{ id: `${id}-login`, kind: "login" as const, at: p.lastAccess, device: p.activeSection.device, ip: `182.23.45.${10 + (h % 240)}` }] : []),
    { id: `${id}-role`, kind: "roleUpdated", at: `${yesterday}T16:30`, actor: SEED_ACTOR },
    { id: `${id}-access`, kind: "accessUpdated", at: `${yesterday}T16:25`, actor: SEED_ACTOR },
    ...(pinDate > p.employee.hireDate ? [{ id: `${id}-pin`, kind: "pinReset" as const, at: `${pinDate}T11:20`, actor: SEED_ACTOR }] : []),
    ...entries,
  ];
}

interface StaffStore {
  employees: Employee[];
  profileOf: (id: string) => MemberProfile | null;
  addEmployee: (employee: Employee, profile?: Partial<MemberProfile>) => void;
  updateEmployee: (id: string, patch: Partial<Employee>) => void;
  removeEmployee: (id: string) => void;
  patchProfile: (id: string, patch: Partial<MemberProfile>) => void;
  isInactive: (id: string) => boolean;
  setInactive: (id: string, inactive: boolean) => void;
  auditOf: (id: string) => AuditEntry[];
  logAudit: (id: string, kind: AuditKind) => void;

  roles: RoleRecord[];
  addRole: (role: RoleRecord, permissions: RolePermissions) => void;
  updateRole: (id: string, patch: Partial<RoleRecord>) => void;
  removeRole: (id: string) => void;
  memberCount: (roleId: string) => number;
  permissions: Record<string, RolePermissions>;
  setRolePermissions: (roleId: string, update: (prev: RolePermissions) => RolePermissions) => void;

  shifts: Record<string, ShiftCell>;
  offDays: Record<string, true>;
  updateSchedule: (update: (prev: Schedule) => Schedule) => void;
  shiftRoles: ShiftRoleRecord[];
  setShiftRoles: (update: (prev: ShiftRoleRecord[]) => ShiftRoleRecord[]) => void;
  leaveRequests: LeaveRequest[];
  setLeaveRequests: (update: (prev: LeaveRequest[]) => LeaveRequest[]) => void;
  availability: Record<string, boolean[]>;
}

const StaffStoreContext = createContext<StaffStore | null>(null);

export function StaffStoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>(() => [...seedEmployees]);
  const [overrides, setOverrides] = useState<Record<string, Partial<MemberProfile>>>({});
  const [inactiveIds, setInactiveIds] = useState<Set<string>>(() => new Set());
  const [createdIds, setCreatedIds] = useState<Set<string>>(() => new Set());
  const [auditLog, setAuditLog] = useState<Record<string, AuditEntry[]>>({});
  const [roles, setRoles] = useState<RoleRecord[]>(() => staffRoleDefs.map((r) => ({ ...r, active: true })));
  const [permissions, setPermissions] = useState<Record<string, RolePermissions>>(seedPermissions);
  const [schedule, setSchedule] = useState<Schedule>(seedSchedule);
  const [shiftRoles, setShiftRoles] = useState<ShiftRoleRecord[]>(SEED_SHIFT_ROLES);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(seedLeaveRequests);
  const [availability] = useState<Record<string, boolean[]>>(seedAvailability);

  const profiles = useMemo(
    () => new Map(employees.map((e) => [e.id, { ...toMemberProfile(e), ...overrides[e.id], employee: e }])),
    [employees, overrides]
  );

  const profileOf = useCallback((id: string) => profiles.get(id) ?? null, [profiles]);

  const logAudit = useCallback(
    (id: string, kind: AuditKind) => {
      const now = new Date();
      const entry: AuditEntry = {
        id: `${id}-${kind}-${now.getTime()}`,
        kind,
        at: `${TODAY}T${pad(now.getHours())}:${pad(now.getMinutes())}`,
        actor: user?.name ?? SEED_ACTOR,
      };
      setAuditLog((prev) => ({ ...prev, [id]: [entry, ...(prev[id] ?? [])] }));
    },
    [user?.name]
  );

  const auditOf = useCallback(
    (id: string) => {
      const profile = profiles.get(id);
      if (!profile) return [];
      const base = createdIds.has(id) ? [] : seedAudit(profile);
      return [...(auditLog[id] ?? []), ...base].sort((a, b) => b.at.localeCompare(a.at));
    },
    [profiles, createdIds, auditLog]
  );

  const addEmployee = useCallback(
    (employee: Employee, profile?: Partial<MemberProfile>) => {
      setEmployees((prev) => [employee, ...prev]);
      setOverrides((prev) => ({ ...prev, [employee.id]: { lastAccess: "", ...profile } }));
      setCreatedIds((prev) => new Set(prev).add(employee.id));
      logAudit(employee.id, "created");
    },
    [logAudit]
  );

  const updateEmployee = useCallback((id: string, patch: Partial<Employee>) => {
    setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }, []);

  const removeEmployee = useCallback((id: string) => {
    setEmployees((prev) => prev.filter((e) => e.id !== id));
    const keep = ([key]: [string, unknown]) => !key.startsWith(`${id}|`);
    setSchedule((prev) => ({
      shifts: Object.fromEntries(Object.entries(prev.shifts).filter(keep)),
      offDays: Object.fromEntries(Object.entries(prev.offDays).filter(keep)) as Record<string, true>,
    }));
  }, []);

  const patchProfile = useCallback((id: string, patch: Partial<MemberProfile>) => {
    setOverrides((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }, []);

  const isInactive = useCallback((id: string) => inactiveIds.has(id), [inactiveIds]);

  const setInactive = useCallback((id: string, inactive: boolean) => {
    setInactiveIds((prev) => {
      const next = new Set(prev);
      if (inactive) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const addRole = useCallback((role: RoleRecord, rolePermissions: RolePermissions) => {
    setRoles((prev) => [...prev, role]);
    setPermissions((prev) => ({ ...prev, [role.id]: rolePermissions }));
  }, []);

  const updateRole = useCallback((id: string, patch: Partial<RoleRecord>) => {
    setRoles((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const removeRole = useCallback((id: string) => {
    setRoles((prev) => prev.filter((r) => r.id !== id));
    setPermissions((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const memberCount = useCallback(
    (roleId: string) => [...profiles.values()].filter((p) => p.assignedRole === roleId).length,
    [profiles]
  );

  const setRolePermissions = useCallback((roleId: string, update: (prev: RolePermissions) => RolePermissions) => {
    setPermissions((prev) => ({ ...prev, [roleId]: update(prev[roleId]) }));
  }, []);

  const value = useMemo<StaffStore>(
    () => ({
      employees,
      profileOf,
      addEmployee,
      updateEmployee,
      removeEmployee,
      patchProfile,
      isInactive,
      setInactive,
      auditOf,
      logAudit,
      roles,
      addRole,
      updateRole,
      removeRole,
      memberCount,
      permissions,
      setRolePermissions,
      shifts: schedule.shifts,
      offDays: schedule.offDays,
      updateSchedule: setSchedule,
      shiftRoles,
      setShiftRoles,
      leaveRequests,
      setLeaveRequests,
      availability,
    }),
    [employees, profileOf, addEmployee, updateEmployee, removeEmployee, patchProfile, isInactive, setInactive, auditOf, logAudit, roles, addRole, updateRole, removeRole, memberCount, permissions, setRolePermissions, schedule, shiftRoles, leaveRequests, availability]
  );

  return <StaffStoreContext.Provider value={value}>{children}</StaffStoreContext.Provider>;
}

export function useStaffStore(): StaffStore {
  const ctx = useContext(StaffStoreContext);
  if (!ctx) throw new Error("useStaffStore must be used within StaffStoreProvider");
  return ctx;
}
