// apps/merchant/src/pages/orders-list/_shared/live-orders-bridge.ts
// Maps a real customer-placed order (the canonical contract shared with
// the storefront) into this page's richer OrderRecord shape, so live
// orders keep showing up here alongside the seeded demo rows — same as
// the page did before this rebuild, just into the new shape.
import type { Order, OrderChannel, OrderStatus as CanonicalOrderStatus } from "@octopus/api-client";
import type { OrderRecord, OrderSource, TimelineStage } from "./types";
import { TIMELINE_STAGES } from "./types";

const SOURCE_BY_CHANNEL: Record<OrderChannel, OrderSource> = {
  dine_in: "QR Code",
  takeaway: "POS Order",
  kiosk: "KIOSK Order",
  delivery: "Phone Order",
  aggregator: "Phone Order",
};

// The canonical contract has no "Accepted" stage of its own and no
// payment-status field yet, so a live order's lastStage is the closest
// of the 6 stages this page distinguishes, and payment always starts
// "Unpaid" until the contract carries real payment data.
const LAST_STAGE_BY_STATUS: Record<CanonicalOrderStatus, TimelineStage> = {
  new: "New",
  preparing: "Preparing",
  ready: "Ready",
  out_for_delivery: "Served",
  completed: "Completed",
  cancelled: "New",
};

function timelineUpTo(lastStage: TimelineStage, createdAt: string): Partial<Record<TimelineStage, string>> {
  const lastIndex = TIMELINE_STAGES.indexOf(lastStage);
  const timeline: Partial<Record<TimelineStage, string>> = {};
  for (let i = 0; i <= lastIndex; i++) timeline[TIMELINE_STAGES[i]] = createdAt;
  return timeline;
}

export function mapLiveOrderToRecord(order: Order): OrderRecord {
  const lastStage = LAST_STAGE_BY_STATUS[order.status];

  return {
    id: `#${order.id}`,
    date: new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    table: order.tableNumber,
    guests: null,
    totalSar: order.totalSar,
    source: SOURCE_BY_CHANNEL[order.channel],
    payment: "Unpaid",
    state: order.status === "cancelled" ? "Canceled" : lastStage,
    lastStage,
    timeline: timelineUpTo(lastStage, order.createdAt),
    items: order.lines.map((line) => ({ name: line.name, qty: line.quantity, priceSar: line.unitPriceSar })),
    courses: 1,
    subtotalSar: order.subtotalSar,
    taxSar: 0, // no tax field on the canonical contract yet
    waiter: undefined,
  };
}

export function mapLiveOrdersToRecords(orders: readonly Order[]): OrderRecord[] {
  return orders.map(mapLiveOrderToRecord);
}
