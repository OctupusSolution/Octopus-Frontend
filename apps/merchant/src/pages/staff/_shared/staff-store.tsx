// One in-memory store for the whole Staff module, so the three tabs agree with
// each other (a role's member count follows the Staff tab's role changes) and
// nothing a merchant edits is lost when they switch tabs. Mock data only: no
// request leaves the page until the staff API lands.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
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
  SHIFT_TYPE_TIME,
  type Employee,
  type LeaveType,
  type MemberProfile,
  type ModuleId,
  type PermissionAction,
  type StaffRole,
} from "@/shared/api/mock-staff";

export type LeaveStatus = "pending" | "approved" | "declined";

export interface LeaveRequest {
  id: string;
  employeeId: string | null;
  employeeName: string;
  type: LeaveType;
  start: string;
  end: string;
  status: LeaveStatus;
}

export interface ShiftRoleRecord {
  id: string;
  name: string;
  color: string;
  /** Minimum people in this role per branch per day. */
  minPerDay: number;
  staffRole: StaffRole | null;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function shortDateToISO(value: string): string {
  const [day, month] = value.split(" ");
  return `2026-${String(MONTHS.indexOf(month) + 1).padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function seedLeaveRequests(): LeaveRequest[] {
  return leaveRequestRows.map((r) => ({
    id: r.id,
    employeeId: seedEmployees.find((e) => e.name === r.employee)?.id ?? null,
    employeeName: r.employee,
    type: r.type,
    start: shortDateToISO(r.startDate),
    end: shortDateToISO(r.endDate),
    status: "pending",
  }));
}

/** Monday-first availability; roughly half the team has one standing day they can't work. */
function seedAvailability(): Record<string, boolean[]> {
  return Object.fromEntries(
    seedEmployees.map((e) => {
      let h = 0;
      for (let i = 0; i < e.id.length; i++) h = (h * 31 + e.id.charCodeAt(i)) >>> 0;
      return [e.id, Array.from({ length: 7 }, (_, day) => !(h % 2 === 0 && day === h % 7))];
    })
  );
}

const SEED_SHIFT_ROLES: ShiftRoleRecord[] = [
  { id: "manager", name: "Restaurant Manager", color: "#0D6EFD", minPerDay: 1, staffRole: "Branch Manager" },
  { id: "cashier", name: "Cashier", color: "#7C3AED", minPerDay: 1, staffRole: "Cashier" },
  { id: "waiter", name: "Waiter", color: "#DB2777", minPerDay: 2, staffRole: "Waiter" },
  { id: "kitchen", name: "Kitchen Staff", color: "#D97706", minPerDay: 1, staffRole: "Kitchen" },
  { id: "driver", name: "Delivery Driver", color: "#16A34A", minPerDay: 0, staffRole: "Driver" },
];

export type ActionFlags = Record<PermissionAction, boolean>;
export type RolePermissions = Record<ModuleId, Record<string, ActionFlags>>;

export interface RoleRecord {
  id: string;
  name: string;
  description: string;
  isSystemRole: boolean;
  active: boolean;
}

export interface ShiftCell {
  start: string;
  end: string;
  templateId: string;
}

export interface ShiftTemplate {
  id: string;
  name: string;
  start: string;
  end: string;
  color: string;
}

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

function seedShifts(): Record<string, ShiftCell> {
  return Object.fromEntries(
    scheduleShifts.map((s) => [`${s.employeeId}|${s.date}`, { start: s.start, end: s.end, templateId: s.type }])
  );
}

const SEED_TEMPLATES: ShiftTemplate[] = [
  { id: "Morning", name: "Morning", start: SHIFT_TYPE_TIME.Morning.start, end: SHIFT_TYPE_TIME.Morning.end, color: "#0D6EFD" },
  { id: "Evening", name: "Evening", start: SHIFT_TYPE_TIME.Evening.start, end: SHIFT_TYPE_TIME.Evening.end, color: "#7C3AED" },
  { id: "Night", name: "Night", start: SHIFT_TYPE_TIME.Night.start, end: SHIFT_TYPE_TIME.Night.end, color: "#0F172A" },
];

interface StaffStore {
  employees: Employee[];
  profileOf: (id: string) => MemberProfile | null;
  addEmployee: (employee: Employee, profile?: Partial<MemberProfile>) => void;
  updateEmployee: (id: string, patch: Partial<Employee>) => void;
  removeEmployee: (id: string) => void;
  patchProfile: (id: string, patch: Partial<MemberProfile>) => void;
  isInactive: (id: string) => boolean;
  setInactive: (id: string, inactive: boolean) => void;

  roles: RoleRecord[];
  addRole: (role: RoleRecord, permissions: RolePermissions) => void;
  updateRole: (id: string, patch: Partial<RoleRecord>) => void;
  removeRole: (id: string) => void;
  memberCount: (roleId: string) => number;
  permissions: Record<string, RolePermissions>;
  setRolePermissions: (roleId: string, update: (prev: RolePermissions) => RolePermissions) => void;

  shifts: Record<string, ShiftCell>;
  setShifts: (update: (prev: Record<string, ShiftCell>) => Record<string, ShiftCell>) => void;
  templates: ShiftTemplate[];
  setTemplates: (update: (prev: ShiftTemplate[]) => ShiftTemplate[]) => void;
  leaveRequests: LeaveRequest[];
  setLeaveRequests: (update: (prev: LeaveRequest[]) => LeaveRequest[]) => void;
  availability: Record<string, boolean[]>;
  setAvailability: (update: (prev: Record<string, boolean[]>) => Record<string, boolean[]>) => void;
  shiftRoles: ShiftRoleRecord[];
  setShiftRoles: (update: (prev: ShiftRoleRecord[]) => ShiftRoleRecord[]) => void;
}

const StaffStoreContext = createContext<StaffStore | null>(null);

export function StaffStoreProvider({ children }: { children: ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>(() => [...seedEmployees]);
  const [overrides, setOverrides] = useState<Record<string, Partial<MemberProfile>>>({});
  const [inactiveIds, setInactiveIds] = useState<Set<string>>(() => new Set());
  const [roles, setRoles] = useState<RoleRecord[]>(() => staffRoleDefs.map((r) => ({ ...r, active: true })));
  const [permissions, setPermissions] = useState<Record<string, RolePermissions>>(seedPermissions);
  const [shifts, setShiftsState] = useState<Record<string, ShiftCell>>(seedShifts);
  const [templates, setTemplatesState] = useState<ShiftTemplate[]>(SEED_TEMPLATES);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(seedLeaveRequests);
  const [availability, setAvailability] = useState<Record<string, boolean[]>>(seedAvailability);
  const [shiftRoles, setShiftRoles] = useState<ShiftRoleRecord[]>(SEED_SHIFT_ROLES);

  const profiles = useMemo(
    () => new Map(employees.map((e) => [e.id, { ...toMemberProfile(e), ...overrides[e.id], employee: e }])),
    [employees, overrides]
  );

  const profileOf = useCallback((id: string) => profiles.get(id) ?? null, [profiles]);

  const addEmployee = useCallback((employee: Employee, profile?: Partial<MemberProfile>) => {
    setEmployees((prev) => [employee, ...prev]);
    if (profile) setOverrides((prev) => ({ ...prev, [employee.id]: profile }));
  }, []);

  const updateEmployee = useCallback((id: string, patch: Partial<Employee>) => {
    setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }, []);

  const removeEmployee = useCallback((id: string) => {
    setEmployees((prev) => prev.filter((e) => e.id !== id));
    setShiftsState((prev) => Object.fromEntries(Object.entries(prev).filter(([key]) => !key.startsWith(`${id}|`))));
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
      roles,
      addRole,
      updateRole,
      removeRole,
      memberCount,
      permissions,
      setRolePermissions,
      shifts,
      setShifts: setShiftsState,
      templates,
      setTemplates: setTemplatesState,
      leaveRequests,
      setLeaveRequests,
      availability,
      setAvailability,
      shiftRoles,
      setShiftRoles,
    }),
    [employees, profileOf, addEmployee, updateEmployee, removeEmployee, patchProfile, isInactive, setInactive, roles, addRole, updateRole, removeRole, memberCount, permissions, setRolePermissions, shifts, templates, leaveRequests, availability, shiftRoles]
  );

  return <StaffStoreContext.Provider value={value}>{children}</StaffStoreContext.Provider>;
}

export function useStaffStore(): StaffStore {
  const ctx = useContext(StaffStoreContext);
  if (!ctx) throw new Error("useStaffStore must be used within StaffStoreProvider");
  return ctx;
}
