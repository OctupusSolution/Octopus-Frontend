// The connector list offered during onboarding. Nothing here actually connects
// anything — real setup happens later in Settings → Integrations, which lists
// this exact same vendor set so nothing here feels invented.

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
