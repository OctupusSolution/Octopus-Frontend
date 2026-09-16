import type { OrderLine, OrderLineModifier } from "@octopus/api-client";
import type { LinePricing } from "./storefront";

export { formatSar } from "@octopus/api-client";

export function computeLineTotalSar(line: {
  unitPriceSar: number;
  modifiers: OrderLineModifier[];
  quantity: number;
}): number {
  const modifierTotal = line.modifiers.reduce((sum, modifier) => sum + modifier.priceDeltaSar, 0);
  return (line.unitPriceSar + modifierTotal) * line.quantity;
}

export function computeCartSubtotalSar(lines: readonly OrderLine[]): number {
  return lines.reduce((sum, line) => sum + computeLineTotalSar(line), 0);
}

export const PROMO_CODES: Record<string, number> = {
  WELCOME10: 0.1,
  EID20: 0.2,
};

export function isValidPromoCode(code: string): boolean {
  return Object.prototype.hasOwnProperty.call(PROMO_CODES, code.toUpperCase());
}

export function computePromoDiscountSar(subtotal: number, code: string): number {
  const percent = PROMO_CODES[code.toUpperCase()];
  if (!percent) return 0;
  return subtotal * percent;
}

// `formatSar` renders "SAR 153.00". The storefront draws the number and the
// currency word at different sizes, and money.ts is shared with the merchant
// console, so the split lives here instead.
/** "153.00" — the currency word comes from the `store.currency` i18n key. */
export function formatAmount(n: number): string {
  return n.toFixed(2);
}

/** Flat per-order service charge, as the fulfillment designs bill it. */
export const SERVICE_FEE_SAR = 5;
export const VAT_RATE = 0.15;
/** The tip amounts the dine-in screen offers, right to left. */
export const TIP_PRESETS_SAR = [5, 10, 15] as const;

export interface OrderTotals {
  baseSar: number;
  addonsSar: number;
  serviceFeeSar: number;
  tipSar: number;
  vatSar: number;
  totalSar: number;
}

export function computeOrderTotals(pricing: LinePricing, tipSar: number): OrderTotals {
  // The design bills VAT on the base price alone — its worked example is
  // 153.00 x 15% = 22.95 — not on the add-ons, the service fee or the tip.
  const vatSar = pricing.baseSar * VAT_RATE;
  return {
    baseSar: pricing.baseSar,
    addonsSar: pricing.addonsSar,
    serviceFeeSar: SERVICE_FEE_SAR,
    tipSar,
    vatSar,
    totalSar: pricing.baseSar + pricing.addonsSar + SERVICE_FEE_SAR + tipSar + vatSar,
  };
}

// The fulfillment designs pad the integer part to two digits — "05.00 ر.س"
// beside "153.00 ر.س" — so the decimal points line up down the column.
const PADDED_AMOUNT = new Intl.NumberFormat("en-US-u-nu-latn", {
  minimumIntegerDigits: 2,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: false,
});

/** "05.00", "153.00" — the currency word comes from the `store.currency` key. */
export function formatAmountPadded(n: number): string {
  return PADDED_AMOUNT.format(n);
}
