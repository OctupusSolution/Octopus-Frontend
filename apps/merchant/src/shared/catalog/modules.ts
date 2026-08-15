// The product catalog: what a tenant can switch on, and what it costs.
//
// Five modules are `inBase` — they ship with the subscription and cannot be
// removed. ZATCA tax invoicing is among them deliberately: e-invoicing is a
// legal obligation for every Saudi business, so it is not a paid extra.
//
// `Delivery & Dispatch` is a first-class module here even though the original
// twelve-module list omitted it — the console already ships four working
// delivery pages, and they need to be entitled and priced like anything else.

export type ModuleId =
  | "core"
  | "orders"
  | "payments"
  | "tax"
  | "reports"
  | "bookings"
  | "delivery"
  | "inventory"
  | "customers"
  | "loyalty"
  | "hr"
  | "accounting"
  | "messaging"
  | "integrations";

export interface CatalogModule {
  id: ModuleId;
  /** lucide-react icon name, resolved to a component in the UI layer */
  icon: string;
  nameKey: string;
  descKey: string;
  /** Included in the base subscription and not removable. */
  inBase: boolean;
  /** SAR per month. 0 for base modules. `null` means priced on request. */
  price: number | null;
  /** Modules that must be enabled for this one to work. */
  dependencies?: readonly ModuleId[];
}

/** SAR per month for the subscription's first branch. */
export const BASE_PRICE = 199;

/** SAR per month for each branch beyond the first. */
export const PRICE_PER_EXTRA_BRANCH = 149;

export const catalogModules: readonly CatalogModule[] = [
  // ---- Base: always on, never billed separately -------------------------
  { id: "core",     icon: "Settings",     inBase: true, price: 0,
    nameKey: "catalog.module.core.name",     descKey: "catalog.module.core.desc" },
  { id: "orders",   icon: "ClipboardList", inBase: true, price: 0,
    nameKey: "catalog.module.orders.name",   descKey: "catalog.module.orders.desc" },
  { id: "payments", icon: "CreditCard",   inBase: true, price: 0,
    nameKey: "catalog.module.payments.name", descKey: "catalog.module.payments.desc" },
  { id: "tax",      icon: "ReceiptText",  inBase: true, price: 0,
    nameKey: "catalog.module.tax.name",      descKey: "catalog.module.tax.desc" },
  { id: "reports",  icon: "BarChart3",    inBase: true, price: 0,
    nameKey: "catalog.module.reports.name",  descKey: "catalog.module.reports.desc" },

  // ---- Add-ons ----------------------------------------------------------
  { id: "bookings",   icon: "CalendarClock", inBase: false, price: 89,
    nameKey: "catalog.module.bookings.name",   descKey: "catalog.module.bookings.desc" },
  { id: "delivery",   icon: "Truck",         inBase: false, price: 119,
    nameKey: "catalog.module.delivery.name",   descKey: "catalog.module.delivery.desc" },
  { id: "inventory",  icon: "Package",       inBase: false, price: 99,
    nameKey: "catalog.module.inventory.name",  descKey: "catalog.module.inventory.desc" },
  { id: "customers",  icon: "Users",         inBase: false, price: 69,
    nameKey: "catalog.module.customers.name",  descKey: "catalog.module.customers.desc" },
  { id: "loyalty",    icon: "Megaphone",     inBase: false, price: 79,
    nameKey: "catalog.module.loyalty.name",    descKey: "catalog.module.loyalty.desc",
    dependencies: ["customers"] },
  { id: "hr",         icon: "UserCog",       inBase: false, price: 129,
    nameKey: "catalog.module.hr.name",         descKey: "catalog.module.hr.desc" },
  { id: "accounting", icon: "Wallet",        inBase: false, price: 149,
    nameKey: "catalog.module.accounting.name", descKey: "catalog.module.accounting.desc",
    dependencies: ["tax"] },
  { id: "messaging",  icon: "MessageCircle", inBase: false, price: 49,
    nameKey: "catalog.module.messaging.name",  descKey: "catalog.module.messaging.desc" },
  { id: "integrations", icon: "Plug",        inBase: false, price: null,
    nameKey: "catalog.module.integrations.name", descKey: "catalog.module.integrations.desc" },
];

export const baseModuleIds: readonly ModuleId[] = catalogModules
  .filter((m) => m.inBase)
  .map((m) => m.id);

export const addOnModules: readonly CatalogModule[] = catalogModules.filter((m) => !m.inBase);

export function getModule(id: ModuleId): CatalogModule | undefined {
  return catalogModules.find((m) => m.id === id);
}

/** Modules that stop working if `id` is switched off. */
export function dependentsOf(id: ModuleId): readonly CatalogModule[] {
  return catalogModules.filter((m) => m.dependencies?.includes(id));
}

/**
 * Turning a module on must also turn on whatever it needs. Returns the full
 * set including prerequisites, so callers never have to walk the graph.
 */
export function withDependencies(ids: readonly ModuleId[]): ModuleId[] {
  const result = new Set<ModuleId>(ids);
  let changed = true;
  while (changed) {
    changed = false;
    for (const id of Array.from(result)) {
      for (const dep of getModule(id)?.dependencies ?? []) {
        if (!result.has(dep)) {
          result.add(dep);
          changed = true;
        }
      }
    }
  }
  return Array.from(result);
}

/**
 * Turning a module off must also turn off whatever depended on it, otherwise
 * the tenant is left paying for a module that cannot function.
 */
export function withoutDependents(ids: readonly ModuleId[], removed: ModuleId): ModuleId[] {
  const result = new Set<ModuleId>(ids);
  result.delete(removed);
  let changed = true;
  while (changed) {
    changed = false;
    for (const id of Array.from(result)) {
      const needs = getModule(id)?.dependencies ?? [];
      if (needs.some((dep) => !result.has(dep))) {
        result.delete(id);
        changed = true;
      }
    }
  }
  return Array.from(result);
}
