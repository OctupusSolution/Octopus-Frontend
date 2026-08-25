// Presentational-only data for the onboarding steps added around the real
// SRS-driven flow (Goals, Integrations, Data & Security, Team & Workflows).
//
// None of this is part of `shared/catalog` — it is not billed, it does not
// gate anything, and it is never written to TenantConfig (which has no field
// for it, because there is no backend for it yet). It exists to be collected
// during the wizard and shown back on the Review step, same honesty as the
// "coming soon" verticals: shown for real, not faked as already working.

export type GoalId =
  | "moreOnlineOrders"
  | "fasterService"
  | "understandNumbers"
  | "retainCustomers"
  | "openBranches"
  | "cutFoodCosts"
  | "modernizeExperience";

export interface Goal {
  id: GoalId;
  /** filename inside apps/assets/onboarding-Goals, resolved to a URL in the UI layer */
  image: string;
  nameKey: string;
  descKey: string;
}

export const GOALS: readonly Goal[] = [
  { id: "moreOnlineOrders", image: "online-orders.png",
    nameKey: "onboarding.goals.moreOnlineOrders.name", descKey: "onboarding.goals.moreOnlineOrders.desc" },
  { id: "fasterService", image: "faster.png",
    nameKey: "onboarding.goals.fasterService.name", descKey: "onboarding.goals.fasterService.desc" },
  { id: "understandNumbers", image: "increase-numbers.png",
    nameKey: "onboarding.goals.understandNumbers.name", descKey: "onboarding.goals.understandNumbers.desc" },
  { id: "retainCustomers", image: "new-customer.png",
    nameKey: "onboarding.goals.retainCustomers.name", descKey: "onboarding.goals.retainCustomers.desc" },
  { id: "openBranches", image: "new-branch.png",
    nameKey: "onboarding.goals.openBranches.name", descKey: "onboarding.goals.openBranches.desc" },
  { id: "cutFoodCosts", image: "food-cost.png",
    nameKey: "onboarding.goals.cutFoodCosts.name", descKey: "onboarding.goals.cutFoodCosts.desc" },
  { id: "modernizeExperience", image: "guest-experience.png",
    nameKey: "onboarding.goals.modernizeExperience.name", descKey: "onboarding.goals.modernizeExperience.desc" },
];

// ---------------------------------------------------------------------------

export type IntegrationCategory = "delivery" | "payments" | "accounting" | "messaging";

export interface IntegrationOption {
  id: string;
  /** Real product name — brand names are not translated, same convention as settings/integrations. */
  name: string;
  category: IntegrationCategory;
  descKey: string;
  /** Swatch for the initial-letter badge, used as a fallback when there is no logo image. */
  color: string;
  /** filename inside apps/assets/onboarding-Integrations, resolved to a URL in the UI layer. Not every vendor has one yet. */
  image?: string;
  /** SAR per month to connect this vendor. */
  priceSar: number;
}

export type IntegrationId = string;

// Same vendor set already used in Settings → Integrations, so a merchant sees
// the same names again later rather than a different invented list.
export const INTEGRATIONS: readonly IntegrationOption[] = [
  { id: "hungerstation", name: "HungerStation", category: "delivery", color: "#F59E0B",
    image: "hunger-station.png", descKey: "onboarding.integrations.item.hungerstation.desc", priceSar: 200 },
  { id: "jahez", name: "Jahez", category: "delivery", color: "#22C55E",
    image: "jahez.png", descKey: "onboarding.integrations.item.jahez.desc", priceSar: 200 },
  { id: "mrsool", name: "Mrsool", category: "delivery", color: "#EF4444",
    image: "mrsool.png", descKey: "onboarding.integrations.item.mrsool.desc", priceSar: 200 },
  { id: "moyasar", name: "Moyasar", category: "payments", color: "#6C4DFF",
    image: "moyasar.png", descKey: "onboarding.integrations.item.moyasar.desc", priceSar: 200 },
  { id: "tap", name: "Tap", category: "payments", color: "#5B8DEF",
    image: "tap.png", descKey: "onboarding.integrations.item.tap.desc", priceSar: 200 },
  { id: "hyperpay", name: "HyperPay", category: "payments", color: "#0D6EFD",
    image: "hyper-pay.png", descKey: "onboarding.integrations.item.hyperpay.desc", priceSar: 200 },
  { id: "qoyod", name: "Qoyod", category: "accounting", color: "#885CF6",
    image: "qoyod.png", descKey: "onboarding.integrations.item.qoyod.desc", priceSar: 200 },
  { id: "wafeq", name: "Wafeq", category: "accounting", color: "#2EC9C0",
    image: "wafeq.png", descKey: "onboarding.integrations.item.wafeq.desc", priceSar: 200 },
  { id: "daftra", name: "Daftra", category: "accounting", color: "#4C35D4",
    image: "daftra.png", descKey: "onboarding.integrations.item.daftra.desc", priceSar: 200 },
  { id: "whatsapp", name: "WhatsApp Cloud API", category: "messaging", color: "#22C55E",
    image: "whatsapp.png", descKey: "onboarding.integrations.item.whatsapp.desc", priceSar: 200 },
];

/** SAR per month for the selected connectors. Every vendor is 200 today, but
 *  reading it off the catalog means a per-vendor price is a data edit. */
export function integrationsTotal(ids: readonly IntegrationId[]): number {
  return INTEGRATIONS.filter((i) => ids.includes(i.id)).reduce((sum, i) => sum + i.priceSar, 0);
}

// ---------------------------------------------------------------------------

export type SecurityOptionId =
  | "twoFactor"
  | "dataResidency"
  | "auditLog"
  | "sessionTimeout"
  | "roleBasedAccess";

export interface SecurityOption {
  id: SecurityOptionId;
  icon: string;
  nameKey: string;
  descKey: string;
  /** Legal/structural requirements that are always on, same framing as base modules. */
  locked: boolean;
}

export const SECURITY_OPTIONS: readonly SecurityOption[] = [
  { id: "dataResidency", icon: "MapPin", locked: true,
    nameKey: "onboarding.security.dataResidency.name", descKey: "onboarding.security.dataResidency.desc" },
  { id: "roleBasedAccess", icon: "UserCog", locked: true,
    nameKey: "onboarding.security.roleBasedAccess.name", descKey: "onboarding.security.roleBasedAccess.desc" },
  { id: "twoFactor", icon: "ShieldCheck", locked: false,
    nameKey: "onboarding.security.twoFactor.name", descKey: "onboarding.security.twoFactor.desc" },
  { id: "auditLog", icon: "ClipboardList", locked: false,
    nameKey: "onboarding.security.auditLog.name", descKey: "onboarding.security.auditLog.desc" },
  { id: "sessionTimeout", icon: "Lock", locked: false,
    nameKey: "onboarding.security.sessionTimeout.name", descKey: "onboarding.security.sessionTimeout.desc" },
];

/** Keyed by the non-locked option ids only — locked ones are always true. */
export type SecuritySettings = Record<Exclude<SecurityOptionId, "dataResidency" | "roleBasedAccess">, boolean>;

export const DEFAULT_SECURITY: SecuritySettings = {
  twoFactor: true,
  auditLog: true,
  sessionTimeout: true,
};

// ---------------------------------------------------------------------------

export type WorkflowId =
  | "orderReadyAlert"
  | "lowStockReorder"
  | "bookingReminder"
  | "winBackCampaign"
  | "dailySalesEmail"
  | "deliveryStatusUpdate";

export interface WorkflowTemplate {
  id: WorkflowId;
  icon: string;
  nameKey: string;
  descKey: string;
  /** A module this template only makes sense with — used to softly annotate, never to hide. */
  relatedModule?: string;
}

export const WORKFLOW_TEMPLATES: readonly WorkflowTemplate[] = [
  { id: "orderReadyAlert", icon: "Bell",
    nameKey: "onboarding.workflows.orderReadyAlert.name", descKey: "onboarding.workflows.orderReadyAlert.desc" },
  { id: "lowStockReorder", icon: "Repeat",
    nameKey: "onboarding.workflows.lowStockReorder.name", descKey: "onboarding.workflows.lowStockReorder.desc",
    relatedModule: "inventory" },
  { id: "bookingReminder", icon: "MessageCircle",
    nameKey: "onboarding.workflows.bookingReminder.name", descKey: "onboarding.workflows.bookingReminder.desc",
    relatedModule: "bookings" },
  { id: "winBackCampaign", icon: "Megaphone",
    nameKey: "onboarding.workflows.winBackCampaign.name", descKey: "onboarding.workflows.winBackCampaign.desc",
    relatedModule: "loyalty" },
  { id: "dailySalesEmail", icon: "ClipboardList",
    nameKey: "onboarding.workflows.dailySalesEmail.name", descKey: "onboarding.workflows.dailySalesEmail.desc" },
  { id: "deliveryStatusUpdate", icon: "Truck",
    nameKey: "onboarding.workflows.deliveryStatusUpdate.name", descKey: "onboarding.workflows.deliveryStatusUpdate.desc",
    relatedModule: "delivery" },
];

// ---------------------------------------------------------------------------

export type TeamRole = "manager" | "staff" | "accountant";

export interface TeamInvite {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
}
