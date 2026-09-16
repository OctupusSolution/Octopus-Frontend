// apps/merchant/src/pages/orders-list/_shared/refund-amount.ts
import type { OrderItem, OrderRecord } from "./types";

export function maxRefundableSar(order: OrderRecord): number {
  return order.totalSar;
}

export function selectedItemsTotalSar(items: readonly OrderItem[], selectedIndices: ReadonlySet<number>): number {
  return items.filter((_, index) => selectedIndices.has(index)).reduce((sum, item) => sum + item.priceSar * item.qty, 0);
}

export function clampAmountSar(raw: string, max: number): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.min(parsed, max);
}
