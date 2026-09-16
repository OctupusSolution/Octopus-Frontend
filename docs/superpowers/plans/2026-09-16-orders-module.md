# Orders (Live Orders) Module Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the merchant app's `/orders` page (`OrdersListPage`) from its current 4-stat-card/single-badge table into the new design: 5 stat cards, single-select status pills, a 6-step per-row timeline, an Order Details modal, and four confirm-flow modals (Cancel/Void/Wastage/Refund) sharing a themed "Manager Authentication & Security" PIN step and result screen, matching `apps/assets/Orders/Orders Desing/*.png` (22 frames).

**Architecture:** `apps/merchant/src/pages/orders-list/index.tsx` is rewritten in place around a new `_shared/` folder: an isolated data layer (types, mock data, live-order bridge — deliberately *not* touching `shared/api/mock-orders.ts`, which `kds`/`preorders` still depend on), presentational row/stepper/modal components, and a small reusable confirm-flow shell (PIN modal + result modal + a tiny step-sequence state machine) that the four action modals configure rather than duplicate.

**Tech Stack:** React 18 + TypeScript, Tailwind (CSS variable design tokens, e.g. `var(--octo-text-primary)`), `@ui/primitives` (`packages/ui`), `lucide-react` icons, the app's `useI18n()`/`t()` i18n pattern (`packages/i18n/src/locales/{en,ar}/index.ts`), Vitest for the pure-logic unit tests (`apps/merchant/vitest.config.ts` only runs `src/**/*.test.ts` — no component-render tests exist in this codebase, so none are added here).

**Spec:** `docs/superpowers/specs/2026-09-16-orders-module-design.md`

## Global Constraints

- No backend/API calls anywhere new — all state is local `useState`/mock data. The one exception is the existing `useLiveOrders()` hook, which is *consumed* (mapped into the new shape) but not modified.
- `shared/api/mock-orders.ts` and `shared/api/live-orders.ts` are **not modified** except removing the now-dead `orderStats`/`orderRows` exports in the final cleanup task, after confirming via grep that nothing outside `orders-list` still imports them. `OrderStatus`/`OrderRow`/`toOrderRow`/`useLiveOrders` stay untouched — `kds-page.tsx`, `kds-ticket-board.tsx`, `preorders/index.tsx`, `mock-preorders.ts` depend on them.
- `/orders/history`, `/orders/preorders`, `/inventory/purchasing`, `/kds` are untouched by every task in this plan.
- New Orders-page vocabulary (stage names, terminal states, sources, payment statuses) gets its **own** i18n keys with explicit lookup maps (e.g. `STAGE_LABEL_KEY: Record<TimelineStage, string>`), rather than routing through the existing `labelKey()` reverse-lookup helper — `labelKey()` resolves by matching English text against every key in the dictionary, and words like "New"/"Completed"/"Ready" already exist under half a dozen unrelated feature keys (reservations, customers, reports); a fresh page's own vocabulary should not depend on winning that collision. `labelKey()` itself is untouched and still used correctly by everything else.
- Every new/changed user-facing string goes through `t(...)` with a key added to **both** `packages/i18n/src/locales/en/index.ts` and `packages/i18n/src/locales/ar/index.ts`, mirrored 1:1 (same key, same relative position).
- A few mockup strings are corrected rather than copied verbatim, because they're typos or Figma placeholder filler, not real product copy — each is called out at the point it's introduced: "Seals Gross" → "Sales Gross"; "Choose Cancellation Scop" → "...Scope"; "2 Course" → "{n} Courses"; the Lorem-ipsum text pre-filled in every Note textarea is dropped in favor of an empty field with a real placeholder; "Refund order" / "Choose Refund type" → Title Case to match the other three modals. The PIN-modal void copy "confirm the avoided" is kept verbatim (visibly a design-side wording choice, not a typo with an obvious fix).
- Money is formatted with `formatSar` from `@octopus/api-client` (already used by `live-orders.ts`) everywhere a SAR amount is displayed — never hand-rolled string interpolation.
- Follow existing styling conventions verbatim: `text-[12.5px]` body text, `text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]` field labels, `rounded-[9px]`/`rounded-xl` radii, `var(--octo-card)`/`var(--octo-border-card)`/`var(--octo-divider)`/`var(--octo-hover)`/`var(--octo-selected)`/`var(--octo-border-input)` tokens, `#0D6EFD` accent blue. Per the project's `merchant-dark-variant-trap` memory, never use a bare Tailwind `dark:` variant — this page has none in its design (light-only in every frame) so no dark-mode branching is needed at all.
- Manual verification is via the `run` skill + screenshot comparison against the 22 mockups, per the project's `verify-ui-with-screenshots` memory — required before Task 14 is considered done.

---

### Task 1: Data layer — types, theme maps, mock data, stats

**Files:**
- Create: `apps/merchant/src/pages/orders-list/_shared/types.ts`
- Create: `apps/merchant/src/pages/orders-list/_shared/theme.ts`
- Create: `apps/merchant/src/pages/orders-list/_shared/mock-data.ts`
- Create: `apps/merchant/src/pages/orders-list/_shared/mock-data.test.ts`
- Create: `apps/merchant/src/pages/orders-list/_shared/stats.ts`
- Create: `apps/merchant/src/pages/orders-list/_shared/stats.test.ts`

**Interfaces:**
- Produces: `OrderSource`, `PaymentStatus`, `TimelineStage`, `TerminalState`, `OrderState`, `TIMELINE_STAGES`, `FILTER_PILL_STATES`, `OrderItem`, `OrderRecord` (types.ts); `STATE_STYLE`, `OrderAction`, `ACTION_THEME` (theme.ts); `orderRecords: readonly OrderRecord[]` (mock-data.ts); `OrdersStats`, `computeOrderStats(records)`, `pillCount(records, state)` (stats.ts).
- Consumes: nothing from other tasks (this is the foundation).

- [ ] **Step 1: Write `types.ts`**

```ts
// apps/merchant/src/pages/orders-list/_shared/types.ts
// The Orders page's own order model — deliberately separate from
// shared/api/mock-orders.ts's OrderStatus/OrderRow, which kds-page.tsx,
// kds-ticket-board.tsx and preorders/index.tsx still depend on unchanged.
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
}

export interface OrderRecord {
  id: string;
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
```

- [ ] **Step 2: Write `theme.ts`**

```ts
// apps/merchant/src/pages/orders-list/_shared/theme.ts
import type { OrderState } from "./types";

export interface StateStyle {
  text: string;
  bg: string;
  dot: string;
}

// Hex colors match this page's own design frames, not any shared token —
// Ready/Accepted share the violet family, Served is the app's usual
// accent blue, the rest follow the mockups' filter-pill dot colors.
export const STATE_STYLE: Record<OrderState, StateStyle> = {
  New: { text: "var(--octo-text-secondary)", bg: "var(--octo-track)", dot: "#94A3B8" },
  Accepted: { text: "#9333EA", bg: "#9333EA1A", dot: "#9333EA" },
  Preparing: { text: "#D97706", bg: "#D977061A", dot: "#D97706" },
  Ready: { text: "#9333EA", bg: "#9333EA1A", dot: "#9333EA" },
  Served: { text: "#0D6EFD", bg: "#0D6EFD1A", dot: "#0D6EFD" },
  Completed: { text: "#16A34A", bg: "#16A34A1A", dot: "#16A34A" },
  Refunded: { text: "#A16207", bg: "#A162071A", dot: "#A16207" },
  Voided: { text: "#6B7280", bg: "#6B72801A", dot: "#6B7280" },
  Canceled: { text: "#DC2626", bg: "#DC26261A", dot: "#DC2626" },
};

export type OrderAction = "cancel" | "void" | "wastage" | "refund";

export interface ActionTheme {
  accent: string;
}

export const ACTION_THEME: Record<OrderAction, ActionTheme> = {
  cancel: { accent: "#DC2626" },
  void: { accent: "#D97706" },
  wastage: { accent: "#7C3AED" },
  refund: { accent: "#A16207" },
};
```

- [ ] **Step 3: Write `stats.ts`**

```ts
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
```

- [ ] **Step 4: Write `mock-data.ts`**

```ts
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
```

- [ ] **Step 5: Write `mock-data.test.ts`**

```ts
// apps/merchant/src/pages/orders-list/_shared/mock-data.test.ts
import { describe, expect, it } from "vitest";
import { orderRecords } from "./mock-data";

describe("orderRecords", () => {
  it("produces exactly 140 seeded orders", () => {
    expect(orderRecords).toHaveLength(140);
  });

  it("matches the state counts the filter pills and stat cards rely on", () => {
    const counts = orderRecords.reduce<Record<string, number>>((acc, order) => {
      acc[order.state] = (acc[order.state] ?? 0) + 1;
      return acc;
    }, {});
    expect(counts).toEqual({
      New: 4,
      Accepted: 4,
      Preparing: 20,
      Ready: 12,
      Served: 55,
      Completed: 25,
      Refunded: 8,
      Voided: 6,
      Canceled: 6,
    });
  });

  it("gives every order a unique id", () => {
    const ids = new Set(orderRecords.map((order) => order.id));
    expect(ids.size).toBe(orderRecords.length);
  });

  it("only marks timeline stages up to and including lastStage as reached", () => {
    const voided = orderRecords.find((order) => order.state === "Voided");
    expect(voided?.lastStage).toBe("Preparing");
    expect(Object.keys(voided?.timeline ?? {})).toEqual(["New", "Accepted", "Preparing"]);
  });

  it("never leaves New/Accepted orders paid", () => {
    const early = orderRecords.filter((order) => order.state === "New" || order.state === "Accepted");
    expect(early.every((order) => order.payment === "Unpaid")).toBe(true);
  });
});
```

- [ ] **Step 6: Write `stats.test.ts`**

```ts
// apps/merchant/src/pages/orders-list/_shared/stats.test.ts
import { describe, expect, it } from "vitest";
import { orderRecords } from "./mock-data";
import { computeOrderStats, pillCount } from "./stats";

describe("computeOrderStats", () => {
  it("matches the seeded fixture's totals", () => {
    const stats = computeOrderStats(orderRecords);
    expect(stats.totalOrders).toBe(140);
    expect(stats.openOrders).toBe(40); // New 4 + Accepted 4 + Preparing 20 + Ready 12
    expect(stats.completed).toBe(25);
    expect(stats.cancelled).toBe(6);
    expect(stats.salesGrossSar).toBeGreaterThan(0);
  });

  it("excludes Voided and Canceled orders from sales gross", () => {
    const voidedAndCancelled = orderRecords.filter((o) => o.state === "Voided" || o.state === "Canceled");
    expect(computeOrderStats(voidedAndCancelled).salesGrossSar).toBe(0);
  });
});

describe("pillCount", () => {
  it("counts orders per state", () => {
    expect(pillCount(orderRecords, "Ready")).toBe(12);
    expect(pillCount(orderRecords, "Refunded")).toBe(8);
  });
});
```

- [ ] **Step 7: Run the new tests**

Run: `cd apps/merchant && npx vitest run src/pages/orders-list/_shared/mock-data.test.ts src/pages/orders-list/_shared/stats.test.ts`
Expected: 9 tests pass.

- [ ] **Step 8: Commit**

```bash
git add apps/merchant/src/pages/orders-list/_shared/types.ts apps/merchant/src/pages/orders-list/_shared/theme.ts apps/merchant/src/pages/orders-list/_shared/mock-data.ts apps/merchant/src/pages/orders-list/_shared/mock-data.test.ts apps/merchant/src/pages/orders-list/_shared/stats.ts apps/merchant/src/pages/orders-list/_shared/stats.test.ts
git commit -m "Add the Orders page's own order model, mock data, and stat aggregation"
```

---

### Task 2: Live-orders bridge

**Files:**
- Create: `apps/merchant/src/pages/orders-list/_shared/live-orders-bridge.ts`
- Create: `apps/merchant/src/pages/orders-list/_shared/live-orders-bridge.test.ts`

**Interfaces:**
- Consumes: `OrderRecord`, `OrderSource`, `TimelineStage`, `TIMELINE_STAGES` (Task 1, `types.ts`); `Order`, `OrderChannel`, `OrderStatus as CanonicalOrderStatus` from `@octopus/api-client`.
- Produces: `mapLiveOrderToRecord(order: Order): OrderRecord`, `mapLiveOrdersToRecords(orders: readonly Order[]): OrderRecord[]`.

- [ ] **Step 1: Write `live-orders-bridge.ts`**

```ts
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
```

- [ ] **Step 2: Write `live-orders-bridge.test.ts`**

```ts
// apps/merchant/src/pages/orders-list/_shared/live-orders-bridge.test.ts
import { describe, expect, it } from "vitest";
import type { Order } from "@octopus/api-client";
import { mapLiveOrderToRecord } from "./live-orders-bridge";

function fakeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: "oc-9001",
    tenantId: "t1",
    branchId: "b1",
    channel: "dine_in",
    status: "preparing",
    customerName: "Walk-in",
    customerPhone: "",
    deliveryAddress: null,
    tableNumber: "12",
    lines: [
      { lineId: "l1", menuItemId: "m1", name: "Beef Burger", unitPriceSar: 32, quantity: 2, modifiers: [], notes: "" },
    ],
    subtotalSar: 64,
    discountSar: 0,
    totalSar: 64,
    createdAt: "2026-05-16T18:00:00.000Z",
    updatedAt: "2026-05-16T18:00:00.000Z",
    ...overrides,
  };
}

describe("mapLiveOrderToRecord", () => {
  it("maps a dine-in preparing order", () => {
    const record = mapLiveOrderToRecord(fakeOrder());
    expect(record.id).toBe("#oc-9001");
    expect(record.source).toBe("QR Code");
    expect(record.state).toBe("Preparing");
    expect(record.lastStage).toBe("Preparing");
    expect(record.table).toBe("12");
    expect(record.items).toEqual([{ name: "Beef Burger", qty: 2, priceSar: 32 }]);
    expect(Object.keys(record.timeline)).toEqual(["New", "Accepted", "Preparing"]);
  });

  it("maps a cancelled order to the Canceled terminal state", () => {
    const record = mapLiveOrderToRecord(fakeOrder({ status: "cancelled" }));
    expect(record.state).toBe("Canceled");
    expect(record.lastStage).toBe("New");
  });

  it("maps delivery channels to Phone Order and out_for_delivery to Served", () => {
    const record = mapLiveOrderToRecord(fakeOrder({ channel: "delivery", status: "out_for_delivery" }));
    expect(record.source).toBe("Phone Order");
    expect(record.lastStage).toBe("Served");
  });

  it("maps kiosk channel to KIOSK Order", () => {
    const record = mapLiveOrderToRecord(fakeOrder({ channel: "kiosk", status: "ready" }));
    expect(record.source).toBe("KIOSK Order");
    expect(record.lastStage).toBe("Ready");
  });
});
```

- [ ] **Step 3: Run the new tests**

Run: `cd apps/merchant && npx vitest run src/pages/orders-list/_shared/live-orders-bridge.test.ts`
Expected: 4 tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/merchant/src/pages/orders-list/_shared/live-orders-bridge.ts apps/merchant/src/pages/orders-list/_shared/live-orders-bridge.test.ts
git commit -m "Bridge live customer orders into the Orders page's order model"
```

---

### Task 3: Add i18n keys for the rebuilt Orders page

**Files:**
- Modify: `packages/i18n/src/locales/en/index.ts`
- Modify: `packages/i18n/src/locales/ar/index.ts`

**Interfaces:** none (string dictionaries only). Every later task's `t("orders....")` call resolves against the keys added here.

- [ ] **Step 1: Update the existing subtitle in `en/index.ts`**

Find `"orders.subtitle": "Live orders across all channels for Al Bahri Group",` and replace it with:

```ts
  "orders.subtitle": "Monitor and manage all restaurant orders.",
```

(`orders.title`/`orders.liveOrders`/`orders.col.*`/`orders.filter.*`/`orders.lastUpdated`/`orders.updatedJustNow` stay exactly as they are — `orders.col.*`/`orders.filter.*`/the last-updated pair are shared with `order-history/index.tsx`; `orders.title` is reused unchanged by the new header.)

- [ ] **Step 2: Insert the new key block in `en/index.ts`**

Find `"orders.filter.reset": "Reset",` and insert immediately after it (before the existing `"orders.history.title"` line):

```ts
  "orders.stat.totalOrders": "Total Orders",
  "orders.stat.salesGross": "Sales Gross",
  "orders.stat.openOrders": "Open Orders",
  "orders.stat.deltaVsYesterday": "vs Yesterday",
  "orders.stat.cancelledLabel": "Cancelled",
  "orders.col.actions": "Actions",
  "orders.pill.all": "All Orders",
  "orders.state.new": "New",
  "orders.state.accepted": "Accepted",
  "orders.state.preparing": "Preparing",
  "orders.state.ready": "Ready",
  "orders.state.served": "Served",
  "orders.state.completed": "Completed",
  "orders.state.refunded": "Refunded",
  "orders.state.voided": "Voided",
  "orders.state.canceled": "Canceled",
  "orders.filter.sourceLabel": "Source",
  "orders.source.qrCode": "QR Code",
  "orders.source.pos": "POS Order",
  "orders.source.kiosk": "KIOSK Order",
  "orders.source.phone": "Phone Order",
  "orders.payment.online": "Paid Online",
  "orders.payment.cash": "Paid Cash",
  "orders.payment.unpaid": "Unpaid",
  "orders.payment.partial": "Partially Paid",
  "orders.row.guests": "{n} Guests",
  "orders.action.void": "Void",
  "orders.action.refund": "Refund",
  "orders.action.wastage": "Wastage",
  "orders.action.cancel": "Cancel",
  "orders.search.placeholder": "Search",
  "orders.export": "Export",
  "orders.empty.title": "No Orders Yet!",
  "orders.empty.description": "There are no orders to display right now. New orders will appear here once they're placed.",
  "orders.details.tableNo": "Table No:",
  "orders.details.guestNo": "Guest No:",
  "orders.details.waiter": "Waiter:",
  "orders.details.source": "Source:",
  "orders.details.summary": "Order Summary",
  "orders.details.items": "Items:",
  "orders.details.itemsValue": "{n} Items",
  "orders.details.courses": "Courses:",
  "orders.details.coursesValue": "{n} Courses",
  "orders.details.subtotal": "Subtotal:",
  "orders.details.tax": "Tax (15%):",
  "orders.details.total": "Total:",
  "orders.details.payment": "Payment",
  "orders.details.method": "Method:",
  "orders.details.paidAt": "Paid At:",
  "orders.details.transactionId": "Transaction ID:",
  "orders.details.timeline": "Timeline",
  "orders.details.pending": "Pending",
  "orders.note": "Note",
  "orders.notePlaceholder": "Add a note (optional)",
  "orders.next": "Next",
  "orders.cancel.title": "Cancel Order",
  "orders.cancel.scopeLabel": "Choose Cancellation Scope",
  "orders.cancel.scopeEntire": "Cancel Entire Order",
  "orders.cancel.scopeSpecific": "Cancel Specific Items",
  "orders.cancel.reasonLabel": "Cancellation Reason",
  "orders.cancel.reasonPlaceholder": "Choose cancellation reason",
  "orders.cancel.reason.wrongOrder": "Wrong order",
  "orders.cancel.reason.customerRequest": "Customer request",
  "orders.cancel.reason.outOfStock": "Item out of stock",
  "orders.cancel.reason.other": "Other",
  "orders.void.title": "Void Order",
  "orders.void.scopeEntire": "Void Entire Order",
  "orders.void.scopeSpecific": "Void Items",
  "orders.void.reasonLabel": "Voided Reason",
  "orders.void.reasonPlaceholder": "Choose voided reason",
  "orders.void.reason.wrongInput": "Wrong input",
  "orders.void.reason.duplicate": "Duplicate order",
  "orders.void.reason.testOrder": "Test order",
  "orders.void.reason.other": "Other",
  "orders.wastage.title": "Wastage Items",
  "orders.wastage.selectLabel": "Select Items & Quantity",
  "orders.wastage.reasonLabel": "Wastage Reason",
  "orders.wastage.reasonPlaceholder": "Choose wastage reason",
  "orders.wastage.reason.overcooked": "Overcooked",
  "orders.wastage.reason.dropped": "Dropped",
  "orders.wastage.reason.expired": "Expired ingredients",
  "orders.wastage.reason.other": "Other",
  "orders.refund.title": "Refund Order",
  "orders.refund.typeLabel": "Choose Refund Type",
  "orders.refund.typeFull": "Full Refund",
  "orders.refund.typePartial": "Partial Refund",
  "orders.refund.methodLabel": "Select Items Or Amount",
  "orders.refund.methodItems": "Items",
  "orders.refund.methodAmount": "Amount",
  "orders.refund.amountPlaceholder": "Enter refund amount",
  "orders.refund.maxAmount": "Max Refund Amount:",
  "orders.refund.amountFieldLabel": "Refund Amount",
  "orders.refund.amountSummary": "Refund Amount:",
  "orders.refund.reasonLabel": "Refund Reason",
  "orders.refund.reasonPlaceholder": "Choose refund reason",
  "orders.refund.reason.wrongInput": "Wrong input",
  "orders.refund.reason.customerComplaint": "Customer complaint",
  "orders.refund.reason.qualityIssue": "Quality issue",
  "orders.refund.reason.other": "Other",
  "orders.refund.selectedSummary": "Selected: {n} Items",
  "orders.refund.unpaidNotice": "Nothing to refund — this order is unpaid.",
  "orders.managerAuth.title": "Manager Authentication & Security",
  "orders.managerAuth.role": "Restaurant Manager",
  "orders.managerAuth.pinDigitLabel": "PIN digit {n}",
  "orders.managerAuth.prompt.cancel": "Please enter your PIN to confirm the cancellation.",
  "orders.managerAuth.prompt.void": "Please enter your PIN to confirm the avoided.",
  "orders.managerAuth.prompt.wastage": "Please enter your PIN to confirm the wastage.",
  "orders.managerAuth.prompt.refund": "Please enter your PIN to confirm the refund.",
  "orders.managerAuth.confirm.cancel": "Confirm Cancellation",
  "orders.managerAuth.confirm.void": "Confirm Avoid",
  "orders.managerAuth.confirm.wastage": "Confirm Wastage",
  "orders.managerAuth.confirm.refund": "Confirm Refund",
  "orders.result.cancelTitle": "Order Cancelled!",
  "orders.result.cancelSubtitle": "Order {id} was cancelled on {date}.",
  "orders.result.cancelLine1": "Payment: No payment was processed.",
  "orders.result.cancelLine2": "Inventory: No ingredients or stock items were wasted.",
  "orders.result.cancelLine3": "Customer: The customer has been notified.",
  "orders.result.voidTitle": "Order Voided!",
  "orders.result.voidSubtitle": "Order {id} was voided on {date}.",
  "orders.result.voidLine1": "Payment reversed.",
  "orders.result.voidLine2": "Inventory not impacted.",
  "orders.result.wastageTitle": "Wastage Recorded",
  "orders.result.wastageSubtitle": "Order {id} was recorded on {date}.",
  "orders.result.wastageLine1": "Inventory reduced.",
  "orders.result.wastageLine2": "No financial refund.",
  "orders.result.done": "Done",
  "orders.result.processingRefundTitle": "Processing Refund!",
  "orders.result.processingRefundSubtitle": "Your refund of {amount} is being processed. This may take a few moments.",
  "orders.result.refundPendingTitle": "Refund Processing!",
  "orders.result.refundPendingSubtitle": "Your refund request has been submitted and is being processed by the payment provider.",
  "orders.result.refundPendingNote": "Refund ID: {refundId}, Processing",
  "orders.result.refundSuccessTitle": "Refund Successful!",
  "orders.result.refundSuccessSubtitle": "{amount} has been refunded to {method}.",
  "orders.result.refundSuccessNote": "Refund ID: {refundId}, at {time}, Refund Type: {type}",
  "orders.result.refundFailedTitle": "Refund Failed!",
  "orders.result.refundFailedSubtitle": "We couldn't process the {amount} refund. No refund was completed.",
  "orders.result.refundFailedReason": "Reason: Payment provider declined the refund.",
  "orders.result.tryAgain": "Try Again",
  "orders.result.cashRefundTitle": "Cash Refund Recorded!",
  "orders.result.cashRefundSubtitle": "{amount} cash refund has been recorded, and the order has been updated.",
  "orders.result.cashRefundNote": "Audit ID: {refundId}, at {time}, Refund Type: {type}",
```

- [ ] **Step 3: Update the existing subtitle in `ar/index.ts`**

Find `"orders.subtitle": "الطلبات المباشرة عبر جميع القنوات لمجموعة البحر الأحمر",` and replace it with:

```ts
  "orders.subtitle": "راقب وأدر جميع طلبات المطعم.",
```

- [ ] **Step 4: Insert the mirrored key block in `ar/index.ts`**

Find `"orders.filter.reset": "إعادة تعيين",` and insert immediately after it (before the existing `"orders.history.title"` line) — same key order as Step 2:

```ts
  "orders.stat.totalOrders": "إجمالي الطلبات",
  "orders.stat.salesGross": "إجمالي المبيعات",
  "orders.stat.openOrders": "الطلبات المفتوحة",
  "orders.stat.deltaVsYesterday": "مقارنة بالأمس",
  "orders.stat.cancelledLabel": "ملغاة",
  "orders.col.actions": "الإجراءات",
  "orders.pill.all": "كل الطلبات",
  "orders.state.new": "جديد",
  "orders.state.accepted": "مقبول",
  "orders.state.preparing": "قيد التحضير",
  "orders.state.ready": "جاهز",
  "orders.state.served": "تم التقديم",
  "orders.state.completed": "مكتمل",
  "orders.state.refunded": "مسترد",
  "orders.state.voided": "مُبطل",
  "orders.state.canceled": "ملغى",
  "orders.filter.sourceLabel": "المصدر",
  "orders.source.qrCode": "رمز QR",
  "orders.source.pos": "طلب نقطة بيع",
  "orders.source.kiosk": "طلب كشك",
  "orders.source.phone": "طلب هاتفي",
  "orders.payment.online": "مدفوع إلكترونيًا",
  "orders.payment.cash": "مدفوع نقدًا",
  "orders.payment.unpaid": "غير مدفوع",
  "orders.payment.partial": "مدفوع جزئيًا",
  "orders.row.guests": "{n} ضيوف",
  "orders.action.void": "إبطال",
  "orders.action.refund": "استرداد",
  "orders.action.wastage": "هدر",
  "orders.action.cancel": "إلغاء",
  "orders.search.placeholder": "بحث",
  "orders.export": "تصدير",
  "orders.empty.title": "لا توجد طلبات بعد!",
  "orders.empty.description": "لا توجد طلبات لعرضها حاليًا. ستظهر الطلبات الجديدة هنا فور تقديمها.",
  "orders.details.tableNo": "رقم الطاولة:",
  "orders.details.guestNo": "عدد الضيوف:",
  "orders.details.waiter": "النادل:",
  "orders.details.source": "المصدر:",
  "orders.details.summary": "ملخص الطلب",
  "orders.details.items": "الأصناف:",
  "orders.details.itemsValue": "{n} صنف",
  "orders.details.courses": "الأطباق:",
  "orders.details.coursesValue": "{n} أطباق",
  "orders.details.subtotal": "الإجمالي الفرعي:",
  "orders.details.tax": "الضريبة (15%):",
  "orders.details.total": "الإجمالي:",
  "orders.details.payment": "الدفع",
  "orders.details.method": "الطريقة:",
  "orders.details.paidAt": "وقت الدفع:",
  "orders.details.transactionId": "رقم العملية:",
  "orders.details.timeline": "المخطط الزمني",
  "orders.details.pending": "قيد الانتظار",
  "orders.note": "ملاحظة",
  "orders.notePlaceholder": "أضف ملاحظة (اختياري)",
  "orders.next": "التالي",
  "orders.cancel.title": "إلغاء الطلب",
  "orders.cancel.scopeLabel": "اختر نطاق الإلغاء",
  "orders.cancel.scopeEntire": "إلغاء الطلب بالكامل",
  "orders.cancel.scopeSpecific": "إلغاء أصناف محددة",
  "orders.cancel.reasonLabel": "سبب الإلغاء",
  "orders.cancel.reasonPlaceholder": "اختر سبب الإلغاء",
  "orders.cancel.reason.wrongOrder": "طلب خاطئ",
  "orders.cancel.reason.customerRequest": "طلب العميل",
  "orders.cancel.reason.outOfStock": "الصنف غير متوفر",
  "orders.cancel.reason.other": "أخرى",
  "orders.void.title": "إبطال الطلب",
  "orders.void.scopeEntire": "إبطال الطلب بالكامل",
  "orders.void.scopeSpecific": "إبطال أصناف",
  "orders.void.reasonLabel": "سبب الإبطال",
  "orders.void.reasonPlaceholder": "اختر سبب الإبطال",
  "orders.void.reason.wrongInput": "إدخال خاطئ",
  "orders.void.reason.duplicate": "طلب مكرر",
  "orders.void.reason.testOrder": "طلب تجريبي",
  "orders.void.reason.other": "أخرى",
  "orders.wastage.title": "أصناف الهدر",
  "orders.wastage.selectLabel": "اختر الأصناف والكمية",
  "orders.wastage.reasonLabel": "سبب الهدر",
  "orders.wastage.reasonPlaceholder": "اختر سبب الهدر",
  "orders.wastage.reason.overcooked": "طهي زائد",
  "orders.wastage.reason.dropped": "سقط أثناء التحضير",
  "orders.wastage.reason.expired": "مكونات منتهية الصلاحية",
  "orders.wastage.reason.other": "أخرى",
  "orders.refund.title": "استرداد الطلب",
  "orders.refund.typeLabel": "اختر نوع الاسترداد",
  "orders.refund.typeFull": "استرداد كامل",
  "orders.refund.typePartial": "استرداد جزئي",
  "orders.refund.methodLabel": "اختر الأصناف أو المبلغ",
  "orders.refund.methodItems": "الأصناف",
  "orders.refund.methodAmount": "المبلغ",
  "orders.refund.amountPlaceholder": "أدخل مبلغ الاسترداد",
  "orders.refund.maxAmount": "الحد الأقصى للاسترداد:",
  "orders.refund.amountFieldLabel": "مبلغ الاسترداد",
  "orders.refund.amountSummary": "مبلغ الاسترداد:",
  "orders.refund.reasonLabel": "سبب الاسترداد",
  "orders.refund.reasonPlaceholder": "اختر سبب الاسترداد",
  "orders.refund.reason.wrongInput": "إدخال خاطئ",
  "orders.refund.reason.customerComplaint": "شكوى عميل",
  "orders.refund.reason.qualityIssue": "مشكلة في الجودة",
  "orders.refund.reason.other": "أخرى",
  "orders.refund.selectedSummary": "المحدد: {n} صنف",
  "orders.refund.unpaidNotice": "لا يوجد مبلغ لاسترداده — هذا الطلب غير مدفوع.",
  "orders.managerAuth.title": "مصادقة المدير والأمان",
  "orders.managerAuth.role": "مدير المطعم",
  "orders.managerAuth.pinDigitLabel": "الرقم {n} من الرمز السري",
  "orders.managerAuth.prompt.cancel": "يرجى إدخال الرمز السري لتأكيد الإلغاء.",
  "orders.managerAuth.prompt.void": "يرجى إدخال الرمز السري لتأكيد الإبطال.",
  "orders.managerAuth.prompt.wastage": "يرجى إدخال الرمز السري لتأكيد الهدر.",
  "orders.managerAuth.prompt.refund": "يرجى إدخال الرمز السري لتأكيد الاسترداد.",
  "orders.managerAuth.confirm.cancel": "تأكيد الإلغاء",
  "orders.managerAuth.confirm.void": "تأكيد الإبطال",
  "orders.managerAuth.confirm.wastage": "تأكيد الهدر",
  "orders.managerAuth.confirm.refund": "تأكيد الاسترداد",
  "orders.result.cancelTitle": "تم إلغاء الطلب!",
  "orders.result.cancelSubtitle": "تم إلغاء الطلب {id} في {date}.",
  "orders.result.cancelLine1": "الدفع: لم تتم معالجة أي دفعة.",
  "orders.result.cancelLine2": "المخزون: لم يتم هدر أي مكونات أو أصناف مخزون.",
  "orders.result.cancelLine3": "العميل: تم إشعار العميل.",
  "orders.result.voidTitle": "تم إبطال الطلب!",
  "orders.result.voidSubtitle": "تم إبطال الطلب {id} في {date}.",
  "orders.result.voidLine1": "تم عكس الدفعة.",
  "orders.result.voidLine2": "لم يتأثر المخزون.",
  "orders.result.wastageTitle": "تم تسجيل الهدر",
  "orders.result.wastageSubtitle": "تم تسجيل الطلب {id} في {date}.",
  "orders.result.wastageLine1": "تم تخفيض المخزون.",
  "orders.result.wastageLine2": "لا يوجد استرداد مالي.",
  "orders.result.done": "تم",
  "orders.result.processingRefundTitle": "جارٍ معالجة الاسترداد!",
  "orders.result.processingRefundSubtitle": "جارٍ معالجة استرداد {amount}. قد يستغرق هذا بضع لحظات.",
  "orders.result.refundPendingTitle": "الاسترداد قيد المعالجة!",
  "orders.result.refundPendingSubtitle": "تم إرسال طلب الاسترداد وهو قيد المعالجة من قبل مزود الدفع.",
  "orders.result.refundPendingNote": "رقم الاسترداد: {refundId}، قيد المعالجة",
  "orders.result.refundSuccessTitle": "تم الاسترداد بنجاح!",
  "orders.result.refundSuccessSubtitle": "تم استرداد {amount} إلى {method}.",
  "orders.result.refundSuccessNote": "رقم الاسترداد: {refundId}، في {time}، نوع الاسترداد: {type}",
  "orders.result.refundFailedTitle": "فشل الاسترداد!",
  "orders.result.refundFailedSubtitle": "تعذّرت معالجة استرداد {amount}. لم يتم أي استرداد.",
  "orders.result.refundFailedReason": "السبب: رفض مزود الدفع عملية الاسترداد.",
  "orders.result.tryAgain": "أعد المحاولة",
  "orders.result.cashRefundTitle": "تم تسجيل الاسترداد النقدي!",
  "orders.result.cashRefundSubtitle": "تم تسجيل استرداد نقدي بقيمة {amount}، وتم تحديث الطلب.",
  "orders.result.cashRefundNote": "رقم التدقيق: {refundId}، في {time}، نوع الاسترداد: {type}",
```

- [ ] **Step 5: Typecheck both locale files**

Run: `cd packages/i18n && npx tsc --noEmit -p .`
Expected: no errors (confirms no duplicate-key or syntax mistakes).

- [ ] **Step 6: Commit**

```bash
git add packages/i18n/src/locales/en/index.ts packages/i18n/src/locales/ar/index.ts
git commit -m "Add i18n keys for the rebuilt Orders page"
```

---

### Task 4: Timeline stepper — stage logic + component

**Files:**
- Create: `apps/merchant/src/pages/orders-list/_shared/stepper-stages.ts`
- Create: `apps/merchant/src/pages/orders-list/_shared/stepper-stages.test.ts`
- Create: `apps/merchant/src/pages/orders-list/_shared/stepper.tsx`

**Interfaces:**
- Consumes: `OrderRecord`, `TimelineStage`, `TIMELINE_STAGES` (Task 1 `types.ts`); `STATE_STYLE` (Task 1 `theme.ts`); `useI18n` (`@/app/providers/i18n-provider`); `orders.state.*` keys (Task 3).
- Produces: `StageStatus`, `stageStatuses(order): StageStatus[]` (`stepper-stages.ts`); `Stepper` component (`stepper.tsx`), used by Task 6 (`order-row.tsx`) and Task 8 (`order-details-modal.tsx`).

- [ ] **Step 1: Write `stepper-stages.ts`**

```ts
// apps/merchant/src/pages/orders-list/_shared/stepper-stages.ts
import { TIMELINE_STAGES, type OrderRecord, type TimelineStage } from "./types";

export interface StageStatus {
  stage: TimelineStage;
  done: boolean;
  timestamp?: string;
}

// A terminal order (Voided/Refunded/Canceled) freezes the stepper at
// `lastStage` — the last stage it actually reached before the terminal
// event — rather than at `state`, which for a terminal order isn't one
// of the 6 stages at all.
export function stageStatuses(order: OrderRecord): StageStatus[] {
  const currentIndex = TIMELINE_STAGES.indexOf(order.lastStage);
  return TIMELINE_STAGES.map((stage, index) => ({
    stage,
    done: index <= currentIndex,
    timestamp: order.timeline[stage],
  }));
}
```

- [ ] **Step 2: Write `stepper-stages.test.ts`**

```ts
// apps/merchant/src/pages/orders-list/_shared/stepper-stages.test.ts
import { describe, expect, it } from "vitest";
import { stageStatuses } from "./stepper-stages";
import type { OrderRecord } from "./types";

function order(overrides: Partial<OrderRecord> = {}): OrderRecord {
  return {
    id: "#ORD-1",
    date: "May 16, 2026",
    table: "Table 1",
    guests: 2,
    totalSar: 100,
    source: "QR Code",
    payment: "Paid Online",
    state: "Preparing",
    lastStage: "Preparing",
    timeline: { New: "t0", Accepted: "t1", Preparing: "t2" },
    items: [],
    courses: 1,
    subtotalSar: 87,
    taxSar: 13,
    ...overrides,
  };
}

describe("stageStatuses", () => {
  it("marks stages up to and including lastStage as done", () => {
    const statuses = stageStatuses(order());
    expect(statuses.map((s) => [s.stage, s.done])).toEqual([
      ["New", true],
      ["Accepted", true],
      ["Preparing", true],
      ["Ready", false],
      ["Served", false],
      ["Completed", false],
    ]);
  });

  it("marks every stage done for a Completed order", () => {
    const statuses = stageStatuses(order({ state: "Completed", lastStage: "Completed" }));
    expect(statuses.every((s) => s.done)).toBe(true);
  });

  it("freezes a terminal order's stepper at lastStage, not at state", () => {
    const statuses = stageStatuses(order({ state: "Voided", lastStage: "Ready" }));
    expect(statuses.map((s) => [s.stage, s.done])).toEqual([
      ["New", true],
      ["Accepted", true],
      ["Preparing", true],
      ["Ready", true],
      ["Served", false],
      ["Completed", false],
    ]);
  });

  it("carries the timeline timestamp for each stage", () => {
    const statuses = stageStatuses(order());
    expect(statuses.find((s) => s.stage === "Preparing")?.timestamp).toBe("t2");
    expect(statuses.find((s) => s.stage === "Ready")?.timestamp).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run the new tests**

Run: `cd apps/merchant && npx vitest run src/pages/orders-list/_shared/stepper-stages.test.ts`
Expected: 4 tests pass.

- [ ] **Step 4: Write `stepper.tsx`**

```tsx
// apps/merchant/src/pages/orders-list/_shared/stepper.tsx
import { Check } from "lucide-react";
import { useI18n } from "@/app/providers/i18n-provider";
import { STATE_STYLE } from "./theme";
import { stageStatuses } from "./stepper-stages";
import type { OrderRecord, OrderState, TimelineStage } from "./types";

const STAGE_LABEL_KEY: Record<TimelineStage, string> = {
  New: "orders.state.new",
  Accepted: "orders.state.accepted",
  Preparing: "orders.state.preparing",
  Ready: "orders.state.ready",
  Served: "orders.state.served",
  Completed: "orders.state.completed",
};

export const STATE_LABEL_KEY: Record<OrderState, string> = {
  ...STAGE_LABEL_KEY,
  Refunded: "orders.state.refunded",
  Voided: "orders.state.voided",
  Canceled: "orders.state.canceled",
};

export function Stepper({ order, className }: { order: OrderRecord; className?: string }) {
  const { t } = useI18n();
  const stages = stageStatuses(order);
  const pill = STATE_STYLE[order.state];

  return (
    <div className={className}>
      <div className="flex items-start">
        {stages.map((stage, index) => (
          <div key={stage.stage} className="flex flex-1 flex-col items-center last:flex-none last:items-end">
            <div className="flex w-full items-center">
              <span
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${
                  stage.done ? "bg-[#16A34A] text-white" : "bg-[var(--octo-track)] text-[var(--octo-text-faint)]"
                }`}
              >
                <Check size={11} strokeWidth={3} />
              </span>
              {index < stages.length - 1 && (
                <span className={`h-px flex-1 ${stage.done ? "bg-[#16A34A]" : "bg-[var(--octo-divider)]"}`} />
              )}
            </div>
            <span className="mt-1 whitespace-nowrap text-[10.5px] text-[var(--octo-text-faint)]">
              {t(STAGE_LABEL_KEY[stage.stage])}
            </span>
          </div>
        ))}
      </div>
      <span className="mt-1 inline-block text-[11px] font-semibold" style={{ color: pill.text }}>
        {t(STATE_LABEL_KEY[order.state])}
      </span>
    </div>
  );
}
```

- [ ] **Step 5: Typecheck**

Run: `cd apps/merchant && npx tsc --noEmit -p .`
Expected: no errors (the new files aren't imported anywhere yet, but must still typecheck standalone).

- [ ] **Step 6: Commit**

```bash
git add apps/merchant/src/pages/orders-list/_shared/stepper-stages.ts apps/merchant/src/pages/orders-list/_shared/stepper-stages.test.ts apps/merchant/src/pages/orders-list/_shared/stepper.tsx
git commit -m "Add the Orders page's 6-step order timeline"
```

---

### Task 5: Stat cards, filter pills, source popover, CSV export

**Files:**
- Create: `apps/merchant/src/pages/orders-list/_shared/stat-cards.tsx`
- Create: `apps/merchant/src/pages/orders-list/_shared/filter-pills.tsx`
- Create: `apps/merchant/src/pages/orders-list/_shared/source-filter-popover.tsx`
- Create: `apps/merchant/src/pages/orders-list/_shared/csv-export.ts`
- Create: `apps/merchant/src/pages/orders-list/_shared/csv-export.test.ts`

**Interfaces:**
- Consumes: `OrdersStats` (Task 1 `stats.ts`); `OrderState`, `OrderSource`, `FILTER_PILL_STATES`, `OrderRecord` (Task 1 `types.ts`); `STATE_STYLE` (Task 1 `theme.ts`); `formatSar` from `@octopus/api-client`.
- Produces: `OrdersStatCards({ stats })`, `OrderFilterPills({ selected, onSelect, countAll, countByState })`, `SourceFilterPopover({ selected, onChange })`, `ordersToCsv(rows): string` — all consumed by Task 7 (`index.tsx`).

- [ ] **Step 1: Write `stat-cards.tsx`**

```tsx
// apps/merchant/src/pages/orders-list/_shared/stat-cards.tsx
import type { ComponentType } from "react";
import { CheckCircle2, RotateCw, TrendingUp, UtensilsCrossed, XCircle } from "lucide-react";
import { formatSar } from "@octopus/api-client";
import { useI18n } from "@/app/providers/i18n-provider";
import type { OrdersStats } from "./stats";

const CARDS: readonly {
  key: keyof OrdersStats;
  icon: ComponentType<{ className?: string }>;
  tile: string;
  cardBg: string;
  labelKey: string;
  money?: boolean;
}[] = [
  { key: "totalOrders", icon: UtensilsCrossed, tile: "#0D6EFD", cardBg: "bg-[#0D6EFD]/[0.06]", labelKey: "orders.stat.totalOrders" },
  { key: "salesGrossSar", icon: TrendingUp, tile: "#D97706", cardBg: "bg-[#D97706]/[0.06]", labelKey: "orders.stat.salesGross", money: true },
  { key: "openOrders", icon: RotateCw, tile: "#64748B", cardBg: "bg-[var(--octo-track)]", labelKey: "orders.stat.openOrders" },
  { key: "completed", icon: CheckCircle2, tile: "#16A34A", cardBg: "bg-[#16A34A]/[0.06]", labelKey: "orders.state.completed" },
  { key: "cancelled", icon: XCircle, tile: "#DC2626", cardBg: "bg-[#DC2626]/[0.06]", labelKey: "orders.stat.cancelledLabel" },
];

export function OrdersStatCards({ stats }: { stats: OrdersStats }) {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {CARDS.map(({ key, icon: Icon, tile, cardBg, labelKey, money }) => (
        <div key={key} className={`rounded-xl p-[18px] ${cardBg}`}>
          <div className="grid h-9 w-9 place-items-center rounded-[10px]" style={{ backgroundColor: tile }}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div className="mt-4 whitespace-nowrap text-[26px] font-bold leading-none text-[var(--octo-text-primary)]">
            {money ? formatSar(stats[key]) : stats[key]}
          </div>
          <div className="mt-1 text-[12px] text-[var(--octo-text-muted)]">{t(labelKey)}</div>
          <div className="mt-1.5 flex items-center gap-1.5 text-[11.5px]">
            <TrendingUp size={13} className="text-[#16A34A]" strokeWidth={2.5} />
            {/* No day-over-day history exists in this mock fixture, so — like
                pages/reservations/_shared/kpi-cards.tsx — this is a fixed
                figure lifted from the mockup, not a computed comparison. */}
            <span className="font-semibold text-[#16A34A]">3.46%</span>
            <span className="text-[var(--octo-text-faint)]">{t("orders.stat.deltaVsYesterday")}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Write `filter-pills.tsx`**

```tsx
// apps/merchant/src/pages/orders-list/_shared/filter-pills.tsx
import { useI18n } from "@/app/providers/i18n-provider";
import { STATE_STYLE } from "./theme";
import { STATE_LABEL_KEY } from "./stepper";
import { FILTER_PILL_STATES, type OrderState } from "./types";

export function OrderFilterPills({
  selected,
  onSelect,
  countAll,
  countByState,
}: {
  selected: OrderState | null;
  onSelect: (state: OrderState | null) => void;
  countAll: number;
  countByState: (state: OrderState) => number;
}) {
  const { t } = useI18n();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <PillButton active={selected === null} onClick={() => onSelect(null)} dotColor="#0D6EFD" label={t("orders.pill.all")} count={countAll} />
      {FILTER_PILL_STATES.map((state) => (
        <PillButton
          key={state}
          active={selected === state}
          onClick={() => onSelect(state)}
          dotColor={STATE_STYLE[state].dot}
          label={t(STATE_LABEL_KEY[state])}
          count={countByState(state)}
        />
      ))}
    </div>
  );
}

function PillButton({
  active,
  onClick,
  dotColor,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  dotColor: string;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-[7px] text-[12px] font-medium transition-colors ${
        active
          ? "border-[#0D6EFD] bg-[#0D6EFD] text-white"
          : "border-[var(--octo-border-input)] bg-[var(--octo-card)] text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: active ? "#fff" : dotColor }} />
      {label}
      <span className={`rounded-full px-1.5 py-px text-[10.5px] ${active ? "bg-white/20" : "bg-[var(--octo-track)] text-[var(--octo-text-muted)]"}`}>
        {count}
      </span>
    </button>
  );
}
```

Note: `STATE_LABEL_KEY` is exported from `stepper.tsx` (Task 4) rather than redefined here, so the pill labels and the per-row status-pill labels can never drift apart.

- [ ] **Step 3: Write `source-filter-popover.tsx`**

```tsx
// apps/merchant/src/pages/orders-list/_shared/source-filter-popover.tsx
import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Checkbox } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import type { OrderSource } from "./types";

const SOURCE_LABEL_KEY: Record<OrderSource, string> = {
  "QR Code": "orders.source.qrCode",
  "POS Order": "orders.source.pos",
  "KIOSK Order": "orders.source.kiosk",
  "Phone Order": "orders.source.phone",
};

const ALL_SOURCES: readonly OrderSource[] = ["QR Code", "POS Order", "KIOSK Order", "Phone Order"];

export function SourceFilterPopover({
  selected,
  onChange,
}: {
  selected: readonly OrderSource[];
  onChange: (next: readonly OrderSource[]) => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  function toggle(source: OrderSource) {
    onChange(selected.includes(source) ? selected.filter((s) => s !== source) : [...selected, source]);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="grid h-[34px] w-[34px] place-items-center rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)]"
      >
        <SlidersHorizontal size={14} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t("orders.filter.sourceLabel")}
          className="absolute start-0 top-[calc(100%+6px)] z-30 w-[200px] rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-3.5 shadow-lg"
        >
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
            {t("orders.filter.sourceLabel")}
          </p>
          <div className="mt-2 flex flex-col gap-2">
            {ALL_SOURCES.map((source) => (
              <Checkbox key={source} label={t(SOURCE_LABEL_KEY[source])} checked={selected.includes(source)} onChange={() => toggle(source)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Write `csv-export.ts`**

```ts
// apps/merchant/src/pages/orders-list/_shared/csv-export.ts
import type { OrderRecord } from "./types";

function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function ordersToCsv(rows: readonly OrderRecord[]): string {
  const header = ["Order", "Date", "Table", "Guests", "Source", "Payment", "Status", "Total (SAR)"];
  const lines = rows.map((row) =>
    [
      row.id,
      row.date,
      row.table ?? "",
      row.guests != null ? String(row.guests) : "",
      row.source,
      row.payment,
      row.state,
      row.totalSar.toFixed(2),
    ]
      .map(escapeCsvField)
      .join(",")
  );
  return [header.join(","), ...lines].join("\n");
}
```

- [ ] **Step 5: Write `csv-export.test.ts`**

```ts
// apps/merchant/src/pages/orders-list/_shared/csv-export.test.ts
import { describe, expect, it } from "vitest";
import { ordersToCsv } from "./csv-export";
import type { OrderRecord } from "./types";

function order(overrides: Partial<OrderRecord> = {}): OrderRecord {
  return {
    id: "#ORD-2001",
    date: "May 16, 2026",
    table: "Table 12",
    guests: 4,
    totalSar: 186,
    source: "QR Code",
    payment: "Paid Online",
    state: "Completed",
    lastStage: "Completed",
    timeline: {},
    items: [],
    courses: 1,
    subtotalSar: 160,
    taxSar: 26,
    ...overrides,
  };
}

describe("ordersToCsv", () => {
  it("writes a header row followed by one row per order", () => {
    const csv = ordersToCsv([order()]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("Order,Date,Table,Guests,Source,Payment,Status,Total (SAR)");
    // The date field itself contains a comma, so it's quoted.
    expect(lines[1]).toBe('#ORD-2001,"May 16, 2026",Table 12,4,QR Code,Paid Online,Completed,186.00');
  });

  it("escapes fields containing commas or quotes", () => {
    const csv = ordersToCsv([order({ table: 'Table "A", VIP' })]);
    expect(csv.split("\n")[1]).toContain('"Table ""A"", VIP"');
  });

  it("renders null table/guests as empty fields", () => {
    const csv = ordersToCsv([order({ table: null, guests: null })]);
    const line = csv.split("\n")[1];
    expect(line).toContain(",,,QR Code,");
  });
});
```

- [ ] **Step 6: Run the new tests**

Run: `cd apps/merchant && npx vitest run src/pages/orders-list/_shared/csv-export.test.ts`
Expected: 3 tests pass.

- [ ] **Step 7: Typecheck**

Run: `cd apps/merchant && npx tsc --noEmit -p .`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add apps/merchant/src/pages/orders-list/_shared/stat-cards.tsx apps/merchant/src/pages/orders-list/_shared/filter-pills.tsx apps/merchant/src/pages/orders-list/_shared/source-filter-popover.tsx apps/merchant/src/pages/orders-list/_shared/csv-export.ts apps/merchant/src/pages/orders-list/_shared/csv-export.test.ts
git commit -m "Add Orders stat cards, filter pills, source popover, and CSV export"
```

---

### Task 6: Order row — desktop table row + mobile card + action buttons

**Files:**
- Create: `apps/merchant/src/pages/orders-list/_shared/order-row.tsx`

**Interfaces:**
- Consumes: `OrderRecord` (Task 1 `types.ts`); `OrderAction` (Task 1 `theme.ts`); `Stepper` (Task 4 `stepper.tsx`); `TD`, `TR` (`@ui/primitives`); `formatSar` (`@octopus/api-client`).
- Produces: `OrderActionButtons`, `OrderTableRow`, `OrderCard` — consumed by Task 7 (`index.tsx`).

- [ ] **Step 1: Write `order-row.tsx`**

```tsx
// apps/merchant/src/pages/orders-list/_shared/order-row.tsx
import { ChevronDown } from "lucide-react";
import { formatSar } from "@octopus/api-client";
import { TD, TR } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { Stepper } from "./stepper";
import type { OrderAction } from "./theme";
import type { OrderRecord } from "./types";

const PAYMENT_LABEL_KEY: Record<OrderRecord["payment"], string> = {
  "Paid Online": "orders.payment.online",
  "Paid Cash": "orders.payment.cash",
  Unpaid: "orders.payment.unpaid",
  "Partially Paid": "orders.payment.partial",
};

const SOURCE_LABEL_KEY: Record<OrderRecord["source"], string> = {
  "QR Code": "orders.source.qrCode",
  "POS Order": "orders.source.pos",
  "KIOSK Order": "orders.source.kiosk",
  "Phone Order": "orders.source.phone",
};

const ACTION_BUTTONS: readonly { action: OrderAction; labelKey: string; className: string }[] = [
  { action: "void", labelKey: "orders.action.void", className: "border-[var(--octo-border-input)] text-[var(--octo-text-secondary)]" },
  { action: "refund", labelKey: "orders.action.refund", className: "border-[#A16207]/30 bg-[#A16207]/10 text-[#A16207]" },
  { action: "wastage", labelKey: "orders.action.wastage", className: "border-[#7C3AED]/30 bg-[#7C3AED]/10 text-[#7C3AED]" },
  { action: "cancel", labelKey: "orders.action.cancel", className: "border-[#DC2626]/30 bg-[#DC2626]/10 text-[#DC2626]" },
];

export function OrderActionButtons({
  order,
  onAction,
  className,
}: {
  order: OrderRecord;
  onAction: (action: OrderAction, order: OrderRecord) => void;
  className?: string;
}) {
  const { t } = useI18n();

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className ?? ""}`}>
      {ACTION_BUTTONS.map(({ action, labelKey, className: btnClassName }) => (
        <button
          key={action}
          type="button"
          onClick={() => onAction(action, order)}
          className={`rounded-[8px] border px-2.5 py-[5px] text-[11.5px] font-medium transition-opacity hover:opacity-80 ${btnClassName}`}
        >
          {t(labelKey)}
        </button>
      ))}
    </div>
  );
}

export function OrderTableRow({
  order,
  onOpenDetails,
  onAction,
}: {
  order: OrderRecord;
  onOpenDetails: (order: OrderRecord) => void;
  onAction: (action: OrderAction, order: OrderRecord) => void;
}) {
  const { t } = useI18n();

  return (
    <TR>
      <TD className="align-top">
        <button type="button" onClick={() => onOpenDetails(order)} className="font-semibold text-[#0D6EFD] hover:underline">
          {order.id}
        </button>
        <div className="mt-0.5 text-[11.5px] text-[var(--octo-text-faint)]">{order.date}</div>
        <div className="mt-0.5 text-[11px] text-[var(--octo-text-muted)]">{t(SOURCE_LABEL_KEY[order.source])}</div>
      </TD>
      <TD className="align-top">
        {order.table && <div>{order.table}</div>}
        {order.guests != null && (
          <div className="text-[11.5px] text-[var(--octo-text-muted)]">
            {t("orders.row.guests").replace("{n}", String(order.guests))}
          </div>
        )}
      </TD>
      <TD className="align-top">
        <div className="font-medium text-[var(--octo-text-primary)]">{formatSar(order.totalSar)}</div>
        <div className="text-[11.5px] text-[var(--octo-text-muted)]">{t(PAYMENT_LABEL_KEY[order.payment])}</div>
      </TD>
      <TD className="align-top">
        <Stepper order={order} />
      </TD>
      <TD className="align-top">
        <OrderActionButtons order={order} onAction={onAction} />
      </TD>
    </TR>
  );
}

export function OrderCard({
  order,
  expanded,
  onToggle,
  onOpenDetails,
  onAction,
}: {
  order: OrderRecord;
  expanded: boolean;
  onToggle: () => void;
  onOpenDetails: (order: OrderRecord) => void;
  onAction: (action: OrderAction, order: OrderRecord) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="py-2.5">
      <button type="button" onClick={onToggle} aria-expanded={expanded} className="flex w-full items-center justify-between gap-3 text-start">
        <span className="flex items-baseline gap-2 truncate">
          <span
            role="link"
            onClick={(event) => {
              event.stopPropagation();
              onOpenDetails(order);
            }}
            className="text-[12.5px] font-semibold text-[#0D6EFD] hover:underline"
          >
            {order.id}
          </span>
          <span className="truncate text-[11.5px] text-[var(--octo-text-secondary)]">{order.date}</span>
        </span>
        <ChevronDown size={15} className={`shrink-0 text-[var(--octo-text-faint)] transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="mt-2 flex flex-col gap-2 text-[12px]">
          <div className="flex items-center justify-between text-[var(--octo-text-secondary)]">
            <span>{order.table ?? t(SOURCE_LABEL_KEY[order.source])}</span>
            <span className="font-medium text-[var(--octo-text-primary)]">{formatSar(order.totalSar)}</span>
          </div>
          <Stepper order={order} />
          <OrderActionButtons order={order} onAction={onAction} className="mt-1" />
        </div>
      )}
    </div>
  );
}
```

(The mobile card's id uses a `<span role="link">` rather than a nested `<button>` because it sits inside the row's own toggle `<button>` — HTML forbids nesting interactive elements, and `event.stopPropagation()` keeps its click from also toggling the card.)

- [ ] **Step 2: Typecheck**

Run: `cd apps/merchant && npx tsc --noEmit -p .`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/merchant/src/pages/orders-list/_shared/order-row.tsx
git commit -m "Add the Orders page's desktop row and mobile card components"
```

---

### Task 7: Rewrite the page shell (`index.tsx`)

**Files:**
- Modify: `apps/merchant/src/pages/orders-list/index.tsx` (full rewrite — replaces all 323 existing lines)

**Interfaces:**
- Consumes: `orderRecords` (Task 1); `computeOrderStats`, `pillCount` (Task 1 `stats.ts`); `mapLiveOrdersToRecords` (Task 2); `useLiveOrders` (existing, `@/shared/api/live-orders`, unchanged); `OrdersStatCards`, `OrderFilterPills`, `SourceFilterPopover`, `ordersToCsv` (Task 5); `OrderCard`, `OrderTableRow` (Task 6); `OrderAction` (Task 1 `theme.ts`); `OrderRecord`, `OrderSource`, `OrderState` (Task 1 `types.ts`).
- Produces: `OrdersListPage` (same export name the router already imports), plus local state `detailsOrder`/`pendingAction` that Task 8 (details modal) and Tasks 10–12 (action flows) render against.

This replaces the current stat cards (4, sparkline-backed, from `mock-orders.ts`), the checkbox-dropdown filter, and the plain-badge table — none of the mockup frames show a refresh button or a "Live / Updated just now" indicator, so both are dropped along with the `mock-orders.ts`/`live-orders.ts` imports they depended on (those modules are untouched for their other consumers, per Global Constraints).

- [ ] **Step 1: Replace the full contents of `index.tsx`**

```tsx
// apps/merchant/src/pages/orders-list/index.tsx
import { useMemo, useState } from "react";
import { ClipboardList, Download, Search } from "lucide-react";
import { EmptyState, Table, TBody, TH, THead } from "@ui/primitives";
import { useLiveOrders } from "@/shared/api/live-orders";
import { useI18n } from "@/app/providers/i18n-provider";
import { orderRecords } from "./_shared/mock-data";
import { mapLiveOrdersToRecords } from "./_shared/live-orders-bridge";
import { computeOrderStats, pillCount } from "./_shared/stats";
import { OrdersStatCards } from "./_shared/stat-cards";
import { OrderFilterPills } from "./_shared/filter-pills";
import { SourceFilterPopover } from "./_shared/source-filter-popover";
import { OrderCard, OrderTableRow } from "./_shared/order-row";
import { ordersToCsv } from "./_shared/csv-export";
import type { OrderAction } from "./_shared/theme";
import type { OrderRecord, OrderSource, OrderState } from "./_shared/types";

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function OrdersListPage() {
  const { t } = useI18n();
  const { orders: liveOrders } = useLiveOrders();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<OrderState | null>(null);
  const [selectedSources, setSelectedSources] = useState<readonly OrderSource[]>([]);
  const [search, setSearch] = useState("");
  const [detailsOrder, setDetailsOrder] = useState<OrderRecord | null>(null);
  const [pendingAction, setPendingAction] = useState<{ action: OrderAction; order: OrderRecord } | null>(null);

  // Live customer orders lead, seeded rows follow — same precedence the
  // page used before this rebuild.
  const allRecords = useMemo(() => [...mapLiveOrdersToRecords(liveOrders), ...orderRecords], [liveOrders]);

  const visibleRows = useMemo(() => {
    return allRecords.filter((order) => {
      if (selectedState && order.state !== selectedState) return false;
      if (selectedSources.length > 0 && !selectedSources.includes(order.source)) return false;
      if (search.trim()) {
        const query = search.trim().toLowerCase();
        if (!order.id.toLowerCase().includes(query) && !(order.table ?? "").toLowerCase().includes(query)) return false;
      }
      return true;
    });
  }, [allRecords, selectedState, selectedSources, search]);

  const stats = useMemo(() => computeOrderStats(allRecords), [allRecords]);
  const isFiltered = selectedState !== null || selectedSources.length > 0 || search.trim() !== "";

  function resetFilters() {
    setSelectedState(null);
    setSelectedSources([]);
    setSearch("");
  }

  function handleExport() {
    downloadCsv(`orders-${new Date().toISOString().slice(0, 10)}.csv`, ordersToCsv(visibleRows));
  }

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("orders.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">{t("orders.subtitle")}</p>
        </div>
        <span className="rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-[7px] text-[12px] font-medium text-[var(--octo-text-secondary)]">
          {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
        </span>
      </header>

      <div className="mt-4">
        <OrdersStatCards stats={stats} />
      </div>

      <section className="mt-4 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div className="flex flex-wrap items-center gap-2">
          <SourceFilterPopover selected={selectedSources} onChange={setSelectedSources} />
          <OrderFilterPills
            selected={selectedState}
            onSelect={setSelectedState}
            countAll={allRecords.length}
            countByState={(state) => pillCount(allRecords, state)}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search size={14} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[var(--octo-text-faint)]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("orders.search.placeholder")}
              className="w-full rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] py-[7px] ps-8 pe-3 text-[12.5px] text-[var(--octo-text-primary)] placeholder:text-[var(--octo-text-faint)] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/30 focus:border-[#0D6EFD]"
            />
          </div>
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-[9px] bg-[#0D6EFD] px-3 py-[7px] text-[12px] font-medium text-white transition-opacity hover:opacity-90"
          >
            <Download size={13} />
            {t("orders.export")}
          </button>
        </div>

        {visibleRows.length === 0 ? (
          <EmptyState
            icon={<ClipboardList size={16} />}
            title={t(isFiltered ? "orders.filter.empty" : "orders.empty.title")}
            description={isFiltered ? undefined : t("orders.empty.description")}
            action={
              isFiltered ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-[7px] text-[12px] font-medium text-[var(--octo-text-primary)] transition-colors hover:bg-[var(--octo-hover)]"
                >
                  {t("orders.filter.reset")}
                </button>
              ) : undefined
            }
            className="mt-4"
          />
        ) : (
          <>
            {/* Mobile: card accordion — tap a row to expand its details */}
            <div className="mt-3 divide-y divide-[var(--octo-row-border)] sm:hidden">
              {visibleRows.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  expanded={expandedId === order.id}
                  onToggle={() => setExpandedId(expandedId === order.id ? null : order.id)}
                  onOpenDetails={setDetailsOrder}
                  onAction={(action, target) => setPendingAction({ action, order: target })}
                />
              ))}
            </div>

            {/* Desktop/tablet: full data table */}
            <div className="octo-scroll mt-3 hidden overflow-x-auto sm:block">
              <Table>
                <THead>
                  <tr>
                    <TH>{t("orders.col.order")}</TH>
                    <TH>{t("orders.details.tableNo")}</TH>
                    <TH>{t("orders.col.total")}</TH>
                    <TH>{t("orders.details.timeline")}</TH>
                    <TH>{t("orders.col.actions")}</TH>
                  </tr>
                </THead>
                <TBody>
                  {visibleRows.map((order) => (
                    <OrderTableRow
                      key={order.id}
                      order={order}
                      onOpenDetails={setDetailsOrder}
                      onAction={(action, target) => setPendingAction({ action, order: target })}
                    />
                  ))}
                </TBody>
              </Table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
```

`detailsOrder` and `pendingAction` are set but not yet rendered anywhere — that's expected at this point; Task 8 adds the modal that reads `detailsOrder`, and Tasks 10–12 add the flows that read `pendingAction`. TypeScript won't flag unused state setters (they're used), and `pendingAction`'s reader arrives in Task 10.

- [ ] **Step 2: Typecheck**

Run: `cd apps/merchant && npx tsc --noEmit -p .`
Expected: no errors.

- [ ] **Step 3: Manual smoke-check**

Use the `run` skill (or `cd apps/merchant && npm run dev`) and open `/orders`. Confirm: 5 stat cards render with real numbers, the pill row filters the list, the source popover toggles, search narrows the list, Export downloads a `.csv`, and every row shows its 6-step timeline and 4 action buttons (clicking a button or the order id does nothing yet — that's Tasks 8–12).

- [ ] **Step 4: Commit**

```bash
git add apps/merchant/src/pages/orders-list/index.tsx
git commit -m "Rewrite the Orders page shell to match the new design"
```

---

### Task 8: Order Details modal

**Files:**
- Create: `apps/merchant/src/pages/orders-list/_shared/order-details-modal.tsx`
- Modify: `apps/merchant/src/pages/orders-list/index.tsx`

**Interfaces:**
- Consumes: `Stepper`, `STATE_LABEL_KEY` (Task 4 `stepper.tsx`); `STATE_STYLE` (Task 1 `theme.ts`); `OrderActionButtons` (Task 6 `order-row.tsx`); `Modal` (`@ui/primitives`); `formatSar` (`@octopus/api-client`).
- Produces: `OrderDetailsModal({ order, onClose, onAction })`, rendered from `index.tsx` against the `detailsOrder`/`setPendingAction` state Task 7 already created.

- [ ] **Step 1: Write `order-details-modal.tsx`**

```tsx
// apps/merchant/src/pages/orders-list/_shared/order-details-modal.tsx
import { Modal } from "@ui/primitives";
import { formatSar } from "@octopus/api-client";
import { useI18n } from "@/app/providers/i18n-provider";
import { OrderActionButtons } from "./order-row";
import { Stepper, STATE_LABEL_KEY } from "./stepper";
import { STATE_STYLE } from "./theme";
import type { OrderAction } from "./theme";
import type { OrderRecord } from "./types";

const PAYMENT_LABEL_KEY: Record<OrderRecord["payment"], string> = {
  "Paid Online": "orders.payment.online",
  "Paid Cash": "orders.payment.cash",
  Unpaid: "orders.payment.unpaid",
  "Partially Paid": "orders.payment.partial",
};

const SOURCE_LABEL_KEY: Record<OrderRecord["source"], string> = {
  "QR Code": "orders.source.qrCode",
  "POS Order": "orders.source.pos",
  "KIOSK Order": "orders.source.kiosk",
  "Phone Order": "orders.source.phone",
};

function paymentTone(payment: OrderRecord["payment"]): string {
  return payment === "Unpaid" ? "var(--octo-text-muted)" : "#16A34A";
}

export function OrderDetailsModal({
  order,
  onClose,
  onAction,
}: {
  order: OrderRecord | null;
  onClose: () => void;
  onAction: (action: OrderAction, order: OrderRecord) => void;
}) {
  const { t } = useI18n();
  if (!order) return null;
  const statePill = STATE_STYLE[order.state];
  const itemCount = order.items.reduce((sum, item) => sum + item.qty, 0);

  return (
    <Modal open onClose={onClose} className="max-w-2xl">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-[19px] font-bold text-[var(--octo-text-primary)]">{order.id}</h2>
        <span className="text-[12.5px] font-semibold" style={{ color: statePill.text }}>
          {t(STATE_LABEL_KEY[order.state])}
        </span>
      </div>
      <p className="mt-1 text-[12.5px] text-[var(--octo-text-muted)]">
        {order.date} — {t(SOURCE_LABEL_KEY[order.source])}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1.5 rounded-[10px] bg-[var(--octo-hover)] px-3.5 py-2.5 text-[12.5px] text-[var(--octo-text-secondary)]">
        {order.table && <span>{t("orders.details.tableNo")} {order.table}</span>}
        {order.guests != null && <span>{t("orders.details.guestNo")} {order.guests}</span>}
        {order.waiter && <span>{t("orders.details.waiter")} {order.waiter}</span>}
        <span>{t("orders.details.source")} {t(SOURCE_LABEL_KEY[order.source])}</span>
      </div>

      <div className="mt-4 rounded-[10px] border border-[var(--octo-border-card)] p-3.5">
        <h3 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("orders.details.summary")}</h3>
        <dl className="mt-2 flex flex-col gap-1 text-[12.5px]">
          <div className="flex items-center justify-between">
            <dt className="text-[var(--octo-text-muted)]">{t("orders.details.items")}</dt>
            <dd>{t("orders.details.itemsValue").replace("{n}", String(itemCount))}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-[var(--octo-text-muted)]">{t("orders.details.courses")}</dt>
            <dd>{t("orders.details.coursesValue").replace("{n}", String(order.courses))}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-3 rounded-[10px] border border-[#0D6EFD]/30 bg-[#0D6EFD]/5 p-3.5 text-[12.5px]">
        <div className="flex items-center justify-between">
          <span className="text-[var(--octo-text-muted)]">{t("orders.details.subtotal")}</span>
          <span>{formatSar(order.subtotalSar)}</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-[var(--octo-text-muted)]">{t("orders.details.tax")}</span>
          <span>{formatSar(order.taxSar)}</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between font-semibold text-[#0D6EFD]">
          <span>{t("orders.details.total")}</span>
          <span>{formatSar(order.totalSar)}</span>
        </div>
      </div>

      <div className="mt-3 rounded-[10px] border border-[var(--octo-border-card)] p-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("orders.details.payment")}</h3>
          <span className="text-[12px] font-medium" style={{ color: paymentTone(order.payment) }}>
            {t(PAYMENT_LABEL_KEY[order.payment])}
          </span>
        </div>
        {order.paymentMethod && (
          <div className="mt-2 flex items-center justify-between text-[12.5px]">
            <span className="text-[var(--octo-text-muted)]">{t("orders.details.method")}</span>
            <span>{order.paymentMethod}</span>
          </div>
        )}
        {order.transactionId && (
          <div className="mt-1.5 flex items-center justify-between text-[12.5px]">
            <span className="text-[var(--octo-text-muted)]">{t("orders.details.transactionId")}</span>
            <span>{order.transactionId}</span>
          </div>
        )}
      </div>

      <div className="mt-3 rounded-[10px] border border-[var(--octo-border-card)] p-3.5">
        <h3 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("orders.details.timeline")}</h3>
        <Stepper order={order} className="mt-3" />
      </div>

      <OrderActionButtons order={order} onAction={onAction} className="mt-4" />
    </Modal>
  );
}
```

- [ ] **Step 2: Wire the modal into `index.tsx`**

In `apps/merchant/src/pages/orders-list/index.tsx`, add the import next to the other `_shared` imports:

```tsx
import { OrderDetailsModal } from "./_shared/order-details-modal";
```

Then wrap the existing return value in a fragment and render the modal as a sibling. Replace:

```tsx
  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
```

with:

```tsx
  return (
    <>
      <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
```

And replace the final two lines of the file:

```tsx
    </div>
  );
}
```

with:

```tsx
      </div>

      <OrderDetailsModal
        order={detailsOrder}
        onClose={() => setDetailsOrder(null)}
        onAction={(action, order) => {
          setDetailsOrder(null);
          setPendingAction({ action, order });
        }}
      />
    </>
  );
}
```

(Every other line keeps its existing indentation — only the outermost `<div>` gains one level from the new `<>` wrapper conceptually, but since JSX doesn't require re-indenting children for a fragment wrapper to compile, leave the inner content as-is; only the two lines shown above change.)

- [ ] **Step 3: Typecheck**

Run: `cd apps/merchant && npx tsc --noEmit -p .`
Expected: no errors.

- [ ] **Step 4: Manual smoke-check**

Run the app, open `/orders`, click an order id (desktop table or mobile card). Compare against `apps/assets/Orders/Orders Desing/order details.png`: header id + state, meta row, Order Summary, Subtotal/Tax/Total box, Payment section, Timeline, and the 4 action buttons in the footer.

- [ ] **Step 5: Commit**

```bash
git add apps/merchant/src/pages/orders-list/_shared/order-details-modal.tsx apps/merchant/src/pages/orders-list/index.tsx
git commit -m "Add the Order Details modal"
```

---

### Task 9: Shared confirm-flow infrastructure

**Files:**
- Create: `apps/merchant/src/pages/orders-list/_shared/radio-card.tsx`
- Create: `apps/merchant/src/pages/orders-list/_shared/pin-input.tsx`
- Create: `apps/merchant/src/pages/orders-list/_shared/pin-confirm-modal.tsx`
- Create: `apps/merchant/src/pages/orders-list/_shared/result-modal.tsx`
- Create: `apps/merchant/src/pages/orders-list/_shared/action-flow-state.ts`
- Create: `apps/merchant/src/pages/orders-list/_shared/action-flow-state.test.ts`
- Create: `apps/merchant/src/pages/orders-list/_shared/action-flow.tsx`

**Interfaces:**
- Consumes: nothing from earlier UI tasks (this is reusable infrastructure); `useI18n` (`@/app/providers/i18n-provider`); `Modal` (`@ui/primitives`).
- Produces: `RadioCardGroup`/`RadioCardOption` (`radio-card.tsx`); `PIN_LENGTH`/`PinInput` (`pin-input.tsx`); `PinConfirmModal` (`pin-confirm-modal.tsx`); `ResultModal` (`result-modal.tsx`); `FlowStepKind`, `FlowState`, `initFlowState`, `currentStep`, `advanceFlow`, `isLastStep` (`action-flow-state.ts`); `useActionFlow` (`action-flow.tsx`) — all consumed by Tasks 10–12 (the four concrete action flows).

- [ ] **Step 1: Write `radio-card.tsx`**

```tsx
// apps/merchant/src/pages/orders-list/_shared/radio-card.tsx
import clsx from "clsx";

export interface RadioCardOption<T extends string> {
  value: T;
  label: string;
}

export function RadioCardGroup<T extends string>({
  name,
  options,
  value,
  onChange,
  className,
}: {
  name: string;
  options: readonly RadioCardOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div role="radiogroup" className={clsx("grid grid-cols-2 gap-3", className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <label
            key={option.value}
            className={clsx(
              "flex cursor-pointer items-center justify-between gap-2 rounded-[10px] border px-4 py-3 text-[13px] font-medium transition-colors",
              active
                ? "border-[#0D6EFD] bg-[var(--octo-selected)] text-[#0D6EFD]"
                : "border-[var(--octo-border-input)] text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]"
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={active}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
            <span
              className={clsx(
                "grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-[1.5px]",
                active ? "border-[#0D6EFD]" : "border-[var(--octo-crumb)]"
              )}
            >
              {active && <span className="h-[8px] w-[8px] rounded-full bg-[#0D6EFD]" />}
            </span>
          </label>
        );
      })}
    </div>
  );
}
```

This mirrors the existing bordered-radio-card recipe in `pages/onboarding/steps/payment-step.tsx` (trailing custom circle indicator, `sr-only` native radio), generalized to any 2-or-more-option row — the same visual the mockups use for Cancel/Void's scope choice and Refund's type/method choices.

- [ ] **Step 2: Write `pin-input.tsx`**

```tsx
// apps/merchant/src/pages/orders-list/_shared/pin-input.tsx
// Same interaction as features/session/_shared/otp-input.tsx (type-advances,
// backspace-back, arrow keys, paste-fill), reimplemented locally: pages/
// orders-list doesn't reach into features/session under this codebase's
// layering, and this modal's boxes are smaller than the auth screen's.
import { useRef, type ChangeEvent, type ClipboardEvent, type KeyboardEvent } from "react";
import { useI18n } from "@/app/providers/i18n-provider";

export const PIN_LENGTH = 4;

export function PinInput({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const { t } = useI18n();
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  function focusBox(index: number) {
    refs.current[Math.max(0, Math.min(PIN_LENGTH - 1, index))]?.focus();
  }

  function handleChange(index: number, event: ChangeEvent<HTMLInputElement>) {
    const digit = event.target.value.replace(/\D/g, "").slice(-1);
    const next = [...value];
    next[index] = digit;
    onChange(next);
    if (digit) focusBox(index + 1);
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !value[index]) {
      event.preventDefault();
      const next = [...value];
      next[index - 1] = "";
      onChange(next);
      focusBox(index - 1);
      return;
    }
    if (event.key === "ArrowLeft") focusBox(index - 1);
    if (event.key === "ArrowRight") focusBox(index + 1);
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const digits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, PIN_LENGTH);
    if (!digits) return;
    event.preventDefault();
    const next = Array.from({ length: PIN_LENGTH }, (_, i) => digits[i] ?? "");
    onChange(next);
    focusBox(digits.length);
  }

  return (
    <div dir="ltr" className="flex items-center justify-center gap-3">
      {Array.from({ length: PIN_LENGTH }, (_, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          value={value[index] ?? ""}
          onChange={(event) => handleChange(index, event)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={2}
          aria-label={t("orders.managerAuth.pinDigitLabel").replace("{n}", String(index + 1))}
          autoFocus={index === 0}
          className="h-14 w-14 rounded-xl border border-[var(--octo-border-input)] bg-[var(--octo-card)] text-center text-[20px] font-semibold text-[#0D6EFD] transition-colors focus:outline-none focus:ring-4 focus:ring-[#0D6EFD]/15 focus:border-[#0D6EFD]"
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Write `pin-confirm-modal.tsx`**

```tsx
// apps/merchant/src/pages/orders-list/_shared/pin-confirm-modal.tsx
import { useState } from "react";
import { Modal } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { PIN_LENGTH, PinInput } from "./pin-input";

export function PinConfirmModal({
  open,
  onClose,
  onConfirm,
  accent,
  promptKey,
  confirmLabelKey,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  accent: string;
  promptKey: string;
  confirmLabelKey: string;
}) {
  const { t } = useI18n();
  const [pin, setPin] = useState<string[]>(Array.from({ length: PIN_LENGTH }, () => ""));

  if (!open) return null;
  const complete = pin.every((digit) => digit !== "");

  return (
    <Modal open onClose={onClose} className="max-w-md">
      <h2 className="text-[17px] font-bold text-[var(--octo-text-primary)]">{t("orders.managerAuth.title")}</h2>

      {/* Static mock manager identity — same convention as this app's other
          mock-auth screens; no real PIN store exists yet, any 4 digits work. */}
      <div className="mt-4 flex items-center gap-3 rounded-[10px] bg-[var(--octo-hover)] p-3">
        <div className="h-10 w-10 shrink-0 rounded-full bg-[var(--octo-track)]" aria-hidden="true" />
        <div>
          <p className="text-[13px] font-semibold text-[var(--octo-text-primary)]">Reem Al-Subaie</p>
          <p className="text-[12px] font-medium text-[#0D6EFD]">{t("orders.managerAuth.role")}</p>
        </div>
      </div>

      <p className="mt-4 text-center text-[13px] text-[var(--octo-text-secondary)]">{t(promptKey)}</p>

      <div className="mt-4">
        <PinInput value={pin} onChange={setPin} />
      </div>

      <button
        type="button"
        disabled={!complete}
        onClick={onConfirm}
        className="mt-5 w-full rounded-[9px] py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        style={{ backgroundColor: accent }}
      >
        {t(confirmLabelKey)}
      </button>
    </Modal>
  );
}
```

- [ ] **Step 4: Write `result-modal.tsx`**

```tsx
// apps/merchant/src/pages/orders-list/_shared/result-modal.tsx
import type { ReactNode } from "react";
import { Modal } from "@ui/primitives";

export function ResultModal({
  open,
  onClose,
  icon,
  title,
  subtitle,
  noteLines,
  noteClassName,
  primaryLabel,
  onPrimary,
}: {
  open: boolean;
  onClose: () => void;
  /** Cancel/Void/Wastage results show no icon in any mockup frame — only
   *  the Refund flow's terminal screens (Cash Recorded / Processing /
   *  Successful / Failed) have one. */
  icon?: ReactNode;
  title: string;
  subtitle: string;
  noteLines: readonly string[];
  noteClassName: string;
  primaryLabel: string;
  onPrimary: () => void;
}) {
  if (!open) return null;

  return (
    <Modal open onClose={onClose} className="max-w-md text-center">
      {icon && <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center">{icon}</div>}
      <h2 className="text-[19px] font-bold text-[var(--octo-text-primary)]">{title}</h2>
      <p className="mt-2 text-[13px] text-[var(--octo-text-secondary)]">{subtitle}</p>

      {noteLines.length > 0 && (
        <div className={`mt-4 rounded-[10px] p-3 text-start text-[12.5px] ${noteClassName}`}>
          {noteLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onPrimary}
        className="mt-5 w-full rounded-[9px] bg-[#0D6EFD] py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
      >
        {primaryLabel}
      </button>
    </Modal>
  );
}
```

- [ ] **Step 5: Write `action-flow-state.ts`**

```ts
// apps/merchant/src/pages/orders-list/_shared/action-flow-state.ts
// A tiny step-sequence state machine shared by all four action flows.
// Cancel/Void/Wastage/cash-Refund use ["form", "pin", "result"]; online
// Refund uses ["form", "pin", "processing", "pending", "result"] — see
// action-flow.tsx for the auto-advance timing on "processing"/"pending".
export type FlowStepKind = "form" | "pin" | "processing" | "pending" | "result";

export interface FlowState<TPayload> {
  stepIndex: number;
  payload: TPayload | undefined;
}

export function initFlowState<TPayload>(): FlowState<TPayload> {
  return { stepIndex: 0, payload: undefined };
}

export function currentStep(state: FlowState<unknown>, steps: readonly FlowStepKind[]): FlowStepKind {
  return steps[Math.min(state.stepIndex, steps.length - 1)];
}

export function advanceFlow<TPayload>(
  state: FlowState<TPayload>,
  steps: readonly FlowStepKind[],
  payload?: TPayload
): FlowState<TPayload> {
  const nextIndex = Math.min(state.stepIndex + 1, steps.length - 1);
  return { stepIndex: nextIndex, payload: payload !== undefined ? payload : state.payload };
}

export function isLastStep(state: FlowState<unknown>, steps: readonly FlowStepKind[]): boolean {
  return state.stepIndex >= steps.length - 1;
}
```

- [ ] **Step 6: Write `action-flow-state.test.ts`**

```ts
// apps/merchant/src/pages/orders-list/_shared/action-flow-state.test.ts
import { describe, expect, it } from "vitest";
import { advanceFlow, currentStep, initFlowState, isLastStep, type FlowStepKind } from "./action-flow-state";

const SIMPLE_STEPS: readonly FlowStepKind[] = ["form", "pin", "result"];
const ONLINE_REFUND_STEPS: readonly FlowStepKind[] = ["form", "pin", "processing", "pending", "result"];

describe("action flow state", () => {
  it("starts on the first step", () => {
    const state = initFlowState();
    expect(currentStep(state, SIMPLE_STEPS)).toBe("form");
    expect(isLastStep(state, SIMPLE_STEPS)).toBe(false);
  });

  it("advances one step at a time and carries the payload forward", () => {
    let state = initFlowState<{ reason: string }>();
    state = advanceFlow(state, SIMPLE_STEPS, { reason: "Wrong order" });
    expect(currentStep(state, SIMPLE_STEPS)).toBe("pin");
    expect(state.payload).toEqual({ reason: "Wrong order" });

    state = advanceFlow(state, SIMPLE_STEPS);
    expect(currentStep(state, SIMPLE_STEPS)).toBe("result");
    expect(state.payload).toEqual({ reason: "Wrong order" });
    expect(isLastStep(state, SIMPLE_STEPS)).toBe(true);
  });

  it("never advances past the last step", () => {
    let state = initFlowState();
    for (let i = 0; i < 10; i++) state = advanceFlow(state, SIMPLE_STEPS);
    expect(currentStep(state, SIMPLE_STEPS)).toBe("result");
  });

  it("walks the 5-step online refund sequence", () => {
    let state = initFlowState();
    const seen: FlowStepKind[] = [currentStep(state, ONLINE_REFUND_STEPS)];
    for (let i = 0; i < 4; i++) {
      state = advanceFlow(state, ONLINE_REFUND_STEPS);
      seen.push(currentStep(state, ONLINE_REFUND_STEPS));
    }
    expect(seen).toEqual(["form", "pin", "processing", "pending", "result"]);
  });
});
```

- [ ] **Step 7: Run the new tests**

Run: `cd apps/merchant && npx vitest run src/pages/orders-list/_shared/action-flow-state.test.ts`
Expected: 4 tests pass.

- [ ] **Step 8: Write `action-flow.tsx`**

```tsx
// apps/merchant/src/pages/orders-list/_shared/action-flow.tsx
import { useEffect, useState } from "react";
import { advanceFlow, currentStep, initFlowState, type FlowState, type FlowStepKind } from "./action-flow-state";

// "processing"/"pending" auto-advance after a short, fixed delay — same
// pattern as this page's own handleRefresh timeout before this rebuild.
const AUTO_ADVANCE_MS: Partial<Record<FlowStepKind, number>> = {
  processing: 900,
  pending: 900,
};

export function useActionFlow<TPayload>(steps: readonly FlowStepKind[], active: boolean) {
  const [state, setState] = useState<FlowState<TPayload>>(initFlowState<TPayload>());

  useEffect(() => {
    if (!active) setState(initFlowState<TPayload>());
  }, [active]);

  const step = currentStep(state, steps);

  useEffect(() => {
    if (!active) return;
    const delay = AUTO_ADVANCE_MS[step];
    if (delay == null) return;
    const timer = window.setTimeout(() => setState((prev) => advanceFlow(prev, steps)), delay);
    return () => window.clearTimeout(timer);
  }, [active, step, steps]);

  return {
    step,
    payload: state.payload,
    submit: (payload: TPayload) => setState((prev) => advanceFlow(prev, steps, payload)),
    advance: () => setState((prev) => advanceFlow(prev, steps)),
    reset: () => setState(initFlowState<TPayload>()),
  };
}
```

- [ ] **Step 9: Typecheck**

Run: `cd apps/merchant && npx tsc --noEmit -p .`
Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add apps/merchant/src/pages/orders-list/_shared/radio-card.tsx apps/merchant/src/pages/orders-list/_shared/pin-input.tsx apps/merchant/src/pages/orders-list/_shared/pin-confirm-modal.tsx apps/merchant/src/pages/orders-list/_shared/result-modal.tsx apps/merchant/src/pages/orders-list/_shared/action-flow-state.ts apps/merchant/src/pages/orders-list/_shared/action-flow-state.test.ts apps/merchant/src/pages/orders-list/_shared/action-flow.tsx
git commit -m "Add the shared PIN-confirm / result-modal flow infrastructure"
```

---

### Task 10: Cancel + Void flows

**Files:**
- Create: `apps/merchant/src/pages/orders-list/_shared/scope-reason-form.tsx`
- Create: `apps/merchant/src/pages/orders-list/_shared/cancel-order-flow.tsx`
- Create: `apps/merchant/src/pages/orders-list/_shared/void-order-flow.tsx`
- Modify: `apps/merchant/src/pages/orders-list/index.tsx`

**Interfaces:**
- Consumes: `RadioCardGroup`, `RadioCardOption` (Task 9 `radio-card.tsx`); `PinConfirmModal`, `ResultModal`, `useActionFlow` (Task 9); `ACTION_THEME` (Task 1 `theme.ts`); `Modal`, `Select`, `Textarea` (`@ui/primitives`); `OrderRecord` (Task 1 `types.ts`).
- Produces: `ScopeReasonForm`, `ScopeReasonPayload` (`scope-reason-form.tsx`); `CancelOrderFlow({ order, onClose })`, `VoidOrderFlow({ order, onClose })` — rendered from `index.tsx` against the `pendingAction` state Task 7 created.

`cancel order.png` and `void order.png` are pixel-identical layouts (scope radio pair → reason select → note → Next) with different copy and reason lists, so they share one dumb form component and differ only in the config each flow component passes it — no duplicated JSX between the two.

- [ ] **Step 1: Write `scope-reason-form.tsx`**

```tsx
// apps/merchant/src/pages/orders-list/_shared/scope-reason-form.tsx
import { useState } from "react";
import { Select, Textarea } from "@ui/primitives";
import { RadioCardGroup, type RadioCardOption } from "./radio-card";

export interface ScopeReasonPayload {
  scope: string;
  reason: string;
  note: string;
}

export function ScopeReasonForm({
  title,
  scopeOptions,
  reasonPlaceholder,
  reasonOptions,
  noteLabel,
  notePlaceholder,
  submitLabel,
  accent,
  onSubmit,
}: {
  title: string;
  scopeOptions: readonly RadioCardOption<string>[];
  reasonPlaceholder: string;
  reasonOptions: readonly { value: string; label: string }[];
  noteLabel: string;
  notePlaceholder: string;
  submitLabel: string;
  accent: string;
  onSubmit: (payload: ScopeReasonPayload) => void;
}) {
  const [scope, setScope] = useState(scopeOptions[0].value);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  return (
    <div>
      <h2 className="text-[17px] font-bold text-[var(--octo-text-primary)]">{title}</h2>

      <RadioCardGroup name="scope" options={scopeOptions} value={scope} onChange={setScope} className="mt-4" />

      <div className="mt-4">
        <Select value={reason} onChange={(event) => setReason(event.target.value)}>
          <option value="" disabled>
            {reasonPlaceholder}
          </option>
          {reasonOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="mt-4">
        <Textarea
          label={noteLabel}
          placeholder={notePlaceholder}
          rows={4}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>

      <button
        type="button"
        disabled={!reason}
        onClick={() => onSubmit({ scope, reason, note })}
        className="mt-5 w-full rounded-[9px] py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        style={{ backgroundColor: accent }}
      >
        {submitLabel}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Write `cancel-order-flow.tsx`**

```tsx
// apps/merchant/src/pages/orders-list/_shared/cancel-order-flow.tsx
import { Modal } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { ScopeReasonForm, type ScopeReasonPayload } from "./scope-reason-form";
import { PinConfirmModal } from "./pin-confirm-modal";
import { ResultModal } from "./result-modal";
import { useActionFlow } from "./action-flow";
import { ACTION_THEME } from "./theme";
import type { OrderRecord } from "./types";

export function CancelOrderFlow({ order, onClose }: { order: OrderRecord | null; onClose: () => void }) {
  const { t } = useI18n();
  const flow = useActionFlow<ScopeReasonPayload>(["form", "pin", "result"], order !== null);
  const accent = ACTION_THEME.cancel.accent;

  if (!order) return null;

  if (flow.step === "form") {
    return (
      <Modal open onClose={onClose} className="max-w-lg">
        <ScopeReasonForm
          title={t("orders.cancel.title")}
          scopeOptions={[
            { value: "entire", label: t("orders.cancel.scopeEntire") },
            { value: "specific", label: t("orders.cancel.scopeSpecific") },
          ]}
          reasonPlaceholder={t("orders.cancel.reasonPlaceholder")}
          reasonOptions={[
            { value: "wrongOrder", label: t("orders.cancel.reason.wrongOrder") },
            { value: "customerRequest", label: t("orders.cancel.reason.customerRequest") },
            { value: "outOfStock", label: t("orders.cancel.reason.outOfStock") },
            { value: "other", label: t("orders.cancel.reason.other") },
          ]}
          noteLabel={t("orders.note")}
          notePlaceholder={t("orders.notePlaceholder")}
          submitLabel={t("orders.next")}
          accent={accent}
          onSubmit={flow.submit}
        />
      </Modal>
    );
  }

  if (flow.step === "pin") {
    return (
      <PinConfirmModal
        open
        onClose={onClose}
        onConfirm={flow.advance}
        accent={accent}
        promptKey="orders.managerAuth.prompt.cancel"
        confirmLabelKey="orders.managerAuth.confirm.cancel"
      />
    );
  }

  const now = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <ResultModal
      open
      onClose={onClose}
      title={t("orders.result.cancelTitle")}
      subtitle={t("orders.result.cancelSubtitle").replace("{id}", order.id).replace("{date}", now)}
      noteLines={[t("orders.result.cancelLine1"), t("orders.result.cancelLine2"), t("orders.result.cancelLine3")]}
      noteClassName="bg-[#FEF2F2] text-[#991B1B]"
      primaryLabel={t("orders.result.done")}
      onPrimary={onClose}
    />
  );
}
```

- [ ] **Step 3: Write `void-order-flow.tsx`**

```tsx
// apps/merchant/src/pages/orders-list/_shared/void-order-flow.tsx
import { Modal } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { ScopeReasonForm, type ScopeReasonPayload } from "./scope-reason-form";
import { PinConfirmModal } from "./pin-confirm-modal";
import { ResultModal } from "./result-modal";
import { useActionFlow } from "./action-flow";
import { ACTION_THEME } from "./theme";
import type { OrderRecord } from "./types";

export function VoidOrderFlow({ order, onClose }: { order: OrderRecord | null; onClose: () => void }) {
  const { t } = useI18n();
  const flow = useActionFlow<ScopeReasonPayload>(["form", "pin", "result"], order !== null);
  const accent = ACTION_THEME.void.accent;

  if (!order) return null;

  if (flow.step === "form") {
    return (
      <Modal open onClose={onClose} className="max-w-lg">
        <ScopeReasonForm
          title={t("orders.void.title")}
          scopeOptions={[
            { value: "entire", label: t("orders.void.scopeEntire") },
            { value: "specific", label: t("orders.void.scopeSpecific") },
          ]}
          reasonPlaceholder={t("orders.void.reasonPlaceholder")}
          reasonOptions={[
            { value: "wrongInput", label: t("orders.void.reason.wrongInput") },
            { value: "duplicate", label: t("orders.void.reason.duplicate") },
            { value: "testOrder", label: t("orders.void.reason.testOrder") },
            { value: "other", label: t("orders.void.reason.other") },
          ]}
          noteLabel={t("orders.note")}
          notePlaceholder={t("orders.notePlaceholder")}
          submitLabel={t("orders.next")}
          accent={accent}
          onSubmit={flow.submit}
        />
      </Modal>
    );
  }

  if (flow.step === "pin") {
    return (
      <PinConfirmModal
        open
        onClose={onClose}
        onConfirm={flow.advance}
        accent={accent}
        promptKey="orders.managerAuth.prompt.void"
        confirmLabelKey="orders.managerAuth.confirm.void"
      />
    );
  }

  const now = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <ResultModal
      open
      onClose={onClose}
      title={t("orders.result.voidTitle")}
      subtitle={t("orders.result.voidSubtitle").replace("{id}", order.id).replace("{date}", now)}
      noteLines={[t("orders.result.voidLine1"), t("orders.result.voidLine2")]}
      noteClassName="bg-[#FFFBEB] text-[#92400E]"
      primaryLabel={t("orders.result.done")}
      onPrimary={onClose}
    />
  );
}
```

- [ ] **Step 4: Wire both flows into `index.tsx`**

Add the imports:

```tsx
import { CancelOrderFlow } from "./_shared/cancel-order-flow";
import { VoidOrderFlow } from "./_shared/void-order-flow";
```

Then, immediately before the closing `</>` (right after the `<OrderDetailsModal ... />` block added in Task 8), add:

```tsx
      <CancelOrderFlow
        order={pendingAction?.action === "cancel" ? pendingAction.order : null}
        onClose={() => setPendingAction(null)}
      />
      <VoidOrderFlow
        order={pendingAction?.action === "void" ? pendingAction.order : null}
        onClose={() => setPendingAction(null)}
      />
```

- [ ] **Step 5: Typecheck**

Run: `cd apps/merchant && npx tsc --noEmit -p .`
Expected: no errors.

- [ ] **Step 6: Manual smoke-check**

Run the app, open `/orders`, click **Cancel** on a row. Compare the form against `cancel order.png`, the PIN step against `Manager Approval.png` (red "Confirm Cancellation"), and the result against `Manager Approval (2).png` ("Order Cancelled!"). Repeat for **Void** against `void order.png`, the orange "Confirm Avoid" PIN screen, and `Manager Approval (3).png` ("Order Voided!").

- [ ] **Step 7: Commit**

```bash
git add apps/merchant/src/pages/orders-list/_shared/scope-reason-form.tsx apps/merchant/src/pages/orders-list/_shared/cancel-order-flow.tsx apps/merchant/src/pages/orders-list/_shared/void-order-flow.tsx apps/merchant/src/pages/orders-list/index.tsx
git commit -m "Add the Cancel and Void order confirm-flows"
```

---

### Task 11: Wastage flow

**Files:**
- Create: `apps/merchant/src/pages/orders-list/_shared/wastage-form.tsx`
- Create: `apps/merchant/src/pages/orders-list/_shared/wastage-order-flow.tsx`
- Modify: `apps/merchant/src/pages/orders-list/index.tsx`

**Interfaces:**
- Consumes: `PinConfirmModal`, `ResultModal`, `useActionFlow` (Task 9); `ACTION_THEME` (Task 1 `theme.ts`); `OrderItem`, `OrderRecord` (Task 1 `types.ts`); `Checkbox`, `Select`, `Textarea`, `Modal` (`@ui/primitives`).
- Produces: `WastageForm`, `WastagePayload` (`wastage-form.tsx`); `WastageOrderFlow({ order, onClose })` — rendered from `index.tsx` against `pendingAction`.

- [ ] **Step 1: Write `wastage-form.tsx`**

```tsx
// apps/merchant/src/pages/orders-list/_shared/wastage-form.tsx
import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Checkbox, Select, Textarea } from "@ui/primitives";
import type { OrderItem } from "./types";

export interface WastagePayload {
  items: { name: string; qty: number }[];
  reason: string;
  note: string;
}

export function WastageForm({
  title,
  selectLabel,
  items,
  reasonPlaceholder,
  reasonOptions,
  noteLabel,
  notePlaceholder,
  submitLabel,
  accent,
  onSubmit,
}: {
  title: string;
  selectLabel: string;
  items: readonly OrderItem[];
  reasonPlaceholder: string;
  reasonOptions: readonly { value: string; label: string }[];
  noteLabel: string;
  notePlaceholder: string;
  submitLabel: string;
  accent: string;
  onSubmit: (payload: WastagePayload) => void;
}) {
  const [selected, setSelected] = useState<Record<string, number>>(() =>
    Object.fromEntries(items.map((item) => [item.name, 0]))
  );
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  function toggle(name: string) {
    setSelected((prev) => ({ ...prev, [name]: prev[name] > 0 ? 0 : 1 }));
  }

  function setQty(name: string, qty: number) {
    setSelected((prev) => ({ ...prev, [name]: Math.max(0, qty) }));
  }

  const selectedItems = items
    .filter((item) => selected[item.name] > 0)
    .map((item) => ({ name: item.name, qty: selected[item.name] }));

  return (
    <div>
      <h2 className="text-[17px] font-bold text-[var(--octo-text-primary)]">{title}</h2>

      <p className="mt-4 text-[12px] font-semibold text-[var(--octo-text-secondary)]">{selectLabel}</p>
      <div className="mt-2 rounded-[10px] border border-[var(--octo-border-input)] p-1">
        {items.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-2 rounded-[8px] px-2.5 py-2">
            <Checkbox label={item.name} checked={selected[item.name] > 0} onChange={() => toggle(item.name)} />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQty(item.name, (selected[item.name] || 1) - 1)}
                className="grid h-6 w-6 place-items-center rounded-full border border-[var(--octo-border-input)] text-[var(--octo-text-secondary)]"
              >
                <Minus size={12} />
              </button>
              <span className="w-4 text-center text-[12.5px]">{selected[item.name] || 1}</span>
              <button
                type="button"
                onClick={() => setQty(item.name, (selected[item.name] || 1) + 1)}
                className="grid h-6 w-6 place-items-center rounded-full text-white"
                style={{ backgroundColor: accent }}
              >
                <Plus size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <Select value={reason} onChange={(event) => setReason(event.target.value)}>
          <option value="" disabled>
            {reasonPlaceholder}
          </option>
          {reasonOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="mt-4">
        <Textarea
          label={noteLabel}
          placeholder={notePlaceholder}
          rows={4}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>

      <button
        type="button"
        disabled={selectedItems.length === 0 || !reason}
        onClick={() => onSubmit({ items: selectedItems, reason, note })}
        className="mt-5 w-full rounded-[9px] py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        style={{ backgroundColor: accent }}
      >
        {submitLabel}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Write `wastage-order-flow.tsx`**

```tsx
// apps/merchant/src/pages/orders-list/_shared/wastage-order-flow.tsx
import { Modal } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { WastageForm, type WastagePayload } from "./wastage-form";
import { PinConfirmModal } from "./pin-confirm-modal";
import { ResultModal } from "./result-modal";
import { useActionFlow } from "./action-flow";
import { ACTION_THEME } from "./theme";
import type { OrderRecord } from "./types";

export function WastageOrderFlow({ order, onClose }: { order: OrderRecord | null; onClose: () => void }) {
  const { t } = useI18n();
  const flow = useActionFlow<WastagePayload>(["form", "pin", "result"], order !== null);
  const accent = ACTION_THEME.wastage.accent;

  if (!order) return null;

  if (flow.step === "form") {
    return (
      <Modal open onClose={onClose} className="max-w-lg">
        <WastageForm
          title={t("orders.wastage.title")}
          selectLabel={t("orders.wastage.selectLabel")}
          items={order.items}
          reasonPlaceholder={t("orders.wastage.reasonPlaceholder")}
          reasonOptions={[
            { value: "overcooked", label: t("orders.wastage.reason.overcooked") },
            { value: "dropped", label: t("orders.wastage.reason.dropped") },
            { value: "expired", label: t("orders.wastage.reason.expired") },
            { value: "other", label: t("orders.wastage.reason.other") },
          ]}
          noteLabel={t("orders.note")}
          notePlaceholder={t("orders.notePlaceholder")}
          submitLabel={t("orders.next")}
          accent={accent}
          onSubmit={flow.submit}
        />
      </Modal>
    );
  }

  if (flow.step === "pin") {
    return (
      <PinConfirmModal
        open
        onClose={onClose}
        onConfirm={flow.advance}
        accent={accent}
        promptKey="orders.managerAuth.prompt.wastage"
        confirmLabelKey="orders.managerAuth.confirm.wastage"
      />
    );
  }

  const now = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <ResultModal
      open
      onClose={onClose}
      title={t("orders.result.wastageTitle")}
      subtitle={t("orders.result.wastageSubtitle").replace("{id}", order.id).replace("{date}", now)}
      noteLines={[t("orders.result.wastageLine1"), t("orders.result.wastageLine2")]}
      noteClassName="bg-[#F5F3FF] text-[#5B21B6]"
      primaryLabel={t("orders.result.done")}
      onPrimary={onClose}
    />
  );
}
```

- [ ] **Step 3: Wire the flow into `index.tsx`**

Add the import:

```tsx
import { WastageOrderFlow } from "./_shared/wastage-order-flow";
```

Then add, right after the `<VoidOrderFlow ... />` block from Task 10:

```tsx
      <WastageOrderFlow
        order={pendingAction?.action === "wastage" ? pendingAction.order : null}
        onClose={() => setPendingAction(null)}
      />
```

- [ ] **Step 4: Typecheck**

Run: `cd apps/merchant && npx tsc --noEmit -p .`
Expected: no errors.

- [ ] **Step 5: Manual smoke-check**

Run the app, click **Wastage** on a row. Compare the form against `Wastageorder.png` (checkbox + qty stepper per item), the PIN step against the purple "Confirm Wastage" screen (`Manager Approval (4).png`), and the result against `Manager Approval (5).png` ("Wastage Recorded").

- [ ] **Step 6: Commit**

```bash
git add apps/merchant/src/pages/orders-list/_shared/wastage-form.tsx apps/merchant/src/pages/orders-list/_shared/wastage-order-flow.tsx apps/merchant/src/pages/orders-list/index.tsx
git commit -m "Add the Wastage order confirm-flow"
```

---

### Task 12: Refund flow (cash + online, amount logic)

**Files:**
- Create: `apps/merchant/src/pages/orders-list/_shared/refund-amount.ts`
- Create: `apps/merchant/src/pages/orders-list/_shared/refund-amount.test.ts`
- Create: `apps/merchant/src/pages/orders-list/_shared/refund-form.tsx`
- Create: `apps/merchant/src/pages/orders-list/_shared/refund-order-flow.tsx`
- Modify: `apps/merchant/src/pages/orders-list/index.tsx`

**Interfaces:**
- Consumes: `PinConfirmModal`, `ResultModal`, `useActionFlow`, `FlowStepKind` (Task 9); `RadioCardGroup` (Task 9 `radio-card.tsx`); `ACTION_THEME` (Task 1 `theme.ts`); `OrderItem`, `OrderRecord` (Task 1 `types.ts`); `Checkbox`, `Input`, `Select`, `Textarea`, `Modal` (`@ui/primitives`); `formatSar` (`@octopus/api-client`).
- Produces: `maxRefundableSar`, `selectedItemsTotalSar`, `clampAmountSar` (`refund-amount.ts`); `RefundForm`, `RefundPayload` (`refund-form.tsx`); `RefundOrderFlow({ order, onClose })`, `RefundFailedPreview` (`refund-order-flow.tsx`) — rendered from `index.tsx` against `pendingAction`.

This is the only one of the four flows that branches on the order itself: a `Paid Cash` order gets the simpler 3-step sequence (`form` → `pin` → `result`, straight to "Cash Refund Recorded!"); anything else paid gets the 5-step sequence (`form` → `pin` → `processing` → `pending` → `result`, ending at "Refund Successful!"); an `Unpaid` order skips the flow entirely and shows a short notice instead. Per the design spec, the online path always resolves to success in this mock — `Refund Failed.png` is built pixel-for-pixel as `RefundFailedPreview` but nothing calls it, since there's no real payment gateway to decline the refund and no mockup defines when a decline should happen.

- [ ] **Step 1: Write `refund-amount.ts`**

```ts
// apps/merchant/src/pages/orders-list/_shared/refund-amount.ts
import type { OrderItem, OrderRecord } from "./types";

export function maxRefundableSar(order: OrderRecord): number {
  return order.totalSar;
}

export function selectedItemsTotalSar(items: readonly OrderItem[], selectedNames: ReadonlySet<string>): number {
  return items.filter((item) => selectedNames.has(item.name)).reduce((sum, item) => sum + item.priceSar * item.qty, 0);
}

export function clampAmountSar(raw: string, max: number): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.min(parsed, max);
}
```

- [ ] **Step 2: Write `refund-amount.test.ts`**

```ts
// apps/merchant/src/pages/orders-list/_shared/refund-amount.test.ts
import { describe, expect, it } from "vitest";
import { clampAmountSar, maxRefundableSar, selectedItemsTotalSar } from "./refund-amount";
import type { OrderItem, OrderRecord } from "./types";

function order(overrides: Partial<OrderRecord> = {}): OrderRecord {
  return {
    id: "#ORD-1",
    date: "May 16, 2026",
    table: "Table 1",
    guests: 2,
    totalSar: 100,
    source: "QR Code",
    payment: "Paid Online",
    state: "Completed",
    lastStage: "Completed",
    timeline: {},
    items: [],
    courses: 1,
    subtotalSar: 87,
    taxSar: 13,
    ...overrides,
  };
}

describe("maxRefundableSar", () => {
  it("is the order's total", () => {
    expect(maxRefundableSar(order({ totalSar: 186 }))).toBe(186);
  });
});

describe("selectedItemsTotalSar", () => {
  const items: OrderItem[] = [
    { name: "Beef Burger", qty: 1, priceSar: 32 },
    { name: "French Fries", qty: 2, priceSar: 14 },
    { name: "Water", qty: 1, priceSar: 3 },
  ];

  it("sums only the selected items, quantity included", () => {
    expect(selectedItemsTotalSar(items, new Set(["Beef Burger", "French Fries"]))).toBe(32 + 2 * 14);
  });

  it("returns 0 when nothing is selected", () => {
    expect(selectedItemsTotalSar(items, new Set())).toBe(0);
  });
});

describe("clampAmountSar", () => {
  it("clamps to the max", () => {
    expect(clampAmountSar("500", 186)).toBe(186);
  });

  it("floors negative or non-numeric input to 0", () => {
    expect(clampAmountSar("-10", 186)).toBe(0);
    expect(clampAmountSar("abc", 186)).toBe(0);
    expect(clampAmountSar("", 186)).toBe(0);
  });

  it("passes valid amounts through unchanged", () => {
    expect(clampAmountSar("75.5", 186)).toBe(75.5);
  });
});
```

- [ ] **Step 3: Run the new tests**

Run: `cd apps/merchant && npx vitest run src/pages/orders-list/_shared/refund-amount.test.ts`
Expected: 6 tests pass.

- [ ] **Step 4: Write `refund-form.tsx`**

```tsx
// apps/merchant/src/pages/orders-list/_shared/refund-form.tsx
import { useState } from "react";
import { Checkbox, Input, Select, Textarea } from "@ui/primitives";
import { formatSar } from "@octopus/api-client";
import { RadioCardGroup } from "./radio-card";
import { clampAmountSar, maxRefundableSar, selectedItemsTotalSar } from "./refund-amount";
import type { OrderRecord } from "./types";

export interface RefundPayload {
  type: "full" | "partial";
  method: "items" | "amount";
  selectedItems: string[];
  amountSar: number;
  reason: string;
  note: string;
}

export function RefundForm({
  order,
  isCash,
  typeLabel,
  typeFullLabel,
  typePartialLabel,
  methodLabel,
  methodItemsLabel,
  methodAmountLabel,
  amountPlaceholder,
  maxAmountLabel,
  amountFieldLabel,
  amountSummaryLabel,
  selectedSummaryLabel,
  reasonPlaceholder,
  reasonOptions,
  noteLabel,
  notePlaceholder,
  submitLabel,
  accent,
  onSubmit,
}: {
  order: OrderRecord;
  isCash: boolean;
  typeLabel: string;
  typeFullLabel: string;
  typePartialLabel: string;
  methodLabel: string;
  methodItemsLabel: string;
  methodAmountLabel: string;
  amountPlaceholder: string;
  maxAmountLabel: string;
  amountFieldLabel: string;
  amountSummaryLabel: string;
  selectedSummaryLabel: string;
  reasonPlaceholder: string;
  reasonOptions: readonly { value: string; label: string }[];
  noteLabel: string;
  notePlaceholder: string;
  submitLabel: string;
  accent: string;
  onSubmit: (payload: RefundPayload) => void;
}) {
  const max = maxRefundableSar(order);
  const [type, setType] = useState<"full" | "partial">("full");
  const [method, setMethod] = useState<"items" | "amount">("amount");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [amountInput, setAmountInput] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  function toggleItem(name: string) {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  const itemsTotal = selectedItemsTotalSar(order.items, selectedItems);
  const amountSar = type === "full" ? max : method === "items" ? itemsTotal : clampAmountSar(amountInput, max);
  const canSubmit = type === "full" || (method === "items" ? selectedItems.size > 0 : amountSar > 0);

  function submit() {
    onSubmit({
      type,
      method: isCash ? "amount" : method,
      selectedItems: Array.from(selectedItems),
      amountSar,
      reason,
      note,
    });
  }

  return (
    <div>
      <p className="text-[12px] font-semibold text-[var(--octo-text-secondary)]">{typeLabel}</p>
      <RadioCardGroup
        name="refund-type"
        options={[
          { value: "full", label: typeFullLabel },
          { value: "partial", label: typePartialLabel },
        ]}
        value={type}
        onChange={(value) => setType(value as "full" | "partial")}
        className="mt-2"
      />

      {type === "partial" && !isCash && (
        <>
          <p className="mt-4 text-[12px] font-semibold text-[var(--octo-text-secondary)]">{methodLabel}</p>
          <RadioCardGroup
            name="refund-method"
            options={[
              { value: "items", label: methodItemsLabel },
              { value: "amount", label: methodAmountLabel },
            ]}
            value={method}
            onChange={(value) => setMethod(value as "items" | "amount")}
            className="mt-2"
          />
        </>
      )}

      {type === "partial" && (isCash || method === "amount") && (
        <div className="mt-4">
          {isCash && (
            <div className="mb-3 flex items-center justify-between rounded-[10px] bg-[var(--octo-hover)] px-3 py-2 text-[12.5px]">
              <span className="text-[var(--octo-text-muted)]">{maxAmountLabel}</span>
              <span className="font-semibold text-[#0D6EFD]">{formatSar(max)}</span>
            </div>
          )}
          <Input
            label={isCash ? amountFieldLabel : undefined}
            value={amountInput}
            onChange={(event) => setAmountInput(event.target.value)}
            placeholder={amountPlaceholder}
            inputMode="decimal"
          />
        </div>
      )}

      {type === "partial" && !isCash && method === "items" && (
        <div className="mt-4 rounded-[10px] border border-[var(--octo-border-input)] p-1">
          {order.items.map((item) => (
            <label key={item.name} className="flex items-center justify-between gap-2 rounded-[8px] px-2.5 py-2">
              <Checkbox label={item.name} checked={selectedItems.has(item.name)} onChange={() => toggleItem(item.name)} />
              <span className="text-[12.5px] text-[var(--octo-text-secondary)]">{formatSar(item.priceSar * item.qty)}</span>
            </label>
          ))}
        </div>
      )}

      <div className="mt-4">
        <Select value={reason} onChange={(event) => setReason(event.target.value)}>
          <option value="" disabled>
            {reasonPlaceholder}
          </option>
          {reasonOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="mt-4">
        <Textarea
          label={noteLabel}
          placeholder={notePlaceholder}
          rows={4}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>

      <div className="mt-4 flex items-center justify-between rounded-[10px] bg-[var(--octo-hover)] px-3 py-2 text-[12.5px]">
        <span className="text-[var(--octo-text-muted)]">
          {type === "partial" && !isCash && method === "items"
            ? selectedSummaryLabel.replace("{n}", String(selectedItems.size))
            : amountSummaryLabel}
        </span>
        <span className="font-semibold text-[#0D6EFD]">{formatSar(amountSar)}</span>
      </div>

      <button
        type="button"
        disabled={!canSubmit || !reason}
        onClick={submit}
        className="mt-5 w-full rounded-[9px] py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        style={{ backgroundColor: accent }}
      >
        {submitLabel}
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Write `refund-order-flow.tsx`**

```tsx
// apps/merchant/src/pages/orders-list/_shared/refund-order-flow.tsx
import { useMemo } from "react";
import { Banknote, Check, FileClock, Loader2, Stamp, X } from "lucide-react";
import { Modal } from "@ui/primitives";
import { formatSar } from "@octopus/api-client";
import { useI18n } from "@/app/providers/i18n-provider";
import { RefundForm, type RefundPayload } from "./refund-form";
import { PinConfirmModal } from "./pin-confirm-modal";
import { ResultModal } from "./result-modal";
import { useActionFlow } from "./action-flow";
import { ACTION_THEME } from "./theme";
import { maxRefundableSar } from "./refund-amount";
import type { FlowStepKind } from "./action-flow-state";
import type { OrderRecord } from "./types";

const CASH_STEPS: readonly FlowStepKind[] = ["form", "pin", "result"];
const ONLINE_STEPS: readonly FlowStepKind[] = ["form", "pin", "processing", "pending", "result"];

function StampBadgeIcon({ tone }: { tone: "success" | "failed" }) {
  const Icon = tone === "success" ? Stamp : Banknote;
  const BadgeIcon = tone === "success" ? Check : X;
  const badgeColor = tone === "success" ? "#16A34A" : "#DC2626";
  return (
    <span className="relative inline-flex h-14 w-14 items-center justify-center">
      <Icon size={48} className="text-[var(--octo-text-primary)]" strokeWidth={1.75} />
      <span
        className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full text-white"
        style={{ backgroundColor: badgeColor }}
      >
        <BadgeIcon size={13} strokeWidth={3} />
      </span>
    </span>
  );
}

function ProcessingStep({ amountSar }: { amountSar: number }) {
  const { t } = useI18n();
  return (
    <Modal open onClose={() => {}} className="max-w-md text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center">
        <Loader2 size={40} className="animate-spin text-[var(--octo-text-secondary)]" />
      </div>
      <h2 className="mt-2 text-[19px] font-bold text-[var(--octo-text-primary)]">{t("orders.result.processingRefundTitle")}</h2>
      <p className="mt-2 text-[13px] text-[var(--octo-text-secondary)]">
        {t("orders.result.processingRefundSubtitle").replace("{amount}", formatSar(amountSar))}
      </p>
    </Modal>
  );
}

function PendingStep({ refundId }: { refundId: string }) {
  const { t } = useI18n();
  return (
    <Modal open onClose={() => {}} className="max-w-md text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center text-[#D97706]">
        <FileClock size={44} strokeWidth={1.75} />
      </div>
      <h2 className="mt-2 text-[19px] font-bold text-[var(--octo-text-primary)]">{t("orders.result.refundPendingTitle")}</h2>
      <p className="mt-2 text-[13px] text-[var(--octo-text-secondary)]">{t("orders.result.refundPendingSubtitle")}</p>
      <div className="mt-4 rounded-[10px] bg-[#FFFBEB] p-3 text-start text-[12.5px] text-[#92400E]">
        {t("orders.result.refundPendingNote").replace("{refundId}", refundId)}
      </div>
    </Modal>
  );
}

// Pixel match for Refund Failed.png, kept as an exported-but-unused view —
// see the Task 12 note in the plan for why nothing currently calls this.
export function RefundFailedPreview({ amountSar, onRetry }: { amountSar: number; onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <ResultModal
      open
      onClose={onRetry}
      icon={<StampBadgeIcon tone="failed" />}
      title={t("orders.result.refundFailedTitle")}
      subtitle={t("orders.result.refundFailedSubtitle").replace("{amount}", formatSar(amountSar))}
      noteLines={[t("orders.result.refundFailedReason")]}
      noteClassName="bg-[#FEF2F2] text-[#991B1B]"
      primaryLabel={t("orders.result.tryAgain")}
      onPrimary={onRetry}
    />
  );
}

export function RefundOrderFlow({ order, onClose }: { order: OrderRecord | null; onClose: () => void }) {
  const { t } = useI18n();
  const isCash = order?.payment === "Paid Cash";
  const isUnpaid = order?.payment === "Unpaid";
  const steps = isCash ? CASH_STEPS : ONLINE_STEPS;
  const flow = useActionFlow<RefundPayload>(steps, order !== null && !isUnpaid);
  const accent = ACTION_THEME.refund.accent;

  // Deterministic per order (from its numeric suffix), so reopening the
  // same order's refund always shows the same id instead of a new random
  // one each time.
  const refundId = useMemo(() => {
    if (!order) return "";
    const digits = Number(order.id.replace(/\D/g, "")) || 0;
    return `RF-${8800000 + digits}`;
  }, [order]);

  if (!order) return null;

  if (isUnpaid) {
    return (
      <ResultModal
        open
        onClose={onClose}
        title={t("orders.refund.title")}
        subtitle={t("orders.refund.unpaidNotice")}
        noteLines={[]}
        noteClassName=""
        primaryLabel={t("orders.result.done")}
        onPrimary={onClose}
      />
    );
  }

  if (flow.step === "form") {
    return (
      <Modal open onClose={onClose} className="max-w-lg">
        <h2 className="text-[17px] font-bold text-[var(--octo-text-primary)]">{t("orders.refund.title")}</h2>
        <RefundForm
          order={order}
          isCash={isCash}
          typeLabel={t("orders.refund.typeLabel")}
          typeFullLabel={t("orders.refund.typeFull")}
          typePartialLabel={t("orders.refund.typePartial")}
          methodLabel={t("orders.refund.methodLabel")}
          methodItemsLabel={t("orders.refund.methodItems")}
          methodAmountLabel={t("orders.refund.methodAmount")}
          amountPlaceholder={t("orders.refund.amountPlaceholder")}
          maxAmountLabel={t("orders.refund.maxAmount")}
          amountFieldLabel={t("orders.refund.amountFieldLabel")}
          amountSummaryLabel={t("orders.refund.amountSummary")}
          selectedSummaryLabel={t("orders.refund.selectedSummary")}
          reasonPlaceholder={t("orders.refund.reasonPlaceholder")}
          reasonOptions={[
            { value: "wrongInput", label: t("orders.refund.reason.wrongInput") },
            { value: "customerComplaint", label: t("orders.refund.reason.customerComplaint") },
            { value: "qualityIssue", label: t("orders.refund.reason.qualityIssue") },
            { value: "other", label: t("orders.refund.reason.other") },
          ]}
          noteLabel={t("orders.note")}
          notePlaceholder={t("orders.notePlaceholder")}
          submitLabel={t("orders.next")}
          accent={accent}
          onSubmit={flow.submit}
        />
      </Modal>
    );
  }

  if (flow.step === "pin") {
    return (
      <PinConfirmModal
        open
        onClose={onClose}
        onConfirm={flow.advance}
        accent={accent}
        promptKey="orders.managerAuth.prompt.refund"
        confirmLabelKey="orders.managerAuth.confirm.refund"
      />
    );
  }

  const amountSar = flow.payload?.amountSar ?? maxRefundableSar(order);
  const typeLabel = flow.payload?.type === "partial" ? t("orders.refund.typePartial") : t("orders.refund.typeFull");
  const now = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  if (flow.step === "processing") return <ProcessingStep amountSar={amountSar} />;
  if (flow.step === "pending") return <PendingStep refundId={refundId} />;

  if (isCash) {
    return (
      <ResultModal
        open
        onClose={onClose}
        icon={<StampBadgeIcon tone="success" />}
        title={t("orders.result.cashRefundTitle")}
        subtitle={t("orders.result.cashRefundSubtitle").replace("{amount}", formatSar(amountSar))}
        noteLines={[
          t("orders.result.cashRefundNote").replace("{refundId}", refundId).replace("{time}", now).replace("{type}", typeLabel),
        ]}
        noteClassName="bg-[#F0FDF4] text-[#166534]"
        primaryLabel={t("orders.result.done")}
        onPrimary={onClose}
      />
    );
  }

  return (
    <ResultModal
      open
      onClose={onClose}
      icon={<StampBadgeIcon tone="success" />}
      title={t("orders.result.refundSuccessTitle")}
      subtitle={t("orders.result.refundSuccessSubtitle")
        .replace("{amount}", formatSar(amountSar))
        .replace("{method}", order.paymentMethod ?? "")}
      noteLines={[
        t("orders.result.refundSuccessNote").replace("{refundId}", refundId).replace("{time}", now).replace("{type}", typeLabel),
      ]}
      noteClassName="bg-[#F0FDF4] text-[#166534]"
      primaryLabel={t("orders.result.done")}
      onPrimary={onClose}
    />
  );
}
```

- [ ] **Step 6: Wire the flow into `index.tsx`**

Add the import:

```tsx
import { RefundOrderFlow } from "./_shared/refund-order-flow";
```

Then add, right after the `<WastageOrderFlow ... />` block from Task 11:

```tsx
      <RefundOrderFlow
        order={pendingAction?.action === "refund" ? pendingAction.order : null}
        onClose={() => setPendingAction(null)}
      />
```

- [ ] **Step 7: Typecheck**

Run: `cd apps/merchant && npx tsc --noEmit -p .`
Expected: no errors.

- [ ] **Step 8: Manual smoke-check**

Run the app. Click **Refund** on a `Paid Cash` row — compare the form (no items/amount toggle) against `refund order-cash payment.png`, the gold "Confirm Refund" PIN screen against `Manager Approval (6).png`, and the result against `Success (1).png`/`Success (2).png` ("Cash Refund Recorded!"). Click **Refund** on a `Paid Online` or `Partially Paid` row — compare the Items-selected form against `refund order-online payment.png`, the Amount-selected form against `refund order.png`, the spinner against `peyment getaway processing.png`, the pending card against `Refund Processing.png`, and the final result against `Success.png` ("Refund Successful!"). Click **Refund** on an `Unpaid` row and confirm the short notice appears instead of a form.

- [ ] **Step 9: Commit**

```bash
git add apps/merchant/src/pages/orders-list/_shared/refund-amount.ts apps/merchant/src/pages/orders-list/_shared/refund-amount.test.ts apps/merchant/src/pages/orders-list/_shared/refund-form.tsx apps/merchant/src/pages/orders-list/_shared/refund-order-flow.tsx apps/merchant/src/pages/orders-list/index.tsx
git commit -m "Add the Refund order confirm-flow (cash and online payment paths)"
```

---

### Task 13: Cleanup — delete the dead `order-detail` stub, trim dead mock exports

**Files:**
- Delete: `apps/merchant/src/pages/order-detail/index.ts` (and the now-empty `order-detail/` folder)
- Modify: `apps/merchant/src/shared/api/mock-orders.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new — this task only removes code confirmed dead by grep, run *after* Task 7 so `orders-list/index.tsx` no longer imports the two exports being removed.

- [ ] **Step 1: Confirm `order-detail` is unreferenced**

Run: `cd apps/merchant && grep -rn "order-detail" src --include="*.tsx" --include="*.ts"` (or the PowerShell equivalent `Select-String -Path src -Pattern "order-detail" -Recurse`)
Expected: only `src/pages/order-detail/index.ts` itself matches (its own file path). It contains just `export {};` and is not in `app/routes/registry.tsx` or imported anywhere.

- [ ] **Step 2: Delete it**

```bash
git rm apps/merchant/src/pages/order-detail/index.ts
```

(This empties the `order-detail/` directory; git doesn't track empty directories, so no further action is needed.)

- [ ] **Step 3: Confirm `orderStats`/`orderRows` are unreferenced outside `mock-orders.ts`**

Run: `cd apps/merchant && grep -rn "orderStats\|orderRows" src --include="*.tsx" --include="*.ts"`
Expected: only `src/shared/api/mock-orders.ts` matches (their own definitions). If `orders-list/index.tsx` still shows up here, Task 7 wasn't completed correctly — stop and fix that first.

- [ ] **Step 4: Trim `mock-orders.ts` to what `kds`/`preorders` actually use**

Open `apps/merchant/src/shared/api/mock-orders.ts`. Replace the whole file with:

```ts
// Mock data shared by the Kitchen Display (kds-page.tsx, kds-ticket-board.tsx)
// and Pre-Orders (preorders/index.tsx, mock-preorders.ts) pages.
// pages/orders-list has its own richer order model — see
// pages/orders-list/_shared/types.ts — and no longer uses this file.

export type OrderStatus = "New" | "Preparing" | "Ready" | "Out for Delivery" | "Completed" | "Cancelled";

export interface OrderRow {
  id: string;
  branch: string;
  channel: "Dine-in" | "Takeaway" | "Delivery" | "Kiosk" | "Aggregator";
  customer: string;
  items: number;
  total: string;
  status: OrderStatus;
  minutesAgo: number;
}
```

(This drops the `orderStats`/`orderRows` constants and the now-unused `KpiCard` import — both confirmed dead in Step 3 — while keeping `OrderStatus`/`OrderRow` exactly as they were, since `live-orders.ts`'s `toOrderRow`/`useLiveOrders`, `kds-page.tsx`, `kds-ticket-board.tsx`, `preorders/index.tsx`, and `mock-preorders.ts` all still depend on them unchanged.)

- [ ] **Step 5: Typecheck and run the full test suite**

Run: `cd apps/merchant && npx tsc --noEmit -p . && npx vitest run`
Expected: no type errors; every test passes (the pre-existing suite, `mock-reservations.test.ts`, `editor-state.test.ts`, etc., plus all the `orders-list/_shared/*.test.ts` files from Tasks 1, 2, 4, 5, 9, 12).

- [ ] **Step 6: Manual smoke-check that KDS and Pre-Orders are unaffected**

Run the app, open `/kds` and `/orders/preorders`. Confirm both render exactly as before this plan — neither page's visuals or data changed.

- [ ] **Step 7: Commit**

```bash
git add apps/merchant/src/shared/api/mock-orders.ts
git commit -m "Remove the dead order-detail stub and the Orders page's old mock stats/rows"
```

---

### Task 14: Full manual verification against all 22 mockups

**Files:** none (verification only).

- [ ] **Step 1: Launch the merchant app**

Use the `run` skill (or, if no project-specific run skill is found for `apps/merchant`, `cd apps/merchant && npm run dev`) and open the app in a browser at `/orders`.

- [ ] **Step 2: Screenshot the populated list and compare**

Compare against `orders (1).png`: 5 stat cards, filter pills with correct counts, source popover, search + Export, every row's 6-step timeline and 4 action buttons.

- [ ] **Step 3: Clear every filter down to zero rows and compare the empty state**

Compare the true-empty illustration/copy against `orders.png` ("No Orders Yet!"), and the filtered-empty state (pick a pill combination that matches nothing) against the existing `orders.filter.empty` copy + Reset button.

- [ ] **Step 4: Open Order Details and compare**

Compare against `order details.png`.

- [ ] **Step 5: Walk the Cancel flow and compare each screen**

Compare against `cancel order.png`, `Manager Approval.png` (red "Confirm Cancellation"), `Manager Approval (2).png` ("Order Cancelled!").

- [ ] **Step 6: Walk the Void flow and compare each screen**

Compare against `void order.png`, the orange "Confirm Avoid" PIN screen, `Manager Approval (3).png` ("Order Voided!").

- [ ] **Step 7: Walk the Wastage flow and compare each screen**

Compare against `Wastageorder.png`, `Manager Approval (4).png` (purple "Confirm Wastage"), `Manager Approval (5).png` ("Wastage Recorded").

- [ ] **Step 8: Walk both Refund paths and compare every screen**

Cash-paid order: `refund order-cash payment.png`, `Manager Approval (6).png` (gold "Confirm Refund"), `Success (1).png`/`Success (2).png` ("Cash Refund Recorded!"). Online-paid order, Items method: `refund order-online payment.png`. Online-paid order, Amount method: `refund order.png`. Then `peyment getaway processing.png`, `Refund Processing.png`, `Success.png` ("Refund Successful!").

- [ ] **Step 9: Confirm untouched pages still render correctly**

Open `/orders/history`, `/orders/preorders`, `/inventory/purchasing`, `/kds` — all four should look and behave exactly as they did before this plan.

- [ ] **Step 10: Fix any visual gaps found, then re-screenshot until every screen matches its mockup**

No fixed step count — iterate: adjust the relevant `_shared/*.tsx` file, re-check in the browser, repeat until satisfied. Commit any fixes as `git commit -m "Fix Orders module visuals to match mockups"` once done.

---

## Self-Review Notes

- **Spec coverage:** Page shell with 5 stat cards, filter pills, source popover, search/export (Task 7) ✓; isolated data model + mock data + live-order bridge (Tasks 1–2) ✓; 6-step timeline frozen at `lastStage` for terminal states (Task 4) ✓; Order Details modal (Task 8) ✓; shared PIN-confirm + result-modal infrastructure reused by all four actions (Task 9) ✓; Cancel/Void sharing one form component (Task 10) ✓; Wastage item-qty picker (Task 11) ✓; Refund's cash-vs-online branching, Items-vs-Amount toggle, and the processing→pending→success/failed sequence (Task 12) ✓; dead `order-detail` stub and dead `orderStats`/`orderRows` removed without touching `kds`/`preorders`/`order-history` (Task 13) ✓; i18n keys mirrored en/ar (Task 3) ✓; manual screenshot verification against all 22 frames (Task 14) ✓. Explicit spec deviations (sliders-icon source popover, terminal-state stepper freezing, Unpaid-order refund notice, unwired Refund Failed screen, corrected typos/Lorem-ipsum) are each called out at the point they're introduced, matching the design spec's own flagged list.
- **Type consistency:** `OrderRecord`/`OrderState`/`TimelineStage`/`OrderItem` (Task 1) used identically through every later task. `stageStatuses`/`StageStatus` (Task 4) consumed by both `order-row.tsx` (Task 6) and `order-details-modal.tsx` (Task 8) via the shared `Stepper` component — never reimplemented. `STATE_LABEL_KEY` is defined once in `stepper.tsx` (Task 4) and imported by `filter-pills.tsx` (Task 5), never redefined. `FlowStepKind`/`FlowState`/`useActionFlow` (Task 9) have the identical signature across all four flow components (Tasks 10–12). `ACTION_THEME`/`OrderAction` (Task 1) keys (`cancel`/`void`/`wastage`/`refund`) match exactly what `order-row.tsx`'s `onAction` callback and `index.tsx`'s `pendingAction.action` narrow against.
- **No placeholders:** every step contains complete, runnable code; the one deliberately-unreachable piece (`RefundFailedPreview`) is a fully built component with a stated reason for being unwired, not a stub.
