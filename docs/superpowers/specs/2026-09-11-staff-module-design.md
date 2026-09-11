# Staff Module Redesign

Date: 2026-09-11
Status: Approved for implementation

## Context

The merchant app's `/staff` route currently renders `StaffEmployeesPage`
(`apps/merchant/src/pages/staff/employees/index.tsx`): a single employee
table with a side drawer. New Figma-exported mockups
(`apps/assets/Staff/Staff Desing/*.png`) specify a materially different,
three-tab Staff module: **Staff**, **Roles & Permissions**, **Shifts**.
This spec covers rebuilding `/staff` to match those mockups.

Separate existing routes `/staff/schedule`, `/staff/attendance`,
`/staff/payroll`, `/staff/tips` are untouched by this work — they keep
their own pages. Only the **Shifts** tab's visual content is rebuilt
(reusing `StaffSchedulePage`'s data/logic) to match the mockup; it does
not replace or redirect to the `/staff/schedule` route.

Backend integration is out of scope. All new interactive state (PIN
reveal, 2FA toggle, Lock Account, role permission toggles, deactivate,
etc.) is local component state only — no API calls.

## Reference mockups

- `staff.png` — Staff tab, card grid
- `staff-actions.png` — member row kebab menu (Edit / Assign-Change Role / Deactivate / Delete)
- `staff- permissions.png` — Roles & Permissions tab
- `staff- permissions actions.png` — role kebab menu (Edit / Duplicate / Assign Users / Deactivate / Delete)
- `staff- shift schedule.png` — Shifts tab (Schedule sub-view)
- `staff- shift schedule-actions.png` — shift row action
- `member details.png`, `member details More.png` — inline 3-column member detail view

## Architecture

### Page shell

`apps/merchant/src/pages/staff/index.tsx` becomes the tabbed shell
(currently just re-exports `StaffEmployeesPage`). It owns:

- Page header (title + subtitle) + "Add New Member" button (Staff tab only).
- The shared `Tabs` primitive (`packages/ui/src/primitives/tabs.tsx`) with
  three items: Staff (default), Roles & Permissions, Shifts.
- Tab content is one of three new sub-components, each in its own file
  under `apps/merchant/src/pages/staff/`:
  - `staff-tab.tsx` (replaces the grid+detail portion of `employees/index.tsx`)
  - `roles-permissions-tab.tsx` (new)
  - `shifts-tab.tsx` (new; visual wrapper reusing schedule mock data)

The existing `employees/`, `schedule/`, `attendance/`, `payroll/`,
`tips/` folders and their routes stay as-is; `staff-tab.tsx` supersedes
`employees/index.tsx` as what `/staff` renders for its default tab, but
`employees/index.tsx` is not deleted if still linked elsewhere (grep
before removing dead code).

### Data model (`apps/merchant/src/shared/api/mock-staff.ts`)

Extend the `Employee` type (additive — don't break schedule/attendance/
payroll/tips consumers) with the fields the mockup's Member Details view
needs:

```
employeeCode: string        // "EMP-0012"
firstName, lastName: string
gender: "Male" | "Female"
nationality: string
languages: string[]         // ["English", "Arabic"]
jobTitle: string
department: string
reportsTo: string
employmentType: "Full time" | "Part time"
status: "Active" | "Inactive"
accessLevel: string
modulesAccess: string[]
loginMethod: "PIN" | "Password" | "Both"
pinCode: string             // mock only, masked in UI
twoFactorEnabled: boolean
twoFactorMethod: string
allowSystemLogin: boolean
allowAccessOutsideBranch: boolean
activeSection?: { device: string; location: string; since: string }
```

Add a new `Role` model + mock data (roles list with member counts,
description, icon, and a permission matrix):

```
type PermissionAction = "view" | "create" | "edit" | "delete" | "approve" | "export" | "setting";
type Module = { id: string; label: string };
type Role = { id: string; name: string; description: string; isSystemRole: boolean; memberCount: number };
type PermissionMatrix = Record<roleId, Record<moduleId, Record<PermissionAction, boolean>>>;
```

Seed with the modules/roles shown in the mockup (Dashboard, Reservations,
Wait list, Floor Plan, Orders, Payment & Refund, Menu & POS, Inventory,
Reports, Customer CRM, Staff Management, Setting & Integrations) and
roles (Owner, Manager, Cashier, Host, Kitchen, Barista, Custom Role).

### Staff tab

- Toolbar: search input, "All Branches" select, "Statuses" select (reuse
  `Select`/`Input` primitives, existing filter pattern from
  `employees/index.tsx`).
- Responsive card grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`),
  each card: avatar, name (link-styled), role, phone, branch, "Last
  Access" row, kebab menu.
- Kebab menu (use existing dropdown pattern, e.g. `Modal`-free popover
  or whatever local pattern `employees/index.tsx` / other pages use for
  row menus — check `pages/staff/payroll` or `finance` for a popover
  primitive before hand-rolling one): Edit, Assign / Change Role,
  Deactivate (amber), Delete (red).
- Clicking a card (not the kebab) opens the Member Details view.

### Member Details view

Per the mockups this is **inline**, not a drawer — replaces the grid
with a 3-column layout: left summary card, center editable form
(collapsible sections: Personal Info, Work Info, Role & Access, Login &
Security, Access Controls), right summary card (read-only echo of
left). A "Back to Staff" affordance returns to the grid.

Collapsible sections use a simple local `expanded` set of section ids
(icon rotates via the existing chevron pattern seen in
`employees/index.tsx`'s `ChevronUp/ChevronDown` usage).

Login & Security section: PIN input with a show/hide eye toggle (masked
by default), "Reset PIN Code" link (mock: regenerates a fake PIN
locally), 2FA toggle + method select.

Access Controls section: two toggles (Allow system login, Allow access
outside branch) + "Lock Account" button (red) that just flips local
`locked` state and shows a banner, mirroring the existing
`deactivated` banner pattern in `employees/index.tsx`.

### Roles & Permissions tab

- Left panel: "Roles" card — "+ Add Role" button, list of role rows
  (icon, name [+ "System Role" badge for Owner], description, member
  count, kebab for non-system roles). Selecting a row highlights it and
  loads its matrix on the right.
- Right panel: "Permission Matrix" card — header row with "Select All"
  master toggle, then one row per module (icon + name + chevron to
  expand — expand can be a no-op placeholder for now since the mockup
  doesn't show expanded state) and a toggle per `PermissionAction`
  column. Toggling updates local state keyed by `[roleId][moduleId][action]`.
- Role kebab menu: Edit, Duplicate, Assign Users, Deactivate, Delete —
  each a mock action (e.g. Duplicate clones the role locally, Delete
  removes it from local state with a confirm `Modal` reusing the
  existing deactivate-confirm pattern).

### Shifts tab

Visual-only rebuild inside the tab, reusing `scheduleStaff` /
`scheduleShifts` / `getWeekStart` from `mock-staff.ts` (same data
`StaffSchedulePage` uses) so both stay consistent:

- Sub-nav row: Schedule / Templates / Shift Roles / Time Off /
  Availability — only **Schedule** is implemented (the rest render an
  `EmptyState` "coming soon" placeholder), matching what the mockup
  shows populated.
- "Weekly Summary" stat row (Total Hours, Total Employees, Overtime,
  Open shift, Est. Labor Cost) — reuse `StatCard`.
- Week/Month toggle (`Segmented` primitive) + date navigator + branch
  filter + Bulk Actions / Send via WhatsApp / Print / Export PDF
  buttons (mock handlers — no real export/send).
- Grid: one row per employee (name, role, weekly hours) × 7 day columns,
  each cell a colored pill per employee (cycle a fixed palette by index)
  showing shift time or dashed "OFF".

### i18n

All new copy goes through the existing `labelKey`/`t()` pattern. Add
new keys under `staff.*` (e.g. `staff.tabs.staff`, `staff.tabs.roles`,
`staff.tabs.shifts`, `staff.role.kebab.assignRole`,
`staff.permissions.selectAll`, `staff.permissions.module.*`,
`staff.shifts.weeklySummary.*`, `staff.member.section.*`) in both
`packages/i18n/src/locales/en/index.ts` and `.../ar/index.ts`, mirrored
1:1 like the existing 219 `staff.*` keys.

## Testing

- Manual verification via the `run` skill: navigate to `/staff`, check
  all three tabs render, open a member's details, toggle a permission,
  switch shifts week — compare screenshots against the mockups per the
  `verify-ui-with-screenshots` memory.
- No new automated tests required beyond what the project already runs
  (typecheck/lint); this is a mock-data UI feature with no business
  logic to unit test.

## Out of scope

- Any backend/API wiring.
- Templates / Shift Roles / Time Off / Availability sub-tabs content.
- Changes to `/staff/schedule`, `/staff/attendance`, `/staff/payroll`,
  `/staff/tips` routes or pages.
