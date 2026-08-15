// Subscription pricing: a fixed base plus whatever the merchant switches on.
//
// Deliberately cumulative rather than tiered packs — the merchant watches the
// monthly figure move as they add features, so what they are buying is never
// a mystery. Enterprise modules are quoted, not priced, and are reported
// separately so they never silently distort the total.

import type { ModuleId } from "./modules";
import { BASE_PRICE, PRICE_PER_EXTRA_BRANCH, getModule } from "./modules";

export interface PriceLine {
  /** Module id, or a synthetic id for the base and branch lines. */
  id: string;
  labelKey: string;
  /** SAR per month. `null` for quote-on-request lines. */
  amount: number | null;
  kind: "base" | "module" | "branches";
}

export interface PriceBreakdown {
  lines: readonly PriceLine[];
  /** SAR per month, excluding any quote-on-request modules. */
  total: number;
  /** True when at least one selected module is priced on request. */
  hasQuotedItems: boolean;
}

export function computePrice(
  enabledModules: readonly ModuleId[],
  branchCount: number
): PriceBreakdown {
  const lines: PriceLine[] = [
    { id: "base", labelKey: "pricing.line.base", amount: BASE_PRICE, kind: "base" },
  ];

  let total = BASE_PRICE;
  let hasQuotedItems = false;

  for (const id of enabledModules) {
    const module = getModule(id);
    if (!module || module.inBase) continue;

    if (module.price === null) {
      hasQuotedItems = true;
      lines.push({ id, labelKey: module.nameKey, amount: null, kind: "module" });
      continue;
    }

    total += module.price;
    lines.push({ id, labelKey: module.nameKey, amount: module.price, kind: "module" });
  }

  const extraBranches = Math.max(0, branchCount - 1);
  if (extraBranches > 0) {
    const amount = extraBranches * PRICE_PER_EXTRA_BRANCH;
    total += amount;
    lines.push({ id: "branches", labelKey: "pricing.line.extraBranches", amount, kind: "branches" });
  }

  return { lines, total, hasQuotedItems };
}

/** `SAR 1,234` — whole riyals; subscription prices never carry halalas. */
export function formatSar(amount: number, locale: string): string {
  const formatted = new Intl.NumberFormat(locale === "ar" ? "ar" : "en-US", {
    numberingSystem: "latn",
    maximumFractionDigits: 0,
  }).format(amount);
  return `SAR ${formatted}`;
}
