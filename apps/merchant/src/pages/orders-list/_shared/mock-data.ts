// apps/merchant/src/pages/orders-list/_shared/mock-data.ts
import type { OrderItem, OrderRecord, OrderSource, OrderState, PaymentStatus, TimelineStage } from "./types";
import { TIMELINE_STAGES } from "./types";

const SOURCES: readonly OrderSource[] = ["QR Code", "POS Order", "KIOSK Order", "Phone Order"];
const PAYMENTS: readonly PaymentStatus[] = ["Paid Online", "Paid Cash", "Unpaid", "Partially Paid"];
const TABLES: readonly string[] = ["Table 4", "Table 7", "Table 9", "Table 12", "Table 15", "Table 18"];
const WAITERS: readonly string[] = ["Ahmed", "Sara", "Khalid", "Noura", "Faisal"];

const ITEM_CATALOG: readonly OrderItem[] = [
  { name: "Beef Burger", qty: 1, priceSar: 32 },
  { name: "French Fries", qty: 1, priceSar: 14 },
  { name: "Water", qty: 2, priceSar: 3 },
  { name: "Grilled Chicken", qty: 1, priceSar: 38 },
  { name: "Caesar Salad", qty: 1, priceSar: 24 },
  { name: "Iced Tea", qty: 1, priceSar: 9 },
];

// Every state this page shows, with how many seeded orders sit in it.
// stats.ts derives the stat cards from the resulting list rather than
// hardcoding its own numbers, so these counts are the single source of
// truth (and mock-data.test.ts pins them so the two can't drift).
const STATE_PLAN: readonly { state: OrderState; lastStage: TimelineStage; count: number }[] = [
  { state: "New", lastStage: "New", count: 4 },
  { state: "Accepted", lastStage: "Accepted", count: 4 },
  { state: "Preparing", lastStage: "Preparing", count: 20 },
  { state: "Ready", lastStage: "Ready", count: 12 },
  { state: "Served", lastStage: "Served", count: 55 },
  { state: "Completed", lastStage: "Completed", count: 25 },
  { state: "Refunded", lastStage: "Served", count: 8 },
  { state: "Voided", lastStage: "Preparing", count: 6 },
  { state: "Canceled", lastStage: "New", count: 6 },
];

function timelineUpTo(lastStage: TimelineStage, baseDate: Date): Partial<Record<TimelineStage, string>> {
  const lastIndex = TIMELINE_STAGES.indexOf(lastStage);
  const timeline: Partial<Record<TimelineStage, string>> = {};
  for (let i = 0; i <= lastIndex; i++) {
    const stamp = new Date(baseDate.getTime() + i * 6 * 60 * 1000);
    timeline[TIMELINE_STAGES[i]] = stamp.toISOString();
  }
  return timeline;
}

function paymentFor(state: OrderState, index: number): PaymentStatus {
  if (state === "New" || state === "Accepted") return "Unpaid";
  if (state === "Refunded") return index % 2 === 0 ? "Paid Online" : "Paid Cash";
  return PAYMENTS[index % PAYMENTS.length];
}

function buildOrder(index: number, state: OrderState, lastStage: TimelineStage): OrderRecord {
  const orderNumber = 2001 + index;
  const baseDate = new Date(Date.UTC(2026, 4, 16, 18, 0, 0)); // matches the mockups' "May 16, 2026"
  baseDate.setUTCMinutes(baseDate.getUTCMinutes() - index * 3);

  const items = [ITEM_CATALOG[index % ITEM_CATALOG.length], ITEM_CATALOG[(index + 2) % ITEM_CATALOG.length]];
  const subtotalSar = items.reduce((sum, item) => sum + item.priceSar * item.qty, 0);
  const taxSar = Math.round(subtotalSar * 0.15 * 100) / 100;
  const payment = paymentFor(state, index);

  return {
    id: `#ORD-${orderNumber}`,
    date: baseDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    table: TABLES[index % TABLES.length],
    guests: 2 + (index % 5),
    totalSar: subtotalSar + taxSar,
    source: SOURCES[index % SOURCES.length],
    payment,
    paymentMethod: payment === "Paid Online" ? "Visa ****4242" : payment === "Paid Cash" ? "Cash" : undefined,
    transactionId: payment === "Paid Online" ? `TXN-${880000 + orderNumber}` : undefined,
    state,
    lastStage,
    timeline: timelineUpTo(lastStage, baseDate),
    items,
    courses: items.length,
    subtotalSar,
    taxSar,
    waiter: WAITERS[index % WAITERS.length],
  };
}

export const orderRecords: readonly OrderRecord[] = STATE_PLAN.flatMap(({ state, lastStage, count }, groupIndex) =>
  Array.from({ length: count }, (_, i) => buildOrder(groupIndex * 100 + i, state, lastStage))
);
