"use strict";
const { R, F, err, T_OK, T_CREATED, T_NO_CONTENT, T_LIST } = require("./lib");

// Shapes mirror apps/merchant/src/shared/api/mock-staff.ts — the Staff module
// (Team Members, Leave Requests, Schedule & Shifts, Roles & Permissions) has
// no backend yet; every screen renders this mock. This is the proposed
// contract, not a confirmed one — flip 🔴 to 🟡 once the API team signs off.

const BRANCHES = ["Riyadh - Olaya", "Riyadh - Narjis", "Jeddah - Corniche", "Dammam - Corniche", "Khobar - Rakah"];
const STAFF_ROLES = ["Owner", "Branch Manager", "Cashier", "Waiter", "Kitchen", "Driver"];

const EMPLOYEE = {
  id: "EMP-007",
  name: "Sara Al-Qahtani",
  nameAr: "سارة القحطاني",
  phone: "+966 50 111 2207",
  role: "Cashier",
  branch: "Riyadh - Olaya",
  status: "On Shift",
  todayShift: "14:00 – 22:00",
  hoursThisWeek: 38,
  attendance: 95,
  hireDate: "2022-02-01",
  iqamaExpiry: "2027-07-21",
  contractType: "Full-time",
  salaryBandMin: 2000,
  salaryBandMax: 2500,
  emergencyContactName: "Aisha Al-Qahtani",
  emergencyContactPhone: "+966 55 222 3307",
  documents: [
    { name: "HR File", type: "PDF" },
    { name: "Employment Contract", type: "PDF" },
    { name: "Iqama Copy", type: "Image" },
  ],
};

const MEMBER_PROFILE = {
  employee: EMPLOYEE,
  employeeCode: "EMP-007",
  firstName: "Sara",
  lastName: "Al-Qahtani",
  email: "sara.alqahtani@gmail.com",
  dateOfBirth: "1994-03-18",
  gender: "Female",
  nationality: "Saudi Arabia",
  languages: "English, Arabic",
  jobTitle: "Cashier",
  department: "Front of House",
  reportsTo: "Faisal Al-Otaibi",
  employmentType: "Full time",
  assignedRole: "cashier",
  accessLevel: "Limited access",
  modulesAccess: ["orders", "paymentRefund", "menuPos"],
  loginMethod: "PIN",
  pinCode: "4821",
  twoFactorEnabled: false,
  twoFactorMethod: "Authenticator App",
  allowSystemLogin: true,
  allowAccessOutsideBranch: false,
  locked: false,
  lastAccess: "2026-08-09T09:15",
  activeSection: { device: "POS Terminal", location: "Riyadh - Olaya", since: "2026-08-09T09:15" },
};

const LEAVE_TYPES = ["Annual", "Sick", "Personal", "Maternity", "Paternity", "Bereavement", "Emergency", "Unpaid"];

const LEAVE_REQUEST = {
  id: "LR-201",
  employee: "Noura Al-Dosari",
  employeeId: "EMP-014",
  type: "Annual",
  startDate: "2026-08-12",
  endDate: "2026-08-18",
  status: "Pending",
  note: "",
};

const SHIFT_TYPES = ["Morning", "Evening", "Night"];

const SCHEDULE_SHIFT = {
  id: "SH-EMP-007-2026-08-09",
  employeeId: "EMP-007",
  date: "2026-08-09",
  type: "Evening",
  start: "14:00",
  end: "22:00",
  breakMinutes: 30,
  role: "Cashier",
  notes: "",
};

const MODULES = [
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

const PERMISSION_ACTIONS = ["view", "create", "edit", "delete", "approve", "export", "setting"];

const FULL_PERMS = { view: true, create: true, edit: true, delete: true, approve: true, export: true, setting: true };
const NONE_PERMS = { view: false, create: false, edit: false, delete: false, approve: false, export: false, setting: false };

const ROLE_DEF = { id: "cashier", name: "Cashier", description: "Handle billing & Payment", isSystemRole: false, memberCount: 2 };

const ROLE_PERMISSIONS_ROW = {
  roleId: "cashier",
  permissions: {
    dashboard: NONE_PERMS,
    reservations: NONE_PERMS,
    waitlist: NONE_PERMS,
    floorPlan: NONE_PERMS,
    orders: FULL_PERMS,
    paymentRefund: FULL_PERMS,
    menuPos: { ...NONE_PERMS, view: true },
    inventory: NONE_PERMS,
    reports: NONE_PERMS,
    customerCrm: { ...NONE_PERMS, view: true },
    staffManagement: NONE_PERMS,
    settingIntegrations: NONE_PERMS,
  },
};

const SHIFT_ROLE = {
  id: "SR-01",
  name: "Opening Cashier",
  startTime: "08:00",
  endTime: "16:00",
  workingDays: ["Sun", "Mon", "Tue", "Wed", "Thu"],
  active: true,
};

const M = "/api/v1/staff/members";
const L = "/api/v1/staff/leave-requests";
const S = "/api/v1/staff/schedule";
const RL = "/api/v1/staff/roles";
const SR = "/api/v1/staff/shift-roles";

const staff = F(
  "05 · Staff",
  "The Staff module (`pages/staff`) — team members, leave, the weekly schedule and roles & permissions. **Not built against a real API yet** — every screen here renders `shared/api/mock-staff.ts`, so this folder is a *proposed* contract, not a confirmed one (see the 🔴 status on each request).\n\n| Folder | Screen |\n|---|---|\n| **5.1 · Team members** | Staff list + member profile drawer |\n| **5.2 · Leave requests** | Leave requests tab |\n| **5.3 · Schedule & shifts** | Weekly shift grid |\n| **5.4 · Roles & permissions** | Roles list + permission matrix |\n\n**Shape source:** `apps/merchant/src/shared/api/mock-staff.ts`.",
  [
    F(
      "5.1 · Team members",
      "Screen: `pages/staff` (list) + the member profile drawer.",
      [
        R("List team members", "GET", M, {
          status: "stub",
          desc: "All staff, across branches. `role` in " + STAFF_ROLES.join("/") + "; `status` in On Shift/Off Duty/On Leave/Absent.",
          screen: "pages/staff (team list)",
          source: "shared/api/mock-staff.ts — Employee",
          query: [
            { key: "branchId", value: "{{branchId}}", desc: "Filter to one branch.", on: false },
            { key: "role", value: "Cashier", desc: "Filter by role.", on: false },
            { key: "status", value: "On Shift", desc: "Filter by shift status.", on: false },
            { key: "search", value: "sara", desc: "Match name, name (Arabic) or phone.", on: false },
            { key: "page", value: "1" },
            { key: "pageSize", value: "25" },
          ],
          tests: T_LIST,
          examples: [{ name: "Success", body: { data: [EMPLOYEE], meta: { page: 1, pageSize: 25, total: 30 } } }],
        }),
        R("Invite team member", "POST", M, {
          status: "stub",
          desc: "Creates the staff record and (if `email` is set) sends an invite to set a password / PIN.",
          screen: "pages/staff → Add member",
          rules: [
            "`phone` unique per tenant.",
            "`salaryBandMin` ≤ `salaryBandMax`, both ≥ 0.",
            "`role: \"Owner\"` cannot be assigned here — the tenant has exactly one owner, set at signup.",
          ],
          saves: { staffMemberId: ".data.id" },
          body: {
            name: "Sara Al-Qahtani", nameAr: "سارة القحطاني", phone: "+966 50 111 2207", email: "sara.alqahtani@gmail.com",
            role: "Cashier", branch: "Riyadh - Olaya", contractType: "Full-time",
            salaryBandMin: 2000, salaryBandMax: 2500,
            emergencyContactName: "Aisha Al-Qahtani", emergencyContactPhone: "+966 55 222 3307",
          },
          tests: T_CREATED,
          examples: [
            { name: "Created", code: 201, body: { data: EMPLOYEE } },
            err("Phone already in use", 409, "phone_taken", "A staff member with this phone number already exists."),
            err("Bad salary band", 422, "validation_error", "Check the highlighted fields.", { salaryBandMax: "must be ≥ salaryBandMin" }),
          ],
        }),
        R("Get member profile", "GET", `${M}/:staffMemberId`, {
          status: "stub",
          desc: "The full profile drawer: personal info, employment, role & module access, login & security.",
          screen: "pages/staff → member profile drawer",
          source: "shared/api/mock-staff.ts — MemberProfile",
          tests: T_OK,
          examples: [{ name: "Success", body: { data: MEMBER_PROFILE } }, err("Not found", 404, "not_found", "Staff member not found.")],
        }),
        R("Update member profile", "PATCH", `${M}/:staffMemberId`, {
          status: "stub",
          desc: "Partial update — send only changed fields. Covers personal info, employment, assigned role, module access and login settings.",
          screen: "pages/staff → member profile drawer → Save",
          rules: [
            "Changing `assignedRole` resets `modulesAccess` to that role's default matrix unless `modulesAccess` is also sent.",
            "`pinCode` must be 4 digits, unique per branch.",
          ],
          body: { jobTitle: "Cashier", department: "Front of House", assignedRole: "cashier", allowAccessOutsideBranch: false },
          tests: T_OK,
          examples: [{ name: "Updated", body: { data: MEMBER_PROFILE } }],
        }),
        R("Lock / unlock login", "PATCH", `${M}/:staffMemberId/lock`, {
          status: "stub",
          desc: "Toggles `locked`. A locked member keeps their record but cannot sign in to POS or the console.",
          screen: "pages/staff → member profile drawer → Login & Security",
          body: { locked: true },
          tests: T_OK,
          examples: [{ name: "Locked", body: { data: { staffMemberId: "EMP-007", locked: true } } }],
        }),
        R("Reset PIN", "POST", `${M}/:staffMemberId/reset-pin`, {
          status: "stub",
          desc: "Issues a new 4-digit PIN and invalidates the old one immediately.",
          screen: "pages/staff → member profile drawer → Login & Security → Reset PIN",
          tests: T_OK,
          examples: [{ name: "Reset", body: { data: { pinCode: "7042" } } }],
        }),
        R("Send password reset email", "POST", `${M}/:staffMemberId/reset-password`, {
          status: "stub",
          desc: "Emails a reset link to the member. Only offered when `loginMethod` is Password or Both — shown next to *Reset PIN* in the profile drawer's Login & Security section.",
          screen: "pages/staff → member profile drawer → Login & Security → Send password reset",
          rules: ["404/422 if the member has no `email` on file — password login needs one."],
          tests: T_OK,
          examples: [
            { name: "Sent", body: { data: { staffMemberId: "EMP-007", emailSentTo: "sara.alqahtani@gmail.com" } } },
            err("No email on file", 422, "no_email", "Add an email address before sending a password reset."),
          ],
        }),
        R("Remove team member", "DELETE", `${M}/:staffMemberId`, {
          status: "stub",
          desc: "Soft-deletes the staff record. Future/open shifts and pending leave requests for this member must be handled first.",
          screen: "pages/staff → member row → Remove",
          rules: ["409 if the member has any shift dated today or later that is not cancelled."],
          tests: T_NO_CONTENT,
          examples: [
            { name: "Removed", code: 204 },
            err("Has upcoming shifts", 409, "has_upcoming_shifts", "Reassign or cancel this member's upcoming shifts first.", { shiftIds: ["SH-EMP-007-2026-08-11"] }),
          ],
        }),
      ]
    ),
    F(
      "5.2 · Leave requests",
      "Screen: `pages/staff` → Leave Requests tab.",
      [
        R("List leave requests", "GET", L, {
          status: "stub",
          desc: "`type` in " + LEAVE_TYPES.join("/") + "; `status` in Pending/Approved/Rejected.",
          source: "shared/api/mock-staff.ts — LeaveRequestRow",
          query: [
            { key: "status", value: "Pending", desc: "Filter by status.", on: false },
            { key: "employeeId", value: "{{staffMemberId}}", desc: "One member's history.", on: false },
            { key: "page", value: "1" },
            { key: "pageSize", value: "25" },
          ],
          tests: T_LIST,
          examples: [{ name: "Success", body: { data: [LEAVE_REQUEST], meta: { page: 1, pageSize: 25, total: 8 } } }],
        }),
        R("Create leave request", "POST", L, {
          status: "stub",
          desc: "Raised on behalf of a staff member (self-service portal is out of scope here).",
          rules: ["`endDate` ≥ `startDate`.", "Overlapping Approved leave for the same `employeeId` → 409."],
          saves: { leaveRequestId: ".data.id" },
          body: { employeeId: "EMP-014", type: "Annual", startDate: "2026-08-12", endDate: "2026-08-18", note: "" },
          tests: T_CREATED,
          examples: [
            { name: "Created", code: 201, body: { data: LEAVE_REQUEST } },
            err("Overlaps existing leave", 409, "leave_overlap", "This member already has approved leave in that range."),
          ],
        }),
        R("Approve / reject leave request", "PATCH", `${L}/:leaveRequestId`, {
          status: "stub",
          desc: "Sets `status`. Approving a request that overlaps a scheduled shift does not auto-cancel the shift — the manager reassigns it separately.",
          screen: "pages/staff → Leave Requests → row actions",
          body: { status: "Approved" },
          tests: T_OK,
          examples: [
            { name: "Approved", body: { data: { ...LEAVE_REQUEST, status: "Approved" } } },
            err("Already decided", 409, "already_decided", "This request was already approved or rejected."),
          ],
        }),
      ]
    ),
    F(
      "5.3 · Schedule & shifts",
      "Screen: `pages/staff` → Schedule tab (Sunday-start weekly grid).",
      [
        R("Get week schedule", "GET", S, {
          status: "stub",
          desc: "All shifts for the Sun–Sat week containing `weekStart`. Owners are never scheduled.",
          source: "shared/api/mock-staff.ts — ScheduleShift",
          query: [
            { key: "weekStart", value: "2026-08-09", desc: "Any ISO date in the target week.", on: true },
            { key: "branchId", value: "{{branchId}}", desc: "Filter to one branch.", on: false },
          ],
          tests: T_LIST,
          examples: [{ name: "Success", body: { data: [SCHEDULE_SHIFT], meta: { page: 1, pageSize: 200, total: 42 } } }],
        }),
        R("Create shift", "POST", `${S}/shifts`, {
          status: "stub",
          desc: "`type` in " + SHIFT_TYPES.join("/") + " drives the default `start`/`end`; both may be overridden.",
          rules: [
            "A member cannot have two shifts on the same `date`.",
            "Warn (not block) client-side past 48h/week — the API returns the created shift plus `weeklyHours` so the grid can flag it.",
          ],
          saves: { shiftId: ".data.id" },
          body: { employeeId: "EMP-007", date: "2026-08-09", type: "Evening", start: "14:00", end: "22:00", breakMinutes: 30, notes: "" },
          tests: T_CREATED,
          examples: [
            { name: "Created", code: 201, body: { data: SCHEDULE_SHIFT, weeklyHours: 38 } },
            err("Double-booked", 409, "shift_conflict", "This member already has a shift on this date.", { shiftId: "SH-EMP-007-2026-08-09" }),
          ],
        }),
        R("Update shift", "PATCH", `${S}/shifts/:shiftId`, {
          status: "stub",
          desc: "Move, retime or reassign a shift (drag-and-drop / edit panel in the grid).",
          body: { start: "12:00", end: "20:00", notes: "Covering for EMP-013" },
          tests: T_OK,
          examples: [{ name: "Updated", body: { data: SCHEDULE_SHIFT } }],
        }),
        R("Delete shift", "DELETE", `${S}/shifts/:shiftId`, {
          status: "stub",
          desc: "Removes one shift from the grid.",
          tests: T_NO_CONTENT,
          examples: [{ name: "Deleted", code: 204 }],
        }),
        R("Bulk assign shifts", "POST", `${S}/shifts/bulk`, {
          status: "stub",
          desc: "The *Bulk Assign Shift* mode of the Assign Shift modal — one or more employees × one or more dates, same shift type/time for all of them.",
          screen: "pages/staff → Shifts → Schedule → Assign Shift (bulk mode) / row menu → Apply to multiple days",
          rules: [
            "Same conflict rule as a single create: any (employeeId, date) pair that already has a shift is skipped and reported, not overwritten.",
          ],
          body: { employeeIds: ["EMP-007", "EMP-009"], dates: ["2026-08-09", "2026-08-10", "2026-08-11"], type: "Evening", start: "14:00", end: "22:00", breakMinutes: 30 },
          tests: T_CREATED,
          examples: [{ name: "Created", code: 201, body: { data: { created: 5, skipped: [{ employeeId: "EMP-007", date: "2026-08-10", reason: "shift_conflict" }] } } }],
        }),
        R("Copy week forward", "POST", `${S}/copy-week`, {
          status: "stub",
          desc: "Row menu → *Copy this week forward*. Duplicates one employee's shifts from `fromWeekStart` onto the week starting `toWeekStart` (default: the following week).",
          rules: ["Dates in the target week that already have a shift for this employee are skipped, not overwritten."],
          body: { employeeId: "EMP-007", fromWeekStart: "2026-08-09", toWeekStart: "2026-08-16" },
          tests: T_OK,
          examples: [{ name: "Copied", body: { data: { copied: 6, skipped: [] } } }],
        }),
        R("Delete employee's week", "DELETE", `${S}/week`, {
          status: "stub",
          desc: "Row menu → *Delete this week*. Clears every shift for one employee within one week — distinct from deleting a single shift.",
          query: [
            { key: "employeeId", value: "EMP-007", on: true },
            { key: "weekStart", value: "2026-08-09", on: true },
          ],
          tests: T_OK,
          examples: [{ name: "Cleared", body: { data: { deleted: 6 } } }],
        }),
        R("Notify staff via WhatsApp", "POST", `${S}/notify-whatsapp`, {
          status: "stub",
          desc: "Today the *Send via WhatsApp* button only opens a `wa.me` deep link built client-side — no server call. This is a placeholder for if/when that becomes a real server-sent notification instead of a manual deep link.",
          screen: "pages/staff → Shifts → Schedule → Send via WhatsApp",
          body: { weekStart: "2026-08-09", employeeIds: ["EMP-007"], message: "Your schedule for this week is ready." },
          tests: T_OK,
          examples: [{ name: "Sent", body: { data: { notified: 1 } } }],
        }),
        R("Export schedule (PDF)", "GET", `${S}/export`, {
          status: "stub",
          desc: "Today *Export PDF*/*Print* just opens the browser print dialog on the rendered grid — no server call. This is a placeholder for a server-generated PDF instead.",
          screen: "pages/staff → Shifts → Schedule → Export PDF",
          query: [
            { key: "weekStart", value: "2026-08-09", on: true },
            { key: "branchId", value: "{{branchId}}", on: false },
          ],
          tests: T_OK,
          examples: [{ name: "Success", body: { data: { url: "https://cdn.octopus.sa/t/ocean-view/exports/schedule-2026-08-09.pdf" } } }],
        }),
        R("Publish week", "POST", `${S}/publish`, {
          status: "stub",
          desc: "🔎 No button currently calls this in `pages/staff` — kept here as a proposal in case a *Publish schedule* action is added later. Locks the week's draft shifts and notifies affected staff.",
          body: { weekStart: "2026-08-09", branchId: "{{branchId}}" },
          tests: T_OK,
          examples: [{ name: "Published", body: { data: { weekStart: "2026-08-09", shiftsPublished: 42, notified: 29 } } }],
        }),
      ]
    ),
    F(
      "5.5 · Shift roles",
      "Screen: `pages/staff` → Shifts → Shift Roles sub-tab. **Not the same as 5.4 Roles & Permissions** — these are scheduling templates (a name, a time range, the working days it applies to), used when building the weekly grid, not access-control roles.",
      [
        R("List shift roles", "GET", SR, {
          status: "stub",
          desc: "All shift-role templates for the tenant/branch.",
          tests: T_LIST,
          examples: [{ name: "Success", body: { data: [SHIFT_ROLE] } }],
        }),
        R("Create shift role", "POST", SR, {
          status: "stub",
          desc: "Header/empty-state *Add Shift Role* button.",
          saves: { shiftRoleId: ".data.id" },
          body: { name: "Opening Cashier", startTime: "08:00", endTime: "16:00", workingDays: ["Sun", "Mon", "Tue", "Wed", "Thu"], active: true },
          tests: T_CREATED,
          examples: [{ name: "Created", code: 201, body: { data: SHIFT_ROLE } }],
        }),
        R("Update shift role", "PATCH", `${SR}/:shiftRoleId`, {
          status: "stub",
          desc: "Row *Edit* action — rename, retime, change working days, or flip *Active*.",
          body: { active: false },
          tests: T_OK,
          examples: [{ name: "Updated", body: { data: SHIFT_ROLE } }],
        }),
        R("Delete shift role", "DELETE", `${SR}/:shiftRoleId`, {
          status: "stub",
          desc: "Row *Delete* action, with confirm.",
          tests: T_NO_CONTENT,
          examples: [{ name: "Deleted", code: 204 }],
        }),
      ]
    ),
    F(
      "5.4 · Roles & permissions",
      "Screen: `pages/staff` → Roles & Permissions tab (role list + the module × action matrix).",
      [
        R("List roles", "GET", RL, {
          status: "stub",
          desc: "System roles (`owner`, `manager`, …) plus any tenant-defined custom roles.",
          source: "shared/api/mock-staff.ts — StaffRoleDef",
          tests: T_LIST,
          examples: [{ name: "Success", body: { data: [ROLE_DEF] } }],
        }),
        R("List permission modules", "GET", `${RL}/modules`, {
          status: "stub",
          desc: "The fixed module catalogue the matrix is built from. Rarely changes; cached client-side.",
          tests: T_OK,
          examples: [{ name: "Success", body: { data: MODULES, actions: PERMISSION_ACTIONS } }],
        }),
        R("Create custom role", "POST", RL, {
          status: "stub",
          desc: "New roles start with every module/action off (`none`); set permissions with the request below.",
          rules: ["`name` unique per tenant.", "`isSystemRole` is always `false` for roles created here — system roles cannot be created or deleted."],
          saves: { roleId: ".data.id" },
          body: { name: "Marketing Access", description: "Reports and customer data, read-only elsewhere" },
          tests: T_CREATED,
          examples: [
            { name: "Created", code: 201, body: { data: { id: "custom", name: "Marketing Access", description: "Reports and customer data, read-only elsewhere", isSystemRole: false, memberCount: 0 } } },
            err("Name taken", 409, "role_name_taken", "A role with this name already exists."),
          ],
        }),
        R("Update role", "PATCH", `${RL}/:roleId`, {
          status: "stub",
          desc: "Rename or redescribe a custom role. System roles (`owner`, `manager`, `cashier`, `host`, `kitchen`, `barista`) reject renames — 403.",
          body: { name: "Marketing & Reports" },
          tests: T_OK,
          examples: [
            { name: "Updated", body: { data: ROLE_DEF } },
            err("System role", 403, "system_role_locked", "System roles cannot be renamed or removed."),
          ],
        }),
        R("Duplicate role", "POST", `${RL}/:roleId/duplicate`, {
          status: "stub",
          desc: "Row menu → *Duplicate*. Creates a new custom role that starts with the same permission matrix as the source role.",
          screen: "pages/staff → Roles & Permissions → role row menu → Duplicate",
          saves: { roleId: ".data.id" },
          body: { name: "Cashier (Copy)" },
          tests: T_CREATED,
          examples: [{ name: "Created", code: 201, body: { data: { id: "custom-2", name: "Cashier (Copy)", description: "Handle billing & Payment", isSystemRole: false, memberCount: 0 } } }],
        }),
        R("Activate / deactivate role", "PATCH", `${RL}/:roleId/status`, {
          status: "stub",
          desc: "Row menu → *Activate*/*Deactivate*. A deactivated role stays on the list and keeps its permissions but cannot be assigned to a member until reactivated.",
          rules: ["System roles cannot be deactivated — 403.", "409 if deactivating would leave a member with no active role (rare, since members keep the role but lose access)."],
          body: { active: false },
          tests: T_OK,
          examples: [
            { name: "Updated", body: { data: { id: "custom", active: false } } },
            err("System role", 403, "system_role_locked", "System roles are always active."),
          ],
        }),
        R("Assign role to members (bulk)", "POST", `${RL}/:roleId/assign`, {
          status: "stub",
          desc: "Row menu → *Assign Users*. Assigns this role to several staff members at once — distinct from changing one member's role from their profile drawer (`PATCH /staff/members/:staffMemberId`).",
          screen: "pages/staff → Roles & Permissions → role row menu → Assign Users",
          body: { employeeIds: ["EMP-007", "EMP-009", "EMP-011"] },
          tests: T_OK,
          examples: [{ name: "Assigned", body: { data: { roleId: "cashier", assigned: 3, memberCount: 5 } } }],
        }),
        R("Delete custom role", "DELETE", `${RL}/:roleId`, {
          status: "stub",
          desc: "Blocked while any staff member still has this role assigned.",
          rules: ["409 if `memberCount` > 0 — reassign members first."],
          tests: T_NO_CONTENT,
          examples: [
            { name: "Deleted", code: 204 },
            err("Role in use", 409, "role_in_use", "Reassign the members on this role before deleting it.", { memberCount: 2 }),
          ],
        }),
        R("Get permission matrix", "GET", `${RL}/permissions`, {
          status: "stub",
          desc: "Every role × every module × the 7 actions (view/create/edit/delete/approve/export/setting).",
          source: "shared/api/mock-staff.ts — PermissionMatrix",
          tests: T_OK,
          examples: [{ name: "Success", body: { data: { cashier: ROLE_PERMISSIONS_ROW.permissions } } }],
        }),
        R("Update role permissions", "PUT", `${RL}/:roleId/permissions`, {
          status: "stub",
          desc: "Replaces the full module × action grid for one role. Send the whole grid, not a diff.",
          rules: [
            "Owner's matrix is fixed at full access everywhere — 403 on write.",
            "Every module in the tenant's `MODULES` catalogue must be present in the body.",
          ],
          body: ROLE_PERMISSIONS_ROW.permissions,
          tests: T_OK,
          examples: [
            { name: "Updated", body: { data: ROLE_PERMISSIONS_ROW } },
            err("Owner is fixed", 403, "owner_permissions_fixed", "The Owner role always has full access and cannot be edited."),
          ],
        }),
      ]
    ),
  ]
);

module.exports = { staff, BRANCHES, STAFF_ROLES };
