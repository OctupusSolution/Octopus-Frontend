// Mock data for /settings/roles — 8 roles with realistic permission combos
// for the 12-module / 5-action matrix. Owner is locked with everything on.
// Stands in for GET /roles (with nested /roles/:id/permissions) until the
// backend exists.

export const permissionModules = [
  "Dashboard", "Orders", "Menu", "Inventory", "Delivery", "Customers",
  "Marketing", "Finance", "Staff", "Reports", "Settings", "Integrations",
] as const;
export type PermissionModule = (typeof permissionModules)[number];

export const permissionActions = ["View", "Create", "Edit", "Delete", "Approve"] as const;
export type PermissionAction = (typeof permissionActions)[number];

export type PermissionMatrix = Record<PermissionModule, Record<PermissionAction, boolean>>;

export interface Role {
  id: string;
  name: string;
  users: number;
  locked?: boolean;
  permissions: PermissionMatrix;
}

type ModuleActions = Readonly<Partial<Record<PermissionModule, readonly PermissionAction[]>>>;

function matrix(overrides: ModuleActions): PermissionMatrix {
  const m = {} as PermissionMatrix;
  for (const mod of permissionModules) {
    const allowed = overrides[mod] ?? [];
    const actions = {} as Record<PermissionAction, boolean>;
    for (const action of permissionActions) actions[action] = allowed.includes(action);
    m[mod] = actions;
  }
  return m;
}

const ALL_ON = matrix(
  Object.fromEntries(permissionModules.map((mod) => [mod, permissionActions])) as ModuleActions
);

export const roles: readonly Role[] = [
  {
    id: "owner", name: "Owner", users: 1, locked: true, permissions: ALL_ON,
  },
  {
    id: "branch-manager", name: "Branch Manager", users: 4,
    permissions: matrix({
      Dashboard: ["View"],
      Orders: ["View", "Create", "Edit", "Approve"],
      Menu: ["View", "Create", "Edit"],
      Inventory: ["View", "Create", "Edit", "Delete"],
      Delivery: ["View", "Edit"],
      Customers: ["View", "Create", "Edit"],
      Marketing: ["View", "Create", "Edit"],
      Finance: ["View", "Approve"],
      Staff: ["View", "Create", "Edit", "Approve"],
      Reports: ["View"],
      Settings: ["View"],
      Integrations: ["View"],
    }),
  },
  {
    id: "shift-supervisor", name: "Shift Supervisor", users: 6,
    permissions: matrix({
      Dashboard: ["View"],
      Orders: ["View", "Create", "Edit", "Approve"],
      Menu: ["View"],
      Inventory: ["View"],
      Delivery: ["View", "Edit"],
      Customers: ["View", "Create"],
      Marketing: ["View"],
      Finance: ["View"],
      Staff: ["View"],
      Reports: ["View"],
    }),
  },
  {
    id: "cashier", name: "Cashier", users: 26,
    permissions: matrix({
      Dashboard: ["View"],
      Orders: ["View", "Create", "Edit"],
      Menu: ["View"],
      Inventory: ["View"],
      Delivery: ["View"],
      Customers: ["View", "Create"],
      Finance: ["View"],
    }),
  },
  {
    id: "waiter", name: "Waiter", users: 58,
    permissions: matrix({
      Dashboard: ["View"],
      Orders: ["View", "Create", "Edit"],
      Menu: ["View"],
      Customers: ["View", "Create"],
    }),
  },
  {
    id: "kitchen", name: "Kitchen", users: 38,
    permissions: matrix({
      Dashboard: ["View"],
      Orders: ["View", "Edit"],
      Menu: ["View"],
      Inventory: ["View"],
    }),
  },
  {
    id: "driver", name: "Driver", users: 22,
    permissions: matrix({
      Orders: ["View"],
      Delivery: ["View", "Edit"],
    }),
  },
  {
    id: "accountant", name: "Accountant", users: 2,
    permissions: matrix({
      Dashboard: ["View"],
      Orders: ["View"],
      Inventory: ["View"],
      Finance: ["View", "Create", "Edit", "Delete", "Approve"],
      Reports: ["View", "Create"],
      Integrations: ["View", "Edit"],
    }),
  },
];

export const roleKpis = null;
