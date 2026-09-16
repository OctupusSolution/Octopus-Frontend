// apps/merchant/src/pages/orders-list/_shared/stats.ts
import type { OrderRecord, OrderState } from "./types";

export interface OrdersStats {
  totalOrders: number;
  salesGrossSar: number;
  openOrders: number;
  completed: number;
  cancelled: number;
}

const OPEN_STATES = new Set<OrderState>(["New", "Accepted", "Preparing", "Ready"]);

export function computeOrderStats(records: readonly OrderRecord[]): OrdersStats {
  let salesGrossSar = 0;
  let openOrders = 0;
  let completed = 0;
  let cancelled = 0;

  for (const order of records) {
    // Voided/Canceled orders never contributed real revenue; Refunded
    // orders did (the refund is its own separate ledger event).
    if (order.state !== "Voided" && order.state !== "Canceled") salesGrossSar += order.totalSar;
    if (OPEN_STATES.has(order.state)) openOrders += 1;
    if (order.state === "Completed") completed += 1;
    if (order.state === "Canceled") cancelled += 1;
  }

  return { totalOrders: records.length, salesGrossSar, openOrders, completed, cancelled };
}

export function pillCount(records: readonly OrderRecord[], state: OrderState): number {
  return records.filter((order) => order.state === state).length;
}
