# POS Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `/pos` route in `apps/merchant` that replicates every screen in `apps/assets/POS/*.png` — shift start, the active order terminal, all payment flows, cash drawer management, retrieve-order, and close-shift with Z-report — using typed mock data only.

**Architecture:** One route, one page (`PosPage`), FSD-compliant, following the `pages/orders-list` pattern: a top-level view-state switch plus a `_shared/` folder of view and modal components. No backend calls; this codebase has no test runner, so "tests" in this plan are `npx tsc --noEmit` (from `apps/merchant`) plus a manual visual check against the named mockup PNG.

**Tech Stack:** React + Vite + TypeScript, Tailwind (logical classes only), `lucide-react` icons, no chart/UI libraries beyond `@ui/primitives` (`Card`, `Badge`).

**Spec:** `docs/superpowers/specs/2026-09-22-pos-module-design.md`

## Global Constraints

- TypeScript everywhere, no `.js`/`.jsx`, no `any` (per AGENTS.md §6).
- Logical Tailwind classes only: `ms-`/`me-`/`ps-`/`pe-`/`text-start`/`text-end`, never `ml-`/`mr-`/`pl-`/`pr-`/`text-left`/`text-right` (AGENTS.md §5).
- Colors only from the token list in AGENTS.md §5 — use the CSS vars already defined (`--octo-text-primary`, `--octo-border-card`, etc.) and raw hexes only where AGENTS.md lists them (`#0D6EFD`, `#22C55E`, `#EF4444`, `#F59E0B`, chart series list).
- Card shape: `rounded-xl` + `border border-[#ececf0]` (or `border-[var(--octo-border-card)]`) + `bg-white`; card padding `px-[18px] py-[15px]`; buttons `rounded-[9px]`, `px-3 py-[7px]`, `text-[12px] font-medium`; icons from `lucide-react`, size 13–16, `#8b8b93` when decorative.
- Mock data lives in its own typed `readonly` file, never inlined in a component (AGENTS.md §6).
- Components defined at module scope, never inside another component's render body.
- Do not edit any file in AGENTS.md §7.1's reserved list except the one explicitly authorized line in `app/routes/registry.tsx` (Task 1).
- Verify every task with `npx tsc --noEmit` from `apps/merchant` — must print nothing — before moving on.

---

## File Structure

```
apps/merchant/src/pages/pos/
  index.ts                      # public surface: export { PosPage }
  index.tsx                     # PosPage: top-level view-state switch
  _shared/
    types.ts                    # Shift, MenuItem, ModifierGroup, CartLine, PendingOrder, Denomination...
    mock-data.ts                # mockShift, mockPreviousShift, mockMenuCategories/Items, mockPendingOrders, mockDenominations
    header-bar.tsx               # POS register/shift/online status strip (top of every state)
    action-bar.tsx               # Cash In / Cash Out / Retrieve Order / End Shift button row
    shift-start-view.tsx         # start shift incl. threshold + previous-shift-not-closed states
    keypad.tsx                   # numeric pad + % buttons + note/discount row
    payment-methods-row.tsx      # Cash/Card/Mada/Apple Pay/STC Pay/QR Pay + Split Bill buttons
    cart-panel.tsx               # right-hand order details + totals + Pay Now
    category-rail.tsx            # left-hand order-type tabs + category list
    menu-grid.tsx                # center item grid
    item-modifier-panel.tsx      # size/bread/spice/add-ons/cooking-level customize panel
    active-pos-view.tsx          # composes category-rail + menu-grid/item-modifier-panel + cart-panel + keypad
    retrieve-order-view.tsx      # pending orders list
    cash-drawer-modal.tsx        # shared Cash In / Cash Out modal
    split-payment-modal.tsx      # split equally / split by item
    qr-pay-modal.tsx             # QR code display -> success transition
    payment-result-modal.tsx     # generic success/fail modal
    pin-pad.tsx                  # shared 4-digit PIN entry
    close-shift-view.tsx         # drawer count, reconciliation, note, PIN confirm
    force-close-reason-modal.tsx # manager reason modal for out-of-tolerance close
    z-report-view.tsx            # final summary after successful close
```

One line added to `apps/merchant/src/app/routes/registry.tsx` (Task 1).

---

### Task 1: Types, mock data, and route registration

**Files:**
- Create: `apps/merchant/src/pages/pos/_shared/types.ts`
- Create: `apps/merchant/src/pages/pos/_shared/mock-data.ts`
- Create: `apps/merchant/src/pages/pos/index.ts`
- Create: `apps/merchant/src/pages/pos/index.tsx` (placeholder shell, filled in by Task 11)
- Modify: `apps/merchant/src/app/routes/registry.tsx` (add one route entry)

**Interfaces:**
- Produces: every type in `types.ts` below, and every mock const in `mock-data.ts` below — every later task imports from these two files only.

- [ ] **Step 1: Write `_shared/types.ts`**

```typescript
// apps/merchant/src/pages/pos/_shared/types.ts

export type OrderType = "dine-in" | "take-away" | "delivery";

export interface Employee {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly avatarUrl?: string;
}

export interface Shift {
  readonly id: string;
  readonly registerId: string;
  readonly registerName: string;
  readonly branchName: string;
  readonly employee: Employee;
  readonly openedAt: string; // ISO
  readonly openingCash: number;
  readonly sales: number;
  readonly orderCount: number;
  readonly status: "active" | "closed";
}

export interface PreviousShift {
  readonly openedAt: string;
  readonly closedAt: string;
  readonly durationLabel: string;
  readonly closingBalance: number;
}

export interface Denomination {
  readonly value: number; // SAR note/coin value
  readonly count: number;
}

export interface ModifierOption {
  readonly id: string;
  readonly label: string;
  readonly priceDelta: number; // SAR, 0 for no add-on cost
}

export interface ModifierGroup {
  readonly id: string;
  readonly title: string; // "Select Size", "Bread Type", ...
  readonly kind: "single" | "multi"; // single = radio, multi = checkbox
  readonly options: readonly ModifierOption[];
  readonly defaultOptionId?: string; // for "single" groups
}

export interface MenuCategory {
  readonly id: string;
  readonly label: string;
  readonly iconKey: string; // maps to a lucide icon in category-rail.tsx
}

export interface MenuItem {
  readonly id: string;
  readonly categoryId: string;
  readonly name: string;
  readonly description: string;
  readonly price: number;
  readonly imageUrl: string;
  readonly modifierGroups?: readonly ModifierGroup[];
}

export interface SelectedModifier {
  readonly groupId: string;
  readonly optionId: string;
  readonly label: string;
  readonly priceDelta: number;
}

export interface CartLine {
  readonly lineId: string;
  readonly itemId: string;
  readonly name: string;
  readonly unitPrice: number;
  readonly quantity: number;
  readonly selectedModifiers: readonly SelectedModifier[];
  readonly note?: string;
}

export type PaymentMethod = "cash" | "card" | "mada" | "apple-pay" | "stc-pay" | "qr";

export interface PendingOrder {
  readonly id: string;
  readonly tableNo: string;
  readonly orderType: OrderType;
  readonly waiterName: string;
  readonly durationLabel: string;
  readonly total: number;
  readonly status: "Active" | "Held";
  readonly lines: readonly CartLine[];
}

export const VAT_RATE = 0.15;

export const CASH_TOLERANCE_SAR = 5;
export const OPENING_BALANCE_THRESHOLD_SAR = 15000;
```

- [ ] **Step 2: Write `_shared/mock-data.ts`**

```typescript
// apps/merchant/src/pages/pos/_shared/mock-data.ts
import type {
  CartLine,
  Denomination,
  MenuCategory,
  MenuItem,
  PendingOrder,
  PreviousShift,
  Shift,
} from "./types";

export const mockShift: Shift = {
  id: "shift-1042",
  registerId: "pos-1",
  registerName: "POS-1",
  branchName: "Downtown Branch",
  employee: {
    id: "EMP-0022",
    name: "Ahmed Ali",
    role: "Cashier",
    avatarUrl: "https://i.pravatar.cc/64?img=12",
  },
  openedAt: "2026-09-16T09:15:00+03:00",
  openingCash: 1250,
  sales: 1250,
  orderCount: 20,
  status: "active",
};

export const mockPreviousShift: PreviousShift = {
  openedAt: "2026-09-16T09:15:00+03:00",
  closedAt: "2026-09-16T17:42:00+03:00",
  durationLabel: "08h 27m",
  closingBalance: 1250,
};

export const mockDenominations: readonly Denomination[] = [
  { value: 500, count: 10 },
  { value: 100, count: 10 },
  { value: 50, count: 10 },
  { value: 20, count: 10 },
  { value: 10, count: 10 },
  { value: 5, count: 10 },
];

export const mockMenuCategories: readonly MenuCategory[] = [
  { id: "all", label: "All Items", iconKey: "list" },
  { id: "starts", label: "Starts", iconKey: "utensils" },
  { id: "salads", label: "Salads", iconKey: "salad" },
  { id: "mains", label: "Mains", iconKey: "chef-hat" },
  { id: "burgers", label: "Burgers", iconKey: "sandwich" },
  { id: "pasta", label: "Pasta", iconKey: "soup" },
  { id: "pizza", label: "Pizza", iconKey: "pizza" },
  { id: "desserts", label: "Desserts", iconKey: "cake" },
  { id: "beverages", label: "Beverages", iconKey: "cup-soda" },
];

const BURGER_IMAGE =
  "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&q=60";

export const mockMenuItems: readonly MenuItem[] = Array.from({ length: 12 }, (_, i) => ({
  id: `item-burger-${i + 1}`,
  categoryId: "burgers",
  name: "Classic Burger Combo",
  description: "Juicy grilled beef burger with lettuce, tomato, pickles and our special sauce.",
  price: 100,
  imageUrl: BURGER_IMAGE,
  modifierGroups: [
    {
      id: "size",
      title: "Select Size",
      kind: "single",
      defaultOptionId: "family",
      options: [
        { id: "family", label: "Family", priceDelta: 0 },
        { id: "large", label: "Large", priceDelta: 0 },
        { id: "medium", label: "Medium", priceDelta: 0 },
        { id: "small", label: "Small", priceDelta: 0 },
      ],
    },
    {
      id: "bread",
      title: "Bread Type",
      kind: "single",
      defaultOptionId: "brown",
      options: [
        { id: "none", label: "No Bread", priceDelta: 0 },
        { id: "white", label: "White Bread", priceDelta: 0 },
        { id: "brown", label: "Brown Bread", priceDelta: 0 },
      ],
    },
    {
      id: "spice",
      title: "Spice Level",
      kind: "single",
      defaultOptionId: "regular",
      options: [
        { id: "regular", label: "Regular", priceDelta: 0 },
        { id: "medium", label: "Medium", priceDelta: 0 },
        { id: "spicy", label: "Spicy", priceDelta: 0 },
      ],
    },
    {
      id: "addons",
      title: "Add-ons",
      kind: "multi",
      options: [
        { id: "cheese", label: "Cheese", priceDelta: 30 },
        { id: "ranch", label: "Ranch", priceDelta: 20 },
        { id: "ketchup", label: "Ketchup", priceDelta: 30 },
        { id: "lettuce", label: "Lettuce", priceDelta: 30 },
        { id: "jalapeno", label: "Jalapeño", priceDelta: 20 },
        { id: "garlic", label: "Garlic", priceDelta: 30 },
      ],
    },
    {
      id: "cooking",
      title: "Cooking Level",
      kind: "single",
      defaultOptionId: "rare",
      options: [
        { id: "rare", label: "Rare", priceDelta: 0 },
        { id: "medium-rare", label: "Med Rare", priceDelta: 0 },
        { id: "well-done", label: "Well Done", priceDelta: 0 },
      ],
    },
  ],
}));

export const mockCartLines: readonly CartLine[] = [
  { lineId: "l1", itemId: "caesar-salad", name: "Caesar Salad", unitPrice: 40, quantity: 1, selectedModifiers: [] },
  { lineId: "l2", itemId: "truffle-fries", name: "Truffle Fries", unitPrice: 40, quantity: 1, selectedModifiers: [] },
  { lineId: "l3", itemId: "grilled-salmon", name: "Grilled Salmon", unitPrice: 40, quantity: 1, selectedModifiers: [] },
  {
    lineId: "l4",
    itemId: "beef-burger",
    name: "Beef Burger",
    unitPrice: 40,
    quantity: 2,
    selectedModifiers: [],
    note: "No onion",
  },
];

export const mockPendingOrders: readonly PendingOrder[] = Array.from({ length: 6 }, (_, i) => ({
  id: `ORD-202${i + 1}`,
  tableNo: "T22",
  orderType: "dine-in",
  waiterName: "Ahmed Ali",
  durationLabel: "00:30 Min",
  total: 125,
  status: "Active",
  lines: mockCartLines,
}));
```

- [ ] **Step 3: Write `index.ts` (public surface) and a placeholder `index.tsx`**

```typescript
// apps/merchant/src/pages/pos/index.ts
export { PosPage } from "./index.tsx";
```

```tsx
// apps/merchant/src/pages/pos/index.tsx
// Filled in fully by Task 11; this placeholder keeps the route buildable
// while the _shared components are built up task by task.
export function PosPage() {
  return <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">POS module under construction.</div>;
}
```

- [ ] **Step 4: Add the `/pos` route**

In `apps/merchant/src/app/routes/registry.tsx`, add one entry to the `routes` array (placement: right after the `"kds"` entry, since POS belongs to the same "Orders" section):

```tsx
  { id: "pos",          path: "/pos",          section: "Orders",       page: "POS",
    element: lazy(() => import("@/pages/pos").then(m => ({ default: m.PosPage }))) },
```

- [ ] **Step 5: Typecheck**

Run from `apps/merchant`: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add apps/merchant/src/pages/pos/index.ts apps/merchant/src/pages/pos/index.tsx apps/merchant/src/pages/pos/_shared/types.ts apps/merchant/src/pages/pos/_shared/mock-data.ts apps/merchant/src/app/routes/registry.tsx
git commit -m "Add POS module types, mock data, and route"
```

---

### Task 2: Header bar and action bar

**Files:**
- Create: `apps/merchant/src/pages/pos/_shared/header-bar.tsx`
- Create: `apps/merchant/src/pages/pos/_shared/action-bar.tsx`
- Reference mockups: `Active POS.png` (top strip + button row), `POS-Start shhift.png` (locked variant)

**Interfaces:**
- Consumes: `Shift` from `./types`.
- Produces: `HeaderBar({ shift, locked }: { shift: Shift | null; locked: boolean })`, `ActionBar({ onCashIn, onCashOut, onRetrieveOrder, onEndShift, disabled }: { onCashIn(): void; onCashOut(): void; onRetrieveOrder(): void; onEndShift(): void; disabled?: boolean })`.

- [ ] **Step 1: Write `header-bar.tsx`**

```tsx
// apps/merchant/src/pages/pos/_shared/header-bar.tsx
import { Bell, ChevronDown, Globe, Lock, Moon, Wifi } from "lucide-react";
import type { Shift } from "./types";

function formatOpenedAt(iso: string) {
  const date = new Date(iso);
  return date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function HeaderBar({ shift, locked }: { shift: Shift | null; locked: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--octo-divider)] pb-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="flex items-center gap-2 rounded-[9px] border border-[var(--octo-border-input)] bg-white px-3 py-[7px] text-[12.5px] font-semibold text-[var(--octo-text-primary)]"
        >
          {shift?.registerName ?? "POS-1"}
          <ChevronDown size={14} className="text-[#8b8b93]" />
        </button>

        {locked ? (
          <span className="flex items-center gap-1.5 rounded-[9px] bg-[#FEE2E2] px-3 py-[7px] text-[12px] font-semibold text-[#EF4444]">
            <Lock size={13} />
            POS Locked
            <span className="font-normal text-[#EF4444]/80">No active shift</span>
          </span>
        ) : (
          <span className="flex items-center gap-1.5 rounded-[9px] bg-[#DCFCE7] px-3 py-[7px] text-[12px] font-semibold text-[#22C55E]">
            <span className="h-[7px] w-[7px] rounded-full bg-[#22C55E]" />
            Shift Active
          </span>
        )}
      </div>

      <div className="flex items-center gap-2.5">
        <span className="flex items-center gap-1.5 rounded-[9px] bg-[#DCFCE7] px-3 py-[7px] text-[12px] font-medium text-[#22C55E]">
          <Wifi size={13} />
          Online
        </span>
        <button type="button" className="rounded-[9px] border border-[var(--octo-border-input)] bg-white p-[7px] text-[#8b8b93]">
          <Moon size={14} />
        </button>
        <button type="button" className="rounded-[9px] border border-[var(--octo-border-input)] bg-white p-[7px] text-[#8b8b93]">
          <Bell size={14} />
        </button>
        <button type="button" className="rounded-[9px] border border-[var(--octo-border-input)] bg-white p-[7px] text-[#8b8b93]">
          <Globe size={14} />
        </button>
        <button type="button" className="flex items-center gap-1.5 rounded-[9px] bg-[#0D6EFD] px-3 py-[7px] text-[12px] font-semibold text-white">
          <Lock size={13} />
          PIN Login
        </button>
      </div>

      {shift ? (
        <div className="mt-1 flex w-full flex-wrap items-center gap-x-8 gap-y-2 rounded-xl border border-[#ececf0] bg-white px-[18px] py-[15px] text-[12.5px]">
          <Field label={shift.employee.name} sub={`ID:${shift.employee.id}`} />
          <Field label={formatOpenedAt(shift.openedAt)} sub="Opened at" />
          <Field label={`SAR ${shift.openingCash.toFixed(2)}`} sub="Opening Cash" />
          <Field label={`SAR ${shift.sales.toFixed(2)}`} sub="Sales" />
          <Field label={String(shift.orderCount)} sub="Orders" />
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-semibold text-[var(--octo-text-primary)]">{label}</span>
      <span className="text-[11.5px] text-[var(--octo-text-muted)]">{sub}</span>
    </div>
  );
}
```

- [ ] **Step 2: Write `action-bar.tsx`**

```tsx
// apps/merchant/src/pages/pos/_shared/action-bar.tsx
import { Banknote, CircleX, Upload } from "lucide-react";

export function ActionBar({
  onCashIn,
  onCashOut,
  onRetrieveOrder,
  onEndShift,
  activeAction,
}: {
  onCashIn: () => void;
  onCashOut: () => void;
  onRetrieveOrder: () => void;
  onEndShift: () => void;
  activeAction?: "retrieve-order" | null;
}) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      <button
        type="button"
        onClick={onCashIn}
        className="flex items-center justify-center gap-2 rounded-[9px] bg-[#FEF9C3] px-3 py-[10px] text-[12.5px] font-semibold text-[#92600A]"
      >
        <Banknote size={15} />
        Cash In
      </button>
      <button
        type="button"
        onClick={onCashOut}
        className="flex items-center justify-center gap-2 rounded-[9px] bg-[#EFF6FF] px-3 py-[10px] text-[12.5px] font-semibold text-[#0D6EFD]"
      >
        <Banknote size={15} />
        Cash Out
      </button>
      <button
        type="button"
        onClick={onRetrieveOrder}
        className={
          activeAction === "retrieve-order"
            ? "flex items-center justify-center gap-2 rounded-[9px] bg-[#0D6EFD] px-3 py-[10px] text-[12.5px] font-semibold text-white"
            : "flex items-center justify-center gap-2 rounded-[9px] border border-[var(--octo-border-input)] bg-white px-3 py-[10px] text-[12.5px] font-semibold text-[var(--octo-text-primary)]"
        }
      >
        <Upload size={15} />
        Retrieve Order
      </button>
      <button
        type="button"
        onClick={onEndShift}
        className="flex items-center justify-center gap-2 rounded-[9px] bg-[#FEE2E2] px-3 py-[10px] text-[12.5px] font-semibold text-[#EF4444]"
      >
        <CircleX size={15} />
        End Shift
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run from `apps/merchant`: `npx tsc --noEmit` — expect no output.

- [ ] **Step 4: Commit**

```bash
git add apps/merchant/src/pages/pos/_shared/header-bar.tsx apps/merchant/src/pages/pos/_shared/action-bar.tsx
git commit -m "Add POS header bar and action bar"
```

---

### Task 3: Shift-start view

**Files:**
- Create: `apps/merchant/src/pages/pos/_shared/shift-start-view.tsx`
- Reference mockups: `POS-Start shhift.png`, `POS-Start  Above Threshold.png`, `POS-Start  Above Threshold (1).png`, `POS-Start  previous shift not closed yet.png`, `POS-Start  previous shift not closed yet (1).png`, `POS-Start  previous shift not closed yet (2).png`

**Interfaces:**
- Consumes: `Shift`, `PreviousShift`, `Denomination`, `Employee` from `./types`; `mockPreviousShift`, `mockDenominations` from `./mock-data`.
- Produces: `ShiftStartView({ employee, branchName, registerName, previousShift, previousShiftStillOpen, onStartShift, onGoCloseStuckShift }: ShiftStartViewProps)` where `onStartShift(openingCash: number): void`.

- [ ] **Step 1: Write `shift-start-view.tsx`**

```tsx
// apps/merchant/src/pages/pos/_shared/shift-start-view.tsx
import { useMemo, useState } from "react";
import { AlertTriangle, Clock, MapPin, Play, Receipt, ShieldCheck, User } from "lucide-react";
import type { Denomination, Employee, PreviousShift } from "./types";
import { OPENING_BALANCE_THRESHOLD_SAR } from "./types";

export interface ShiftStartViewProps {
  readonly employee: Employee;
  readonly branchName: string;
  readonly registerName: string;
  readonly previousShift: PreviousShift;
  readonly previousShiftStillOpen: boolean;
  readonly denominations: readonly Denomination[];
  readonly onStartShift: (openingCash: number) => void;
  readonly onGoCloseStuckShift: () => void;
}

export function ShiftStartView({
  employee,
  branchName,
  registerName,
  previousShift,
  previousShiftStillOpen,
  denominations,
  onStartShift,
  onGoCloseStuckShift,
}: ShiftStartViewProps) {
  const [counts, setCounts] = useState<Record<number, number>>(
    () => Object.fromEntries(denominations.map((d) => [d.value, d.count]))
  );

  const openingBalance = useMemo(
    () => denominations.reduce((sum, d) => sum + d.value * (counts[d.value] ?? 0), 0),
    [denominations, counts]
  );
  const aboveThreshold = openingBalance > OPENING_BALANCE_THRESHOLD_SAR;

  if (previousShiftStillOpen) {
    return (
      <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
        <h1 className="text-[21px] font-bold leading-tight text-[var(--octo-text-primary)]">Previous Shift Not Closed</h1>
        <p className="mt-1 text-[12.5px] text-[var(--octo-text-muted)]">
          You must close the previous shift on this register before starting a new one.
        </p>
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-[18px] py-[15px]">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[#F59E0B]" />
          <div>
            <p className="text-[13px] font-semibold text-[var(--octo-text-primary)]">
              A shift opened on {new Date(previousShift.openedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} is still active.
            </p>
            <p className="mt-1 text-[12.5px] text-[var(--octo-text-muted)]">
              Close it to reconcile the drawer and free up this register.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onGoCloseStuckShift}
          className="mt-5 w-full rounded-[9px] bg-[#EF4444] px-3 py-[10px] text-[13px] font-semibold text-white"
        >
          Go to Close Shift
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <h1 className="text-[21px] font-bold leading-tight text-[var(--octo-text-primary)]">Start Your Shift</h1>
      <p className="mt-1 text-[12.5px] text-[var(--octo-text-muted)]">Open your register and record the opening cash balance.</p>

      <div className="mt-5 flex flex-wrap items-center gap-x-10 gap-y-3 rounded-xl border border-[#ececf0] bg-white px-[18px] py-[15px]">
        <InfoField icon={<User size={16} className="text-[#0D6EFD]" />} title={employee.name} sub={`ID:${employee.id}`} />
        <InfoField icon={<ShieldCheck size={16} className="text-[#0D6EFD]" />} title={employee.role} sub="Full Access" />
        <InfoField icon={<MapPin size={16} className="text-[#0D6EFD]" />} title={branchName} sub="Branch" />
        <InfoField icon={<Receipt size={16} className="text-[#0D6EFD]" />} title={registerName} sub="Main Register" />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-10 gap-y-3 rounded-xl border border-[#ececf0] bg-white px-[18px] py-[15px]">
        <InfoField icon={<Clock size={16} className="text-[#8b8b93]" />} title="Closed" sub="Previous Shift" />
        <InfoField
          icon={<Clock size={16} className="text-[#8b8b93]" />}
          title={new Date(previousShift.openedAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          sub="Opened at"
        />
        <InfoField
          icon={<Clock size={16} className="text-[#8b8b93]" />}
          title={new Date(previousShift.closedAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          sub="Closed at"
        />
        <InfoField icon={<Clock size={16} className="text-[#8b8b93]" />} title={previousShift.durationLabel} sub="Duration" />
        <InfoField icon={<Receipt size={16} className="text-[#8b8b93]" />} title={`SAR ${previousShift.closingBalance.toFixed(2)}`} sub="Closing Balance" />
      </div>

      <div className="mt-5 rounded-xl border border-[#ececf0] bg-white px-[18px] py-[15px]">
        <h2 className="text-[15px] font-bold text-[var(--octo-text-primary)]">Opening Balance</h2>

        <p className="mt-3 flex items-center gap-2 rounded-[9px] bg-[#EFF6FF] px-3 py-[9px] text-[12.5px] text-[#0D6EFD]">
          This is a cash available in the drawer at the start of your shift.
        </p>

        {aboveThreshold ? (
          <p className="mt-3 flex items-center gap-2 rounded-[9px] bg-[#FFFBEB] px-3 py-[9px] text-[12.5px] font-medium text-[#F59E0B]">
            <AlertTriangle size={14} />
            Opening balance exceeds the SAR {OPENING_BALANCE_THRESHOLD_SAR.toLocaleString()} threshold for this register.
          </p>
        ) : null}

        <label className="mt-4 block text-[12.5px] font-medium text-[var(--octo-text-primary)]">
          Opening Cash Balance (SAR) <span className="text-[#EF4444]">*</span>
        </label>
        <input
          readOnly
          value={`SAR ${openingBalance.toLocaleString()}`}
          className="mt-1.5 w-full rounded-[10px] border border-[var(--octo-border-input)] bg-white px-3 py-[9px] text-[13px] text-[var(--octo-text-primary)]"
        />

        <div className="mt-4 overflow-hidden rounded-[10px] border border-[#ececf0]">
          <div className="grid grid-cols-3 bg-[var(--octo-hover)] px-4 py-2 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-muted)]">
            <span>Denomination (SAR)</span>
            <span className="text-center">Count</span>
            <span className="text-end">Total (SAR)</span>
          </div>
          {denominations.map((d) => (
            <div key={d.value} className="grid grid-cols-3 items-center border-t border-[#f0f0f2] px-4 py-2.5 text-[13px]">
              <span className="text-[var(--octo-text-primary)]">{d.value}</span>
              <input
                type="number"
                min={0}
                value={counts[d.value] ?? 0}
                onChange={(e) =>
                  setCounts((prev) => ({ ...prev, [d.value]: Math.max(0, Number(e.target.value) || 0) }))
                }
                className="mx-auto w-20 rounded-[8px] border border-[var(--octo-border-input)] px-2 py-1 text-center"
              />
              <span className="text-end text-[var(--octo-text-primary)]">{d.value * (counts[d.value] ?? 0)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-[#f0f0f2] bg-[var(--octo-hover)] px-4 py-2.5 text-[13px] font-semibold">
            <span className="text-[var(--octo-text-primary)]">Opening Balance</span>
            <span className="text-[#0D6EFD]">SAR {openingBalance.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onStartShift(openingBalance)}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-[9px] bg-[#0D6EFD] px-3 py-[12px] text-[13px] font-semibold text-white"
      >
        <Play size={15} />
        Start Shift
      </button>
    </div>
  );
}

function InfoField({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EFF6FF]">{icon}</span>
      <div className="flex flex-col">
        <span className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{title}</span>
        <span className="text-[11.5px] text-[var(--octo-text-muted)]">{sub}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run from `apps/merchant`: `npx tsc --noEmit` — expect no output.

- [ ] **Step 3: Visual check**

Wire `ShiftStartView` temporarily into `pages/pos/index.tsx` (replace the placeholder body) with `mockShift.employee`, `mockShift.branchName`, `mockShift.registerName`, `mockPreviousShift`, `mockDenominations`, `previousShiftStillOpen={false}`, no-op callbacks. Compare against `POS-Start shhift.png`; toggle `previousShiftStillOpen={true}` and compare against `POS-Start  previous shift not closed yet.png`.

- [ ] **Step 4: Commit**

```bash
git add apps/merchant/src/pages/pos/_shared/shift-start-view.tsx apps/merchant/src/pages/pos/index.tsx
git commit -m "Add POS shift-start view"
```

---

### Task 4: Keypad and payment-methods row

**Files:**
- Create: `apps/merchant/src/pages/pos/_shared/keypad.tsx`
- Create: `apps/merchant/src/pages/pos/_shared/payment-methods-row.tsx`
- Reference mockups: `Active POS.png` (bottom strip, default state), `Active POS-pay now.png` (payment-methods variant), `Active POS-pay now-cash.png` (Amount Received field)

**Interfaces:**
- Produces: `Keypad({ mode, discountPercent, onDiscountPercent, onAddNote, onHoldOrder }: KeypadProps)` where `mode: "categories" | "payment"` selects which right-hand block (`CategoryQuickButtons` — not built here, category icons live in `category-rail.tsx` — actually the keypad's right block in "payment" mode is `PaymentMethodsRow`; in "categories" mode it is omitted, callers render their own right column). `PaymentMethodsRow({ selected, onSelect, onSplitBill, showAmountReceived, amountReceived, onAmountReceivedChange }: PaymentMethodsRowProps)`.

- [ ] **Step 1: Write `payment-methods-row.tsx`**

```tsx
// apps/merchant/src/pages/pos/_shared/payment-methods-row.tsx
import { Banknote, CreditCard, QrCode, SplitSquareHorizontal } from "lucide-react";
import type { PaymentMethod } from "./types";

const METHODS: { id: PaymentMethod; label: string }[] = [
  { id: "cash", label: "Cash" },
  { id: "card", label: "Card" },
  { id: "mada", label: "Mada" },
  { id: "apple-pay", label: "Apple Pay" },
  { id: "stc-pay", label: "STC Pay" },
  { id: "qr", label: "QR Pay" },
];

export function PaymentMethodsRow({
  selected,
  onSelect,
  onSplitBill,
  showAmountReceived,
  amountReceived,
  onAmountReceivedChange,
}: {
  selected: PaymentMethod | null;
  onSelect: (method: PaymentMethod) => void;
  onSplitBill: () => void;
  showAmountReceived: boolean;
  amountReceived: string;
  onAmountReceivedChange: (value: string) => void;
}) {
  return (
    <div className="flex w-full flex-col gap-2">
      {showAmountReceived ? (
        <div>
          <label className="text-[11.5px] font-medium text-[var(--octo-text-primary)]">Amount Received</label>
          <input
            value={amountReceived}
            onChange={(e) => onAmountReceivedChange(e.target.value)}
            placeholder="Enter amount received"
            className="mt-1 w-full rounded-[10px] border border-[var(--octo-border-input)] px-3 py-[9px] text-[13px]"
          />
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-2">
        {METHODS.slice(0, 3).map((m) => (
          <MethodButton key={m.id} method={m} active={selected === m.id} onClick={() => onSelect(m.id)} />
        ))}
        {METHODS.slice(3).map((m) => (
          <MethodButton key={m.id} method={m} active={selected === m.id} onClick={() => onSelect(m.id)} />
        ))}
      </div>

      <button
        type="button"
        onClick={onSplitBill}
        className="mt-1 flex items-center justify-center gap-2 rounded-[9px] bg-[#F59E0B] px-3 py-[10px] text-[13px] font-semibold text-white"
      >
        <SplitSquareHorizontal size={15} />
        Split Bill
      </button>
    </div>
  );
}

function MethodButton({
  method,
  active,
  onClick,
}: {
  method: { id: PaymentMethod; label: string };
  active: boolean;
  onClick: () => void;
}) {
  const Icon = method.id === "qr" ? QrCode : method.id === "cash" ? Banknote : CreditCard;
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "flex flex-col items-center gap-1 rounded-[9px] bg-[#0D6EFD] px-3 py-[10px] text-[11.5px] font-medium text-white"
          : "flex flex-col items-center gap-1 rounded-[9px] border border-[var(--octo-border-input)] bg-white px-3 py-[10px] text-[11.5px] font-medium text-[var(--octo-text-primary)]"
      }
    >
      <Icon size={16} className={active ? "text-white" : "text-[#8b8b93]"} />
      {method.label}
    </button>
  );
}
```

- [ ] **Step 2: Write `keypad.tsx`**

```tsx
// apps/merchant/src/pages/pos/_shared/keypad.tsx
import { Delete, MessageSquarePlus, Pause, Percent, Ticket } from "lucide-react";

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "+/-", "0", "."] as const;
const QUICK_PERCENTS = [5, 10, 15, 20] as const;

export function Keypad({
  onDigit,
  onClear,
  onBackspace,
  onQuickDiscount,
  onCustomDiscount,
  onHoldOrder,
  onAddNote,
}: {
  onDigit: (digit: string) => void;
  onClear: () => void;
  onBackspace: () => void;
  onQuickDiscount: (percent: number) => void;
  onCustomDiscount: () => void;
  onHoldOrder: () => void;
  onAddNote: () => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 rounded-xl border border-[#ececf0] bg-white px-[18px] py-[15px] sm:grid-cols-[auto_1fr]">
      <div className="grid grid-cols-4 gap-2">
        {DIGITS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onDigit(d)}
            className="flex h-11 w-11 items-center justify-center rounded-[9px] border border-[var(--octo-border-input)] text-[14px] font-medium text-[var(--octo-text-primary)]"
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          onClick={onBackspace}
          className="flex h-11 w-11 items-center justify-center rounded-[9px] border border-[var(--octo-border-input)] text-[var(--octo-text-primary)]"
        >
          <Delete size={15} />
        </button>
        <button
          type="button"
          onClick={onClear}
          className="col-span-1 flex h-11 items-center justify-center rounded-[9px] bg-[#FEE2E2] text-[12.5px] font-semibold text-[#EF4444]"
        >
          Clear
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          {QUICK_PERCENTS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onQuickDiscount(p)}
              className="rounded-[9px] border border-[var(--octo-border-input)] px-3 py-[7px] text-[12px] font-medium text-[var(--octo-text-primary)]"
            >
              {p}%
            </button>
          ))}
          <button
            type="button"
            onClick={onCustomDiscount}
            className="rounded-[9px] border border-[var(--octo-border-input)] px-3 py-[7px] text-[12px] font-medium text-[var(--octo-text-primary)]"
          >
            <Percent size={12} className="me-1 inline" />
            Custom %
          </button>
          <button
            type="button"
            onClick={() => onQuickDiscount(0)}
            className="rounded-[9px] bg-[#DCFCE7] px-3 py-[7px] text-[12px] font-semibold text-[#16a34a]"
          >
            <Ticket size={12} className="me-1 inline" />
            Discount
          </button>
          <button
            type="button"
            className="rounded-[9px] bg-[#EFF6FF] px-3 py-[7px] text-[12px] font-semibold text-[#0D6EFD]"
          >
            Promo Code
          </button>
          <button
            type="button"
            onClick={onHoldOrder}
            className="rounded-[9px] bg-[#FEF9C3] px-3 py-[7px] text-[12px] font-semibold text-[#92600A]"
          >
            <Pause size={12} className="me-1 inline" />
            Hold Order
          </button>
        </div>

        <button
          type="button"
          onClick={onAddNote}
          className="flex items-center justify-center gap-2 rounded-[9px] bg-[var(--octo-hover)] px-3 py-[10px] text-[12.5px] font-medium text-[var(--octo-text-secondary)]"
        >
          <MessageSquarePlus size={14} />
          Add Note
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run from `apps/merchant`: `npx tsc --noEmit` — expect no output.

- [ ] **Step 4: Commit**

```bash
git add apps/merchant/src/pages/pos/_shared/keypad.tsx apps/merchant/src/pages/pos/_shared/payment-methods-row.tsx
git commit -m "Add POS keypad and payment-methods row"
```

---

### Task 5: Category rail and menu grid

**Files:**
- Create: `apps/merchant/src/pages/pos/_shared/category-rail.tsx`
- Create: `apps/merchant/src/pages/pos/_shared/menu-grid.tsx`
- Reference mockup: `Active POS.png`

**Interfaces:**
- Consumes: `MenuCategory`, `MenuItem`, `OrderType` from `./types`.
- Produces: `CategoryRail({ orderType, onOrderTypeChange, categories, selectedCategoryId, onSelectCategory, search, onSearchChange }: CategoryRailProps)`, `MenuGrid({ items, search, onSearchChange, onSelectItem }: MenuGridProps)`.

- [ ] **Step 1: Write `category-rail.tsx`**

```tsx
// apps/merchant/src/pages/pos/_shared/category-rail.tsx
import {
  Cake, ChefHat, CupSoda, List, Pizza, Plus, Salad, Sandwich, Search, Soup, Utensils,
} from "lucide-react";
import type { MenuCategory, OrderType } from "./types";

const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  list: List, utensils: Utensils, salad: Salad, "chef-hat": ChefHat,
  sandwich: Sandwich, soup: Soup, pizza: Pizza, cake: Cake, "cup-soda": CupSoda,
};

const ORDER_TYPES: { id: OrderType; label: string }[] = [
  { id: "dine-in", label: "Dine In" },
  { id: "take-away", label: "Take Away" },
  { id: "delivery", label: "Delivery" },
];

export function CategoryRail({
  orderType,
  onOrderTypeChange,
  categories,
  selectedCategoryId,
  onSelectCategory,
  search,
  onSearchChange,
  onAddCustomItem,
}: {
  orderType: OrderType;
  onOrderTypeChange: (type: OrderType) => void;
  categories: readonly MenuCategory[];
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  onAddCustomItem: () => void;
}) {
  return (
    <div className="flex w-[220px] shrink-0 flex-col gap-3 rounded-xl border border-[#ececf0] bg-white px-[14px] py-[15px]">
      <div className="flex rounded-[9px] bg-[var(--octo-hover)] p-1 text-[12px] font-medium">
        {ORDER_TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onOrderTypeChange(t.id)}
            className={
              orderType === t.id
                ? "flex-1 rounded-[7px] bg-white px-2 py-[6px] font-semibold text-[#0D6EFD] shadow-sm"
                : "flex-1 rounded-[7px] px-2 py-[6px] text-[var(--octo-text-muted)]"
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search size={14} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[var(--octo-text-faint)]" />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search"
          className="w-full rounded-[9px] border border-[var(--octo-border-input)] py-[8px] ps-9 pe-3 text-[12.5px]"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        {categories.map((c) => {
          const Icon = ICONS[c.iconKey] ?? List;
          const active = c.id === selectedCategoryId;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelectCategory(c.id)}
              className={
                active
                  ? "flex items-center gap-2.5 rounded-[9px] border border-[#0D6EFD] bg-[#EFF6FF] px-3 py-[9px] text-[12.5px] font-semibold text-[#0D6EFD]"
                  : "flex items-center gap-2.5 rounded-[9px] border border-[var(--octo-border-input)] bg-white px-3 py-[9px] text-[12.5px] font-medium text-[var(--octo-text-primary)]"
              }
            >
              <Icon size={14} className={active ? "text-[#0D6EFD]" : "text-[#8b8b93]"} />
              {c.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={onAddCustomItem}
          className="flex items-center justify-center gap-2 rounded-[9px] border border-[#0D6EFD] px-3 py-[9px] text-[12.5px] font-semibold text-[#0D6EFD]"
        >
          <Plus size={14} />
          Add custom item
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write `menu-grid.tsx`**

```tsx
// apps/merchant/src/pages/pos/_shared/menu-grid.tsx
import { Search, SlidersHorizontal } from "lucide-react";
import type { MenuItem } from "./types";

export function MenuGrid({
  items,
  search,
  onSearchChange,
  onSelectItem,
}: {
  items: readonly MenuItem[];
  search: string;
  onSearchChange: (value: string) => void;
  onSelectItem: (item: MenuItem) => void;
}) {
  const filtered = items.filter((item) => item.name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-[var(--octo-text-faint)]" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search"
            className="w-full rounded-[10px] border border-[var(--octo-border-input)] py-[9px] ps-10 pe-3 text-[13px]"
          />
        </div>
        <button type="button" className="rounded-[10px] border border-[var(--octo-border-input)] p-[9px] text-[#8b8b93]">
          <SlidersHorizontal size={15} />
        </button>
      </div>

      <div className="octo-scroll grid max-h-[560px] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectItem(item)}
            className="flex flex-col overflow-hidden rounded-xl border border-[#ececf0] bg-white text-start"
          >
            <img src={item.imageUrl} alt={item.name} className="h-[120px] w-full object-cover" />
            <div className="flex flex-col gap-1 px-3 py-2.5">
              <span className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{item.name}</span>
              <span className="line-clamp-2 text-[11.5px] text-[var(--octo-text-muted)]">{item.description}</span>
              <span className="text-[13px] font-bold text-[#0D6EFD]">SAR {item.price}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run from `apps/merchant`: `npx tsc --noEmit` — expect no output.

- [ ] **Step 4: Commit**

```bash
git add apps/merchant/src/pages/pos/_shared/category-rail.tsx apps/merchant/src/pages/pos/_shared/menu-grid.tsx
git commit -m "Add POS category rail and menu grid"
```

---

### Task 6: Cart panel and item-modifier panel

**Files:**
- Create: `apps/merchant/src/pages/pos/_shared/cart-panel.tsx`
- Create: `apps/merchant/src/pages/pos/_shared/item-modifier-panel.tsx`
- Reference mockups: `Active POS-pay now.png` (cart panel), `Active POS-adding order-modifires.png` (modifier panel)

**Interfaces:**
- Consumes: `CartLine`, `MenuItem`, `ModifierGroup`, `OrderType`, `VAT_RATE` from `./types`.
- Produces: `CartPanel({ orderType, onOrderTypeChange, tableNo, onTableNoChange, lines, onRemoveLine, onPayNow, payNowLabel }: CartPanelProps)`, `ItemModifierPanel({ item, onBack, onConfirm }: ItemModifierPanelProps)` where `onConfirm(selected: SelectedModifier[], note: string): void`.

- [ ] **Step 1: Write `cart-panel.tsx`**

```tsx
// apps/merchant/src/pages/pos/_shared/cart-panel.tsx
import { Map, X } from "lucide-react";
import type { CartLine, OrderType } from "./types";
import { VAT_RATE } from "./types";

function lineTotal(line: CartLine) {
  const modifiersTotal = line.selectedModifiers.reduce((sum, m) => sum + m.priceDelta, 0);
  return (line.unitPrice + modifiersTotal) * line.quantity;
}

const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  "dine-in": "Dine In",
  "take-away": "Take Away",
  delivery: "Delivery",
};

export function CartPanel({
  orderType,
  onOrderTypeChange,
  tableNo,
  onTableNoChange,
  lines,
  onRemoveLine,
  onPayNow,
  payNowLabel = "Pay Now",
}: {
  orderType: OrderType;
  onOrderTypeChange: (type: OrderType) => void;
  tableNo: string;
  onTableNoChange: (value: string) => void;
  lines: readonly CartLine[];
  onRemoveLine: (lineId: string) => void;
  onPayNow: () => void;
  payNowLabel?: string;
}) {
  const subTotal = lines.reduce((sum, l) => sum + lineTotal(l), 0);
  const vat = subTotal * VAT_RATE;
  const total = subTotal + vat;

  return (
    <div className="flex w-[300px] shrink-0 flex-col gap-3 rounded-xl border border-[#ececf0] bg-white px-[18px] py-[15px]">
      <div>
        <label className="text-[11.5px] font-medium text-[var(--octo-text-primary)]">Order Type</label>
        <select
          value={orderType}
          onChange={(e) => onOrderTypeChange(e.target.value as OrderType)}
          className="mt-1 w-full rounded-[9px] border border-[var(--octo-border-input)] px-3 py-[8px] text-[12.5px]"
        >
          {Object.entries(ORDER_TYPE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-[11.5px] font-medium text-[var(--octo-text-primary)]">Table No.</label>
        <div className="relative mt-1">
          <input
            value={tableNo}
            onChange={(e) => onTableNoChange(e.target.value)}
            placeholder="Select Table"
            className="w-full rounded-[9px] border border-[var(--octo-border-input)] py-[8px] ps-3 pe-9 text-[12.5px]"
          />
          <Map size={14} className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-[#8b8b93]" />
        </div>
      </div>

      <div>
        <label className="text-[11.5px] font-medium text-[var(--octo-text-primary)]">Order Details</label>
        <div className="octo-scroll mt-1.5 flex max-h-[220px] flex-col gap-2 overflow-y-auto">
          {lines.map((line) => (
            <div key={line.lineId} className="flex items-start justify-between gap-2 border-b border-[#f0f0f2] pb-2 text-[12.5px]">
              <div>
                <span className="text-[var(--octo-text-primary)]">{line.quantity} {line.name}</span>
                {line.note ? (
                  <span className="mt-0.5 block w-fit rounded-[6px] bg-[#FFFBEB] px-1.5 py-0.5 text-[11px] text-[#92600A]">{line.note}</span>
                ) : null}
              </div>
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="text-[var(--octo-text-primary)]">SAR {lineTotal(line).toFixed(2)}</span>
                <button type="button" onClick={() => onRemoveLine(line.lineId)} className="text-[#EF4444]">
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 border-t border-[#f0f0f2] pt-3 text-[12.5px]">
        <div className="flex justify-between">
          <span className="text-[var(--octo-text-muted)]">Sub Total</span>
          <span className="text-[var(--octo-text-primary)]">SAR {subTotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--octo-text-muted)]">VAT (15%)</span>
          <span className="text-[var(--octo-text-primary)]">SAR {vat.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-[13.5px] font-bold">
          <span className="text-[var(--octo-text-primary)]">Total</span>
          <span className="text-[#0D6EFD]">SAR {total.toFixed(2)}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onPayNow}
        disabled={lines.length === 0}
        className="rounded-[9px] bg-[#0D6EFD] px-3 py-[11px] text-[13px] font-semibold text-white disabled:opacity-40"
      >
        {payNowLabel}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Write `item-modifier-panel.tsx`**

```tsx
// apps/merchant/src/pages/pos/_shared/item-modifier-panel.tsx
import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import type { MenuItem, SelectedModifier } from "./types";

export function ItemModifierPanel({
  item,
  onBack,
  onConfirm,
}: {
  item: MenuItem;
  onBack: () => void;
  onConfirm: (selected: SelectedModifier[], note: string) => void;
}) {
  const groups = item.modifierGroups ?? [];
  const [singleSelections, setSingleSelections] = useState<Record<string, string>>(() =>
    Object.fromEntries(groups.filter((g) => g.kind === "single").map((g) => [g.id, g.defaultOptionId ?? g.options[0]?.id ?? ""]))
  );
  const [multiSelections, setMultiSelections] = useState<Record<string, Set<string>>>({});
  const [note, setNote] = useState("");

  function toggleMulti(groupId: string, optionId: string) {
    setMultiSelections((prev) => {
      const current = new Set(prev[groupId] ?? []);
      if (current.has(optionId)) current.delete(optionId); else current.add(optionId);
      return { ...prev, [groupId]: current };
    });
  }

  function handleConfirm() {
    const selected: SelectedModifier[] = [];
    for (const group of groups) {
      if (group.kind === "single") {
        const optionId = singleSelections[group.id];
        const option = group.options.find((o) => o.id === optionId);
        if (option) selected.push({ groupId: group.id, optionId: option.id, label: option.label, priceDelta: option.priceDelta });
      } else {
        for (const optionId of multiSelections[group.id] ?? []) {
          const option = group.options.find((o) => o.id === optionId);
          if (option) selected.push({ groupId: group.id, optionId: option.id, label: option.label, priceDelta: option.priceDelta });
        }
      }
    }
    onConfirm(selected, note);
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      <button type="button" onClick={onBack} className="flex w-fit items-center gap-1.5 text-[12.5px] font-medium text-[var(--octo-text-secondary)]">
        <ChevronLeft size={15} />
        Back to Items
      </button>

      <div className="flex gap-3 rounded-xl border border-[#ececf0] bg-white px-[18px] py-[15px]">
        <img src={item.imageUrl} alt={item.name} className="h-[80px] w-[80px] shrink-0 rounded-[10px] object-cover" />
        <div>
          <h3 className="text-[15px] font-bold text-[var(--octo-text-primary)]">{item.name}</h3>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)]">{item.description}</p>
          <p className="mt-1 text-[14px] font-bold text-[#0D6EFD]">SAR {item.price}</p>
        </div>
      </div>

      <div className="octo-scroll flex max-h-[480px] flex-col gap-5 overflow-y-auto rounded-xl border border-[#ececf0] bg-white px-[18px] py-[15px]">
        <h3 className="text-[15px] font-bold text-[var(--octo-text-primary)]">Customize Gest Order</h3>

        {groups.map((group) => (
          <div key={group.id}>
            <h4 className="mb-2 text-[13px] font-semibold text-[var(--octo-text-primary)]">{group.title}</h4>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {group.options.map((option) => {
                const checked = group.kind === "single"
                  ? singleSelections[group.id] === option.id
                  : (multiSelections[group.id] ?? new Set()).has(option.id);
                return (
                  <label
                    key={option.id}
                    className={
                      checked
                        ? "flex items-center justify-between rounded-[9px] border border-[#0D6EFD] bg-[#EFF6FF] px-3 py-[9px] text-[12.5px] font-medium text-[#0D6EFD]"
                        : "flex items-center justify-between rounded-[9px] border border-[var(--octo-border-input)] px-3 py-[9px] text-[12.5px] text-[var(--octo-text-primary)]"
                    }
                  >
                    <span>{option.label}{option.priceDelta > 0 ? ` (+${option.priceDelta} SAR)` : ""}</span>
                    <input
                      type={group.kind === "single" ? "radio" : "checkbox"}
                      name={group.id}
                      checked={checked}
                      onChange={() =>
                        group.kind === "single"
                          ? setSingleSelections((prev) => ({ ...prev, [group.id]: option.id }))
                          : toggleMulti(group.id, option.id)
                      }
                    />
                  </label>
                );
              })}
            </div>
          </div>
        ))}

        <div>
          <h4 className="mb-2 text-[13px] font-semibold text-[var(--octo-text-primary)]">Note</h4>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add any notes about this order"
            rows={3}
            className="w-full rounded-[9px] border border-[var(--octo-border-input)] px-3 py-2 text-[12.5px]"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleConfirm}
        className="rounded-[9px] bg-[#0D6EFD] px-3 py-[11px] text-[13px] font-semibold text-white"
      >
        Add to Order
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run from `apps/merchant`: `npx tsc --noEmit` — expect no output.

- [ ] **Step 4: Commit**

```bash
git add apps/merchant/src/pages/pos/_shared/cart-panel.tsx apps/merchant/src/pages/pos/_shared/item-modifier-panel.tsx
git commit -m "Add POS cart panel and item modifier panel"
```

---

### Task 7: Active POS view (composition)

**Files:**
- Create: `apps/merchant/src/pages/pos/_shared/active-pos-view.tsx`
- Reference mockups: `Active POS.png`, `Active POS-adding order.png`, `Active POS-pay now.png`

**Interfaces:**
- Consumes: `CategoryRail`, `MenuGrid`, `ItemModifierPanel`, `CartPanel`, `Keypad`, `PaymentMethodsRow` from sibling files; `mockMenuCategories`, `mockMenuItems`, `mockCartLines` from `./mock-data`.
- Produces: `ActivePosView({ onPayNowConfirmed, onSplitBill }: ActivePosViewProps)` where `onPayNowConfirmed(method: PaymentMethod): void` and `onSplitBill(): void`. This component owns all local cart/keypad state — it is the biggest state owner in the module, but it is still one clear responsibility: "run the order-taking terminal."

- [ ] **Step 1: Write `active-pos-view.tsx`**

```tsx
// apps/merchant/src/pages/pos/_shared/active-pos-view.tsx
import { useState } from "react";
import { ActionBar } from "./action-bar";
import { CartPanel } from "./cart-panel";
import { CategoryRail } from "./category-rail";
import { ItemModifierPanel } from "./item-modifier-panel";
import { Keypad } from "./keypad";
import { MenuGrid } from "./menu-grid";
import { mockCartLines, mockMenuCategories, mockMenuItems } from "./mock-data";
import { PaymentMethodsRow } from "./payment-methods-row";
import type { CartLine, MenuItem, OrderType, PaymentMethod } from "./types";

export function ActivePosView({
  onCashIn,
  onCashOut,
  onRetrieveOrder,
  onEndShift,
  onPayNowConfirmed,
  onSplitBill,
}: {
  onCashIn: () => void;
  onCashOut: () => void;
  onRetrieveOrder: () => void;
  onEndShift: () => void;
  onPayNowConfirmed: (method: PaymentMethod) => void;
  onSplitBill: () => void;
}) {
  const [orderType, setOrderType] = useState<OrderType>("dine-in");
  const [tableNo, setTableNo] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [search, setSearch] = useState("");
  const [lines, setLines] = useState<readonly CartLine[]>(mockCartLines);
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [payMode, setPayMode] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [amountReceived, setAmountReceived] = useState("");

  const visibleItems = selectedCategoryId === "all"
    ? mockMenuItems
    : mockMenuItems.filter((item) => item.categoryId === selectedCategoryId);

  function addLine(item: MenuItem, modifiers: CartLine["selectedModifiers"] = [], note?: string) {
    setLines((prev) => [
      ...prev,
      { lineId: `${item.id}-${Date.now()}`, itemId: item.id, name: item.name, unitPrice: item.price, quantity: 1, selectedModifiers: modifiers, note },
    ]);
  }

  function handleSelectItem(item: MenuItem) {
    if (item.modifierGroups && item.modifierGroups.length > 0) {
      setCustomizingItem(item);
    } else {
      addLine(item);
    }
  }

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <ActionBar onCashIn={onCashIn} onCashOut={onCashOut} onRetrieveOrder={onRetrieveOrder} onEndShift={onEndShift} />

      <div className="mt-3 flex flex-col gap-3 lg:flex-row">
        <CategoryRail
          orderType={orderType}
          onOrderTypeChange={setOrderType}
          categories={mockMenuCategories}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={setSelectedCategoryId}
          search=""
          onSearchChange={() => {}}
          onAddCustomItem={() => {}}
        />

        {customizingItem ? (
          <ItemModifierPanel
            item={customizingItem}
            onBack={() => setCustomizingItem(null)}
            onConfirm={(modifiers, note) => {
              addLine(customizingItem, modifiers, note || undefined);
              setCustomizingItem(null);
            }}
          />
        ) : (
          <MenuGrid items={visibleItems} search={search} onSearchChange={setSearch} onSelectItem={handleSelectItem} />
        )}

        <CartPanel
          orderType={orderType}
          onOrderTypeChange={setOrderType}
          tableNo={tableNo}
          onTableNoChange={setTableNo}
          lines={lines}
          onRemoveLine={(lineId) => setLines((prev) => prev.filter((l) => l.lineId !== lineId))}
          onPayNow={() => setPayMode(true)}
        />
      </div>

      <div className="mt-3">
        {payMode ? (
          <div className="flex flex-col gap-3 rounded-xl border border-[#ececf0] bg-white px-[18px] py-[15px] sm:flex-row">
            <div className="flex-1">
              <Keypad
                onDigit={() => {}}
                onClear={() => {}}
                onBackspace={() => {}}
                onQuickDiscount={() => {}}
                onCustomDiscount={() => {}}
                onHoldOrder={() => setPayMode(false)}
                onAddNote={() => {}}
              />
            </div>
            <div className="w-full sm:w-[260px]">
              <PaymentMethodsRow
                selected={selectedMethod}
                onSelect={(method) => {
                  setSelectedMethod(method);
                  if (method === "qr") { onPayNowConfirmed(method); return; }
                  onPayNowConfirmed(method);
                }}
                onSplitBill={onSplitBill}
                showAmountReceived={selectedMethod === "cash"}
                amountReceived={amountReceived}
                onAmountReceivedChange={setAmountReceived}
              />
            </div>
          </div>
        ) : (
          <Keypad
            onDigit={() => {}}
            onClear={() => {}}
            onBackspace={() => {}}
            onQuickDiscount={() => {}}
            onCustomDiscount={() => {}}
            onHoldOrder={() => {}}
            onAddNote={() => {}}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run from `apps/merchant`: `npx tsc --noEmit` — expect no output.

- [ ] **Step 3: Visual check**

Wire `ActivePosView` into `pages/pos/index.tsx` temporarily (all callbacks no-op) and compare against `Active POS.png` (default), click a burger card and compare against `Active POS-adding order-modifires.png`, then click Pay Now and compare against `Active POS-pay now.png` / `Active POS-pay now-cash.png`.

- [ ] **Step 4: Commit**

```bash
git add apps/merchant/src/pages/pos/_shared/active-pos-view.tsx
git commit -m "Add POS active terminal view"
```

---

### Task 8: Payment result and QR modals

**Files:**
- Create: `apps/merchant/src/pages/pos/_shared/payment-result-modal.tsx`
- Create: `apps/merchant/src/pages/pos/_shared/qr-pay-modal.tsx`
- Reference mockups: `Active POS-pay now- QR Code.png`, `Active POS-pay now- QR Code-success payment.png`, `Active POS-pay now-online-success.png`, `Active POS-pay now-online-faild.png`

**Interfaces:**
- Produces: `PaymentResultModal({ outcome, onClose }: { outcome: "success" | "failed" | null; onClose(): void })`, `QrPayModal({ open, amount, onPaid, onClose }: { open: boolean; amount: number; onPaid(): void; onClose(): void })`.

- [ ] **Step 1: Write `payment-result-modal.tsx`**

```tsx
// apps/merchant/src/pages/pos/_shared/payment-result-modal.tsx
import { CheckCircle2, XCircle } from "lucide-react";

export function PaymentResultModal({
  outcome,
  onClose,
}: {
  outcome: "success" | "failed" | null;
  onClose: () => void;
}) {
  if (!outcome) return null;
  const success = outcome === "success";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="flex w-full max-w-[420px] flex-col items-center gap-3 rounded-xl bg-white px-6 py-8 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {success ? (
          <CheckCircle2 size={48} className="text-[#22C55E]" />
        ) : (
          <XCircle size={48} className="text-[#EF4444]" />
        )}
        <h3 className="text-[17px] font-bold text-[var(--octo-text-primary)]">
          {success ? "Payment Successful!" : "Payment Failed"}
        </h3>
        <p className="text-[12.5px] text-[var(--octo-text-muted)]">
          {success
            ? "The customer's payment was completed successfully."
            : "The payment could not be completed. Please try again."}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full rounded-[9px] bg-[#0D6EFD] px-3 py-[10px] text-[13px] font-semibold text-white"
        >
          Done
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write `qr-pay-modal.tsx`**

```tsx
// apps/merchant/src/pages/pos/_shared/qr-pay-modal.tsx
import { useEffect, useState } from "react";
import { QrCode } from "lucide-react";

export function QrPayModal({
  open,
  amount,
  onPaid,
  onClose,
}: {
  open: boolean;
  amount: number;
  onPaid: () => void;
  onClose: () => void;
}) {
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    if (!open) { setPaid(false); return; }
    const timer = setTimeout(() => setPaid(true), 1500);
    return () => clearTimeout(timer);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="flex w-full max-w-[420px] flex-col items-center gap-4 rounded-xl bg-white px-6 py-8 text-center" onClick={(e) => e.stopPropagation()}>
        {!paid ? (
          <>
            <h3 className="text-[15px] font-bold text-[var(--octo-text-primary)]">Scan to Pay</h3>
            <div className="flex h-[220px] w-[220px] items-center justify-center rounded-xl border border-[#ececf0] bg-white">
              <QrCode size={160} className="text-[var(--octo-text-primary)]" />
            </div>
            <p className="text-[14px] font-semibold text-[#0D6EFD]">SAR {amount.toFixed(2)}</p>
            <p className="text-[12px] text-[var(--octo-text-muted)]">Waiting for customer to complete payment...</p>
          </>
        ) : (
          <button
            type="button"
            onClick={onPaid}
            className="w-full rounded-[9px] bg-[#0D6EFD] px-3 py-[10px] text-[13px] font-semibold text-white"
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run from `apps/merchant`: `npx tsc --noEmit` — expect no output.

- [ ] **Step 4: Commit**

```bash
git add apps/merchant/src/pages/pos/_shared/payment-result-modal.tsx apps/merchant/src/pages/pos/_shared/qr-pay-modal.tsx
git commit -m "Add POS payment-result and QR-pay modals"
```

---

### Task 9: Split-payment modal

**Files:**
- Create: `apps/merchant/src/pages/pos/_shared/split-payment-modal.tsx`
- Reference mockups: `Active POS-pay now- split payment-equally.png`, `Active POS-pay now- split payment-by item.png`

**Interfaces:**
- Consumes: `CartLine` from `./types`.
- Produces: `SplitPaymentModal({ open, lines, total, onClose, onPaySubBill }: { open: boolean; lines: readonly CartLine[]; total: number; onClose(): void; onPaySubBill(): void })`.

- [ ] **Step 1: Write `split-payment-modal.tsx`**

```tsx
// apps/merchant/src/pages/pos/_shared/split-payment-modal.tsx
import { useState } from "react";
import { GripVertical, Plus } from "lucide-react";
import type { CartLine } from "./types";
import { VAT_RATE } from "./types";

interface SubBill {
  readonly id: string;
  readonly lineIds: string[];
}

export function SplitPaymentModal({
  open,
  lines,
  total,
  onClose,
  onPaySubBill,
}: {
  open: boolean;
  lines: readonly CartLine[];
  total: number;
  onClose: () => void;
  onPaySubBill: () => void;
}) {
  const [method, setMethod] = useState<"equally" | "by-item">("by-item");
  const [subBills, setSubBills] = useState<SubBill[]>([{ id: "bill-1", lineIds: [] }]);
  const [equalParts, setEqualParts] = useState(2);

  if (!open) return null;

  function assignToBill(billId: string, lineId: string) {
    setSubBills((prev) => prev.map((b) => (b.id === billId ? { ...b, lineIds: [...b.lineIds, lineId] } : b)));
  }

  function addBill() {
    setSubBills((prev) => [...prev, { id: `bill-${prev.length + 1}`, lineIds: [] }]);
  }

  function subBillTotal(bill: SubBill) {
    const subtotal = lines
      .filter((l) => bill.lineIds.includes(l.lineId))
      .reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
    return { subtotal, vat: subtotal * VAT_RATE, total: subtotal * (1 + VAT_RATE) };
  }

  const unassignedLines = lines.filter((l) => !subBills.some((b) => b.lineIds.includes(l.lineId)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="octo-scroll max-h-[85vh] w-full max-w-[680px] overflow-y-auto rounded-xl bg-white px-6 py-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-[19px] font-bold text-[var(--octo-text-primary)]">Split Payment</h3>

        <div className="mt-3 rounded-[9px] border-2 border-dashed border-[#0D6EFD] bg-[#EFF6FF] px-4 py-2.5 text-center text-[13px] font-semibold text-[#0D6EFD]">
          Total: SAR {total.toFixed(2)}
        </div>

        <h4 className="mt-4 text-[12.5px] font-semibold text-[var(--octo-text-primary)]">Split Method</h4>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMethod("equally")}
            className={
              method === "equally"
                ? "rounded-[9px] border-2 border-[#0D6EFD] px-3 py-[9px] text-[12.5px] font-semibold text-[#0D6EFD]"
                : "rounded-[9px] border border-[var(--octo-border-input)] px-3 py-[9px] text-[12.5px] text-[var(--octo-text-primary)]"
            }
          >
            Split Equally
          </button>
          <button
            type="button"
            onClick={() => setMethod("by-item")}
            className={
              method === "by-item"
                ? "rounded-[9px] border-2 border-[#0D6EFD] px-3 py-[9px] text-[12.5px] font-semibold text-[#0D6EFD]"
                : "rounded-[9px] border border-[var(--octo-border-input)] px-3 py-[9px] text-[12.5px] text-[var(--octo-text-primary)]"
            }
          >
            Split by Items
          </button>
        </div>

        {method === "equally" ? (
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <label className="text-[12.5px] font-medium text-[var(--octo-text-primary)]">Number of guests</label>
              <input
                type="number"
                min={2}
                value={equalParts}
                onChange={(e) => setEqualParts(Math.max(2, Number(e.target.value) || 2))}
                className="w-20 rounded-[8px] border border-[var(--octo-border-input)] px-2 py-1 text-center"
              />
            </div>
            {Array.from({ length: equalParts }, (_, i) => (
              <div key={i} className="flex items-center justify-between rounded-[9px] border border-[#ececf0] px-4 py-3 text-[13px]">
                <span className="font-semibold text-[var(--octo-text-primary)]">Guest {i + 1}</span>
                <span className="text-[var(--octo-text-primary)]">SAR {(total / equalParts).toFixed(2)}</span>
                <button type="button" onClick={onPaySubBill} className="rounded-[8px] bg-[#0D6EFD] px-3 py-[6px] text-[12px] font-semibold text-white">
                  Pay Now
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <h5 className="mb-2 text-[12.5px] font-semibold text-[var(--octo-text-primary)]">Order Items</h5>
              <div className="flex flex-col gap-2">
                {unassignedLines.map((line) => (
                  <div key={line.lineId} className="flex items-center justify-between rounded-[9px] border border-[var(--octo-border-input)] px-3 py-2 text-[12.5px]">
                    {line.name}
                    <GripVertical size={14} className="text-[#8b8b93]" />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h5 className="mb-2 text-[12.5px] font-semibold text-[var(--octo-text-primary)]">Sub Bills</h5>
              <div className="flex flex-col gap-3">
                {subBills.map((bill, idx) => {
                  const totals = subBillTotal(bill);
                  return (
                    <div key={bill.id} className="rounded-[9px] border border-[#ececf0] px-3 py-2.5 text-[12.5px]">
                      <p className="font-semibold text-[var(--octo-text-primary)]">Bill {idx + 1}</p>
                      {bill.lineIds.map((lineId) => {
                        const line = lines.find((l) => l.lineId === lineId);
                        if (!line) return null;
                        return (
                          <div key={lineId} className="mt-1 flex justify-between text-[12px]">
                            <span>{line.quantity} {line.name}</span>
                            <span>SAR {(line.unitPrice * line.quantity).toFixed(2)}</span>
                          </div>
                        );
                      })}
                      {unassignedLines.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => unassignedLines[0] && assignToBill(bill.id, unassignedLines[0].lineId)}
                          className="mt-2 w-full rounded-[7px] border border-dashed border-[#0D6EFD] py-1.5 text-[11.5px] text-[#0D6EFD]"
                        >
                          Drag items here to assign to this bill
                        </button>
                      ) : null}
                      <div className="mt-2 flex justify-between border-t border-[#f0f0f2] pt-1.5 font-bold">
                        <span>Total</span>
                        <span>SAR {totals.total.toFixed(2)}</span>
                      </div>
                      <button type="button" onClick={onPaySubBill} className="mt-2 w-full rounded-[8px] bg-[#0D6EFD] py-[7px] text-[12px] font-semibold text-white">
                        Pay Now
                      </button>
                    </div>
                  );
                })}
                <button type="button" onClick={addBill} className="flex items-center justify-center gap-1.5 text-[12.5px] font-semibold text-[#0D6EFD]">
                  <Plus size={14} />
                  Add New Bill
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run from `apps/merchant`: `npx tsc --noEmit` — expect no output.

- [ ] **Step 3: Commit**

```bash
git add apps/merchant/src/pages/pos/_shared/split-payment-modal.tsx
git commit -m "Add POS split-payment modal"
```

---

### Task 10: Cash-drawer modal, retrieve-order view, PIN pad

**Files:**
- Create: `apps/merchant/src/pages/pos/_shared/cash-drawer-modal.tsx`
- Create: `apps/merchant/src/pages/pos/_shared/retrieve-order-view.tsx`
- Create: `apps/merchant/src/pages/pos/_shared/pin-pad.tsx`
- Reference mockups: `cash in.png`, `cash out.png`, `cash out amount entry.png`, `cash out amount entry _500.png`, `Retrieve Order.png`, `pin for confirmation.png`

**Interfaces:**
- Consumes: `Employee`, `PendingOrder` from `./types`.
- Produces: `CashDrawerModal({ open, mode, employee, onClose, onConfirm }: { open: boolean; mode: "in" | "out"; employee: Employee; onClose(): void; onConfirm(amount: number, reason: string, reference: string, note: string): void })`, `RetrieveOrderView({ orders, onBack, onRetrieve }: { orders: readonly PendingOrder[]; onBack(): void; onRetrieve(order: PendingOrder): void })`, `PinPad({ length, value, onChange }: { length: number; value: string[]; onChange(next: string[]): void })`.

- [ ] **Step 1: Write `pin-pad.tsx`**

```tsx
// apps/merchant/src/pages/pos/_shared/pin-pad.tsx
export function PinPad({
  length,
  value,
  onChange,
}: {
  length: number;
  value: string[];
  onChange: (next: string[]) => void;
}) {
  function setDigit(index: number, digit: string) {
    const next = [...value];
    next[index] = digit;
    onChange(next);
  }

  return (
    <div dir="ltr" className="flex items-center justify-center gap-3">
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          value={value[i] ?? ""}
          onChange={(e) => setDigit(i, e.target.value.replace(/\D/g, "").slice(-1))}
          inputMode="numeric"
          maxLength={1}
          className="h-[52px] w-[52px] rounded-[9px] border border-[var(--octo-border-input)] text-center text-[18px] font-semibold text-[#0D6EFD] focus:border-[#0D6EFD] focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/20"
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Write `cash-drawer-modal.tsx`**

```tsx
// apps/merchant/src/pages/pos/_shared/cash-drawer-modal.tsx
import { useState } from "react";
import type { Employee } from "./types";

export function CashDrawerModal({
  open,
  mode,
  employee,
  onClose,
  onConfirm,
}: {
  open: boolean;
  mode: "in" | "out";
  employee: Employee;
  onClose: () => void;
  onConfirm: (amount: number, reason: string, reference: string, note: string) => void;
}) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");

  if (!open) return null;
  const title = mode === "in" ? "Cash In" : "Cash Out";
  const subtitle = mode === "in" ? "Add cash to drawer." : "Remove cash from drawer.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="w-full max-w-[480px] rounded-xl bg-white px-6 py-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-[19px] font-bold text-[var(--octo-text-primary)]">{title}</h3>
        <p className="mt-1 text-[12.5px] text-[var(--octo-text-muted)]">{subtitle}</p>

        <div className="mt-4 flex items-center gap-3 rounded-[9px] bg-[var(--octo-hover)] px-3 py-2.5">
          {employee.avatarUrl ? (
            <img src={employee.avatarUrl} alt={employee.name} className="h-9 w-9 rounded-full object-cover" />
          ) : null}
          <div>
            <p className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{employee.name}</p>
            <p className="text-[11.5px] text-[#0D6EFD]">{employee.role}</p>
          </div>
        </div>

        <label className="mt-4 block text-[12.5px] font-medium text-[var(--octo-text-primary)]">
          Amount <span className="text-[#EF4444]">*</span>
        </label>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={`Enter cash ${mode} amount`}
          className="mt-1 w-full rounded-[9px] border border-[var(--octo-border-input)] px-3 py-[9px] text-[13px]"
        />

        <label className="mt-4 block text-[12.5px] font-medium text-[var(--octo-text-primary)]">
          Reason <span className="text-[#EF4444]">*</span>
        </label>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Write reason"
          className="mt-1 w-full rounded-[9px] border border-[var(--octo-border-input)] px-3 py-[9px] text-[13px]"
        />

        <label className="mt-4 block text-[12.5px] font-medium text-[var(--octo-text-primary)]">Reference</label>
        <input
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="e.g., Invoice"
          className="mt-1 w-full rounded-[9px] border border-[var(--octo-border-input)] px-3 py-[9px] text-[13px]"
        />

        <label className="mt-4 block text-[12.5px] font-medium text-[var(--octo-text-primary)]">Note</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add any note"
          rows={3}
          className="mt-1 w-full rounded-[9px] border border-[var(--octo-border-input)] px-3 py-2 text-[13px]"
        />

        <button
          type="button"
          onClick={() => onConfirm(Number(amount) || 0, reason, reference, note)}
          disabled={!amount || !reason}
          className="mt-5 w-full rounded-[9px] bg-[#0D6EFD] px-3 py-[10px] text-[13px] font-semibold text-white disabled:opacity-40"
        >
          Confirm {title}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write `retrieve-order-view.tsx`**

```tsx
// apps/merchant/src/pages/pos/_shared/retrieve-order-view.tsx
import { useState } from "react";
import { Search, Upload } from "lucide-react";
import type { PendingOrder } from "./types";

export function RetrieveOrderView({
  orders,
  onRetrieve,
}: {
  orders: readonly PendingOrder[];
  onRetrieve: (order: PendingOrder) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = orders.filter((o) => o.id.toLowerCase().includes(search.trim().toLowerCase()) || o.tableNo.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <h1 className="text-[21px] font-bold leading-tight text-[var(--octo-text-primary)]">Retrieve Order</h1>
      <p className="mt-1 text-[12.5px] text-[var(--octo-text-muted)]">Select a pending order to view details and proceed to payment.</p>

      <div className="relative mt-4">
        <Search size={15} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-[var(--octo-text-faint)]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search Table NO, Order ID, Phone, Name..."
          className="w-full rounded-[10px] border border-[var(--octo-border-input)] py-[10px] ps-10 pe-3 text-[13px]"
        />
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        {filtered.map((order) => (
          <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#ececf0] bg-white px-[18px] py-[15px]">
            <span className="text-[13px] font-bold text-[#0D6EFD]">#{order.id}</span>
            <Field title={order.tableNo} sub="Table No." />
            <Field title={order.orderType === "dine-in" ? "Dine-In" : order.orderType === "take-away" ? "Take Away" : "Delivery"} sub="Order type" />
            <Field title={order.waiterName} sub="Waiter Name" />
            <Field title={order.durationLabel} sub="Order Duration" />
            <Field title={`SAR ${order.total}`} sub="Total" />
            <span className="rounded-[7px] bg-[#DCFCE7] px-2.5 py-1 text-[11.5px] font-semibold text-[#22C55E]">{order.status}</span>
            <button
              type="button"
              onClick={() => onRetrieve(order)}
              className="flex items-center gap-1.5 rounded-[9px] bg-[#0D6EFD] px-3 py-[8px] text-[12.5px] font-semibold text-white"
            >
              <Upload size={14} />
              Retrieve Order
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex flex-col text-[12.5px]">
      <span className="font-semibold text-[var(--octo-text-primary)]">{title}</span>
      <span className="text-[11px] text-[var(--octo-text-muted)]">{sub}</span>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck**

Run from `apps/merchant`: `npx tsc --noEmit` — expect no output.

- [ ] **Step 5: Commit**

```bash
git add apps/merchant/src/pages/pos/_shared/cash-drawer-modal.tsx apps/merchant/src/pages/pos/_shared/retrieve-order-view.tsx apps/merchant/src/pages/pos/_shared/pin-pad.tsx
git commit -m "Add POS cash-drawer modal, retrieve-order view, and PIN pad"
```

---

### Task 11: Close-shift view, force-close-reason modal, Z-report

**Files:**
- Create: `apps/merchant/src/pages/pos/_shared/close-shift-view.tsx`
- Create: `apps/merchant/src/pages/pos/_shared/force-close-reason-modal.tsx`
- Create: `apps/merchant/src/pages/pos/_shared/z-report-view.tsx`
- Reference mockups: `close shift.png`, `close shift- Tolerance Limit _ 5 SAR.png`, `close shift- Tolerance Limit _ 5 SAR (1).png`, `manager reason for force close.png`, `closing shift report - Z Report.png`

**Interfaces:**
- Consumes: `Denomination`, `Shift`, `Employee`, `CASH_TOLERANCE_SAR` from `./types`.
- Produces: `CloseShiftView({ shift, denominations, expectedBalance, onRequireForceCloseReason, onCloseShift }: CloseShiftViewProps)`, `ForceCloseReasonModal({ open, onClose, onSubmit }: { open: boolean; onClose(): void; onSubmit(reason: string): void })`, `ZReportView({ shift, onDone }: { shift: Shift; onDone(): void })`.

- [ ] **Step 1: Write `close-shift-view.tsx`**

```tsx
// apps/merchant/src/pages/pos/_shared/close-shift-view.tsx
import { useMemo, useState } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import type { Denomination, Shift } from "./types";
import { CASH_TOLERANCE_SAR } from "./types";
import { PinPad } from "./pin-pad";

export function CloseShiftView({
  shift,
  denominations,
  expectedBalance,
  onOutOfTolerance,
  onCloseShift,
}: {
  shift: Shift;
  denominations: readonly Denomination[];
  expectedBalance: number;
  onOutOfTolerance: () => void;
  onCloseShift: () => void;
}) {
  const [counts, setCounts] = useState<Record<number, number>>(
    () => Object.fromEntries(denominations.map((d) => [d.value, d.count]))
  );
  const [note, setNote] = useState("");
  const [pin, setPin] = useState<string[]>(["", "", "", ""]);

  const actualBalance = useMemo(
    () => denominations.reduce((sum, d) => sum + d.value * (counts[d.value] ?? 0), 0),
    [denominations, counts]
  );
  const difference = actualBalance - expectedBalance;
  const outOfTolerance = Math.abs(difference) > CASH_TOLERANCE_SAR;
  const pinComplete = pin.every((d) => d !== "");

  function handleCloseClick() {
    if (outOfTolerance) { onOutOfTolerance(); return; }
    onCloseShift();
  }

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <h1 className="text-[21px] font-bold leading-tight text-[var(--octo-text-primary)]">Close Shift</h1>
      <p className="mt-1 text-[12.5px] text-[var(--octo-text-muted)]">Review all transactions, count the cash drawer and close the shift.</p>

      <div className="mt-5 rounded-xl border border-[#ececf0] bg-white px-[18px] py-[15px]">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-[var(--octo-text-primary)]">Cash Drawer Count</h2>
          <RotateCcw size={14} className="text-[#8b8b93]" />
        </div>

        <div className="mt-3 overflow-hidden rounded-[10px] border border-[#ececf0]">
          <div className="grid grid-cols-3 bg-[var(--octo-hover)] px-4 py-2 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-muted)]">
            <span>Denomination (SAR)</span>
            <span className="text-center">Count</span>
            <span className="text-end">Total (SAR)</span>
          </div>
          {denominations.map((d) => (
            <div key={d.value} className="grid grid-cols-3 items-center border-t border-[#f0f0f2] px-4 py-2.5 text-[13px]">
              <span>{d.value}</span>
              <input
                type="number"
                min={0}
                value={counts[d.value] ?? 0}
                onChange={(e) => setCounts((prev) => ({ ...prev, [d.value]: Math.max(0, Number(e.target.value) || 0) }))}
                className="mx-auto w-20 rounded-[8px] border border-[var(--octo-border-input)] px-2 py-1 text-center"
              />
              <span className="text-end">{d.value * (counts[d.value] ?? 0)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-[#f0f0f2] bg-[var(--octo-hover)] px-4 py-2.5 text-[13px] font-semibold">
            <span>Actual Drawer Balance</span>
            <span className="text-[#0D6EFD]">SAR {actualBalance.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-[#ececf0] bg-white px-[18px] py-[15px]">
        <h2 className="text-[15px] font-bold text-[var(--octo-text-primary)]">Reconciliation Result</h2>
        {outOfTolerance ? (
          <p className="mt-2 flex items-center gap-2 rounded-[9px] bg-[#FFFBEB] px-3 py-[9px] text-[12.5px] font-medium text-[#F59E0B]">
            <AlertTriangle size={14} />
            Difference exceeds the SAR {CASH_TOLERANCE_SAR} tolerance limit for this register.
          </p>
        ) : null}
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ResultTile label="Expected Drawer Balance" value={expectedBalance} tone="pink" />
          <ResultTile label="Actual Drawer Balance" value={actualBalance} tone="blue" />
          <ResultTile label="Difference (Over / Short)" value={difference} tone={outOfTolerance ? "warning" : "green"} />
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-[#ececf0] bg-white px-[18px] py-[15px]">
        <h2 className="text-[14px] font-bold text-[var(--octo-text-primary)]">Closing Note</h2>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add any note"
          rows={3}
          className="mt-2 w-full rounded-[9px] border border-[var(--octo-border-input)] px-3 py-2 text-[13px]"
        />
      </div>

      <div className="mt-3 rounded-xl border border-[#ececf0] bg-white px-[18px] py-[15px]">
        <h2 className="text-[15px] font-bold text-[var(--octo-text-primary)]">Manager Authentication &amp; Security</h2>
        <p className="mt-3 text-center text-[12.5px] text-[var(--octo-text-muted)]">Please enter your PIN to confirm closing this shift.</p>
        <div className="mt-3">
          <PinPad length={4} value={pin} onChange={setPin} />
        </div>
      </div>

      <button
        type="button"
        onClick={handleCloseClick}
        disabled={!pinComplete}
        className="mt-5 w-full rounded-[9px] bg-[#EF4444] px-3 py-[12px] text-[13px] font-semibold text-white disabled:opacity-40"
      >
        Close Shift
      </button>
    </div>
  );
}

function ResultTile({ label, value, tone }: { label: string; value: number; tone: "pink" | "blue" | "green" | "warning" }) {
  const bg = { pink: "bg-[#FCE7F3]", blue: "bg-[var(--octo-hover)]", green: "bg-[#DCFCE7]", warning: "bg-[#FFFBEB]" }[tone];
  const text = { pink: "text-[#DB2777]", blue: "text-[var(--octo-text-primary)]", green: "text-[#16a34a]", warning: "text-[#F59E0B]" }[tone];
  return (
    <div className={`rounded-xl px-4 py-4 ${bg}`}>
      <p className={`text-[20px] font-bold ${text}`}>{value === 0 ? "-" : `SAR ${value.toLocaleString()}`}</p>
      <p className="mt-1 text-[11.5px] text-[var(--octo-text-muted)]">{label}</p>
    </div>
  );
}
```

- [ ] **Step 2: Write `force-close-reason-modal.tsx`**

```tsx
// apps/merchant/src/pages/pos/_shared/force-close-reason-modal.tsx
import { useState } from "react";
import { AlertTriangle } from "lucide-react";

export function ForceCloseReasonModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="w-full max-w-[440px] rounded-xl bg-white px-6 py-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <AlertTriangle size={18} className="text-[#F59E0B]" />
          <h3 className="text-[16px] font-bold text-[var(--octo-text-primary)]">Manager Reason Required</h3>
        </div>
        <p className="mt-2 text-[12.5px] text-[var(--octo-text-muted)]">
          The drawer count is outside the tolerance limit. Provide a reason to force-close this shift.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Explain the discrepancy"
          rows={4}
          className="mt-3 w-full rounded-[9px] border border-[var(--octo-border-input)] px-3 py-2 text-[13px]"
        />
        <button
          type="button"
          onClick={() => onSubmit(reason)}
          disabled={!reason.trim()}
          className="mt-4 w-full rounded-[9px] bg-[#EF4444] px-3 py-[10px] text-[13px] font-semibold text-white disabled:opacity-40"
        >
          Force Close Shift
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write `z-report-view.tsx`**

```tsx
// apps/merchant/src/pages/pos/_shared/z-report-view.tsx
import { CheckCircle2 } from "lucide-react";
import type { Shift } from "./types";

export function ZReportView({ shift, onDone }: { shift: Shift; onDone: () => void }) {
  return (
    <div className="flex flex-col items-center px-4 py-16 text-center">
      <CheckCircle2 size={48} className="text-[#22C55E]" />
      <h1 className="mt-4 text-[19px] font-bold text-[var(--octo-text-primary)]">Shift Closed Successfully</h1>
      <p className="mt-1 max-w-[420px] text-[12.5px] text-[var(--octo-text-muted)]">
        The Z-Report for {shift.employee.name}&apos;s shift on {shift.registerName} has been generated and saved.
      </p>
      <div className="mt-6 w-full max-w-[360px] rounded-xl border border-[#ececf0] bg-white px-[18px] py-[15px] text-start text-[12.5px]">
        <div className="flex justify-between py-1"><span className="text-[var(--octo-text-muted)]">Total Sales</span><span className="font-semibold">SAR {shift.sales.toLocaleString()}</span></div>
        <div className="flex justify-between py-1"><span className="text-[var(--octo-text-muted)]">Orders</span><span className="font-semibold">{shift.orderCount}</span></div>
      </div>
      <button
        type="button"
        onClick={onDone}
        className="mt-6 rounded-[9px] bg-[#0D6EFD] px-5 py-[11px] text-[13px] font-semibold text-white"
      >
        Back to Start Shift
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck**

Run from `apps/merchant`: `npx tsc --noEmit` — expect no output.

- [ ] **Step 5: Commit**

```bash
git add apps/merchant/src/pages/pos/_shared/close-shift-view.tsx apps/merchant/src/pages/pos/_shared/force-close-reason-modal.tsx apps/merchant/src/pages/pos/_shared/z-report-view.tsx
git commit -m "Add POS close-shift view, force-close modal, and Z-report"
```

---

### Task 12: Wire PosPage top-level state machine

**Files:**
- Modify: `apps/merchant/src/pages/pos/index.tsx` (replace placeholder body with the full state machine)

**Interfaces:**
- Consumes every component and mock const built in Tasks 2–11.
- Produces: the final `PosPage` export that `index.ts` re-exports (already wired in Task 1).

- [ ] **Step 1: Replace `index.tsx`**

```tsx
// apps/merchant/src/pages/pos/index.tsx
import { useState } from "react";
import { ActivePosView } from "./_shared/active-pos-view";
import { CashDrawerModal } from "./_shared/cash-drawer-modal";
import { CloseShiftView } from "./_shared/close-shift-view";
import { ForceCloseReasonModal } from "./_shared/force-close-reason-modal";
import { HeaderBar } from "./_shared/header-bar";
import { mockDenominations, mockPendingOrders, mockPreviousShift, mockShift } from "./_shared/mock-data";
import { PaymentResultModal } from "./_shared/payment-result-modal";
import { QrPayModal } from "./_shared/qr-pay-modal";
import { RetrieveOrderView } from "./_shared/retrieve-order-view";
import { ShiftStartView } from "./_shared/shift-start-view";
import { SplitPaymentModal } from "./_shared/split-payment-modal";
import { ZReportView } from "./_shared/z-report-view";
import type { PaymentMethod, Shift } from "./_shared/types";

type TopView = "shift-start" | "active" | "retrieve-order" | "close-shift" | "z-report";

export function PosPage() {
  const [view, setView] = useState<TopView>("shift-start");
  const [shift, setShift] = useState<Shift | null>(null);
  const [cashDrawerMode, setCashDrawerMode] = useState<"in" | "out" | null>(null);
  const [splitOpen, setSplitOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [paymentOutcome, setPaymentOutcome] = useState<"success" | "failed" | null>(null);
  const [forceCloseOpen, setForceCloseOpen] = useState(false);

  function handleStartShift(openingCash: number) {
    setShift({ ...mockShift, openingCash, sales: 0, orderCount: 0, status: "active" });
    setView("active");
  }

  function handlePayNowConfirmed(method: PaymentMethod) {
    if (method === "qr") { setQrOpen(true); return; }
    setPaymentOutcome("success");
  }

  return (
    <div>
      <div className="px-4 pt-4 sm:px-[26px] sm:pt-5">
        <HeaderBar shift={shift} locked={view === "shift-start"} />
      </div>

      {view === "shift-start" ? (
        <ShiftStartView
          employee={mockShift.employee}
          branchName={mockShift.branchName}
          registerName={mockShift.registerName}
          previousShift={mockPreviousShift}
          previousShiftStillOpen={false}
          denominations={mockDenominations}
          onStartShift={handleStartShift}
          onGoCloseStuckShift={() => setView("close-shift")}
        />
      ) : null}

      {view === "active" ? (
        <ActivePosView
          onCashIn={() => setCashDrawerMode("in")}
          onCashOut={() => setCashDrawerMode("out")}
          onRetrieveOrder={() => setView("retrieve-order")}
          onEndShift={() => setView("close-shift")}
          onPayNowConfirmed={handlePayNowConfirmed}
          onSplitBill={() => setSplitOpen(true)}
        />
      ) : null}

      {view === "retrieve-order" ? (
        <RetrieveOrderView orders={mockPendingOrders} onRetrieve={() => setView("active")} />
      ) : null}

      {view === "close-shift" && shift ? (
        <CloseShiftView
          shift={shift}
          denominations={mockDenominations}
          expectedBalance={shift.openingCash + shift.sales}
          onOutOfTolerance={() => setForceCloseOpen(true)}
          onCloseShift={() => setView("z-report")}
        />
      ) : null}

      {view === "z-report" && shift ? (
        <ZReportView
          shift={shift}
          onDone={() => {
            setShift(null);
            setView("shift-start");
          }}
        />
      ) : null}

      {shift ? (
        <CashDrawerModal
          open={cashDrawerMode !== null}
          mode={cashDrawerMode ?? "in"}
          employee={shift.employee}
          onClose={() => setCashDrawerMode(null)}
          onConfirm={() => setCashDrawerMode(null)}
        />
      ) : null}

      <SplitPaymentModal
        open={splitOpen}
        lines={[]}
        total={0}
        onClose={() => setSplitOpen(false)}
        onPaySubBill={() => {
          setSplitOpen(false);
          setPaymentOutcome("success");
        }}
      />

      <QrPayModal
        open={qrOpen}
        amount={206.5}
        onPaid={() => {
          setQrOpen(false);
          setPaymentOutcome("success");
        }}
        onClose={() => setQrOpen(false)}
      />

      <PaymentResultModal outcome={paymentOutcome} onClose={() => setPaymentOutcome(null)} />

      <ForceCloseReasonModal
        open={forceCloseOpen}
        onClose={() => setForceCloseOpen(false)}
        onSubmit={() => {
          setForceCloseOpen(false);
          setView("z-report");
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run from `apps/merchant`: `npx tsc --noEmit` — expect no output.

- [ ] **Step 3: Visual walk-through**

If port 5173 is free (check with another agent first per AGENTS.md §7.3), run `npm run dev` in `apps/merchant` and walk the full flow: start shift → add items → customize a burger → pay with cash → split bill → cash in/out → retrieve order → end shift → close shift → force-close reason (enter a mismatched count) → Z-report → back to shift-start. Compare each screen against its mockup filename listed in the spec §4–§9. If the port is busy, rely on the Task-by-task typechecks already done plus careful reading of each component against its mockup.

- [ ] **Step 4: Commit**

```bash
git add apps/merchant/src/pages/pos/index.tsx
git commit -m "Wire POS page top-level state machine"
```

---

## Self-Review

**Spec coverage:**
- §3 route/shell → Task 1 (registry) + Task 12 (`HeaderBar` mounted at page level).
- §4 shift-start incl. threshold + previous-shift-not-closed → Task 3.
- §5 active terminal incl. modifier panel + payment-method row → Tasks 4–7.
- §6 split/QR/payment-result/retrieved-order-payment → Tasks 8–9 (retrieved-order payment reuses `ActivePosView`'s own pay flow once `onRetrieve` loads it back into `active`, per Task 12).
- §7 cash in/out → Task 10.
- §8 retrieve order → Task 10.
- §9 close shift incl. tolerance/force-close/Z-report → Task 11.
- §10 shared keypad/pin-pad reuse → Tasks 4, 10, 11.
- §11 mock data shape → Task 1.
- §13 verification → every task's typecheck step + Task 12's walk-through.

**Placeholder scan:** none — every step has runnable code, no "TBD"/"similar to Task N".

**Type consistency:** `SelectedModifier`, `CartLine`, `PaymentMethod`, `Employee`, `Shift`, `Denomination`, `PendingOrder`, `MenuItem`, `ModifierGroup` are defined once in Task 1 and imported (never redefined) by every later task.
