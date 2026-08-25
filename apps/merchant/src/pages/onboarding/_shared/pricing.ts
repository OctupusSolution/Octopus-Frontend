// One place that knows what a draft costs. The price bar, the review aside and
// the payment step all showed the same number by each computing
// `computePrice(...).total + integrationsTotal(...)` themselves — three copies
// that agreed by coincidence. They now agree structurally.
import { computePrice, type PriceLine } from "@/shared/catalog";
import { integrationsTotal } from "./extras-catalog";
import type { OnboardingDraft } from "./draft";

export interface DraftPrice {
  /** Per-module and per-branch lines, for the expandable breakdown. */
  lines: readonly PriceLine[];
  /** The OCTOPUS subscription alone — modules plus extra branches. */
  subscription: number;
  /** The selected connectors, per month. */
  connectors: number;
  /** What the merchant actually pays: subscription + connectors. */
  total: number;
  hasQuotedItems: boolean;
}

export function priceFor(draft: OnboardingDraft): DraftPrice {
  const price = computePrice(draft.enabled, draft.brand.branchCount);
  const connectors = integrationsTotal(draft.integrations);
  return {
    lines: price.lines,
    subscription: price.total,
    connectors,
    total: price.total + connectors,
    hasQuotedItems: price.hasQuotedItems,
  };
}

/** The one number every price surface must show. */
export function totalFor(draft: OnboardingDraft): number {
  return priceFor(draft).total;
}

/** `AED 45` — the merchant's chosen currency, formatted the way `formatSar`
 *  formats the subscription: Latin digits even in Arabic, whole units only. */
export function formatBrandPrice(amount: number, currency: string, locale: string): string {
  const formatted = new Intl.NumberFormat(locale === "ar" ? "ar" : "en-US", {
    numberingSystem: "latn",
    maximumFractionDigits: 0,
  }).format(amount);
  return `${currency} ${formatted}`;
}

/** A plain count (orders, reservations) in the same numeral system the money
 *  tiles use, so one row never mixes Latin and Arabic-Indic digits. */
export function formatCount(value: number, locale: string): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar" : "en-US", {
    numberingSystem: "latn",
    maximumFractionDigits: 0,
  }).format(value);
}
