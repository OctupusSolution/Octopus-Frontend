// What each restaurant type turns on by default — derived from the capability
// matrix in the OCTOPUS Restaurants SRS, Section 8.
//
// The SRS grades every capability per type as:
//   ● Core         must have it, the segment cannot operate without it
//   ◐ Recommended  on by default, can be switched off
//   ○ Optional     available, off by default
//   — N/A          does not apply, hidden entirely
//
// The SRS grades ~60 individual capabilities; this table rolls them up to the
// module level, because modules are what the sidebar shows and what the
// merchant is billed for. A module is `core` when the SRS marks any of its
// defining capabilities ● for that type, and `na` only when the SRS marks the
// module's capabilities — across the board.
//
// Base modules are omitted: they are always on for every type.

import type { TypeCode } from "./restaurant-types";
import type { ModuleId } from "./modules";
import { baseModuleIds } from "./modules";

export type Availability = "core" | "recommended" | "optional" | "na";

type AddOnId = Exclude<ModuleId, "core" | "orders" | "payments" | "tax" | "reports">;

type TypeProfile = Record<AddOnId, Availability>;

export const typeDefaults: Record<TypeCode, TypeProfile> = {
  // Fine Dining — reservation-led, guest recognition matters, no delivery.
  T1: {
    bookings: "core", delivery: "na", inventory: "recommended", customers: "core",
    loyalty: "optional", hr: "recommended", accounting: "core",
    messaging: "recommended", integrations: "optional",
  },
  // Casual & Family — the volume centre; genuinely multi-channel.
  T2: {
    bookings: "core", delivery: "core", inventory: "core", customers: "core",
    loyalty: "core", hr: "recommended", accounting: "core",
    messaging: "core", integrations: "recommended",
  },
  // QSR — throughput above all; no tables, no reservations.
  T3: {
    bookings: "na", delivery: "core", inventory: "recommended", customers: "recommended",
    loyalty: "recommended", hr: "recommended", accounting: "core",
    messaging: "optional", integrations: "optional",
  },
  // Café — lifetime value is retention, so loyalty and CRM lead.
  T4: {
    bookings: "optional", delivery: "recommended", inventory: "recommended", customers: "core",
    loyalty: "core", hr: "recommended", accounting: "core",
    messaging: "core", integrations: "optional",
  },
  // Bakery & Sweets — production-led, pre-order heavy, waste-sensitive.
  T5: {
    bookings: "na", delivery: "core", inventory: "core", customers: "recommended",
    loyalty: "optional", hr: "recommended", accounting: "core",
    messaging: "core", integrations: "optional",
  },
  // Cloud Kitchen — delivery-only, aggregator-exposed, no dining room at all.
  T6: {
    bookings: "na", delivery: "core", inventory: "core", customers: "optional",
    loyalty: "optional", hr: "recommended", accounting: "core",
    messaging: "recommended", integrations: "core",
  },
  // Truck & Kiosk — minimal hardware, offline-first, deliberately light.
  T7: {
    bookings: "na", delivery: "optional", inventory: "optional", customers: "optional",
    loyalty: "optional", hr: "optional", accounting: "recommended",
    messaging: "recommended", integrations: "optional",
  },
  // Buffet & Cafeteria — per-head pricing and member/employee accounts.
  T8: {
    bookings: "optional", delivery: "na", inventory: "recommended", customers: "core",
    loyalty: "optional", hr: "recommended", accounting: "core",
    messaging: "optional", integrations: "optional",
  },
  // Catering & Events — sells proposals, not menu items; staff-heavy on the day.
  T9: {
    bookings: "core", delivery: "core", inventory: "recommended", customers: "core",
    loyalty: "optional", hr: "core", accounting: "core",
    messaging: "core", integrations: "optional",
  },
  // Traditional Saudi — cabins, pre-orders for long-cook items, high takeaway.
  T10: {
    bookings: "core", delivery: "core", inventory: "core", customers: "recommended",
    loyalty: "optional", hr: "recommended", accounting: "core",
    messaging: "recommended", integrations: "recommended",
  },
  // Hotel & Resort — multi-outlet, memberships, folio charging.
  T11: {
    bookings: "core", delivery: "optional", inventory: "recommended", customers: "core",
    loyalty: "recommended", hr: "core", accounting: "core",
    messaging: "recommended", integrations: "recommended",
  },
  // Home-Based — mobile-only, WhatsApp-centred, no staff and no hardware.
  T12: {
    bookings: "na", delivery: "recommended", inventory: "na", customers: "recommended",
    loyalty: "optional", hr: "na", accounting: "na",
    messaging: "core", integrations: "na",
  },
};

/** How a module rates for a type. Base modules are always core. */
export function availabilityFor(type: TypeCode, moduleId: ModuleId): Availability {
  if (baseModuleIds.includes(moduleId)) return "core";
  return typeDefaults[type][moduleId as AddOnId] ?? "optional";
}

/** False when the SRS says this module simply does not apply to the type. */
export function isApplicable(type: TypeCode, moduleId: ModuleId): boolean {
  return availabilityFor(type, moduleId) !== "na";
}

/**
 * The starting selection for a type: everything in the base, plus every
 * module the SRS marks core or recommended. Optional modules start off;
 * the merchant can still add them on the review step.
 */
export function defaultModulesFor(type: TypeCode): ModuleId[] {
  const profile = typeDefaults[type];
  const addOns = (Object.keys(profile) as AddOnId[]).filter(
    (id) => profile[id] === "core" || profile[id] === "recommended"
  );
  return [...baseModuleIds, ...addOns];
}
