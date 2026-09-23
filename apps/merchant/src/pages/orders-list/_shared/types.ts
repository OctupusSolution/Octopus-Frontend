// apps/merchant/src/pages/orders-list/_shared/types.ts
// The Orders page's own order model — deliberately separate from
// shared/api/mock-orders.ts's OrderStatus/OrderRow, which kds-page.tsx and
// kds-ticket-board.tsx still depend on unchanged.
// This page needs a richer status/payment/timeline shape than that model
// carries, so it gets its own.

export type OrderSource = "QR Code" | "POS Order" | "KIOSK Order" | "Phone Order";

export type PaymentStatus = "Paid Online" | "Paid Cash" | "Unpaid" | "Partially Paid";

export type TimelineStage = "New" | "Accepted" | "Preparing" | "Ready" | "Served" | "Completed";

export type TerminalState = "Refunded" | "Voided" | "Canceled";

export type OrderState = TimelineStage | TerminalState;

export const TIMELINE_STAGES: readonly TimelineStage[] = [
  "New",
  "Accepted",
  "Preparing",
  "Ready",
  "Served",
  "Completed",
];

// The 8 filter pills the list page renders, in order, right after "All
// Orders". New/Accepted orders only ever show up under "All Orders" — no
// mockup frame gives them their own pill.
export const FILTER_PILL_STATES: readonly OrderState[] = [
  "Ready",
  "Completed",
  "Served",
  "Refunded",
  "Preparing",
  "Voided",
  "Canceled",
];

export interface OrderItem {
  name: string;
  qty: number;
  priceSar: number;
  /** The real Order module's line id, present only when this item came from
   *  a real backend order (order-record-bridge.ts) — needed to target
   *  wastage/discount calls at the right line. Absent for seeded/live rows. */
  lineId?: string;
}

/** Present only on a record that came from the real Order module (US-018),
 *  never on a seeded or customer-storefront-live row — see
 *  order-record-bridge.ts. Carries what an action call needs: the real id
 *  (order.id is the human-readable code, e.g. "O-000001", not this), and the
 *  optimistic-concurrency version every mutator must send back. */
export interface RealOrderRef {
  orderId: string;
  version: number;
}

export interface OrderRecord {
  id: string;
  /** See RealOrderRef's own doc. */
  real?: RealOrderRef;
  date: string;
  table: string | null;
  guests: number | null;
  totalSar: number;
  source: OrderSource;
  payment: PaymentStatus;
  paymentMethod?: string;
  transactionId?: string;
  /** The order's current state — one of the 6 lifecycle stages, or a
   *  terminal state reached from wherever `lastStage` was. */
  state: OrderState;
  /** The last lifecycle stage actually reached, used to freeze the
   *  6-step timeline in place for terminal states. Equal to `state`
   *  itself whenever `state` is a TimelineStage. */
  lastStage: TimelineStage;
  timeline: Partial<Record<TimelineStage, string>>;
  items: OrderItem[];
  courses: number;
  subtotalSar: number;
  taxSar: number;
  waiter?: string;
}
