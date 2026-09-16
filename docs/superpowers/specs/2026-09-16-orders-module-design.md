# Orders (Live Orders) Module Redesign

Date: 2026-09-16
Status: Approved for implementation

## Context

The merchant app's `/orders` route renders `OrdersListPage`
(`apps/merchant/src/pages/orders-list/index.tsx`): 4 stat cards, a
checkbox-dropdown status filter, and a plain table/card list with a
single status badge per row. New mockups
(`apps/assets/Orders/Orders Desing/*.png`) specify a materially
different page: 5 stat cards, single-select filter pills, a 6-step
per-row status timeline, 4 always-visible row actions (Void / Refund /
Wastage / Cancel), an Order Details modal, and four confirm-flow
modals (Cancel, Void, Wastage, Refund) that each run through a shared
"Manager Authentication & Security" PIN step and a themed result
screen. This spec covers rebuilding `/orders` to match those mockups.

`/orders/history` (`OrderHistoryPage`), `/orders/preorders`
(`PreOrdersPage`), `/inventory/purchasing` (Purchase Orders), and
`/kds` are **untouched** — confirmed out of scope. They keep consuming
`shared/api/mock-orders.ts` / `live-orders.ts` exactly as today.

Backend integration is out of scope: everything is mock/local state,
same as the Staff module precedent
([[2026-09-11-staff-module-design]]). Live customer orders placed via
the storefront must still surface here (that's real, working
behaviour today via `useLiveOrders`), so the new page keeps merging
them in, best-effort-mapped into the richer shape — not a regression
to mock-only data.

## Reference mockups (22 frames, `apps/assets/Orders/Orders Desing/`)

- `orders.png` — empty state; `orders (1).png` — populated list
- `order details.png` — Order Details modal
- `cancel order.png` — Cancel Order form (scope + reason + note)
- `void order.png` — Void Order form (same shape, different reason list)
- `Wastageorder.png` — Wastage Items form (item picker w/ qty + reason)
- `refund order.png`, `refund order-online payment.png` — Refund form, online-paid order (Full/Partial + Items-or-Amount toggle)
- `refund order-cash payment.png` — Refund form, cash-paid order (Full/Partial + direct amount w/ max cap, no toggle)
- `Manager Approval.png`, `(1)`–`(6)` — the shared PIN modal, themed per action, plus its result screens (Order Cancelled!, Order Voided!, Wastage Recorded, Refund success)
- `peyment getaway processing.png` — brief "Processing Refund!" spinner
- `Refund Processing.png` — pending state with Refund ID (online refund)
- `Success.png` — "Refund Successful!" (online refund)
- `Success (1).png`, `Success (2).png` — "Cash Refund Recorded!" (identical content, two crops)
- `Refund Failed.png` — failure state with "Try Again"

## Architecture

### Page shell

`apps/merchant/src/pages/orders-list/index.tsx` is rewritten in place
(same route, same exported `OrdersListPage`). It owns:

- Header (title/subtitle — existing `orders.title`/`orders.subtitle`
  keys) + date pill (static "Fri, Aug 14, 2026"-style display; no date
  picker behaviour shown in any frame).
- 5 stat cards (Total Orders, Sales Gross, Open Orders, Completed,
  Cancelled) — reuses `StatCard`/`widgets/sales-summary-chart` like
  today, fed by new mock stats (not `orderStats` from `mock-orders.ts`,
  which stays reserved for KDS/other consumers).
- Filter pill row (All Orders / Ready / Completed / Served / Refunded /
  Preparing / Voided / Canceled), each with a live count, single-select,
  replacing today's checkbox dropdown.
- Leading sliders-icon button opens a small popover with an Order
  Source filter (QR Code / POS Order / Kiosk Order / Phone Order,
  multi-select) — no frame shows this open; it's my own call to give
  the icon a purpose using a real data dimension, easy to cut.
- Search input (filters by order id/customer) + Export button (exports
  the currently visible rows to CSV client-side — small, real, not a
  no-op stub).
- Row list: mobile card + desktop table, same responsive split pattern
  the current page already uses.

### Data model (new, isolated — `apps/merchant/src/pages/orders-list/_shared/`)

`types.ts` defines the page-local model. **Not** merged into
`shared/api/mock-orders.ts`'s `OrderStatus`/`OrderRow`, which
`kds-page.tsx`, `kds-ticket-board.tsx`, and `preorders/index.tsx` still
depend on unchanged.

```
type OrderSource = "QR Code" | "POS Order" | "KIOSK Order" | "Phone Order";
type PaymentStatus = "Paid Online" | "Paid Cash" | "Unpaid" | "Partially Paid";
type TimelineStage = "New" | "Accepted" | "Preparing" | "Ready" | "Served" | "Completed";
type OrderState = TimelineStage | "Refunded" | "Voided" | "Canceled";

interface OrderRecord {
  id: string;              // "#ORD-2021"
  date: string;
  table: string | null;
  guests: number | null;
  totalSar: number;
  source: OrderSource;
  payment: PaymentStatus;
  paymentMethod?: string;  // "Visa ****4242" — for the details modal
  transactionId?: string;
  state: OrderState;
  timeline: Partial<Record<TimelineStage, string /* ISO timestamp */>>; // stages reached
  items: { name: string; qty: number; priceSar: number }[];
  courses: number;
  subtotalSar: number;
  taxSar: number;
  waiter?: string;
}
```

`mock-data.ts` seeds ~140 records matching the stat totals shown
(140 total / 8 open / 100 completed / 12 cancelled, distributed across
Ready/Completed/Served/Refunded/Preparing/Voided/Canceled/New per the
pill counts in `orders (1).png`).

`live-orders-bridge.ts` maps `useLiveOrders()`'s canonical `Order[]`
into `OrderRecord` (channel → `OrderSource`, `tableNumber`/absent →
`table`/`guests`, canonical `OrderStatus` → `TimelineStage`/`state`,
payment fields defaulted to `"Unpaid"` since the canonical contract
carries none yet). Bridged rows are prepended to the seeded rows, same
pattern `orders-list/index.tsx` uses today.

### Shared row/detail components

- `stepper.tsx` — the 6-node timeline (checked/pending per stage
  reached before any terminal state; terminal states render the same
  stepper frozen at their last reached stage, with the colored status
  pill below showing Refunded/Voided/Canceled instead of a lifecycle
  stage — no frame shows a terminal-state row, so this is an explicit
  interpretation, flagged for easy correction).
- `order-row.tsx` — desktop `<tr>` + mobile card, id/date/source,
  table/guests, total, payment badge, `Stepper`, the 4 action buttons.
  All 4 buttons always rendered/enabled, matching every frame (no
  disabled state is depicted anywhere in the 22 frames).
- `order-details-modal.tsx` — header (id, state, date/time/source),
  meta row (table/guests/waiter/source), Order Summary (items/courses),
  Subtotal/Tax/Total box, Payment section, Timeline (reuses `stepper.tsx`
  in its vertical/labelled form), same 4 action buttons in the footer.

### Shared confirm-flow (Cancel / Void / Wastage / Refund)

`action-flow.tsx` is a small local state machine — `"form" |
"pin" | "processing" | "result"` — parameterized per action:

```
interface ActionFlowConfig {
  formTitle: string;
  renderForm: (order: OrderRecord, submit: (payload) => void) => ReactNode;
  pinTheme: { accent: string; confirmLabel: string; prompt: string };
  resultTheme: (payload, order: OrderRecord) => ResultView; // icon/title/body/accent, or a processing→success/fail sub-sequence for online refunds
}
```

- `pin-input.tsx` — 4-box PIN field, same interaction as
  `features/session/_shared/otp-input.tsx` (type-advances,
  backspace-back, arrow keys, paste-fill) reimplemented locally under
  `orders-list/_shared/` — `pages/orders-list` doesn't reach into
  `features/session` per this codebase's layering, so the component is
  copied/adapted, not imported.
- `pin-confirm-modal.tsx` — "Manager Authentication & Security" header,
  static manager identity (mock: "Reem Al-Subaie, Restaurant Manager"),
  themed PIN-confirm button. Any 4-digit entry succeeds (no real PIN
  store exists yet) — mirrors the mock-auth precedent elsewhere in the
  app.
- `result-modal.tsx` — themed icon/title/body + colored info box +
  "Done" button, covering Cancel (red), Void (orange), Wastage
  (purple), and the two direct-result refund cases.

Per-action wrappers, each just the form step's fields, reusing shared
`Select`/`Textarea`/`Checkbox`/`RadioGroup`-equivalent primitives from
`@ui/primitives` (check what exists before hand-rolling radio pills —
`cancel order.png`/`void order.png`/`refund order.png` all use the
same two-box radio-card control):

- `cancel-order-modal.tsx` — Cancel Entire Order / Cancel Specific
  Items, reason select, note.
- `void-order-modal.tsx` — same shape, Void-specific reason list.
- `wastage-order-modal.tsx` — item picker (checkbox + qty stepper),
  reason select, note.
- `refund-order-modal.tsx` — branches on `order.payment`:
  - `"Paid Cash"`: Full/Partial + direct amount input with a "Max
    Refund Amount" readout, reason, note → PIN (gold "Confirm Refund")
    → straight to **"Cash Refund Recorded!"** result (green stamp
    icon, Audit ID + timestamp + refund type).
  - anything else paid (`"Paid Online"` / `"Partially Paid"`): adds the
    Items-or-Amount toggle (Items: checkbox list with per-item price
    and a running "Selected: N Items" total; Amount: manual input) →
    PIN → **"Processing Refund!"** spinner (~900ms, matching the
    existing `handleRefresh` timeout pattern already in this file) →
    **"Refund Processing!"** pending card (Refund ID, ~900ms) →
    **"Refund Successful!"** (Refund ID + timestamp + type). The
    **"Refund Failed!"** screen is built pixel-for-pixel but not wired
    to any trigger — there's no real payment gateway to fail, and nothing
    in the mockups defines when it should; the online path always
    resolves to success in this mock.
  - `"Unpaid"` orders: Refund button stays visible per the
    no-disabled-states rule above, but its form has nothing to refund —
    opens straight to a short "Nothing to refund — this order is
    unpaid." notice in place of the form, Done-only.

### Cleanup

- `apps/merchant/src/pages/order-detail/` deleted — an empty,
  unregistered stub (`export {}`, not in `app/routes/registry.tsx`,
  not imported anywhere). Order details are a modal on this page per
  the mockups, not a separate route.
- The current `orders-list/index.tsx` filter-dropdown implementation,
  `STATUS_STYLE`/`ORDER_STATUSES` maps, and its `mock-orders.ts`/
  `live-orders.ts` imports are removed from this file (those modules
  themselves are untouched for their other consumers).

### i18n

New copy under the existing `orders.*` namespace (mirrored in
`packages/i18n/src/locales/{en,ar}/index.ts`, following the 1:1
pattern already used for the 219 `staff.*` keys): `orders.kpi.*` (5
new stat labels), `orders.pill.*` (8 filter pills), `orders.action.*`
(void/refund/wastage/cancel), `orders.details.*`, `orders.cancel.*`,
`orders.void.*`, `orders.wastage.*`, `orders.refund.*`,
`orders.managerAuth.*`, `orders.result.*`. Existing `orders.col.*`,
`orders.filter.*` keys are retired if no longer referenced (grep
before deleting).

## Testing

- Manual verification via the `run` skill: open `/orders`, check the
  empty state, the populated list, every filter pill, the source
  popover, Order Details, and all four action flows end-to-end
  (including both refund payment-method branches) — compare
  screenshots against the 22 mockups per the
  [[verify-ui-with-screenshots]] memory before calling any screen done.
- Confirm `/orders/history`, `/orders/preorders`, `/kds` still render
  unchanged (they share `mock-orders.ts`/`live-orders.ts`, which this
  work doesn't modify).
- Confirm a live customer-placed order (via the customer storefront
  dev flow) still appears on `/orders`.
- No new automated tests required beyond typecheck/lint — mock-data UI
  feature, no business logic to unit test.

## Out of scope

- Any backend/API wiring; the canonical `Order` contract in
  `@octopus/api-client` is not modified.
- `/orders/history`, `/orders/preorders`, `/inventory/purchasing`, `/kds`.
- Real PIN validation, real payment-gateway refunds, real CSV export
  formatting beyond a basic client-side download.
- Disabled/conditional action-button states (no mockup depicts one).
