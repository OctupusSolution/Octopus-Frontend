import type { OrderLine, OrderLineModifier } from "@octopus/api-client";

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
