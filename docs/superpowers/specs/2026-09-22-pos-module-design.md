# POS Module — Design Spec

Date: 2026-09-22
Source of truth: `apps/assets/POS/*.png` (35 mockups, pixel reference — match exactly)

## 1. Goal

Build the Orders & POS terminal screen (`/pos`) in `apps/merchant`, replicating the
mockups in `apps/assets/POS` exactly: shift start, the active order-taking terminal,
all payment flows (cash / card / mada / Apple Pay / STC Pay / QR / split), cash
drawer management (cash in / cash out), retrieve-order, and close-shift with Z-report.

Mock data only, typed, in one file per AGENTS.md conventions. No backend calls.

## 2. Route & page shell

- New route: `id: "pos"`, `path: "/pos"`, `section: "Orders"`, `page: "POS"`, added to
  `apps/merchant/src/app/routes/registry.tsx` (only line touched in that file).
- Sidebar already has a "POS" entry (`widgets/app-sidebar`) — not modified.
- `PosPage` renders inside the existing app shell (sidebar + top bar), matching every
  mockup which shows the sidebar present. No fullscreen/kiosk breakout.
- The page's own header strip (POS register selector, shift-active pill, online
  status, PIN login) is drawn by the page itself, below the shared top-bar — it is
  additional chrome specific to POS, not a replacement for `widgets/top-bar`.

## 3. Top-level view state

`PosPage` holds one state variable driving which screen is shown in the main content
area (all within the same route, no sub-routes):

- `"shift-start"` — no active shift. Default when there is no mock shift in progress.
- `"active"` — the order-taking terminal (menu grid + cart + keypad). Default once a
  shift is active.
- `"retrieve-order"` — the content area swaps to the pending-orders list.
- `"close-shift"` — the content area swaps to the close-shift review screen.

Transitions:
- `shift-start` → `active` via "Start Shift".
- `active` → `retrieve-order` via the "Retrieve Order" bar button, and back via
  "Back"/selecting an order (selecting loads that order into the cart and returns to
  `active`).
- `active` → `close-shift` via "End Shift", and back to `shift-start` once the close
  is confirmed (PIN entered, shift ends).

## 4. Shift-start screen (`shift-start-view.tsx`)

One screen with three data-driven variants (all in the same component, driven by
mock shift-history data, not separate routes):

- **Normal** (`POS-Start shhift.png`): employee/role/branch/register card, previous
  shift summary card, opening-balance form with a denomination-count table that sums
  to the opening balance, "Start Shift" button.
- **Above threshold** (`POS-Start Above Threshold*.png`): opening balance exceeds a
  configured threshold → inline warning before Start Shift is enabled/confirmed.
- **Previous shift not closed** (`POS-Start previous shift not closed yet*.png`):
  blocks starting a new shift, shows the stuck previous shift and a path to close it
  (routes into `close-shift` for that shift).

## 5. Active POS terminal (`active-pos-view.tsx`)

Three-column layout per `Active POS.png` / `Active POS-pay now.png`:

- **Left:** order-type tabs (Dine In / Take Away / Delivery), category search, category
  list (All Items + per-category icons), "Add custom item".
- **Center:** item search + filter icon, responsive grid of menu item cards (image,
  name, description, price). Clicking a card adds it to the cart; if the item has
  configurable options it opens the modifier panel in place of the grid
  (`item-modifier-panel.tsx`, per `Active POS-adding order-modifires.png`: size,
  bread type, spice level, add-ons with price deltas, cooking level, note).
- **Right (`cart-panel.tsx`):** order type selector, table picker, line items with
  qty/price/remove and modifier sub-notes, subtotal/VAT/total, "Pay Now" button. This
  panel is always visible while in `active`.
- **Bottom strip (`keypad.tsx`):** numeric keypad, quick-discount %, custom %,
  discount/promo/hold-order buttons, note field. On "Pay Now" this strip's right side
  swaps from category icons to payment method buttons (Cash / Card / Mada / Apple Pay
  / STC Pay / QR Pay) plus Split Bill — matching `Active POS-pay now.png`. Selecting
  Cash reveals an "Amount Received" field above the payment buttons
  (`Active POS-pay now-cash.png`).

Top bar-buttons above this layout (`Cash In` / `Cash Out` / `Retrieve Order` / `End
Shift`) drive the modals/views in §6–§8.

## 6. Payment result & method modals

- **Split payment** (`split-payment-modal.tsx`): modal over the active view. Two
  methods — Split Equally (N-way divide) and Split by Item (drag items between
  generated sub-bills, per `...split payment-by item.png`), each sub-bill pays
  independently via its own "Pay Now".
- **QR Pay** (`qr-pay-modal.tsx`): shows a generated QR + amount, then transitions to
  the shared success state.
- **Payment result** (`payment-result-modal.tsx`): shared success/fail modal (icon +
  message), used after cash/card/QR/online payment — parameterized by outcome, not a
  separate component per method.
- **Retrieved-order payment**: paying an order pulled from Retrieve Order reuses the
  same cart panel + keypad + result modal — no separate component.

## 7. Cash drawer management

- **Cash In / Cash Out** (`cash-drawer-modal.tsx`, single component with a `mode`
  prop): employee card, Amount, Reason, Reference, Note, Confirm button — per
  `cash in.png` / `cash out amount entry*.png`.

## 8. Retrieve order (`retrieve-order-view.tsx`)

Replaces the center+right content (menu stays out) with a searchable list of pending
orders (table, order type, waiter, duration, total, status pill, "Retrieve Order"
button) — per `Retrieve Order.png`. Selecting one loads it into the cart and returns
to `active`.

## 9. Close shift (`close-shift-view.tsx`)

Per `close shift.png`: cash-drawer denomination count (with a "Use Cash Counter" /
"Recount / Clear All" toggle-only affordance — no real hardware integration),
reconciliation summary (expected vs actual vs difference), payment summary, cash
movements during shift, closing note, manager PIN confirmation
(`pin-pad.tsx`, shared with PIN Login), "Close Shift" button.

Sub-states, still within this same view, data-driven:
- **Tolerance limit exceeded** (`close shift- Tolerance Limit*.png`): difference
  outside configured tolerance → warning styling, requires acknowledging before
  proceeding.
- **Manager reason for force close** (`manager reason for force close.png`): modal
  requiring a reason when closing outside tolerance without matching.
- **Z-Report** (`closing shift report - Z Report.png`): final summary screen shown
  after successful close, before returning to `shift-start`.

## 10. Shared building blocks

- `keypad.tsx` and `pin-pad.tsx` are reused across views (keypad: active terminal;
  pin-pad: close-shift + PIN Login button in the header, though wiring the header's
  PIN Login button is out of scope — it's decorative here since no auth flow exists
  for it yet).
- All modals are simple local `useState`-driven overlays (fixed/backdrop + centered
  card), matching the existing `_shared/*-flow.tsx` modal pattern used in
  `orders-list`.

## 11. Mock data shape (`_shared/mock-data.ts`)

Typed `readonly` consts: `mockShift` (employee, branch, register, opening cash,
sales, order count, opened-at), `mockPreviousShift`, `mockMenuCategories` +
`mockMenuItems` (id, category, name, description, price, image, optional
`modifierGroups`), `mockPendingOrders`, `mockDenominations` (SAR 500→1). Shaped so
each maps cleanly to a future `GET /pos/shift`, `GET /pos/menu`,
`GET /pos/orders?status=pending` response.

## 12. Out of scope

- No real payment gateway/QR generation, no backend persistence (state resets on
  reload), no barcode/keyboard scanning, no floor-plan integration for the table
  picker (decorative), no real cash-counter hardware hook.
- RTL/i18n: components use logical Tailwind classes and design-token colors per
  AGENTS.md, but full Arabic string wiring into `packages/i18n` is not required for
  this pass unless requested — English copy matches the mockups.

## 13. Verification

`npx tsc --noEmit` from `apps/merchant` must pass. Visual check against each mockup
file for pixel-level fidelity (spacing, colors, copy) where feasible without a live
dev server conflict.
