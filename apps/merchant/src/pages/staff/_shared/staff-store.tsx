// One in-memory store for the whole Staff module, so the three tabs agree with
// each other (a role's member count follows the Staff tab's role changes) and
// nothing a merchant edits is lost when they switch tabs. The Staff API is the
// source of truth: `staff-sync.ts` / `staff-shifts-sync.ts` load it and send
// each local edit back as the minimal set of calls.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  listStaffDepartments,
  listStaffJobTitles,
  listTimeOffTypes,
  type StaffCatalogEntryResponse,
  type StaffTimeOffOrigin,
  type TimeOffTypeResponse,
} from "@octopus/api-client";
import { useAuth } from "@/app/providers/auth-provider";
import {
  employees as seedEmployees,
  toMemberProfile,
  TODAY,
  type Employee,
  type MemberProfile,
} from "@/shared/api/mock-staff";
import { addDays, fromISO, toISO } from "./format";
import {
  describeStaffError,
  dropMember,
  dropRole,
  loadAll,
  pushMember,
  pushRole,
  refreshMember,
  type MemberMeta,
} from "./staff-sync";
import { dropShiftRole, loadShifts, pushLeave, pushSchedule, pushShiftRole, reloadSchedule } from "./staff-shifts-sync";

export type LeaveStatus = "pending" | "approved" | "rejected";

export interface LeaveRequest {
  id: string;
  employeeId: string | null;
  employeeName: string;
  /** The business's time-off type (GET /time-off/types); null only for a name-only legacy row. */
  typeId: string | null;
  /** English name of the type. */
  type: string;
  typeAr: string;
  start: string;
  end: string;
  status: LeaveStatus;
  /** DirectGrant = given by a manager (POST /time-off/grants), approved on creation. */
  origin?: StaffTimeOffOrigin;
  note?: string;
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

/** Weekday-indexed (0 = Sunday); roughly half the team has one standing day they can't work. */
function seedAvailability(): Record<string, boolean[]> {
  return Object.fromEntries(
    seedEmployees.map((e) => {
      const h = hashOf(e.id);
      return [e.id, Array.from({ length: 7 }, (_, day) => !(h % 2 === 0 && day === h % 7))];
    })
  );
}

function sortCatalog<T extends { sortOrder: number; nameEn: string }>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => a.sortOrder - b.sortOrder || a.nameEn.localeCompare(b.nameEn));
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

  /** Server fields the mock profile has no slot for (account access, access scope). */
  metaOf: (id: string) => MemberMeta | null;
  /** Re-reads members after a write made outside the store's own sync
   *  (invitations, bulk role assignment) and applies what came back. */
  refreshMembers: (ids: readonly string[]) => Promise<void>;

  roles: RoleRecord[];
  /** A role the screen already created on the server (create / duplicate). */
  adoptRole: (role: RoleRecord) => void;
  updateRole: (id: string, patch: Partial<RoleRecord>) => void;
  removeRole: (id: string) => void;
  memberCount: (roleId: string) => number;

  /** The business's job titles and departments (GET /job-titles, /departments), inactive included. */
  jobTitles: StaffCatalogEntryResponse[];
  departments: StaffCatalogEntryResponse[];
  timeOffTypes: TimeOffTypeResponse[];
  reloadCatalogs: () => Promise<void>;
  reloadTimeOffTypes: () => Promise<void>;
  catalogsLoaded: boolean;

  shifts: Record<string, ShiftCell>;
  offDays: Record<string, true>;
  updateSchedule: (update: (prev: Schedule) => Schedule) => void;
  shiftRoles: ShiftRoleRecord[];
  setShiftRoles: (update: (prev: ShiftRoleRecord[]) => ShiftRoleRecord[]) => void;
  leaveRequests: LeaveRequest[];
  setLeaveRequests: (update: (prev: LeaveRequest[]) => LeaveRequest[]) => void;
  /** Runs a server-side schedule operation (bulk assign, copy, clear) after
   *  every queued edit, then re-reads the schedule. Rejects with the API error. */
  scheduleOp: <T>(op: (businessId: string) => Promise<T>) => Promise<T>;
  availability: Record<string, boolean[]>;
  /** The last failed sync with the Staff API, until dismissed. */
  syncError: string | null;
  dismissSyncError: () => void;
}

const StaffStoreContext = createContext<StaffStore | null>(null);

export function StaffStoreProvider({ children }: { children: ReactNode }) {
  const { user, activeBusinessId } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [overrides, setOverrides] = useState<Record<string, Partial<MemberProfile>>>({});
  const [inactiveIds, setInactiveIds] = useState<Set<string>>(() => new Set());
  const [createdIds, setCreatedIds] = useState<Set<string>>(() => new Set());
  const [auditLog, setAuditLog] = useState<Record<string, AuditEntry[]>>({});
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [meta, setMeta] = useState<Record<string, MemberMeta>>({});
  const [jobTitles, setJobTitles] = useState<StaffCatalogEntryResponse[]>([]);
  const [departments, setDepartments] = useState<StaffCatalogEntryResponse[]>([]);
  const [timeOffTypes, setTimeOffTypes] = useState<TimeOffTypeResponse[]>([]);
  const [catalogsLoaded, setCatalogsLoaded] = useState(false);
  const [schedule, setSchedule] = useState<Schedule>({ shifts: {}, offDays: {} });
  const [shiftRoles, setShiftRolesState] = useState<ShiftRoleRecord[]>([]);
  const [leaveRequests, setLeaveRequestsState] = useState<LeaveRequest[]>([]);
  const [availability] = useState<Record<string, boolean[]>>(seedAvailability);

  const profiles = useMemo(
    () => new Map(employees.map((e) => [e.id, { ...toMemberProfile(e), ...overrides[e.id], employee: e }])),
    [employees, overrides]
  );

  const profileOf = useCallback((id: string) => profiles.get(id) ?? null, [profiles]);

  // ---- Staff API sync: the server is the truth for members and roles --------
  const [syncError, setSyncError] = useState<string | null>(null);
  const latest = useRef({ profiles, inactiveIds, roles });
  latest.current = { profiles, inactiveIds, roles };
  const dirtyMembers = useRef(new Set<string>());
  const dirtyRoles = useRef(new Set<string>());
  const goneMembers = useRef(new Set<string>());
  const goneRoles = useRef(new Set<string>());
  const timer = useRef<number | undefined>(undefined);
  const chain = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    if (!activeBusinessId) return;
    let cancelled = false;
    loadAll(activeBusinessId)
      .then((loaded) => {
        if (cancelled) return;
        setEmployees(loaded.employees);
        setOverrides(loaded.profiles);
        setInactiveIds(new Set(loaded.inactive));
        setRoles(loaded.roles);
        setMeta(loaded.meta);
        return loadShifts(activeBusinessId).then((shifts) => {
          if (cancelled) return;
          setShiftRolesState(shifts.shiftRoles);
          setSchedule(shifts.schedule);
          setLeaveRequestsState(shifts.leaveRequests);
          setTimeOffTypes(sortCatalog(shifts.timeOffTypes));
        });
      })
      .catch((err) => !cancelled && setSyncError(describeStaffError(err)));
    return () => {
      cancelled = true;
    };
  }, [activeBusinessId]);

  // Job titles and departments feed every member form; loaded on their own so a
  // failure there does not take the rest of the module down with it.
  const reloadCatalogs = useCallback(async () => {
    if (!activeBusinessId) return;
    const [titles, depts] = await Promise.all([
      listStaffJobTitles(activeBusinessId, true),
      listStaffDepartments(activeBusinessId, true),
    ]);
    setJobTitles(sortCatalog(titles));
    setDepartments(sortCatalog(depts));
    setCatalogsLoaded(true);
  }, [activeBusinessId]);

  useEffect(() => {
    reloadCatalogs().catch((err) => setSyncError(describeStaffError(err)));
  }, [reloadCatalogs]);

  const reloadTimeOffTypes = useCallback(async () => {
    if (!activeBusinessId) return;
    setTimeOffTypes(sortCatalog(await listTimeOffTypes(activeBusinessId, true)));
  }, [activeBusinessId]);

  const flush = useCallback(() => {
    if (!activeBusinessId) return;
    const businessId = activeBusinessId;
    const { profiles: ps, inactiveIds: inactive, roles: rs } = latest.current;
    const goneM = [...goneMembers.current];
    const goneR = [...goneRoles.current];
    const dirtyR = [...dirtyRoles.current];
    const dirtyM = [...dirtyMembers.current];
    goneMembers.current.clear();
    goneRoles.current.clear();
    dirtyRoles.current.clear();
    dirtyMembers.current.clear();
    // One after another: a member's role must exist before it is assigned.
    chain.current = chain.current
      .then(async () => {
        for (const id of goneM) await dropMember(businessId, id);
        for (const id of dirtyR) {
          const role = rs.find((r) => r.id === id);
          if (role) await pushRole(businessId, role);
        }
        for (const id of dirtyM) {
          const profile = ps.get(id);
          if (profile) await pushMember(businessId, id, { employee: profile.employee, profile, inactive: inactive.has(id) });
        }
        for (const id of goneR) await dropRole(businessId, id);
        setSyncError(null);
      })
      .catch((err) => setSyncError(describeStaffError(err)));
  }, [activeBusinessId]);

  const scheduleSync = useCallback(() => {
    window.clearTimeout(timer.current);
    // Wait for the burst of setters one save makes to settle, then send once.
    timer.current = window.setTimeout(flush, 350);
  }, [flush]);
  const markMember = useCallback((id: string) => {
    dirtyMembers.current.add(id);
    scheduleSync();
  }, [scheduleSync]);
  const markRole = useCallback((id: string) => {
    dirtyRoles.current.add(id);
    scheduleSync();
  }, [scheduleSync]);

  // Shifts, schedule and leave: the screens hand over a whole new value, so each
  // setter applies it to the latest copy, shows it, then sends only the difference.
  const shiftsLatest = useRef({ schedule, shiftRoles, leaveRequests });
  shiftsLatest.current = { schedule, shiftRoles, leaveRequests };
  const enqueue = useCallback(
    (job: (businessId: string) => Promise<unknown>) => {
      if (!activeBusinessId) return;
      chain.current = chain.current
        .then(() => job(activeBusinessId))
        .then(() => setSyncError(null))
        .catch((err) => setSyncError(describeStaffError(err)));
    },
    [activeBusinessId]
  );
  const updateSchedule = useCallback(
    (update: (prev: Schedule) => Schedule) => {
      const prev = shiftsLatest.current.schedule;
      const next = update(prev);
      shiftsLatest.current = { ...shiftsLatest.current, schedule: next };
      setSchedule(next);
      const roles = shiftsLatest.current.shiftRoles;
      enqueue((b) => pushSchedule(b, prev, next, roles));
    },
    [enqueue]
  );
  const setShiftRoles = useCallback(
    (update: (prev: ShiftRoleRecord[]) => ShiftRoleRecord[]) => {
      const prev = shiftsLatest.current.shiftRoles;
      const next = update(prev);
      shiftsLatest.current = { ...shiftsLatest.current, shiftRoles: next };
      setShiftRolesState(next);
      const before = new Map(prev.map((r) => [r.id, r]));
      enqueue(async (b) => {
        for (const r of next) {
          const old = before.get(r.id);
          if (!old || old.name !== r.name || old.start !== r.start || old.end !== r.end || old.active !== r.active || old.days.join() !== r.days.join()) {
            await pushShiftRole(b, r);
          }
        }
        for (const r of prev) if (!next.some((n) => n.id === r.id)) await dropShiftRole(b, r.id);
      });
    },
    [enqueue]
  );
  const scheduleOp = useCallback(
    <T,>(op: (businessId: string) => Promise<T>): Promise<T> => {
      if (!activeBusinessId) return Promise.reject(new Error("No business selected"));
      const businessId = activeBusinessId;
      // Queued behind any pending single-cell edits, so the operation sees them.
      const run = chain.current.catch(() => undefined).then(async () => {
        const result = await op(businessId);
        const shifts = await reloadSchedule(businessId);
        const offDays: Record<string, true> = {};
        for (const k of Object.keys(shiftsLatest.current.schedule.offDays)) if (!shifts[k]) offDays[k] = true;
        const next = { shifts, offDays };
        shiftsLatest.current = { ...shiftsLatest.current, schedule: next };
        setSchedule(next);
        return result;
      });
      chain.current = run.catch(() => undefined);
      return run;
    },
    [activeBusinessId]
  );

  const refreshMembers = useCallback(
    (ids: readonly string[]): Promise<void> => {
      if (!activeBusinessId) return Promise.resolve();
      const businessId = activeBusinessId;
      const run = chain.current.catch(() => undefined).then(async () => {
        for (const id of ids) {
          const fresh = await refreshMember(businessId, id);
          if (!fresh) continue;
          setOverrides((prev) => ({ ...prev, [id]: { ...prev[id], ...fresh.profile } }));
          setMeta((prev) => ({ ...prev, [id]: fresh.meta }));
          setInactiveIds((prev) => {
            const next = new Set(prev);
            if (fresh.inactive) next.add(id);
            else next.delete(id);
            return next;
          });
        }
      });
      chain.current = run.catch(() => undefined);
      return run;
    },
    [activeBusinessId]
  );

  const setLeaveRequests = useCallback(
    (update: (prev: LeaveRequest[]) => LeaveRequest[]) => {
      const prev = shiftsLatest.current.leaveRequests;
      const next = update(prev);
      shiftsLatest.current = { ...shiftsLatest.current, leaveRequests: next };
      setLeaveRequestsState(next);
      enqueue((b) => pushLeave(b, prev, next));
    },
    [enqueue]
  );

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
      markMember(employee.id);
    },
    [logAudit, markMember]
  );

  const updateEmployee = useCallback((id: string, patch: Partial<Employee>) => {
    setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    markMember(id);
  }, [markMember]);

  const removeEmployee = useCallback((id: string) => {
    goneMembers.current.add(id);
    dirtyMembers.current.delete(id);
    scheduleSync();
    setEmployees((prev) => prev.filter((e) => e.id !== id));
    const keep = ([key]: [string, unknown]) => !key.startsWith(`${id}|`);
    setSchedule((prev) => ({
      shifts: Object.fromEntries(Object.entries(prev.shifts).filter(keep)),
      offDays: Object.fromEntries(Object.entries(prev.offDays).filter(keep)) as Record<string, true>,
    }));
  }, [scheduleSync]);

  const patchProfile = useCallback((id: string, patch: Partial<MemberProfile>) => {
    setOverrides((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
    markMember(id);
  }, [markMember]);

  const isInactive = useCallback((id: string) => inactiveIds.has(id), [inactiveIds]);

  const setInactive = useCallback((id: string, inactive: boolean) => {
    setInactiveIds((prev) => {
      const next = new Set(prev);
      if (inactive) next.add(id);
      else next.delete(id);
      return next;
    });
    markMember(id);
  }, [markMember]);

  const adoptRole = useCallback((role: RoleRecord) => {
    setRoles((prev) => [...prev.filter((r) => r.id !== role.id), role]);
  }, []);

  const updateRole = useCallback((id: string, patch: Partial<RoleRecord>) => {
    setRoles((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    markRole(id);
  }, [markRole]);

  const removeRole = useCallback((id: string) => {
    goneRoles.current.add(id);
    dirtyRoles.current.delete(id);
    scheduleSync();
    setRoles((prev) => prev.filter((r) => r.id !== id));
  }, [scheduleSync]);

  const memberCount = useCallback(
    (roleId: string) => [...profiles.values()].filter((p) => p.assignedRole === roleId).length,
    [profiles]
  );

  const metaOf = useCallback((id: string) => meta[id] ?? null, [meta]);

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
      metaOf,
      refreshMembers,
      roles,
      adoptRole,
      updateRole,
      removeRole,
      memberCount,
      jobTitles,
      departments,
      timeOffTypes,
      reloadCatalogs,
      reloadTimeOffTypes,
      catalogsLoaded,
      scheduleOp,
      shifts: schedule.shifts,
      offDays: schedule.offDays,
      updateSchedule,
      shiftRoles,
      setShiftRoles,
      leaveRequests,
      setLeaveRequests,
      availability,
      syncError,
      dismissSyncError: () => setSyncError(null),
    }),
    [employees, profileOf, addEmployee, updateEmployee, removeEmployee, patchProfile, isInactive, setInactive, auditOf, logAudit, metaOf, refreshMembers, roles, adoptRole, updateRole, removeRole, memberCount, jobTitles, departments, timeOffTypes, reloadCatalogs, reloadTimeOffTypes, catalogsLoaded, scheduleOp, schedule, shiftRoles, leaveRequests, availability, syncError, updateSchedule, setShiftRoles, setLeaveRequests]
  );

  return <StaffStoreContext.Provider value={value}>{children}</StaffStoreContext.Provider>;
}

export function useStaffStore(): StaffStore {
  const ctx = useContext(StaffStoreContext);
  if (!ctx) throw new Error("useStaffStore must be used within StaffStoreProvider");
  return ctx;
}
