// Mock data for /settings/modules — product catalog cards. `packs` are the
// 7 restaurant-focused bundles; `modules` are the 12 underlying modules with
// tier + dependency info. Stands in for GET /modules until the backend exists.

export type ModuleTier = "Included" | "Add-on" | "Enterprise";
export type PackPlan = "Lite" | "Core" | "Growth";

export interface ModuleCard {
  id: string;
  name: string;
  description: string;
  tier: ModuleTier;
  enabled: boolean;
  price?: string;
  dependencies?: readonly string[];
}

export interface PackCard {
  id: string;
  plan: PackPlan;
  name: string;
  description: string;
  price: string;
  includes: readonly string[];
  modules: readonly string[];
  current?: boolean;
}

export const moduleCards: readonly ModuleCard[] = [
  { id: "mod-orders", name: "Orders & POS", description: "Restaurant orders, menus, items and kitchen display", tier: "Included", enabled: true },
  { id: "mod-tax", name: "Tax Invoicing (ZATCA)", description: "Compliant e-invoicing, QR codes and clearance", tier: "Included", enabled: true },
  { id: "mod-payments", name: "Payments", description: "Unified payment object with gateways and BNPL", tier: "Included", enabled: true },
  { id: "mod-bookings", name: "Bookings & Reservations", description: "Reservation deposits, appointments and waitlist", tier: "Included", enabled: true },
  { id: "mod-customers", name: "Customers / CRM", description: "Customer profile, visit history and saved cards", tier: "Included", enabled: true },
  { id: "mod-core", name: "Core Settings", description: "Branches, roles and permissions", tier: "Included", enabled: true },
  { id: "mod-inventory", name: "Inventory", description: "SKUs, warehouses, stock transfers and recipes", tier: "Add-on", enabled: true, price: "SAR 99 / month" },
  { id: "mod-accounting", name: "Accounting", description: "Journal sync and VAT reports for your accountant", tier: "Add-on", enabled: true, price: "SAR 149 / month", dependencies: ["mod-tax"] },
  { id: "mod-loyalty", name: "Loyalty & Marketing", description: "Points, gift cards and campaigns", tier: "Add-on", enabled: false, price: "SAR 79 / month", dependencies: ["mod-customers"] },
  { id: "mod-hr", name: "HR / Staff", description: "Employees, shifts, leave and payroll inputs", tier: "Add-on", enabled: false, price: "SAR 129 / month" },
  { id: "mod-messaging", name: "Messaging", description: "WhatsApp, SMS and email as a shared service", tier: "Add-on", enabled: true, price: "SAR 49 / month" },
  { id: "mod-integrations", name: "Integration Hub", description: "Per-provider connection status and logs", tier: "Enterprise", enabled: true, price: "Custom" },
];

export const packCards: readonly PackCard[] = [
  {
    id: "pack-lite", plan: "Lite", name: "Lite", description: "For small cafés starting out",
    price: "SAR 199 / month",
    includes: ["1 branch", "1 device per branch", "Orders & POS", "Standard support"],
    modules: ["mod-orders", "mod-tax", "mod-payments", "mod-core"],
  },
  {
    id: "pack-core", plan: "Core", name: "Core", description: "For growing restaurant groups",
    price: "SAR 449 / month", current: true,
    includes: ["5 branches", "Unlimited devices", "Orders, Bookings, CRM", "Priority support"],
    modules: ["mod-orders", "mod-tax", "mod-payments", "mod-bookings", "mod-customers", "mod-core", "mod-inventory", "mod-messaging"],
  },
  {
    id: "pack-growth", plan: "Growth", name: "Growth", description: "Full modular operating system",
    price: "SAR 799 / month",
    includes: ["Unlimited branches", "All modules", "Dedicated account manager", "Custom integrations"],
    modules: ["mod-orders", "mod-tax", "mod-payments", "mod-bookings", "mod-customers", "mod-core", "mod-inventory", "mod-accounting", "mod-loyalty", "mod-hr", "mod-messaging", "mod-integrations"],
  },
];
