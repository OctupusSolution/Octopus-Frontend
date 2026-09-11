# Staff Module Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the merchant app's `/staff` page from a single employee table into a three-tab module (Staff / Roles & Permissions / Shifts) matching the Figma mockups in `apps/assets/Staff/Staff Desing/`.

**Architecture:** `apps/merchant/src/pages/staff/index.tsx` becomes a tab shell around three new sibling components (`staff-tab.tsx`, `roles-permissions-tab.tsx`, `shifts-tab.tsx`), each reading from mock data extended in `apps/merchant/src/shared/api/mock-staff.ts`. All new interactivity (PIN reveal, 2FA toggle, lock account, permission toggles, role CRUD) is local React state only — no backend calls.

**Tech Stack:** React 18 + TypeScript, Tailwind (CSS variable design tokens, e.g. `var(--octo-text-primary)`), `@ui/primitives` (this repo's `packages/ui`), `lucide-react` icons, the app's `useI18n()`/`t()` + `labelKey()` i18n pattern (`packages/i18n/src/locales/{en,ar}/index.ts`).

**Spec:** `docs/superpowers/specs/2026-09-11-staff-module-design.md`

## Global Constraints

- No backend/API calls anywhere in this feature — all state is local `useState`.
- All employee-facing routes `/staff/schedule`, `/staff/attendance`, `/staff/payroll`, `/staff/tips` and their page files are untouched.
- `apps/merchant/src/pages/staff/employees/index.tsx` (old table+drawer implementation) is not deleted — it stays as dead code reachable only if something still imports it (nothing will, after Task 7, but don't remove the file).
- Every new/changed user-facing string goes through `t(...)` with a key added to **both** `packages/i18n/src/locales/en/index.ts` and `packages/i18n/src/locales/ar/index.ts`, mirrored 1:1 (same key, same line position relative to surrounding keys).
- Follow existing styling conventions verbatim: `text-[12.5px]` body text, `text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]` for field labels, `rounded-[9px]`/`rounded-xl` radii, `var(--octo-card)` / `var(--octo-border-card)` / `var(--octo-divider)` / `var(--octo-hover)` tokens, `#0D6EFD` as the accent blue.
- No automated tests are added (this is mock-data UI with no business logic); verification is manual via the `run` skill + screenshot comparison against the mockups, per the project's `verify-ui-with-screenshots` memory.

---

### Task 1: Extend `mock-staff.ts` with member-profile and roles/permissions data

**Files:**
- Modify: `apps/merchant/src/shared/api/mock-staff.ts`

**Interfaces:**
- Consumes: existing `Employee`, `StaffRole`, `Branch`, `employees`, `employeeById` (all unchanged).
- Produces (new exports later tasks rely on):
  - `type MemberProfile` (full shape below)
  - `function toMemberProfile(e: Employee): MemberProfile`
  - `type ModuleId` (union of the 12 module ids)
  - `const MODULES: readonly { id: ModuleId; label: string }[]`
  - `type PermissionAction` = `"view" | "create" | "edit" | "delete" | "approve" | "export" | "setting"`
  - `const PERMISSION_ACTIONS: readonly PermissionAction[]`
  - `type RoleId` (string)
  - `interface StaffRoleDef { id: RoleId; name: string; description: string; isSystemRole: boolean; memberCount: number }`
  - `const staffRoleDefs: readonly StaffRoleDef[]`
  - `type PermissionMatrix = Record<RoleId, Record<ModuleId, Record<PermissionAction, boolean>>>`
  - `const defaultPermissionMatrix: PermissionMatrix`
  - `const SHIFT_PILL_COLORS: readonly string[]` (palette for the Shifts-tab per-employee row color, cycled by index)

- [ ] **Step 1: Add member-profile derivation at the end of the Employees section**

Open `apps/merchant/src/shared/api/mock-staff.ts` and insert this immediately after the `employeeRows` block (after line 159, before the `/* ---- Leave requests */` comment):

```ts
/* ------------------------------------------------------------------ Member profile (Staff tab rebuild) */

const ROLE_JOB_TITLE: Record<StaffRole, string> = {
  Owner: "Owner",
  "Branch Manager": "Restaurant Manager",
  Cashier: "Cashier",
  Waiter: "Waiter",
  Kitchen: "Kitchen Staff",
  Driver: "Delivery Driver",
};

const ROLE_DEPARTMENT: Record<StaffRole, string> = {
  Owner: "Management",
  "Branch Manager": "Management",
  Cashier: "Front of House",
  Waiter: "Front of House",
  Kitchen: "Back of House",
  Driver: "Delivery",
};

const CONTRACT_TO_EMPLOYMENT_TYPE: Record<ContractType, "Full time" | "Part time"> = {
  "Full-time": "Full time",
  "Part-time": "Part time",
  Seasonal: "Part time",
};

const ROLE_ACCESS_LEVEL: Record<StaffRole, string> = {
  Owner: "Full access",
  "Branch Manager": "Full access",
  Cashier: "Limited access",
  Waiter: "Limited access",
  Kitchen: "Limited access",
  Driver: "Limited access",
};

const ROLE_MODULES_ACCESS: Record<StaffRole, readonly string[]> = {
  Owner: ["Dashboard", "Reservations", "Wait list", "Floor Plan", "Orders", "Payment & Refund", "Menu & POS", "Inventory", "Reports", "Customer CRM", "Staff Management", "Setting & Integrations"],
  "Branch Manager": ["Dashboard", "Reservations", "Wait list", "Floor Plan", "Orders", "Payment & Refund", "Menu & POS", "Inventory", "Reports", "Customer CRM", "Staff Management", "Setting & Integrations"],
  Cashier: ["Orders", "Payment & Refund", "Menu & POS"],
  Waiter: ["Reservations", "Wait list", "Floor Plan", "Orders"],
  Kitchen: ["Orders", "Menu & POS", "Inventory"],
  Driver: ["Orders"],
};

// Deterministic 4-digit PIN and boolean flag from an employee id, so the
// mock data stays stable across renders without needing a stored seed.
function hashCode(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

export interface MemberProfile {
  employee: Employee;
  employeeCode: string;
  firstName: string;
  lastName: string;
  gender: "Male" | "Female";
  nationality: string;
  languages: readonly string[];
  jobTitle: string;
  department: string;
  reportsTo: string;
  employmentType: "Full time" | "Part time";
  status: "Active" | "Inactive";
  accessLevel: string;
  modulesAccess: readonly string[];
  loginMethod: "PIN" | "Password" | "Both";
  pinCode: string;
  twoFactorEnabled: boolean;
  twoFactorMethod: string;
  allowSystemLogin: boolean;
  allowAccessOutsideBranch: boolean;
  activeSection: { device: string; location: string; since: string };
}

export function toMemberProfile(e: Employee): MemberProfile {
  const hash = hashCode(e.id);
  const [firstName, ...rest] = e.name.split(" ");
  const managerForBranch = employees.find((m) => m.role === "Branch Manager" && m.branch === e.branch && m.id !== e.id);

  return {
    employee: e,
    employeeCode: e.id,
    firstName,
    lastName: rest.join(" ") || "—",
    gender: hash % 2 === 0 ? "Male" : "Female",
    nationality: "Saudi Arabia",
    languages: ["English", "Arabic"],
    jobTitle: ROLE_JOB_TITLE[e.role],
    department: ROLE_DEPARTMENT[e.role],
    reportsTo: e.role === "Owner" ? "—" : (managerForBranch?.name ?? "Owner"),
    employmentType: CONTRACT_TO_EMPLOYMENT_TYPE[e.contractType],
    status: "Active",
    accessLevel: ROLE_ACCESS_LEVEL[e.role],
    modulesAccess: ROLE_MODULES_ACCESS[e.role],
    loginMethod: "PIN",
    pinCode: String(1000 + (hash % 9000)),
    twoFactorEnabled: e.role === "Owner" || e.role === "Branch Manager",
    twoFactorMethod: "Authenticator App",
    allowSystemLogin: true,
    allowAccessOutsideBranch: e.role === "Owner",
    activeSection: {
      device: "iPad Pro",
      location: `${e.branch}, Saudi Arabia`,
      since: "May 12, 2026 - 10:30 AM",
    },
  };
}
```

- [ ] **Step 2: Add Roles & Permissions mock data**

Insert this new section at the very end of the file (after the Payroll section, i.e. after the closing `);` of `payrollRowsByPeriod`):

```ts
/* ================================================================== ROLES & PERMISSIONS */

export type ModuleId =
  | "dashboard" | "reservations" | "waitlist" | "floorPlan" | "orders"
  | "paymentRefund" | "menuPos" | "inventory" | "reports" | "customerCrm"
  | "staffManagement" | "settingIntegrations";

export const MODULES: readonly { id: ModuleId; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "reservations", label: "Reservations" },
  { id: "waitlist", label: "Wait list" },
  { id: "floorPlan", label: "Floor Plan" },
  { id: "orders", label: "Orders" },
  { id: "paymentRefund", label: "Payment & Refund" },
  { id: "menuPos", label: "Menu & POS" },
  { id: "inventory", label: "Inventory" },
  { id: "reports", label: "Reports" },
  { id: "customerCrm", label: "Customer CRM" },
  { id: "staffManagement", label: "Staff Management" },
  { id: "settingIntegrations", label: "Setting & Integrations" },
];

export type PermissionAction = "view" | "create" | "edit" | "delete" | "approve" | "export" | "setting";
export const PERMISSION_ACTIONS: readonly PermissionAction[] = ["view", "create", "edit", "delete", "approve", "export", "setting"];

export type RoleId = "owner" | "manager" | "cashier" | "host" | "kitchen" | "barista" | "custom";

export interface StaffRoleDef {
  id: RoleId;
  name: string;
  description: string;
  isSystemRole: boolean;
  memberCount: number;
}

export const staffRoleDefs: readonly StaffRoleDef[] = [
  { id: "owner", name: "Owner", description: "Full system access", isSystemRole: true, memberCount: 1 },
  { id: "manager", name: "Manager", description: "Manage operations & staff", isSystemRole: false, memberCount: 2 },
  { id: "cashier", name: "Cashier", description: "Handle billing & Payment", isSystemRole: false, memberCount: 2 },
  { id: "host", name: "Host", description: "Manage reservations & seating", isSystemRole: false, memberCount: 2 },
  { id: "kitchen", name: "Kitchen", description: "View & manage kitchen orders", isSystemRole: false, memberCount: 3 },
  { id: "barista", name: "Barista", description: "Prepare beverages", isSystemRole: false, memberCount: 2 },
  { id: "custom", name: "Custom Role", description: "Marketing Access", isSystemRole: false, memberCount: 1 },
];

type AccessLevel = "full" | "view" | "none";

function permissionsFor(level: AccessLevel): Record<PermissionAction, boolean> {
  if (level === "full") return { view: true, create: true, edit: true, delete: true, approve: true, export: true, setting: true };
  if (level === "view") return { view: true, create: false, edit: false, delete: false, approve: false, export: false, setting: false };
  return { view: false, create: false, edit: false, delete: false, approve: false, export: false, setting: false };
}

// Per-role, per-module override; any module not listed falls back to the
// role's `default` level. Mirrors the "Owner = everything on" / narrower
// roles mockup without hand-writing 7 roles x 12 modules x 7 actions.
const ROLE_ACCESS: Record<RoleId, { default: AccessLevel; overrides?: Partial<Record<ModuleId, AccessLevel>> }> = {
  owner: { default: "full" },
  manager: { default: "full", overrides: { settingIntegrations: "view" } },
  cashier: {
    default: "none",
    overrides: { orders: "full", paymentRefund: "full", menuPos: "view", customerCrm: "view" },
  },
  host: {
    default: "none",
    overrides: { reservations: "full", waitlist: "full", floorPlan: "full", customerCrm: "view" },
  },
  kitchen: {
    default: "none",
    overrides: { orders: "full", menuPos: "view", inventory: "view" },
  },
  barista: {
    default: "none",
    overrides: { orders: "view", menuPos: "view", inventory: "view" },
  },
  custom: {
    default: "none",
    overrides: { reports: "view", customerCrm: "full" },
  },
};

export type PermissionMatrix = Record<RoleId, Record<ModuleId, Record<PermissionAction, boolean>>>;

function buildPermissionMatrix(): PermissionMatrix {
  const matrix = {} as PermissionMatrix;
  for (const role of staffRoleDefs) {
    const access = ROLE_ACCESS[role.id];
    matrix[role.id] = {} as Record<ModuleId, Record<PermissionAction, boolean>>;
    for (const mod of MODULES) {
      const level = access.overrides?.[mod.id] ?? access.default;
      matrix[role.id][mod.id] = permissionsFor(level);
    }
  }
  return matrix;
}

export const defaultPermissionMatrix: PermissionMatrix = buildPermissionMatrix();

/* ================================================================== SHIFTS TAB PALETTE */

// Cycled by employee row index in the Shifts tab grid; kept separate from
// SHIFT_TYPE_COLOR (which colors by shift type, not by employee).
export const SHIFT_PILL_COLORS: readonly string[] = [
  "#7C6EF6", "#2E90FA", "#12B76A", "#F79009", "#06AED4", "#EE46BC", "#667085",
];
```

- [ ] **Step 3: Typecheck**

Run: `cd apps/merchant && npx tsc --noEmit -p .`
Expected: no new errors from `mock-staff.ts`. (Pre-existing unrelated errors, if any, are out of scope — only confirm nothing new appears in this file.)

- [ ] **Step 4: Commit**

```bash
git add apps/merchant/src/shared/api/mock-staff.ts
git commit -m "Add member-profile and roles/permissions mock data for the Staff rebuild"
```

---

### Task 2: Add i18n keys for the rebuilt Staff module

**Files:**
- Modify: `packages/i18n/src/locales/en/index.ts`
- Modify: `packages/i18n/src/locales/ar/index.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: every `staff.tabs.*`, `staff.member.*`, `staff.roles.*`, `staff.permissions.*`, `staff.shifts.*` key used by Tasks 3–7. Exact key list below — later tasks must use these exact strings with `t("...")`.

- [ ] **Step 1: Insert English keys**

In `packages/i18n/src/locales/en/index.ts`, find the line `"staff.employees.drawer.editTitle": "Edit employee",` and insert immediately after it:

```ts
  /* --- staff module rebuild: tabs shell --- */
  "staff.tabs.staff": "Staff",
  "staff.tabs.rolesPermissions": "Roles& Permissions",
  "staff.tabs.shifts": "Shifts",
  "staff.header.title": "Staff",
  "staff.header.subtitle": "Manage your team, roles and work schedules",
  "staff.header.addNewMember": "Add New Member",

  /* --- staff module rebuild: Staff tab card grid --- */
  "staff.grid.searchPlaceholder": "Search",
  "staff.grid.lastAccess": "Last Access",
  "staff.grid.menu.edit": "Edit",
  "staff.grid.menu.assignChangeRole": "Assign /Change Role",
  "staff.grid.menu.deactivate": "Deactivate",
  "staff.grid.menu.delete": "Delete",
  "staff.grid.backToStaff": "Back to Staff",

  /* --- staff module rebuild: Member details --- */
  "staff.member.personalInfo": "Personal Info",
  "staff.member.workInfo": "Work Info",
  "staff.member.roleAccess": "Role &Access",
  "staff.member.loginSecurity": "Login &Security",
  "staff.member.accessControls": "Access Controls",
  "staff.member.field.firstName": "First Name",
  "staff.member.field.lastName": "Last Name",
  "staff.member.field.phoneNumber": "Phone Number",
  "staff.member.field.email": "Email",
  "staff.member.field.dateOfBirth": "Date of Birth",
  "staff.member.field.gender": "Gender",
  "staff.member.field.nationality": "Nationality",
  "staff.member.field.language": "Language",
  "staff.member.field.employeeId": "Employee ID",
  "staff.member.field.phone": "Phone",
  "staff.member.field.branch": "Branch",
  "staff.member.field.joined": "Joined",
  "staff.member.field.jobTitle": "Job Title",
  "staff.member.field.department": "Department",
  "staff.member.field.reportsTo": "Reports To",
  "staff.member.field.hireDate": "Hire Date",
  "staff.member.field.employmentType": "Employment Type",
  "staff.member.field.status": "Status",
  "staff.member.field.assignedRole": "Assigned Role",
  "staff.member.field.accessLevel": "Access Level",
  "staff.member.field.modulesAccess": "Modules Access",
  "staff.member.field.pinCode": "PIN Code",
  "staff.member.field.resetPinCode": "Reset PIN Code",
  "staff.member.field.twoFactor": "Two-Factor Authentication (2FA)",
  "staff.member.field.preferred2fa": "Preferred 2FA Method",
  "staff.member.field.allowSystemLogin": "Allow system login",
  "staff.member.field.allowAccessOutsideBranch": "Allow access outside assigned branch",
  "staff.member.field.lockAccountPrompt": "Lock account immediately?",
  "staff.member.field.lockAccount": "Lock Account",
  "staff.member.field.activeSections": "Active Sections",
  "staff.member.status.active": "Active",
  "staff.member.status.locked": "This account is locked.",

  /* --- staff module rebuild: Roles & Permissions tab --- */
  "staff.roles.heading": "Roles",
  "staff.roles.subheading": "Manage roles for your team",
  "staff.roles.addRole": "Add Role",
  "staff.roles.systemRole": "System Role",
  "staff.roles.menu.edit": "Edit",
  "staff.roles.menu.duplicate": "Duplicate",
  "staff.roles.menu.assignUsers": "Assign Users",
  "staff.roles.menu.deactivate": "Deactivate",
  "staff.roles.menu.delete": "Delete",
  "staff.roles.deleteConfirmTitle": "Delete role",
  "staff.roles.deleteConfirmBody": "Delete {name}? Members assigned to this role keep their access until reassigned.",
  "staff.permissions.matrixHeading": "Permission Matrix",
  "staff.permissions.matrixSubheading": "Toggle permission ON/OFF for this role.",
  "staff.permissions.selectAll": "Select All",
  "staff.permissions.column.module": "Module",
  "staff.permissions.column.view": "View",
  "staff.permissions.column.create": "Create",
  "staff.permissions.column.edit": "Edit",
  "staff.permissions.column.delete": "Delete",
  "staff.permissions.column.approve": "Approve",
  "staff.permissions.column.export": "Export",
  "staff.permissions.column.setting": "Setting",

  /* --- staff module rebuild: Shifts tab --- */
  "staff.shiftsTab.title": "Shifts",
  "staff.shiftsTab.subtitle": "Manage team schedules and working hours.",
  "staff.shiftsTab.subnav.schedule": "Schedule",
  "staff.shiftsTab.subnav.templates": "Templets",
  "staff.shiftsTab.subnav.shiftRoles": "Shift Roles",
  "staff.shiftsTab.subnav.timeOff": "Time Off",
  "staff.shiftsTab.subnav.availability": "Availability",
  "staff.shiftsTab.comingSoon": "Coming soon",
  "staff.shiftsTab.comingSoonDescription": "This view isn't available yet.",
  "staff.shiftsTab.weeklySummary": "Weekly Summary",
  "staff.shiftsTab.totalHours": "Total Hours",
  "staff.shiftsTab.totalEmployees": "Total Employees",
  "staff.shiftsTab.overtime": "Overtime",
  "staff.shiftsTab.openShift": "Open shift",
  "staff.shiftsTab.estLaborCost": "Est. Labor Cost",
  "staff.shiftsTab.week": "Week",
  "staff.shiftsTab.month": "Month",
  "staff.shiftsTab.bulkActions": "Bulk Actions",
  "staff.shiftsTab.sendViaWhatsApp": "Send Via WhatsApp",
  "staff.shiftsTab.print": "Print",
  "staff.shiftsTab.exportPdf": "Export PDF",
  "staff.shiftsTab.allEmployees": "All Employees",
  "staff.shiftsTab.off": "OFF",
```

- [ ] **Step 2: Insert matching Arabic keys**

In `packages/i18n/src/locales/ar/index.ts`, find the line `"staff.employees.drawer.editTitle": "تعديل الموظف",` and insert immediately after it (same key set, Arabic values):

```ts
  /* --- staff module rebuild: tabs shell --- */
  "staff.tabs.staff": "الموظفون",
  "staff.tabs.rolesPermissions": "الأدوار والصلاحيات",
  "staff.tabs.shifts": "الشِفتات",
  "staff.header.title": "الموظفون",
  "staff.header.subtitle": "إدارة فريقك وأدواره وجداول عمله",
  "staff.header.addNewMember": "إضافة عضو جديد",

  /* --- staff module rebuild: Staff tab card grid --- */
  "staff.grid.searchPlaceholder": "بحث",
  "staff.grid.lastAccess": "آخر دخول",
  "staff.grid.menu.edit": "تعديل",
  "staff.grid.menu.assignChangeRole": "تعيين / تغيير الدور",
  "staff.grid.menu.deactivate": "إيقاف",
  "staff.grid.menu.delete": "حذف",
  "staff.grid.backToStaff": "الرجوع للموظفين",

  /* --- staff module rebuild: Member details --- */
  "staff.member.personalInfo": "البيانات الشخصية",
  "staff.member.workInfo": "بيانات العمل",
  "staff.member.roleAccess": "الدور والصلاحيات",
  "staff.member.loginSecurity": "تسجيل الدخول والأمان",
  "staff.member.accessControls": "ضوابط الوصول",
  "staff.member.field.firstName": "الاسم الأول",
  "staff.member.field.lastName": "اسم العائلة",
  "staff.member.field.phoneNumber": "رقم الهاتف",
  "staff.member.field.email": "البريد الإلكتروني",
  "staff.member.field.dateOfBirth": "تاريخ الميلاد",
  "staff.member.field.gender": "الجنس",
  "staff.member.field.nationality": "الجنسية",
  "staff.member.field.language": "اللغة",
  "staff.member.field.employeeId": "رقم الموظف",
  "staff.member.field.phone": "الهاتف",
  "staff.member.field.branch": "الفرع",
  "staff.member.field.joined": "تاريخ الانضمام",
  "staff.member.field.jobTitle": "المسمى الوظيفي",
  "staff.member.field.department": "القسم",
  "staff.member.field.reportsTo": "يتبع إداريًا لـ",
  "staff.member.field.hireDate": "تاريخ التوظيف",
  "staff.member.field.employmentType": "نوع التوظيف",
  "staff.member.field.status": "الحالة",
  "staff.member.field.assignedRole": "الدور المعيّن",
  "staff.member.field.accessLevel": "مستوى الصلاحية",
  "staff.member.field.modulesAccess": "الوصول إلى الوحدات",
  "staff.member.field.pinCode": "الرمز السري",
  "staff.member.field.resetPinCode": "إعادة تعيين الرمز السري",
  "staff.member.field.twoFactor": "المصادقة الثنائية",
  "staff.member.field.preferred2fa": "طريقة المصادقة الثنائية المفضلة",
  "staff.member.field.allowSystemLogin": "السماح بتسجيل الدخول للنظام",
  "staff.member.field.allowAccessOutsideBranch": "السماح بالوصول خارج الفرع المعيّن",
  "staff.member.field.lockAccountPrompt": "قفل الحساب فورًا؟",
  "staff.member.field.lockAccount": "قفل الحساب",
  "staff.member.field.activeSections": "الأجهزة النشطة",
  "staff.member.status.active": "نشط",
  "staff.member.status.locked": "هذا الحساب مقفل.",

  /* --- staff module rebuild: Roles & Permissions tab --- */
  "staff.roles.heading": "الأدوار",
  "staff.roles.subheading": "إدارة أدوار فريقك",
  "staff.roles.addRole": "إضافة دور",
  "staff.roles.systemRole": "دور نظامي",
  "staff.roles.menu.edit": "تعديل",
  "staff.roles.menu.duplicate": "نسخ",
  "staff.roles.menu.assignUsers": "تعيين مستخدمين",
  "staff.roles.menu.deactivate": "إيقاف",
  "staff.roles.menu.delete": "حذف",
  "staff.roles.deleteConfirmTitle": "حذف الدور",
  "staff.roles.deleteConfirmBody": "هل تريد حذف {name}؟ سيحتفظ الأعضاء المعيّنون لهذا الدور بصلاحياتهم حتى إعادة تعيينهم.",
  "staff.permissions.matrixHeading": "مصفوفة الصلاحيات",
  "staff.permissions.matrixSubheading": "فعّل أو أوقف الصلاحية لهذا الدور.",
  "staff.permissions.selectAll": "تحديد الكل",
  "staff.permissions.column.module": "الوحدة",
  "staff.permissions.column.view": "عرض",
  "staff.permissions.column.create": "إنشاء",
  "staff.permissions.column.edit": "تعديل",
  "staff.permissions.column.delete": "حذف",
  "staff.permissions.column.approve": "اعتماد",
  "staff.permissions.column.export": "تصدير",
  "staff.permissions.column.setting": "إعدادات",

  /* --- staff module rebuild: Shifts tab --- */
  "staff.shiftsTab.title": "الشِفتات",
  "staff.shiftsTab.subtitle": "إدارة جداول فريقك وساعات العمل.",
  "staff.shiftsTab.subnav.schedule": "الجدول",
  "staff.shiftsTab.subnav.templates": "القوالب",
  "staff.shiftsTab.subnav.shiftRoles": "أدوار الشِفت",
  "staff.shiftsTab.subnav.timeOff": "الإجازات",
  "staff.shiftsTab.subnav.availability": "التوفر",
  "staff.shiftsTab.comingSoon": "قريبًا",
  "staff.shiftsTab.comingSoonDescription": "هذه الشاشة غير متاحة بعد.",
  "staff.shiftsTab.weeklySummary": "ملخص الأسبوع",
  "staff.shiftsTab.totalHours": "إجمالي الساعات",
  "staff.shiftsTab.totalEmployees": "إجمالي الموظفين",
  "staff.shiftsTab.overtime": "الوقت الإضافي",
  "staff.shiftsTab.openShift": "شِفت شاغر",
  "staff.shiftsTab.estLaborCost": "تكلفة العمالة التقديرية",
  "staff.shiftsTab.week": "أسبوع",
  "staff.shiftsTab.month": "شهر",
  "staff.shiftsTab.bulkActions": "إجراءات جماعية",
  "staff.shiftsTab.sendViaWhatsApp": "إرسال عبر واتساب",
  "staff.shiftsTab.print": "طباعة",
  "staff.shiftsTab.exportPdf": "تصدير PDF",
  "staff.shiftsTab.allEmployees": "كل الموظفين",
  "staff.shiftsTab.off": "إجازة",
```

- [ ] **Step 3: Typecheck the i18n packages**

Run: `cd packages/i18n && npx tsc --noEmit -p .`
Expected: no errors (both files export plain `Record<string, string>` objects, so a stray duplicate key would only surface as a lint/duplicate-key warning, not a type error — proceed to Step 4 either way, then fix any duplicate-key warning from `npx eslint` if the project runs it).

- [ ] **Step 4: Commit**

```bash
git add packages/i18n/src/locales/en/index.ts packages/i18n/src/locales/ar/index.ts
git commit -m "Add en/ar translation keys for the rebuilt Staff module"
```

---

### Task 3: Shared dismiss hook + kebab row-menu component for the Staff pages

**Files:**
- Create: `apps/merchant/src/pages/staff/_shared/use-dismiss.ts`
- Create: `apps/merchant/src/pages/staff/_shared/row-menu.tsx`

**Interfaces:**
- Produces:
  - `useDismiss(open: boolean, close: () => void): RefObject<HTMLDivElement>`
  - `interface RowMenuItem { key: string; label: string; onSelect: () => void; tone?: "default" | "warning" | "danger" }`
  - `function RowMenu({ items, open, onOpenChange, ariaLabel }: { items: RowMenuItem[]; open: boolean; onOpenChange: (open: boolean) => void; ariaLabel: string }): JSX.Element`

- [ ] **Step 1: Add the dismiss hook**

Create `apps/merchant/src/pages/staff/_shared/use-dismiss.ts`:

```ts
// Shared "click outside or press Escape to close" behaviour for the Staff
// module's kebab menus, mirroring apps/merchant/src/pages/reservations/_shared/use-dismiss.ts.
import { useEffect, useRef, type RefObject } from "react";

export function useDismiss(open: boolean, close: () => void): RefObject<HTMLDivElement> {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleMouseDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        close();
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        close();
      }
    }

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, close]);

  return ref;
}
```

- [ ] **Step 2: Add the generic kebab RowMenu**

Create `apps/merchant/src/pages/staff/_shared/row-menu.tsx`:

```tsx
import { MoreVertical } from "lucide-react";
import clsx from "clsx";
import { useDismiss } from "./use-dismiss";

export interface RowMenuItem {
  key: string;
  label: string;
  onSelect: () => void;
  tone?: "default" | "warning" | "danger";
}

const TONE_CLASSES: Record<NonNullable<RowMenuItem["tone"]>, string> = {
  default: "text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]",
  warning: "text-[#B54708] hover:bg-[#FFFAEB]",
  danger: "text-[#EF4444] hover:bg-[#FEF2F2]",
};

export function RowMenu({
  items,
  open,
  onOpenChange,
  ariaLabel,
}: {
  items: RowMenuItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ariaLabel: string;
}) {
  const ref = useDismiss(open, () => onOpenChange(false));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={(e) => {
          e.stopPropagation();
          onOpenChange(!open);
        }}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-[7px] text-[var(--octo-text-muted)] transition-colors hover:bg-[var(--octo-hover)]"
      >
        <MoreVertical size={15} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute end-0 z-20 mt-1 w-48 rounded-[10px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-1 shadow-lg"
        >
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                item.onSelect();
                onOpenChange(false);
              }}
              className={clsx(
                "flex w-full items-center rounded-[9px] px-2.5 py-1.5 text-start text-[12px] transition-colors",
                TONE_CLASSES[item.tone ?? "default"]
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `cd apps/merchant && npx tsc --noEmit -p .`
Expected: no errors from the two new files.

- [ ] **Step 4: Commit**

```bash
git add apps/merchant/src/pages/staff/_shared/use-dismiss.ts apps/merchant/src/pages/staff/_shared/row-menu.tsx
git commit -m "Add shared dismiss hook and kebab row-menu for the Staff module"
```

---

### Task 4: Build the Staff tab (card grid + toolbar)

**Files:**
- Create: `apps/merchant/src/pages/staff/staff-tab.tsx`

**Interfaces:**
- Consumes: `employees`, `Employee`, `Branch`, `branches`, `toMemberProfile`, `MemberProfile` from `@/shared/api/mock-staff`; `Badge, Button, Input, Select` from `@ui/primitives`; `RowMenu, RowMenuItem` from `./_shared/row-menu`; `useI18n` from `@/app/providers/i18n-provider`.
- Produces: `export function StaffTab(): JSX.Element` — self-contained (owns its own search/filter/selected-member state). Task 6 (page shell) renders `<StaffTab />` directly with no props, so all state lives inside this component. Deactivation state must be exposed via a small local `Set<string>` (deactivated employee ids) kept inside `StaffTab` — Task 5's member-details view is composed *inside* `StaffTab` (same file's sibling component or a child it renders), not a separate top-level export, so this task also produces the "click a card → inline detail view replaces the grid" behavior wiring point that Task 5 fills in.

- [ ] **Step 1: Write `staff-tab.tsx` with the grid, toolbar, and kebab actions (detail view stubbed as a TODO marker replaced in Task 5)**

Create `apps/merchant/src/pages/staff/staff-tab.tsx`:

```tsx
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge, Button, Input, Select } from "@ui/primitives";
import { employees, branches, type Employee, type Branch, toMemberProfile } from "@/shared/api/mock-staff";
import { useI18n } from "@/app/providers/i18n-provider";
import { RowMenu, type RowMenuItem } from "./_shared/row-menu";
import { MemberDetails } from "./member-details";

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function StaffTab() {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState<"all" | Branch>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "Active" | "Inactive">("all");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deactivatedIds, setDeactivatedIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return employees.filter((e) => {
      if (q && !e.name.toLowerCase().includes(q) && !e.phone.includes(q)) return false;
      if (branchFilter !== "all" && e.branch !== branchFilter) return false;
      const status = deactivatedIds.has(e.id) ? "Inactive" : "Active";
      if (statusFilter !== "all" && status !== statusFilter) return false;
      return true;
    });
  }, [query, branchFilter, statusFilter, deactivatedIds]);

  const selected = selectedId ? employees.find((e) => e.id === selectedId) ?? null : null;

  if (selected) {
    return (
      <MemberDetails
        profile={toMemberProfile(selected)}
        deactivated={deactivatedIds.has(selected.id)}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  const menuItemsFor = (e: Employee): RowMenuItem[] => [
    { key: "edit", label: t("staff.grid.menu.edit"), onSelect: () => setSelectedId(e.id) },
    { key: "assign-role", label: t("staff.grid.menu.assignChangeRole"), onSelect: () => setSelectedId(e.id) },
    {
      key: "deactivate",
      label: t("staff.grid.menu.deactivate"),
      tone: "warning",
      onSelect: () => setDeactivatedIds((prev) => new Set(prev).add(e.id)),
    },
    {
      key: "delete",
      label: t("staff.grid.menu.delete"),
      tone: "danger",
      onSelect: () => setDeactivatedIds((prev) => new Set(prev).add(e.id)),
    },
  ];

  return (
    <div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Input
          className="min-w-[220px] flex-1"
          placeholder={t("staff.grid.searchPlaceholder")}
          icon={<Search size={13} />}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Select className="w-[170px]" value={branchFilter} onChange={(e) => setBranchFilter(e.target.value as "all" | Branch)}>
          <option value="all">{t("staff.filter.allBranches")}</option>
          {branches.map((b) => <option key={b} value={b}>{b}</option>)}
        </Select>
        <Select className="w-[150px]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "all" | "Active" | "Inactive")}>
          <option value="all">{t("staff.filter.allStatuses")}</option>
          <option value="Active">{t("staff.member.status.active")}</option>
          <option value="Inactive">{t("staff.grid.menu.deactivate")}</option>
        </Select>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {rows.map((e) => (
          <article
            key={e.id}
            role="button"
            tabIndex={0}
            onClick={() => setSelectedId(e.id)}
            onKeyDown={(ev) => { if (ev.key === "Enter") setSelectedId(e.id); }}
            className="flex cursor-pointer flex-col gap-2.5 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px] transition-colors hover:border-[#0D6EFD]/50"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#eaf2ff] text-[12px] font-bold text-[#0D6EFD]">
                  {initials(e.name)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-[var(--octo-text-primary)]">{e.name}</p>
                  <p className="truncate text-[11.5px] text-[#0D6EFD]">{e.role === "Branch Manager" ? "Restaurant Manager" : e.role}</p>
                </div>
              </div>
              <RowMenu
                items={menuItemsFor(e)}
                open={openMenuId === e.id}
                onOpenChange={(open) => setOpenMenuId(open ? e.id : null)}
                ariaLabel={e.name}
              />
            </div>

            <div className="flex flex-col gap-1 text-[12px] text-[var(--octo-text-secondary)]">
              <span>{e.phone}</span>
              <span>{e.branch}</span>
            </div>

            <div className="mt-1 flex items-center justify-between border-t border-[var(--octo-divider)] pt-2 text-[11px] text-[var(--octo-text-muted)]">
              <span>{t("staff.grid.lastAccess")}: May 12, 2026 - 10:30 AM</span>
              {deactivatedIds.has(e.id) && <Badge tone="neutral">{t("staff.grid.menu.deactivate")}</Badge>}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
```

Note: `MemberDetails` is imported here but doesn't exist yet — that's fine, Task 5 creates it next; don't run the app between Task 4 and Task 5, only typecheck-skip is expected to fail at this point. Instead, for Task 4's own verification, temporarily comment out the `import { MemberDetails }` line and the `if (selected) { ... }` block, run the typecheck, then restore them before committing (so the commit lands with Task 5 as an immediate follow-up and the two are typically done back-to-back). If you're executing tasks strictly in order without gaps, skip Task 4's typecheck step and do it once at the end of Task 5 instead.

- [ ] **Step 2: Commit (staged together with Task 5 is fine; if committing standalone, keep the temporary comment-out from Step 1's note)**

```bash
git add apps/merchant/src/pages/staff/staff-tab.tsx
git commit -m "Add Staff tab card grid with search/filter and kebab actions"
```

---

### Task 5: Build the inline Member Details view

**Files:**
- Create: `apps/merchant/src/pages/staff/member-details.tsx`

**Interfaces:**
- Consumes: `MemberProfile` from `@/shared/api/mock-staff`; `Badge, Button, Input, Select` from `@ui/primitives`; `useI18n` from `@/app/providers/i18n-provider`.
- Produces: `export function MemberDetails({ profile, deactivated, onBack }: { profile: MemberProfile; deactivated: boolean; onBack: () => void }): JSX.Element` — matches the signature `staff-tab.tsx` already calls in Task 4.

- [ ] **Step 1: Write `member-details.tsx`**

Create `apps/merchant/src/pages/staff/member-details.tsx`:

```tsx
import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronLeft, Eye, EyeOff, User, Briefcase, ShieldCheck, KeyRound, Lock } from "lucide-react";
import { Badge, Button, Input, Select } from "@ui/primitives";
import type { MemberProfile } from "@/shared/api/mock-staff";
import { useI18n } from "@/app/providers/i18n-provider";

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 text-[12.5px]">
      <span className="text-[var(--octo-text-muted)]">{label}</span>
      <span className="text-end font-medium text-[var(--octo-text-primary)]">{value}</span>
    </div>
  );
}

function SummaryCard({ profile, deactivated }: { profile: MemberProfile; deactivated: boolean }) {
  const { t } = useI18n();
  const e = profile.employee;
  return (
    <div className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-[18px]">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#eaf2ff] text-[14px] font-bold text-[#0D6EFD]">
          {initials(e.name)}
        </div>
        <div>
          <h3 className="text-[15px] font-bold text-[var(--octo-text-primary)]">{e.name}</h3>
          <p className="text-[12px] text-[#0D6EFD]">{profile.jobTitle}</p>
          <Badge tone={deactivated ? "neutral" : "success"} className="mt-1">
            {deactivated ? t("staff.grid.menu.deactivate") : t("staff.member.status.active")}
          </Badge>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 border-t border-[var(--octo-divider)] pt-3">
        <Field label={t("staff.member.field.employeeId")} value={profile.employeeCode} />
        <Field label={t("staff.member.field.phone")} value={e.phone} />
        <Field label={t("staff.member.field.branch")} value={e.branch} />
        <Field label={t("staff.member.field.joined")} value={profile.activeSection.since.split(" - ")[0]} />
        <Field label={t("staff.member.field.dateOfBirth")} value="31 July 1999" />
        <Field label={t("staff.member.field.nationality")} value={profile.nationality} />
        <Field label={t("staff.member.field.language")} value={profile.languages.join(", ")} />
      </div>

      <div className="mt-3 rounded-[9px] bg-[#ecfdf3] px-3 py-2.5">
        <div className="flex items-center justify-between text-[11.5px] font-semibold text-[#16a34a]">
          <span>{t("staff.member.field.activeSections")}</span>
          <Badge tone="success">{t("staff.member.status.active")}</Badge>
        </div>
        <p className="mt-1 text-[12px] text-[var(--octo-text-primary)]">{profile.activeSection.device}</p>
        <p className="text-[11px] text-[var(--octo-text-muted)]">{profile.activeSection.location}</p>
        <p className="text-[11px] text-[var(--octo-text-muted)]">{profile.activeSection.since}</p>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  expanded,
  onToggle,
  children,
}: {
  icon: ReactNode;
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-[18px] py-[15px] text-start"
      >
        <span className="flex items-center gap-2 text-[13.5px] font-semibold text-[var(--octo-text-primary)]">
          {icon} {title}
        </span>
        <ChevronDown size={16} className={`text-[var(--octo-text-muted)] transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>
      {expanded && <div className="border-t border-[var(--octo-divider)] px-[18px] py-[15px]">{children}</div>}
    </div>
  );
}

export function MemberDetails({
  profile,
  deactivated,
  onBack,
}: {
  profile: MemberProfile;
  deactivated: boolean;
  onBack: () => void;
}) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["personal", "work"]));
  const [pinVisible, setPinVisible] = useState(false);
  const [pinCode, setPinCode] = useState(profile.pinCode);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(profile.twoFactorEnabled);
  const [allowSystemLogin, setAllowSystemLogin] = useState(profile.allowSystemLogin);
  const [allowOutsideBranch, setAllowOutsideBranch] = useState(profile.allowAccessOutsideBranch);
  const [locked, setLocked] = useState(false);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const e = profile.employee;

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={onBack}
        className="mb-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-[#0D6EFD] hover:underline"
      >
        <ChevronLeft size={14} className="rtl:rotate-180" /> {t("staff.grid.backToStaff")}
      </button>

      {locked && (
        <div className="mb-3 rounded-[9px] bg-[#fdecec] px-3 py-2 text-center text-[11.5px] font-medium text-[#dc2626]">
          {t("staff.member.status.locked")}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[320px_1fr_320px]">
        <SummaryCard profile={profile} deactivated={deactivated} />

        <div className="flex flex-col gap-3">
          <Section icon={<User size={15} />} title={t("staff.member.personalInfo")} expanded={expanded.has("personal")} onToggle={() => toggle("personal")}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input label={t("staff.member.field.firstName")} defaultValue={profile.firstName} />
              <Input label={t("staff.member.field.lastName")} defaultValue={profile.lastName} />
              <Input label={t("staff.member.field.phoneNumber")} defaultValue={e.phone} />
              <Input label={t("staff.member.field.email")} defaultValue={`${profile.firstName.toLowerCase()}.${profile.lastName.toLowerCase()}@gmail.com`} />
              <Input label={t("staff.member.field.dateOfBirth")} defaultValue="31 July 1999" />
              <Select label={t("staff.member.field.gender")} defaultValue={profile.gender}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </Select>
              <Input label={t("staff.member.field.nationality")} defaultValue={profile.nationality} />
              <Select label={t("staff.member.field.language")} defaultValue={profile.languages.join(", ")}>
                <option value={profile.languages.join(", ")}>{profile.languages.join(", ")}</option>
              </Select>
            </div>
          </Section>

          <Section icon={<Briefcase size={15} />} title={t("staff.member.workInfo")} expanded={expanded.has("work")} onToggle={() => toggle("work")}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Select label={t("staff.member.field.jobTitle")} defaultValue={profile.jobTitle}>
                <option value={profile.jobTitle}>{profile.jobTitle}</option>
              </Select>
              <Select label={t("staff.member.field.branch")} defaultValue={e.branch}>
                <option value={e.branch}>{e.branch}</option>
              </Select>
              <Select label={t("staff.member.field.department")} defaultValue={profile.department}>
                <option value={profile.department}>{profile.department}</option>
              </Select>
              <Select label={t("staff.member.field.reportsTo")} defaultValue={profile.reportsTo}>
                <option value={profile.reportsTo}>{profile.reportsTo}</option>
              </Select>
              <Input label={t("staff.member.field.hireDate")} defaultValue={e.hireDate} />
              <Select label={t("staff.member.field.employmentType")} defaultValue={profile.employmentType}>
                <option value="Full time">Full time</option>
                <option value="Part time">Part time</option>
              </Select>
              <Select label={t("staff.member.field.status")} defaultValue={deactivated ? "Inactive" : "Active"} className="sm:col-span-2">
                <option value="Active">{t("staff.member.status.active")}</option>
                <option value="Inactive">{t("staff.grid.menu.deactivate")}</option>
              </Select>
            </div>
          </Section>

          <Section icon={<ShieldCheck size={15} />} title={t("staff.member.roleAccess")} expanded={expanded.has("access")} onToggle={() => toggle("access")}>
            <div className="flex flex-col gap-3">
              <Select label={t("staff.member.field.assignedRole")} defaultValue={profile.jobTitle}>
                <option value={profile.jobTitle}>{profile.jobTitle}</option>
              </Select>
              <Select label={t("staff.member.field.accessLevel")} defaultValue={profile.accessLevel}>
                <option value={profile.accessLevel}>{profile.accessLevel}</option>
              </Select>
              <Select label={t("staff.member.field.modulesAccess")} defaultValue={profile.modulesAccess[0]}>
                <option value={profile.modulesAccess[0]}>
                  {profile.modulesAccess.slice(0, 4).join(", ")}
                  {profile.modulesAccess.length > 4 ? ` +${profile.modulesAccess.length - 4}` : ""}
                </option>
              </Select>
            </div>
          </Section>

          <Section icon={<KeyRound size={15} />} title={t("staff.member.loginSecurity")} expanded={expanded.has("login")} onToggle={() => toggle("login")}>
            <div className="flex flex-col gap-3">
              <div>
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{t("staff.member.field.pinCode")}</span>
                <div className="mt-1.5 flex items-center gap-2">
                  <Input
                    type={pinVisible ? "text" : "password"}
                    value={pinCode}
                    onChange={(ev) => setPinCode(ev.target.value)}
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => setPinVisible((v) => !v)}
                    aria-label={t("staff.member.field.pinCode")}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] text-[var(--octo-text-muted)] hover:bg-[var(--octo-hover)]"
                  >
                    {pinVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setPinCode(String(1000 + Math.floor(Math.random() * 9000)))}
                  className="mt-1.5 text-[11.5px] font-medium text-[#0D6EFD] hover:underline"
                >
                  {t("staff.member.field.resetPinCode")}
                </button>
              </div>

              <label className="flex items-center justify-between gap-2">
                <span className="text-[12.5px] font-medium text-[var(--octo-text-primary)]">{t("staff.member.field.twoFactor")}</span>
                <input
                  type="checkbox"
                  checked={twoFactorEnabled}
                  onChange={(ev) => setTwoFactorEnabled(ev.target.checked)}
                  className="h-5 w-9 cursor-pointer appearance-none rounded-full bg-[var(--octo-track)] transition-colors checked:bg-[#0D6EFD]"
                />
              </label>
              {twoFactorEnabled && (
                <Select label={t("staff.member.field.preferred2fa")} defaultValue={profile.twoFactorMethod}>
                  <option value={profile.twoFactorMethod}>{profile.twoFactorMethod}</option>
                </Select>
              )}
            </div>
          </Section>

          <Section icon={<Lock size={15} />} title={t("staff.member.accessControls")} expanded={expanded.has("controls")} onToggle={() => toggle("controls")}>
            <div className="flex flex-col gap-3">
              <label className="flex items-center justify-between gap-2">
                <span className="text-[12.5px] text-[var(--octo-text-primary)]">{t("staff.member.field.allowSystemLogin")}</span>
                <input
                  type="checkbox"
                  checked={allowSystemLogin}
                  onChange={(ev) => setAllowSystemLogin(ev.target.checked)}
                  className="h-5 w-9 cursor-pointer appearance-none rounded-full bg-[var(--octo-track)] transition-colors checked:bg-[#0D6EFD]"
                />
              </label>
              <label className="flex items-center justify-between gap-2">
                <span className="text-[12.5px] text-[var(--octo-text-primary)]">{t("staff.member.field.allowAccessOutsideBranch")}</span>
                <input
                  type="checkbox"
                  checked={allowOutsideBranch}
                  onChange={(ev) => setAllowOutsideBranch(ev.target.checked)}
                  className="h-5 w-9 cursor-pointer appearance-none rounded-full bg-[var(--octo-track)] transition-colors checked:bg-[#0D6EFD]"
                />
              </label>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12.5px] text-[var(--octo-text-primary)]">{t("staff.member.field.lockAccountPrompt")}</span>
                <Button variant="danger" size="sm" onClick={() => setLocked(true)}>
                  {t("staff.member.field.lockAccount")}
                </Button>
              </div>
            </div>
          </Section>
        </div>

        <SummaryCard profile={profile} deactivated={deactivated} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Restore Task 4's import/branch if it was commented out**

If Task 4's Step 1 note applied (temporary comment-out), uncomment the `import { MemberDetails } from "./member-details";` line and the `if (selected) { ... }` block in `staff-tab.tsx` now.

- [ ] **Step 3: Typecheck**

Run: `cd apps/merchant && npx tsc --noEmit -p .`
Expected: no errors from `staff-tab.tsx` or `member-details.tsx`.

- [ ] **Step 4: Commit**

```bash
git add apps/merchant/src/pages/staff/member-details.tsx apps/merchant/src/pages/staff/staff-tab.tsx
git commit -m "Add inline Member Details view with mock PIN/2FA/lock-account controls"
```

---

### Task 6: Build the Roles & Permissions tab

**Files:**
- Create: `apps/merchant/src/pages/staff/roles-permissions-tab.tsx`

**Interfaces:**
- Consumes: `staffRoleDefs, StaffRoleDef, RoleId, MODULES, PERMISSION_ACTIONS, PermissionAction, defaultPermissionMatrix, PermissionMatrix` from `@/shared/api/mock-staff`; `Button, Modal` from `@ui/primitives`; `RowMenu, RowMenuItem` from `./_shared/row-menu`; `useI18n` from `@/app/providers/i18n-provider`.
- Produces: `export function RolesPermissionsTab(): JSX.Element` — no props, owns its own roles list + matrix state.

- [ ] **Step 1: Write `roles-permissions-tab.tsx`**

```tsx
import { useState } from "react";
import { Crown, Plus } from "lucide-react";
import { Button, Modal } from "@ui/primitives";
import {
  staffRoleDefs,
  MODULES,
  PERMISSION_ACTIONS,
  defaultPermissionMatrix,
  type StaffRoleDef,
  type RoleId,
  type PermissionAction,
  type PermissionMatrix,
} from "@/shared/api/mock-staff";
import { useI18n } from "@/app/providers/i18n-provider";
import { RowMenu, type RowMenuItem } from "./_shared/row-menu";

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="h-5 w-9 cursor-pointer appearance-none rounded-full bg-[var(--octo-track)] transition-colors checked:bg-[#0D6EFD]"
    />
  );
}

export function RolesPermissionsTab() {
  const { t } = useI18n();
  const [roles, setRoles] = useState<StaffRoleDef[]>([...staffRoleDefs]);
  const [matrix, setMatrix] = useState<PermissionMatrix>(defaultPermissionMatrix);
  const [selectedRoleId, setSelectedRoleId] = useState<RoleId>(staffRoleDefs[0].id);
  const [openMenuId, setOpenMenuId] = useState<RoleId | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StaffRoleDef | null>(null);

  const selectedRole = roles.find((r) => r.id === selectedRoleId) ?? roles[0];
  const roleMatrix = matrix[selectedRole.id];

  const allOn = MODULES.every((m) => PERMISSION_ACTIONS.every((a) => roleMatrix[m.id][a]));

  const setAction = (moduleId: (typeof MODULES)[number]["id"], action: PermissionAction, value: boolean) => {
    setMatrix((prev) => ({
      ...prev,
      [selectedRole.id]: {
        ...prev[selectedRole.id],
        [moduleId]: { ...prev[selectedRole.id][moduleId], [action]: value },
      },
    }));
  };

  const setSelectAll = (value: boolean) => {
    setMatrix((prev) => {
      const next = { ...prev[selectedRole.id] };
      for (const m of MODULES) {
        next[m.id] = Object.fromEntries(PERMISSION_ACTIONS.map((a) => [a, value])) as Record<PermissionAction, boolean>;
      }
      return { ...prev, [selectedRole.id]: next };
    });
  };

  const menuItemsFor = (role: StaffRoleDef): RowMenuItem[] => [
    { key: "edit", label: t("staff.roles.menu.edit"), onSelect: () => setSelectedRoleId(role.id) },
    {
      key: "duplicate",
      label: t("staff.roles.menu.duplicate"),
      onSelect: () => {
        const copyId = `${role.id}-copy-${roles.length}` as RoleId;
        setRoles((prev) => [...prev, { ...role, id: copyId, name: `${role.name} (Copy)`, isSystemRole: false }]);
        setMatrix((prev) => ({ ...prev, [copyId]: prev[role.id] }));
      },
    },
    { key: "assign-users", label: t("staff.roles.menu.assignUsers"), onSelect: () => setSelectedRoleId(role.id) },
    { key: "deactivate", label: t("staff.roles.menu.deactivate"), tone: "warning", onSelect: () => {} },
    { key: "delete", label: t("staff.roles.menu.delete"), tone: "danger", onSelect: () => setDeleteTarget(role) },
  ];

  return (
    <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[320px_1fr]">
      <div className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-[18px]">
        <h2 className="text-[13.5px] font-bold text-[var(--octo-text-primary)]">{t("staff.roles.heading")}</h2>
        <p className="mt-1 text-[11.5px] text-[var(--octo-text-muted)]">{t("staff.roles.subheading")}</p>
        <Button variant="primary" size="sm" icon={<Plus size={14} />} className="mt-3 w-full justify-center">
          {t("staff.roles.addRole")}
        </Button>

        <div className="mt-3 flex flex-col gap-2">
          {roles.map((role) => (
            <button
              key={role.id}
              type="button"
              onClick={() => setSelectedRoleId(role.id)}
              className={`flex items-center justify-between gap-2 rounded-[10px] border px-3 py-2.5 text-start transition-colors ${
                role.id === selectedRole.id
                  ? "border-[#0D6EFD] bg-[#eaf2ff]"
                  : "border-[var(--octo-border-card)] hover:bg-[var(--octo-hover)]"
              }`}
            >
              <span className="flex min-w-0 items-center gap-2">
                {role.isSystemRole ? <Crown size={16} className="shrink-0 text-[#0D6EFD]" /> : <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[var(--octo-track)]" />}
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 truncate text-[12.5px] font-semibold text-[var(--octo-text-primary)]">
                    {role.name}
                    {role.isSystemRole && (
                      <span className="rounded-full bg-[#eaf2ff] px-1.5 py-0.5 text-[9.5px] font-medium text-[#0D6EFD]">{t("staff.roles.systemRole")}</span>
                    )}
                  </span>
                  <span className="block truncate text-[11px] text-[var(--octo-text-muted)]">{role.description}</span>
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                <span className="text-[11px] text-[var(--octo-text-faint)]">{role.memberCount}</span>
                {!role.isSystemRole && (
                  <RowMenu
                    items={menuItemsFor(role)}
                    open={openMenuId === role.id}
                    onOpenChange={(open) => setOpenMenuId(open ? role.id : null)}
                    ariaLabel={role.name}
                  />
                )}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-[18px]">
        <h2 className="text-[13.5px] font-bold text-[var(--octo-text-primary)]">{t("staff.permissions.matrixHeading")}</h2>
        <p className="mt-1 text-[11.5px] text-[var(--octo-text-muted)]">{t("staff.permissions.matrixSubheading")}</p>

        <div className="octo-scroll mt-3 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-[var(--octo-divider)]">
                <th className="px-2 py-2 text-start">
                  <span className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                    {t("staff.permissions.column.module")}
                    <Toggle checked={allOn} onChange={setSelectAll} />
                    <span>{t("staff.permissions.selectAll")}</span>
                  </span>
                </th>
                {PERMISSION_ACTIONS.map((action) => (
                  <th key={action} className="px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                    {t(`staff.permissions.column.${action}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODULES.map((mod) => (
                <tr key={mod.id} className="border-b border-[var(--octo-row-border)] last:border-0">
                  <td className="whitespace-nowrap px-2 py-2.5 font-medium text-[var(--octo-text-primary)]">{mod.label}</td>
                  {PERMISSION_ACTIONS.map((action) => (
                    <td key={action} className="px-2 py-2.5">
                      <Toggle checked={roleMatrix[mod.id][action]} onChange={(v) => setAction(mod.id, action, v)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={t("staff.roles.deleteConfirmTitle")}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(null)}>{t("common.cancel")}</Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (deleteTarget) setRoles((prev) => prev.filter((r) => r.id !== deleteTarget.id));
                setDeleteTarget(null);
              }}
            >
              {t("staff.roles.menu.delete")}
            </Button>
          </>
        }
      >
        <p className="text-[12.5px] text-[var(--octo-text-secondary)]">
          {t("staff.roles.deleteConfirmBody").replace("{name}", deleteTarget?.name ?? "")}
        </p>
      </Modal>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/merchant && npx tsc --noEmit -p .`
Expected: no errors from `roles-permissions-tab.tsx`.

- [ ] **Step 3: Commit**

```bash
git add apps/merchant/src/pages/staff/roles-permissions-tab.tsx
git commit -m "Add Roles & Permissions tab with role list and toggleable permission matrix"
```

---

### Task 7: Build the Shifts tab

**Files:**
- Create: `apps/merchant/src/pages/staff/shifts-tab.tsx`

**Interfaces:**
- Consumes: `scheduleStaff, scheduleShifts, getWeekStart, TODAY, SHIFT_PILL_COLORS, type ScheduleShift` from `@/shared/api/mock-staff`; `Button, EmptyState, Segmented` from `@ui/primitives`; `StatCard` from `@/widgets/sales-summary-chart`; `useI18n` from `@/app/providers/i18n-provider`.
- Produces: `export function ShiftsTab(): JSX.Element` — no props.

- [ ] **Step 1: Write `shifts-tab.tsx`**

```tsx
import { useMemo, useState } from "react";
import { Calendar, CalendarClock, Clock, Users, Wallet } from "lucide-react";
import { Button, EmptyState, Segmented } from "@ui/primitives";
import { scheduleStaff, scheduleShifts, getWeekStart, TODAY, SHIFT_PILL_COLORS, type ScheduleShift } from "@/shared/api/mock-staff";
import { useI18n } from "@/app/providers/i18n-provider";

const SUBNAV = ["schedule", "templates", "shiftRoles", "timeOff", "availability"] as const;
type SubnavId = (typeof SUBNAV)[number];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}
function formatShiftTime(shift: ScheduleShift): string {
  return `${shift.start}–${shift.end}`;
}

export function ShiftsTab() {
  const { t } = useI18n();
  const [subnav, setSubnav] = useState<SubnavId>("schedule");
  const [range, setRange] = useState<"week" | "month">("week");
  const weekStart = useMemo(() => getWeekStart(new Date(TODAY)), []);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const shiftsByEmployeeAndDate = useMemo(() => {
    const map = new Map<string, ScheduleShift>();
    for (const s of scheduleShifts) map.set(`${s.employeeId}|${s.date}`, s);
    return map;
  }, []);

  const totalHours = scheduleStaff.reduce((sum, e) => sum + e.hoursThisWeek, 0);

  return (
    <div className="mt-4">
      <div role="tablist" className="flex flex-wrap items-center gap-4 border-b border-[var(--octo-divider)] pb-2 text-[12.5px]">
        {SUBNAV.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={subnav === id}
            onClick={() => setSubnav(id)}
            className={`-mb-[9px] border-b-2 pb-2 font-medium transition-colors ${
              subnav === id ? "border-[#0D6EFD] text-[var(--octo-text-primary)]" : "border-transparent text-[var(--octo-text-muted)] hover:text-[var(--octo-text-primary)]"
            }`}
          >
            {t(`staff.shiftsTab.subnav.${id}`)}
          </button>
        ))}
      </div>

      {subnav !== "schedule" ? (
        <EmptyState
          className="mt-6"
          icon={<Calendar size={18} />}
          title={t("staff.shiftsTab.comingSoon")}
          description={t("staff.shiftsTab.comingSoonDescription")}
        />
      ) : (
        <>
          <div className="mt-4 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
            <p className="text-[13px] font-bold text-[var(--octo-text-primary)]">{t("staff.shiftsTab.weeklySummary")}</p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {[
                { icon: <Clock size={15} />, label: t("staff.shiftsTab.totalHours"), value: `${totalHours}hr`, bg: "bg-[#eaf2ff] text-[#0D6EFD]" },
                { icon: <Users size={15} />, label: t("staff.shiftsTab.totalEmployees"), value: String(scheduleStaff.length), bg: "bg-[#f3e8ff] text-[#9333ea]" },
                { icon: <CalendarClock size={15} />, label: t("staff.shiftsTab.overtime"), value: "12hr", bg: "bg-[#fce7f3] text-[#db2777]" },
                { icon: <Calendar size={15} />, label: t("staff.shiftsTab.openShift"), value: "5", bg: "bg-[#fef3c7] text-[#b45309]" },
                { icon: <Wallet size={15} />, label: t("staff.shiftsTab.estLaborCost"), value: "SAR12.500", bg: "bg-[#dcfce7] text-[#15803d]" },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center gap-2.5 rounded-[10px] border border-[var(--octo-border-card)] px-3 py-2.5">
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-[8px] ${stat.bg}`}>{stat.icon}</span>
                  <span>
                    <span className="block text-[14px] font-bold leading-tight text-[var(--octo-text-primary)]">{stat.value}</span>
                    <span className="block text-[10.5px] text-[var(--octo-text-muted)]">{stat.label}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Segmented
              options={[{ id: "week", label: t("staff.shiftsTab.week") }, { id: "month", label: t("staff.shiftsTab.month") }]}
              value={range}
              onChange={(id) => setRange(id as "week" | "month")}
            />
            <span className="text-[12px] font-medium text-[var(--octo-text-primary)]">{toISO(weekStart)}</span>
            <Button variant="secondary" size="sm" className="ms-auto">{t("staff.shiftsTab.bulkActions")}</Button>
            <Button variant="secondary" size="sm">{t("staff.shiftsTab.sendViaWhatsApp")}</Button>
            <Button variant="secondary" size="sm">{t("staff.shiftsTab.print")}</Button>
            <Button variant="primary" size="sm">{t("staff.shiftsTab.exportPdf")}</Button>
          </div>

          <div className="octo-scroll mt-3 overflow-x-auto rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)]">
            <table className="w-full min-w-[900px] border-collapse text-[12.5px]">
              <thead>
                <tr className="border-b border-[var(--octo-divider)]">
                  <th className="px-3 py-2.5 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                    {t("staff.shiftsTab.allEmployees")}
                  </th>
                  {days.map((d, i) => (
                    <th key={toISO(d)} className="px-3 py-2.5 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                      {DAY_LABELS[i]} {d.getDate()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scheduleStaff.map((emp, empIndex) => {
                  const color = SHIFT_PILL_COLORS[empIndex % SHIFT_PILL_COLORS.length];
                  return (
                    <tr key={emp.id} className="border-b border-[var(--octo-row-border)] last:border-0">
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <div className="font-semibold text-[var(--octo-text-primary)]">{emp.name}</div>
                        <div className="text-[11px] text-[var(--octo-text-muted)]">{emp.role === "Branch Manager" ? "Restaurant Manager" : emp.role}</div>
                        <div className="text-[10.5px] text-[var(--octo-text-faint)]">{emp.hoursThisWeek}h/ 40h</div>
                      </td>
                      {days.map((d) => {
                        const shift = shiftsByEmployeeAndDate.get(`${emp.id}|${toISO(d)}`);
                        return (
                          <td key={toISO(d)} className="px-3 py-2.5">
                            {shift ? (
                              <span
                                className="inline-flex rounded-[7px] border px-2.5 py-1.5 text-[11px] font-medium"
                                style={{ borderColor: color, color }}
                              >
                                {formatShiftTime(shift)}
                              </span>
                            ) : (
                              <span className="inline-flex rounded-[7px] border border-dashed border-[var(--octo-border-input)] px-2.5 py-1.5 text-[11px] text-[var(--octo-text-faint)]">
                                {t("staff.shiftsTab.off")}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/merchant && npx tsc --noEmit -p .`
Expected: no errors from `shifts-tab.tsx`.

- [ ] **Step 3: Commit**

```bash
git add apps/merchant/src/pages/staff/shifts-tab.tsx
git commit -m "Add Shifts tab with weekly summary stats and colored per-employee shift grid"
```

---

### Task 8: Wire the tab shell into `/staff` and drop the old default page

**Files:**
- Modify: `apps/merchant/src/pages/staff/index.tsx`

**Interfaces:**
- Consumes: `Tabs` from `@ui/primitives`; `Button` from `@ui/primitives`; `Plus` icon from `lucide-react`; `StaffTab` from `./staff-tab`; `RolesPermissionsTab` from `./roles-permissions-tab`; `ShiftsTab` from `./shifts-tab`; `useI18n` from `@/app/providers/i18n-provider`.
- Produces: `export function StaffPage(): JSX.Element` — same export name `apps/merchant/src/app/routes/registry.tsx` already imports (`m.StaffPage`), so no registry change is needed.

- [ ] **Step 1: Replace the contents of `apps/merchant/src/pages/staff/index.tsx`**

```tsx
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button, Tabs } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { StaffTab } from "./staff-tab";
import { RolesPermissionsTab } from "./roles-permissions-tab";
import { ShiftsTab } from "./shifts-tab";

type TabId = "staff" | "roles" | "shifts";

export function StaffPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<TabId>("staff");

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("staff.header.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">{t("staff.header.subtitle")}</p>
        </div>
        {tab === "staff" && (
          <Button variant="primary" icon={<Plus size={15} />}>
            {t("staff.header.addNewMember")}
          </Button>
        )}
      </header>

      <Tabs
        className="mt-4"
        value={tab}
        onChange={(id) => setTab(id as TabId)}
        items={[
          { id: "staff", label: t("staff.tabs.staff") },
          { id: "roles", label: t("staff.tabs.rolesPermissions") },
          { id: "shifts", label: t("staff.tabs.shifts") },
        ]}
      />

      {tab === "staff" && <StaffTab />}
      {tab === "roles" && <RolesPermissionsTab />}
      {tab === "shifts" && <ShiftsTab />}
    </div>
  );
}
```

This fully replaces the previous file contents (the `// The registry still routes bare "/staff" ...` re-export comment and `export { StaffEmployeesPage as StaffPage } from "./employees";` line are removed).

- [ ] **Step 2: Confirm nothing else imports the old re-export**

Run: `cd apps/merchant && grep -rn "from \"@/pages/staff\"" src --include="*.tsx" --include="*.ts"` (or the PowerShell equivalent `Select-String -Path src -Pattern 'from "@/pages/staff"' -Recurse`)
Expected: only `apps/merchant/src/app/routes/registry.tsx` matches (it imports `m.StaffPage`, which still exists under the new implementation). If any other file imports `StaffPage` from `@/pages/staff` expecting the old table, no action needed — the export name and default tab content are compatible (Staff tab is the default view).

- [ ] **Step 3: Typecheck the whole app**

Run: `cd apps/merchant && npx tsc --noEmit -p .`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/merchant/src/pages/staff/index.tsx
git commit -m "Wire Staff/Roles & Permissions/Shifts tabs into the /staff page shell"
```

---

### Task 9: Manual verification against the mockups

**Files:** none (verification only).

- [ ] **Step 1: Launch the merchant app**

Use the `run` skill (or, if no project-specific run skill is found for `apps/merchant`, `cd apps/merchant && npm run dev`) and open the app in a browser.

- [ ] **Step 2: Navigate to `/staff` and screenshot the Staff tab**

Compare against `apps/assets/Staff/Staff Desing/staff.png`: card grid, search/filter row, "+ Add New Member" button, tab bar with Staff/Roles& Permissions/Shifts.

- [ ] **Step 3: Open a member's kebab menu and screenshot**

Compare against `apps/assets/Staff/Staff Desing/staff-actions.png`: Edit / Assign /Change Role / Deactivate (amber) / Delete (red) items.

- [ ] **Step 4: Click a card and screenshot the Member Details view**

Compare against `apps/assets/Staff/Staff Desing/member details.png` and `member details More.png`: 3-column layout, collapsible sections, PIN show/hide, 2FA toggle, Lock Account button.

- [ ] **Step 5: Switch to the Roles & Permissions tab and screenshot**

Compare against `apps/assets/Staff/Staff Desing/staff- permissions.png` and `staff- permissions actions.png`: roles list with Owner's "System Role" badge, permission matrix with per-module toggle rows and a working Select All, role kebab menu.

- [ ] **Step 6: Switch to the Shifts tab and screenshot**

Compare against `apps/assets/Staff/Staff Desing/staff- shift schedule.png`: sub-nav row, Weekly Summary stat tiles, Week/Month segmented control, colored per-employee shift pills across the 7-day grid, OFF cells for days without a shift.

- [ ] **Step 7: Fix any visual gaps found, then re-screenshot until each tab matches its mockup**

No fixed step count here — iterate: adjust the relevant tab's `.tsx` file, re-check in the browser, repeat until satisfied. Commit any fixes as `git commit -m "Fix Staff module visuals to match mockups"` once done.

---

## Self-Review Notes

- **Spec coverage:** Page shell + 3 tabs (Task 8, 4, 6, 7) ✓; extended `Employee` data via `MemberProfile` + Roles/permission matrix (Task 1) ✓; i18n keys en/ar mirrored (Task 2) ✓; inline (non-drawer) Member Details with collapsible sections and mock PIN/2FA/Lock Account (Task 5) ✓; Roles & Permissions role CRUD + matrix (Task 6) ✓; Shifts tab visual rebuild reusing schedule mock data, sub-nav placeholder tabs (Task 7) ✓; existing `/staff/schedule` etc. routes untouched (no task modifies them) ✓; manual screenshot verification (Task 9) ✓.
- **Type consistency:** `MemberProfile`/`toMemberProfile` (Task 1) used identically in `staff-tab.tsx` (Task 4) and `member-details.tsx` (Task 5). `StaffRoleDef`/`RoleId`/`PermissionMatrix`/`MODULES`/`PERMISSION_ACTIONS` (Task 1) used identically in `roles-permissions-tab.tsx` (Task 6). `scheduleStaff`/`scheduleShifts`/`getWeekStart`/`SHIFT_PILL_COLORS` (Task 1, extending existing exports) used identically in `shifts-tab.tsx` (Task 7). `StaffPage` export name unchanged (Task 8), matching the existing `registry.tsx` import.
- **No placeholders:** all steps contain full component code; the one deliberately deferred item (Templates/Shift Roles/Time Off/Availability sub-tabs) is explicitly scoped out in the spec and rendered as a real `EmptyState`, not a TODO comment.
