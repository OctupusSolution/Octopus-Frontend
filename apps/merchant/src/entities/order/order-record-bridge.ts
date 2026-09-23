// Maps a real Order-module order (US-018, staff-side) into the orders-list
// page's own OrderRecord shape — same job as live-orders-bridge.ts does for
// a customer-storefront order, so a real backend order shows up in the same
// list alongside the seeded demo rows and the customer's own live orders.
import type { OrderAdminStatus, OrderResponse } from "@octopus/api-client";
import type { OrderRecord, OrderSource, PaymentStatus, TimelineStage } from "@/pages/orders-list/_shared/types";
import { TIMELINE_STAGES } from "@/pages/orders-list/_shared/types";

// The Order module's own status set is richer than the page's 6-stage
// timeline in one direction (Voided has no stage of its own) and thinner in
// another (no "Accepted" pill exists, folded into the timeline itself). See
// [[order-module-status-mismatch]] for the note this leaves in the gaps doc.
const LAST_STAGE_BY_STATUS: Record<OrderAdminStatus, TimelineStage> = {
  New: "New",
  Accepted: "Accepted",
  Preparing: "Preparing",
  Ready: "Ready",
  Served: "Served",
  Completed: "Completed",
  Cancelled: "New",
  Voided: "Preparing",
};

const SOURCE_BY_CODE: Record<string, OrderSource> = {
  pos: "POS Order",
  phone: "Phone Order",
  qr: "QR Code",
  kiosk: "KIOSK Order",
};

function paymentStatusOf(order: OrderResponse): PaymentStatus {
  switch (order.paymentState) {
    case "Paid":
    case "Overpaid":
      return order.capturedTotal.amount > 0 && order.gratuityTotal.amount === 0 ? "Paid Cash" : "Paid Online";
    case "PartiallyPaid":
    case "PartiallyRefunded":
      return "Partially Paid";
    default:
      return "Unpaid";
  }
}

function timelineUpTo(lastStage: TimelineStage, placedAtUtc: string): Partial<Record<TimelineStage, string>> {
  const lastIndex = TIMELINE_STAGES.indexOf(lastStage);
  const timeline: Partial<Record<TimelineStage, string>> = {};
  for (let i = 0; i <= lastIndex; i++) timeline[TIMELINE_STAGES[i]] = placedAtUtc;
  return timeline;
}

export function mapRealOrderToRecord(order: OrderResponse): OrderRecord {
  const lastStage = LAST_STAGE_BY_STATUS[order.status];
  const state = order.status === "Cancelled" ? "Canceled" : order.status === "Voided" ? "Voided" : lastStage;

  return {
    id: order.code,
    real: { orderId: order.id, version: order.version },
    date: new Date(order.placedAtUtc).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    table: order.resource ? order.resource.displayName || order.resource.code : null,
    guests: order.attendeeCount,
    totalSar: order.totals.grandTotal.amount,
    source: SOURCE_BY_CODE[order.sourceCode] ?? "POS Order",
    payment: paymentStatusOf(order),
    state,
    lastStage,
    timeline: timelineUpTo(lastStage, order.placedAtUtc),
    items: order.lines.map((line) => ({
      name: line.displayName,
      qty: line.quantity,
      priceSar: line.unitPrice.amount,
      lineId: line.id,
    })),
    courses: 1,
    subtotalSar: order.totals.linesSubtotal.amount,
    taxSar: order.totals.taxTotal.amount,
    waiter: undefined,
  };
}

export function mapRealOrdersToRecords(orders: readonly OrderResponse[]): OrderRecord[] {
  return orders.map(mapRealOrderToRecord);
}
