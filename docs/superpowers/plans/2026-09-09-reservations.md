# Reservations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/reservations` hub with the full reservations list from the fifteen design frames, plus its add/edit form, eight-state detail dialog and cancel dialog.

**Architecture:** All decision logic (status merge, filtering, sorting, KPI derivation, refund policy) lives in one pure module `_shared/model.ts` with unit tests. Components are thin renderers over it, verified by screenshot against the frames. Add and Edit are one component behind a `mode` prop; the eight detail states are one component behind a switch.

**Tech Stack:** React 18, TypeScript, Tailwind, react-router-dom 6, lucide-react, vitest (node environment), existing `@ui/primitives` and `--octo-*` CSS tokens.

**Spec:** `docs/superpowers/specs/2026-09-09-reservations-design.md`

**Frames:** `apps/assets/Reservations/Reservations Desing/` — 15 PNGs. Open the relevant frame before building each piece.

## Global Constraints

- Every user-visible string goes through `t()` and exists in **both** `packages/i18n/src/locales/en/index.ts` and `.../ar/index.ts`. `apps/merchant/src/shared/i18n/keys.test.ts` fails otherwise.
- Surfaces and text use `--octo-*` tokens, never literal greys — the console has a dark theme the frames do not show. Status colours are literal hex, as elsewhere in the app.
- Type scale follows the app: `text-[12px]`/`text-[12.5px]` body, `text-[19px] sm:text-[21px]` page title, `rounded-[9px]` controls, `rounded-xl` cards.
- Reuse `@ui/primitives` (`Modal`, `Input`, `Textarea`, `Select`, `Checkbox`, `Badge`, `Tabs`, `Button`). Do not add a new primitive.
- No `Math.random`, no `Date.now()` in render — the fixture's "today" is the exported `TODAY` constant.
- Nothing persists. Page state is `useState` over the fixture, matching every other console page.
- Vitest runs `environment: "node"` and only matches `src/**/*.test.ts` (not `.tsx`). Components are **not** unit tested; pure logic is.
- Run from `apps/merchant`: `npm test`, `npx tsc -b --noEmit`, `npm run lint`.
- An action with no backend is rendered **disabled with a `title` saying so** — never wired to a no-op that pretends to work.

### Copy fixes carried through every task

The frames contain four errors. Use the corrected text everywhere:

| Frame text | Use |
| --- | --- |
| "Mange all table reservations in one place." | "Manage all table reservations in one place." |
| "Paid on MAU20,2026 at 3:42 PM" | "Paid on May 20, 2026 at 3:42 PM" |
| "Create& Send Confirmation" | "Create & Send Confirmation" |
| Header button "Add To Waitlist" (on the modal frames only) | "Add New Reservation" (per the list frame) |

---

### Task 1: Data model

**Files:**
- Modify: `apps/merchant/src/shared/api/mock-reservations.ts:33-58` (types), `:66-95` (fixture)
- Modify: `apps/merchant/src/pages/reservations/calendar/index.tsx:41-71` (the four `Record<>` maps)
- Modify: `packages/i18n/src/locales/en/index.ts`, `packages/i18n/src/locales/ar/index.ts`
- Test: `apps/merchant/src/shared/api/mock-reservations.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `ReservationStatus`, `DepositState`, `ReservationSource`, `Reservation` (extended), `reservations` fixture, `TODAY`.

**Why the fixture must change:** every one of the eight detail states has to be reachable by clicking a row. A fixture that lacks a `failed` deposit makes a whole frame unverifiable.

- [ ] **Step 1: Write the failing test**

Create `apps/merchant/src/shared/api/mock-reservations.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { reservations, TODAY, type DepositState, type ReservationStatus } from "./mock-reservations";

const ALL_STATUSES: ReservationStatus[] = [
  "Pending", "Confirmed", "Arrived", "Seated", "Completed", "No-show", "Cancelled",
];
const ALL_DEPOSIT_STATES: DepositState[] = [
  "none", "unpaid", "link-sent", "paid", "expired", "failed", "refunded", "cancelled",
];

describe("reservations fixture", () => {
  it("covers every reservation status today", () => {
    const today = reservations.filter((r) => r.date === TODAY);
    for (const status of ALL_STATUSES) {
      expect(today.some((r) => r.status === status), `missing status ${status}`).toBe(true);
    }
  });

  it("covers every deposit state today", () => {
    const today = reservations.filter((r) => r.date === TODAY);
    for (const state of ALL_DEPOSIT_STATES) {
      const present = today.some((r) => (r.deposit?.state ?? "none") === state);
      expect(present, `missing deposit state ${state}`).toBe(true);
    }
  });

  it("gives every reservation a unique ref", () => {
    const refs = reservations.map((r) => r.ref);
    expect(new Set(refs).size).toBe(refs.length);
  });

  it("gives every reservation an area", () => {
    expect(reservations.every((r) => r.area.length > 0)).toBe(true);
  });

  it("attaches a payment link to every reservation whose deposit was sent or expired", () => {
    for (const r of reservations) {
      const state = r.deposit?.state;
      if (state === "link-sent" || state === "expired") {
        expect(r.paymentLink, `${r.ref} needs a paymentLink`).toBeDefined();
      }
    }
  });

  it("records how a paid deposit was paid", () => {
    for (const r of reservations) {
      if (r.deposit?.state === "paid") {
        expect(r.deposit.paidOn, `${r.ref} needs paidOn`).toBeTruthy();
        expect(r.deposit.method, `${r.ref} needs method`).toBeTruthy();
        expect(r.deposit.txnId, `${r.ref} needs txnId`).toBeTruthy();
      }
    }
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd apps/merchant && npx vitest run src/shared/api/mock-reservations.test.ts`
Expected: FAIL — `DepositState` is not exported; `r.ref` / `r.area` / `r.deposit` do not exist.

- [ ] **Step 3: Widen the types**

In `mock-reservations.ts`, replace the `ReservationStatus` / `ReservationSource` declarations and the `Reservation` interface:

```ts
export type ReservationStatus =
  | "Pending" | "Confirmed" | "Arrived" | "Seated"
  | "Completed" | "No-show" | "Cancelled";

export type ReservationSource =
  | "Direct Booking" | "Website" | "Walk In" | "Phone" | "Instagram";

/** How far the deposit for a reservation has got. "none" = none required. */
export type DepositState =
  | "none" | "unpaid" | "link-sent" | "paid"
  | "expired" | "failed" | "refunded" | "cancelled";

export type DepositType = "Pre Reservation" | "Per Guest" | "Full Prepayment";

export interface ReservationDeposit {
  amount: number;
  currency: "SAR";
  type: DepositType;
  state: DepositState;
  /** Display strings, pre-formatted — the fixture stands in for an API. */
  dueBy?: string;
  paidOn?: string;
  method?: string;
  txnId?: string;
}

export interface ReservationPaymentLink {
  url: string;
  sentVia: "WhatsApp" | "SMS" | "Email";
  sentTo: string;
  sentOn: string;
  expiresOn: string;
}

export interface Reservation {
  id: string;
  /** ISO date, e.g. "2026-08-08" */
  date: string;
  /** minutes from midnight; 10:00 -> 600, next-day 02:00 -> 1560 (24 + 2 = 26h) */
  startMinutes: number;
  durationMinutes: number;
  /** Human reference without the hash, e.g. "RSV-1048". */
  ref: string;
  guest: string;
  phone: string;
  email?: string;
  partySize: number;
  /** Seating area — the line above the table on a row, e.g. "Main Dining". */
  area: string;
  table: string;
  branch: Branch;
  source: ReservationSource;
  status: ReservationStatus;
  tags?: readonly string[];
  deposit?: ReservationDeposit;
  paymentLink?: ReservationPaymentLink;
  confirmedOn?: string;
  confirmedMethod?: string;
  cancelledAt?: string;
  cancelReason?: string;
  notes?: string;
  allergyTags?: readonly string[];
}
```

- [ ] **Step 4: Rewrite the fixture**

Replace the fifteen `reservations` entries. Keep the existing week spread (Sat 8 → Fri 14 Aug 2026, `TODAY = "2026-08-08"`), but make **today** carry one row per status and one per deposit state. Add `ref` (RSV-1041 upward, unique), `area` (`Main Dining`, `Terrace`, `Family Section`, `Private Rooms`), and re-source `Mobile App` → `Instagram`, `Aggregator` → `Website`, `Walk-in` → `Walk In`.

Today's rows must include, at minimum:

| ref | status | deposit.state | extra fields required |
| --- | --- | --- | --- |
| RSV-1041 | Completed | paid | `paidOn`, `method: "mada **** 1236"`, `txnId: "PAY-123654789"` |
| RSV-1042 | Confirmed | paid | + `confirmedOn`, `confirmedMethod: "AUTO (Deposit Paid)"` |
| RSV-1043 | Pending | unpaid | `dueBy` |
| RSV-1044 | Confirmed | link-sent | `paymentLink` (url `https://pay.octopus.app`, `sentVia: "WhatsApp"`) |
| RSV-1045 | Pending | expired | `paymentLink` with a past `expiresOn` |
| RSV-1046 | Pending | failed | no `paidOn` |
| RSV-1047 | Cancelled | refunded | `cancelledAt`, `cancelReason` |
| RSV-1048 | Cancelled | cancelled | `cancelledAt` |
| RSV-1049 | Arrived | paid | full paid fields |
| RSV-1050 | Seated | paid | full paid fields |
| RSV-1051 | No-show | unpaid | — |
| RSV-1052 | Confirmed | none | no `deposit` at all |

Give two rows `tags: ["Birthday", "VIP"]` so the form's tag chips have something to show.

- [ ] **Step 5: Fix the calendar's four maps**

`calendar/index.tsx` holds `Record<ReservationStatus, …>` and `Record<ReservationSource, …>` maps that no longer cover the unions. TypeScript will point at all four. Extend them:

```ts
const STATUS_COLOR: Record<ReservationStatus, string> = {
  Pending: "#F59E0B",
  Confirmed: "#0D6EFD",
  Arrived: "#6366F1",
  Seated: "#22C55E",
  Completed: "#a9a9b2",
  "No-show": "#EF4444",
  Cancelled: "#9ca3af",
};

const STATUS_TONE: Record<ReservationStatus, "success" | "error" | "warning" | "info" | "neutral"> = {
  Pending: "warning",
  Confirmed: "info",
  Arrived: "info",
  Seated: "success",
  Completed: "neutral",
  "No-show": "error",
  Cancelled: "neutral",
};

const STATUS_KEY: Record<ReservationStatus, string> = {
  Pending: "status.pending",
  Confirmed: "status.confirmed",
  Arrived: "status.arrived",
  Seated: "status.seated",
  Completed: "status.completed",
  "No-show": "status.noShow",
  Cancelled: "status.cancelled",
};

const SOURCE_KEY: Record<ReservationSource, string> = {
  "Direct Booking": "reservations.source.directBooking",
  Website: "reservations.source.website",
  "Walk In": "reservations.source.walkIn",
  Phone: "reservations.source.phone",
  Instagram: "reservations.source.instagram",
};
```

Also fix `calendar/index.tsx:222` — the hardcoded `source: "Phone"` on the new-reservation draft stays valid, but the draft object now needs `ref` and `area` too. Give it `ref: "RSV-NEW"` and `area: "Main Dining"`.

- [ ] **Step 6: Add the i18n keys this task needs**

In **both** dictionaries, add `status.arrived`, `reservations.source.directBooking`, `reservations.source.instagram`, and change `reservations.source.walkIn`'s value. Delete `reservations.source.mobileApp` and `reservations.source.aggregator` — nothing references them once the calendar map is rewritten.

`en`:
```ts
  "status.arrived": "Arrived",
  "reservations.source.directBooking": "Direct Booking",
  "reservations.source.instagram": "Instagram",
  "reservations.source.walkIn": "Walk In",
```
`ar`:
```ts
  "status.arrived": "وصل",
  "reservations.source.directBooking": "حجز مباشر",
  "reservations.source.instagram": "إنستغرام",
  "reservations.source.walkIn": "زيارة مباشرة",
```

- [ ] **Step 7: Run the tests and the type-checker**

Run: `cd apps/merchant && npx vitest run && npx tsc -b --noEmit`
Expected: all green. The i18n key test passes; the calendar compiles.

- [ ] **Step 8: Commit**

```bash
git add apps/merchant/src/shared/api/mock-reservations.ts \
        apps/merchant/src/shared/api/mock-reservations.test.ts \
        apps/merchant/src/pages/reservations/calendar/index.tsx \
        packages/i18n/src/locales
git commit -m "feat(reservations): carry deposits and payment links in the fixture"
```

---

### Task 2: The model

Every decision the page makes lives here, so it can be tested without a DOM.

**Files:**
- Create: `apps/merchant/src/pages/reservations/_shared/model.ts`
- Test: `apps/merchant/src/pages/reservations/_shared/model.test.ts`

**Interfaces:**
- Consumes: `Reservation`, `ReservationStatus`, `DepositState` from Task 1.
- Produces:
  ```ts
  type DisplayState = ReservationStatus | "Link Sent" | "Expired" | "Failed" | "Refunded";
  type SortKey = "time-asc" | "time-desc" | "party" | "status";
  type DayFilter = "today" | "tomorrow" | "date";
  interface ListFilters { day: DayFilter; date: string; status: string; area: string; source: string; query: string; sort: SortKey }
  interface Kpis { total: number; confirmed: number; pending: number; cancelled: number; noShow: number;
                   confirmedPct: number; pendingPct: number; cancelledPct: number; noShowPct: number }
  interface RefundPolicy { minutesToEvent: number; tier: "full" | "partial" | "none" }

  displayState(r: Reservation): DisplayState
  isPaid(r: Reservation): boolean | null      // null = no deposit required
  clock12(startMinutes: number): string       // 1140 -> "7:00 PM"
  dayLabel(date: string): "today" | "tomorrow" | "other"
  visibleRows(rows: readonly Reservation[], f: ListFilters): Reservation[]
  deriveKpis(rows: readonly Reservation[]): Kpis
  refundPolicy(r: Reservation, nowMinutes: number): RefundPolicy
  EMPTY_FILTERS: ListFilters
  NOW_MINUTES: 870            // the module's fixed "now", 14:30 — matches the calendar's mock clock
  ```

- [ ] **Step 1: Write the failing test**

Create `_shared/model.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { reservations, TODAY, type Reservation } from "@/shared/api/mock-reservations";
import { clock12, deriveKpis, displayState, EMPTY_FILTERS, isPaid, refundPolicy, visibleRows } from "./model";

function row(over: Partial<Reservation> = {}): Reservation {
  return {
    id: "x", date: TODAY, startMinutes: 19 * 60, durationMinutes: 90,
    ref: "RSV-9000", guest: "Reem Al-Subaie", phone: "+966510002877",
    partySize: 2, area: "Main Dining", table: "T-12", branch: "Riyadh - Olaya",
    source: "Direct Booking", status: "Confirmed", ...over,
  };
}

describe("displayState", () => {
  it("shows the reservation status when the deposit is quiet", () => {
    expect(displayState(row({ status: "Seated" }))).toBe("Seated");
    expect(displayState(row({ status: "Pending", deposit: { amount: 200, currency: "SAR", type: "Pre Reservation", state: "unpaid" } }))).toBe("Pending");
    expect(displayState(row({ status: "Confirmed", deposit: { amount: 200, currency: "SAR", type: "Pre Reservation", state: "paid" } }))).toBe("Confirmed");
  });

  it("lets four payment states take over the pill", () => {
    const at = (state: "link-sent" | "expired" | "failed" | "refunded") =>
      displayState(row({ status: "Confirmed", deposit: { amount: 200, currency: "SAR", type: "Pre Reservation", state } }));
    expect(at("link-sent")).toBe("Link Sent");
    expect(at("expired")).toBe("Expired");
    expect(at("failed")).toBe("Failed");
    expect(at("refunded")).toBe("Refunded");
  });

  it("never lets a payment state hide a cancellation", () => {
    expect(displayState(row({ status: "Cancelled", deposit: { amount: 200, currency: "SAR", type: "Pre Reservation", state: "refunded" } }))).toBe("Cancelled");
  });
});

describe("isPaid", () => {
  it("is null when no deposit is required", () => {
    expect(isPaid(row())).toBeNull();
  });
  it("is true only once the money landed", () => {
    expect(isPaid(row({ deposit: { amount: 1, currency: "SAR", type: "Pre Reservation", state: "paid" } }))).toBe(true);
    expect(isPaid(row({ deposit: { amount: 1, currency: "SAR", type: "Pre Reservation", state: "link-sent" } }))).toBe(false);
  });
});

describe("clock12", () => {
  it("formats the frame's times", () => {
    expect(clock12(19 * 60)).toBe("7:00 PM");
    expect(clock12(19 * 60 + 30)).toBe("7:30 PM");
    expect(clock12(23 * 60)).toBe("11:00 PM");
    expect(clock12(12 * 60)).toBe("12:00 PM");
  });
  it("wraps a past-midnight slot back onto the clock", () => {
    expect(clock12(25 * 60)).toBe("1:00 AM");
  });
});

describe("visibleRows", () => {
  const today = reservations.filter((r) => r.date === TODAY);

  it("shows today by default", () => {
    expect(visibleRows(reservations, EMPTY_FILTERS)).toHaveLength(today.length);
  });

  it("narrows by status", () => {
    const out = visibleRows(reservations, { ...EMPTY_FILTERS, status: "Cancelled" });
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((r) => r.status === "Cancelled")).toBe(true);
  });

  it("matches a search against name, phone and ref", () => {
    const target = today[0];
    expect(visibleRows(reservations, { ...EMPTY_FILTERS, query: target.ref }).map((r) => r.id)).toContain(target.id);
    expect(visibleRows(reservations, { ...EMPTY_FILTERS, query: target.guest.slice(0, 4) }).map((r) => r.id)).toContain(target.id);
  });

  it("sorts earliest first by default and latest first on demand", () => {
    const asc = visibleRows(reservations, EMPTY_FILTERS);
    const desc = visibleRows(reservations, { ...EMPTY_FILTERS, sort: "time-desc" });
    expect(asc[0].startMinutes).toBeLessThanOrEqual(asc[asc.length - 1].startMinutes);
    expect(desc[0].startMinutes).toBe(asc[asc.length - 1].startMinutes);
  });
});

describe("deriveKpis", () => {
  it("counts from the rows it is given, not the whole fixture", () => {
    const k = deriveKpis([row({ status: "Confirmed" }), row({ status: "Pending" }), row({ status: "Cancelled" }), row({ status: "No-show" })]);
    expect(k).toMatchObject({ total: 4, confirmed: 1, pending: 1, cancelled: 1, noShow: 1 });
  });

  it("reports each slice as a percentage of the total", () => {
    const k = deriveKpis([row({ status: "Confirmed" }), row({ status: "Confirmed" }), row({ status: "Pending" }), row({ status: "Pending" })]);
    expect(k.confirmedPct).toBe(50);
    expect(k.pendingPct).toBe(50);
  });

  it("does not divide by zero on an empty day", () => {
    expect(deriveKpis([])).toMatchObject({ total: 0, confirmedPct: 0 });
  });
});

describe("refundPolicy", () => {
  const r = row({ startMinutes: 19 * 60 });
  it("refunds in full more than six hours out", () => {
    expect(refundPolicy(r, 12 * 60).tier).toBe("full");
  });
  it("refunds half inside six hours", () => {
    expect(refundPolicy(r, 16 * 60).tier).toBe("partial");
  });
  it("refunds nothing once the slot has started", () => {
    expect(refundPolicy(r, 19 * 60 + 1).tier).toBe("none");
  });
  it("reports the gap in minutes", () => {
    expect(refundPolicy(r, 12 * 60).minutesToEvent).toBe(420);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd apps/merchant && npx vitest run src/pages/reservations/_shared/model.test.ts`
Expected: FAIL — `./model` does not resolve.

- [ ] **Step 3: Write `model.ts`**

Write the module so the tests pass. Non-obvious points the tests pin down:

- `displayState` checks `status === "Cancelled"` **first** — a refunded cancellation must still read "Cancelled".
- `clock12` takes `startMinutes % (24 * 60)` before formatting, so a past-midnight `25 * 60` reads `1:00 AM`; hour `0` renders as `12`.
- `deriveKpis` guards `total === 0` and rounds percentages to two decimals (`Math.round(x * 100) / 100`) — the frames read `66.46%`.
- `refundPolicy` compares `startMinutes - nowMinutes`: `> 360` full, `> 0` partial, else none.
- `visibleRows` applies day → status → area → source → query, then sorts. `"status"` sort orders by the seven-status order, not alphabetically.
- `EMPTY_FILTERS` is `{ day: "today", date: TODAY, status: "", area: "", source: "", query: "", sort: "time-asc" }`.

- [ ] **Step 4: Run the tests**

Run: `cd apps/merchant && npx vitest run src/pages/reservations/_shared/model.test.ts`
Expected: PASS, all cases.

- [ ] **Step 5: Commit**

```bash
git add apps/merchant/src/pages/reservations/_shared/model.ts \
        apps/merchant/src/pages/reservations/_shared/model.test.ts
git commit -m "feat(reservations): model the status merge, filters, KPIs and refund policy"
```

---

### Task 3: The dictionary

Adding all keys up front means no later task has to touch two locale files.

**Files:**
- Modify: `packages/i18n/src/locales/en/index.ts`, `packages/i18n/src/locales/ar/index.ts`
- Test: `apps/merchant/src/shared/i18n/keys.test.ts` (existing — must keep passing)

**Interfaces:**
- Produces: the `reservations.list.*`, `reservations.state.*`, `reservations.form.*`, `reservations.detail.*`, `reservations.cancel.*` namespaces.

- [ ] **Step 1: Delete the hub's keys**

The hub page goes away in Task 8. Remove these eleven from **both** dictionaries: `reservations.hub.scheduleTitle`, `.scheduleEmpty`, `.quickTitle`, `.quick.calendar`, `.quick.calendarDesc`, `.quick.floorPlan`, `.quick.floorPlanDesc`, `.quick.waitlist`, `.quick.waitlistDesc`, `.quick.events`, `.quick.eventsDesc`.

- [ ] **Step 2: Repoint the page subtitle**

Change `reservations.subtitle` in place — en: `"Manage all table reservations in one place."`, ar: `"أدر كل حجوزات الطاولات من مكان واحد."`

- [ ] **Step 3: Add the list keys**

`en`:
```ts
  "reservations.list.print": "Print Reservations",
  "reservations.list.addNew": "Add New Reservation",
  "reservations.list.kpi.today": "Today's Reservations",
  "reservations.list.kpi.confirmed": "Confirmed",
  "reservations.list.kpi.pending": "Pending",
  "reservations.list.kpi.cancelled": "Cancelled",
  "reservations.list.kpi.noShow": "No Show",
  "reservations.list.kpi.vsYesterday": "vs Yesterday",
  "reservations.list.filter.today": "Today",
  "reservations.list.filter.tomorrow": "Tomorrow",
  "reservations.list.filter.allStatus": "All Status",
  "reservations.list.filter.allAreas": "All Areas",
  "reservations.list.filter.allSources": "All Sources",
  "reservations.list.filter.more": "More Filters",
  "reservations.list.allCount": "All Reservations({n})",
  "reservations.list.sortedBy": "Sorted By",
  "reservations.list.sort.timeEarliest": "Time (Earliest)",
  "reservations.list.sort.timeLatest": "Time (Latest)",
  "reservations.list.sort.partySize": "Party Size",
  "reservations.list.sort.status": "Status",
  "reservations.list.empty": "No reservations match these filters.",
  "reservations.list.row.ref": "Ref: #{ref}",
  "reservations.list.row.guests": "{n} Guests",
  "reservations.list.row.guestOne": "1 Guest",
  "reservations.list.row.deposit": "Deposit: {amount}",
  "reservations.list.row.paid": "PAID",
  "reservations.list.row.unpaid": "UNPAID",
  "reservations.list.row.cancelledOn": "Cancelled {when}",
  "reservations.list.row.edit": "Edit",
  "reservations.list.row.status": "Status",
  "reservations.list.row.whatsapp": "WhatsApp",
  "reservations.list.row.call": "Call",
  "reservations.list.row.email": "Email",
  "reservations.list.row.more": "More actions",
  "reservations.list.actions.duplicate": "Duplicate",
  "reservations.list.actions.addNote": "Add Note",
  "reservations.list.actions.sendReminder": "Send Reminder",
  "reservations.list.actions.viewLogs": "View Logs",
  "reservations.list.actions.exportCalendar": "Export To Calendar",
  "reservations.list.actions.sharePaymentLink": "Share Payment Link",
  "reservations.list.actions.cancel": "Cancel",
  "reservations.list.actions.noBackend": "Needs a backend — not wired yet",
  "reservations.state.pending": "Pending",
  "reservations.state.confirmed": "Confirmed",
  "reservations.state.arrived": "Arrived",
  "reservations.state.seated": "Seated",
  "reservations.state.completed": "Completed",
  "reservations.state.noShow": "No Show",
  "reservations.state.cancelled": "Cancelled",
  "reservations.state.linkSent": "Link Sent",
  "reservations.state.expired": "Expired",
  "reservations.state.failed": "Failed",
  "reservations.state.refunded": "Refunded",
```

`ar`:
```ts
  "reservations.list.print": "طباعة الحجوزات",
  "reservations.list.addNew": "إضافة حجز جديد",
  "reservations.list.kpi.today": "حجوزات اليوم",
  "reservations.list.kpi.confirmed": "مؤكدة",
  "reservations.list.kpi.pending": "قيد الانتظار",
  "reservations.list.kpi.cancelled": "ملغاة",
  "reservations.list.kpi.noShow": "لم يحضر",
  "reservations.list.kpi.vsYesterday": "مقارنة بالأمس",
  "reservations.list.filter.today": "اليوم",
  "reservations.list.filter.tomorrow": "غدًا",
  "reservations.list.filter.allStatus": "كل الحالات",
  "reservations.list.filter.allAreas": "كل المناطق",
  "reservations.list.filter.allSources": "كل المصادر",
  "reservations.list.filter.more": "فلاتر إضافية",
  "reservations.list.allCount": "كل الحجوزات({n})",
  "reservations.list.sortedBy": "الترتيب حسب",
  "reservations.list.sort.timeEarliest": "الوقت (الأقرب)",
  "reservations.list.sort.timeLatest": "الوقت (الأبعد)",
  "reservations.list.sort.partySize": "عدد الضيوف",
  "reservations.list.sort.status": "الحالة",
  "reservations.list.empty": "لا توجد حجوزات تطابق هذه الفلاتر.",
  "reservations.list.row.ref": "المرجع: #{ref}",
  "reservations.list.row.guests": "{n} ضيوف",
  "reservations.list.row.guestOne": "ضيف واحد",
  "reservations.list.row.deposit": "العربون: {amount}",
  "reservations.list.row.paid": "مدفوع",
  "reservations.list.row.unpaid": "غير مدفوع",
  "reservations.list.row.cancelledOn": "أُلغي {when}",
  "reservations.list.row.edit": "تعديل",
  "reservations.list.row.status": "الحالة",
  "reservations.list.row.whatsapp": "واتساب",
  "reservations.list.row.call": "اتصال",
  "reservations.list.row.email": "بريد",
  "reservations.list.row.more": "إجراءات أخرى",
  "reservations.list.actions.duplicate": "تكرار",
  "reservations.list.actions.addNote": "إضافة ملاحظة",
  "reservations.list.actions.sendReminder": "إرسال تذكير",
  "reservations.list.actions.viewLogs": "عرض السجل",
  "reservations.list.actions.exportCalendar": "تصدير إلى التقويم",
  "reservations.list.actions.sharePaymentLink": "مشاركة رابط الدفع",
  "reservations.list.actions.cancel": "إلغاء",
  "reservations.list.actions.noBackend": "يحتاج ربطًا بالخادم — غير مفعّل بعد",
  "reservations.state.pending": "قيد الانتظار",
  "reservations.state.confirmed": "مؤكد",
  "reservations.state.arrived": "وصل",
  "reservations.state.seated": "جالس",
  "reservations.state.completed": "مكتمل",
  "reservations.state.noShow": "لم يحضر",
  "reservations.state.cancelled": "ملغي",
  "reservations.state.linkSent": "أُرسل الرابط",
  "reservations.state.expired": "منتهي",
  "reservations.state.failed": "فشل",
  "reservations.state.refunded": "مُسترد",
```

- [ ] **Step 4: Add the form keys**

`en`:
```ts
  "reservations.form.addTitle": "Guest Reservation",
  "reservations.form.editTitle": "Edit Guest Reservation",
  "reservations.form.tab.details": "Reservation Details",
  "reservations.form.tab.guest": "Guest Details",
  "reservations.form.tab.notes": "Notes & Preferences",
  "reservations.form.date": "Date",
  "reservations.form.time": "Time",
  "reservations.form.partySize": "Party Size",
  "reservations.form.duration": "Duration (Estimated)",
  "reservations.form.durationHours": "{n} Hours",
  "reservations.form.areaPreference": "Area Preference",
  "reservations.form.tablePreference": "Table Preference",
  "reservations.form.tableAny": "Any Available",
  "reservations.form.source": "Source",
  "reservations.form.reference": "Reservation Reference",
  "reservations.form.deposit": "Deposit/ Payment",
  "reservations.form.depositAmount": "Deposit Amount",
  "reservations.form.depositType": "Deposit Type",
  "reservations.form.depositStatus": "Deposit Status",
  "reservations.form.depositType.preReservation": "Pre Reservation",
  "reservations.form.depositType.perGuest": "Per Guest",
  "reservations.form.depositType.fullPrepayment": "Full Prepayment",
  "reservations.form.tag": "Tag",
  "reservations.form.optional": "(Optional)",
  "reservations.form.addTag": "Add Tag",
  "reservations.form.sendLinkWith": "Send Payment Link with",
  "reservations.form.notifyGuest": "Notify Guest",
  "reservations.form.notifyAboutChanges": "Notify guest about changes",
  "reservations.form.paidOn": "Paid on {when}",
  "reservations.form.viewPayment": "View Payment",
  "reservations.form.firstName": "First Name",
  "reservations.form.lastName": "Last Name",
  "reservations.form.firstNamePlaceholder": "Enter guest first name",
  "reservations.form.lastNamePlaceholder": "Enter guest last name",
  "reservations.form.phone": "Phone Number",
  "reservations.form.email": "Email",
  "reservations.form.emailPlaceholder": "Enter guest email",
  "reservations.form.note": "Note",
  "reservations.form.noteSub": "Special Request",
  "reservations.form.notePlaceholder": "Type guest note",
  "reservations.form.linkNotice": "A payment link will be sent to the guest after saving this reservation.",
  "reservations.form.saveAsPending": "Save As Pending",
  "reservations.form.createAndSend": "Create & Send Confirmation",
  "reservations.form.saveChanges": "Save Changes",
  "reservations.form.cancelReservation": "Cancel Reservation",
```

`ar`:
```ts
  "reservations.form.addTitle": "حجز ضيف",
  "reservations.form.editTitle": "تعديل حجز الضيف",
  "reservations.form.tab.details": "تفاصيل الحجز",
  "reservations.form.tab.guest": "بيانات الضيف",
  "reservations.form.tab.notes": "الملاحظات والتفضيلات",
  "reservations.form.date": "التاريخ",
  "reservations.form.time": "الوقت",
  "reservations.form.partySize": "عدد الضيوف",
  "reservations.form.duration": "المدة (تقديرية)",
  "reservations.form.durationHours": "{n} ساعات",
  "reservations.form.areaPreference": "المنطقة المفضلة",
  "reservations.form.tablePreference": "الطاولة المفضلة",
  "reservations.form.tableAny": "أي طاولة متاحة",
  "reservations.form.source": "المصدر",
  "reservations.form.reference": "مرجع الحجز",
  "reservations.form.deposit": "العربون/ الدفع",
  "reservations.form.depositAmount": "قيمة العربون",
  "reservations.form.depositType": "نوع العربون",
  "reservations.form.depositStatus": "حالة العربون",
  "reservations.form.depositType.preReservation": "قبل الحجز",
  "reservations.form.depositType.perGuest": "لكل ضيف",
  "reservations.form.depositType.fullPrepayment": "دفع كامل مقدمًا",
  "reservations.form.tag": "وسم",
  "reservations.form.optional": "(اختياري)",
  "reservations.form.addTag": "إضافة وسم",
  "reservations.form.sendLinkWith": "أرسل رابط الدفع عبر",
  "reservations.form.notifyGuest": "إشعار الضيف",
  "reservations.form.notifyAboutChanges": "أبلغ الضيف بالتعديلات",
  "reservations.form.paidOn": "دُفع في {when}",
  "reservations.form.viewPayment": "عرض الدفعة",
  "reservations.form.firstName": "الاسم الأول",
  "reservations.form.lastName": "اسم العائلة",
  "reservations.form.firstNamePlaceholder": "اكتب اسم الضيف الأول",
  "reservations.form.lastNamePlaceholder": "اكتب اسم عائلة الضيف",
  "reservations.form.phone": "رقم الجوال",
  "reservations.form.email": "البريد الإلكتروني",
  "reservations.form.emailPlaceholder": "اكتب بريد الضيف",
  "reservations.form.note": "ملاحظة",
  "reservations.form.noteSub": "طلب خاص",
  "reservations.form.notePlaceholder": "اكتب ملاحظة الضيف",
  "reservations.form.linkNotice": "سيُرسل رابط الدفع للضيف بعد حفظ هذا الحجز.",
  "reservations.form.saveAsPending": "حفظ كقيد الانتظار",
  "reservations.form.createAndSend": "إنشاء وإرسال التأكيد",
  "reservations.form.saveChanges": "حفظ التعديلات",
  "reservations.form.cancelReservation": "إلغاء الحجز",
```

- [ ] **Step 5: Add the detail keys**

`en`:
```ts
  "reservations.detail.title": "Reservation #{ref}",
  "reservations.detail.state.confirmed": "Confirmed",
  "reservations.detail.state.pending": "Pending (Deposit Required)",
  "reservations.detail.state.linkSent": "Payment Link Sent",
  "reservations.detail.state.paid": "Deposit Paid",
  "reservations.detail.state.failed": "Deposit Failed",
  "reservations.detail.state.expired": "Expired Payment Link",
  "reservations.detail.state.paymentCancelled": "Payment Cancelled",
  "reservations.detail.confirmedPanel": "Reservation Confirmed",
  "reservations.detail.confirmedOn": "Confirmed On:",
  "reservations.detail.confirmedMethod": "Confirmed Method:",
  "reservations.detail.depositInfo": "Deposit Information",
  "reservations.detail.required": "(Required)",
  "reservations.detail.status": "Status:",
  "reservations.detail.depositAmount": "Deposit Amount:",
  "reservations.detail.dueBy": "Due By:",
  "reservations.detail.autoConfirmNote": "Reservation will be automatically confirmed when deposit paid.",
  "reservations.detail.linkPanel": "Payment Link Sent",
  "reservations.detail.copyLink": "Copy link",
  "reservations.detail.copied": "Copied",
  "reservations.detail.sentVia": "Sent Via:",
  "reservations.detail.sentTo": "Sent To:",
  "reservations.detail.sentOn": "Sent On:",
  "reservations.detail.expireOn": "Expire On:",
  "reservations.detail.paymentSuccessful": "Payment Successful",
  "reservations.detail.paidAmount": "Paid Amount:",
  "reservations.detail.paidOn": "Paid On:",
  "reservations.detail.paymentMethod": "Payment Method:",
  "reservations.detail.transactionId": "Transaction ID:",
  "reservations.detail.noAmountCaptured": "No amount captured",
  "reservations.detail.linkNoLongerValid": "Link no longer valid",
  "reservations.detail.guestCancelledPayment": "Guest canceled the payment",
  "reservations.detail.sendMessage": "Send Message",
  "reservations.detail.editReservation": "Edit Reservation",
  "reservations.detail.shareLink": "Share Link",
  "reservations.detail.resendLink": "Resend Link",
  "reservations.detail.downloadReceipt": "Download Receipt",
  "reservations.detail.notifyGuest": "Notify guest",
  "reservations.detail.resendNewLink": "Resend New Payment Link",
  "reservations.detail.cancelReservation": "Cancel Reservation",
```

`ar`:
```ts
  "reservations.detail.title": "حجز #{ref}",
  "reservations.detail.state.confirmed": "مؤكد",
  "reservations.detail.state.pending": "قيد الانتظار (العربون مطلوب)",
  "reservations.detail.state.linkSent": "أُرسل رابط الدفع",
  "reservations.detail.state.paid": "العربون مدفوع",
  "reservations.detail.state.failed": "فشل دفع العربون",
  "reservations.detail.state.expired": "انتهت صلاحية رابط الدفع",
  "reservations.detail.state.paymentCancelled": "أُلغيت الدفعة",
  "reservations.detail.confirmedPanel": "تم تأكيد الحجز",
  "reservations.detail.confirmedOn": "تاريخ التأكيد:",
  "reservations.detail.confirmedMethod": "طريقة التأكيد:",
  "reservations.detail.depositInfo": "بيانات العربون",
  "reservations.detail.required": "(مطلوب)",
  "reservations.detail.status": "الحالة:",
  "reservations.detail.depositAmount": "قيمة العربون:",
  "reservations.detail.dueBy": "الاستحقاق:",
  "reservations.detail.autoConfirmNote": "سيتم تأكيد الحجز تلقائيًا عند دفع العربون.",
  "reservations.detail.linkPanel": "أُرسل رابط الدفع",
  "reservations.detail.copyLink": "نسخ الرابط",
  "reservations.detail.copied": "تم النسخ",
  "reservations.detail.sentVia": "أُرسل عبر:",
  "reservations.detail.sentTo": "أُرسل إلى:",
  "reservations.detail.sentOn": "تاريخ الإرسال:",
  "reservations.detail.expireOn": "ينتهي في:",
  "reservations.detail.paymentSuccessful": "تمت الدفعة بنجاح",
  "reservations.detail.paidAmount": "المبلغ المدفوع:",
  "reservations.detail.paidOn": "تاريخ الدفع:",
  "reservations.detail.paymentMethod": "طريقة الدفع:",
  "reservations.detail.transactionId": "رقم العملية:",
  "reservations.detail.noAmountCaptured": "لم يُحصّل أي مبلغ",
  "reservations.detail.linkNoLongerValid": "الرابط لم يعد صالحًا",
  "reservations.detail.guestCancelledPayment": "ألغى الضيف الدفعة",
  "reservations.detail.sendMessage": "إرسال رسالة",
  "reservations.detail.editReservation": "تعديل الحجز",
  "reservations.detail.shareLink": "مشاركة الرابط",
  "reservations.detail.resendLink": "إعادة إرسال الرابط",
  "reservations.detail.downloadReceipt": "تحميل الإيصال",
  "reservations.detail.notifyGuest": "إشعار الضيف",
  "reservations.detail.resendNewLink": "إرسال رابط دفع جديد",
  "reservations.detail.cancelReservation": "إلغاء الحجز",
```

- [ ] **Step 6: Add the cancel keys**

`en`:
```ts
  "reservations.cancel.title": "Cancel Reservation #{ref}",
  "reservations.cancel.actionType": "Action Type",
  "reservations.cancel.reason": "Reason",
  "reservations.cancel.note": "Note",
  "reservations.cancel.noteOption": "(Option)",
  "reservations.cancel.notePlaceholder": "Guest called to reschedule for another day.",
  "reservations.cancel.action.byGuest": "Cancel by guest",
  "reservations.cancel.action.byRestaurant": "Cancel by restaurant",
  "reservations.cancel.action.noShow": "Mark as no show",
  "reservations.cancel.reason.changeOfPlans": "Change of plans",
  "reservations.cancel.reason.doubleBooking": "Double booking",
  "reservations.cancel.reason.weather": "Weather",
  "reservations.cancel.reason.other": "Other",
  "reservations.cancel.policyPreview": "Policy Preview",
  "reservations.cancel.timeToEvent": "Time to event:",
  "reservations.cancel.policy": "Policy:",
  "reservations.cancel.deposit": "Deposit:",
  "reservations.cancel.result": "Result:",
  "reservations.cancel.policyFull": "More than 6h before - Full Refund",
  "reservations.cancel.policyPartial": "Less than 6h before - 50% Refund",
  "reservations.cancel.policyNone": "After start time - No Refund",
  "reservations.cancel.resultFull": "Full Refund",
  "reservations.cancel.resultPartial": "Partial Refund",
  "reservations.cancel.resultNone": "No Refund",
  "reservations.cancel.perReservation": "(Per Reservation)",
  "reservations.cancel.hoursMinutes": "{h}h {m}m",
  "reservations.cancel.confirm": "Confirm Cancellation",
```

`ar`:
```ts
  "reservations.cancel.title": "إلغاء الحجز #{ref}",
  "reservations.cancel.actionType": "نوع الإجراء",
  "reservations.cancel.reason": "السبب",
  "reservations.cancel.note": "ملاحظة",
  "reservations.cancel.noteOption": "(اختياري)",
  "reservations.cancel.notePlaceholder": "اتصل الضيف لتغيير الموعد ليوم آخر.",
  "reservations.cancel.action.byGuest": "إلغاء من الضيف",
  "reservations.cancel.action.byRestaurant": "إلغاء من المطعم",
  "reservations.cancel.action.noShow": "تسجيل عدم حضور",
  "reservations.cancel.reason.changeOfPlans": "تغيّرت الخطط",
  "reservations.cancel.reason.doubleBooking": "حجز مزدوج",
  "reservations.cancel.reason.weather": "الطقس",
  "reservations.cancel.reason.other": "أخرى",
  "reservations.cancel.policyPreview": "معاينة السياسة",
  "reservations.cancel.timeToEvent": "الوقت المتبقي:",
  "reservations.cancel.policy": "السياسة:",
  "reservations.cancel.deposit": "العربون:",
  "reservations.cancel.result": "النتيجة:",
  "reservations.cancel.policyFull": "قبل أكثر من 6 ساعات - استرداد كامل",
  "reservations.cancel.policyPartial": "قبل أقل من 6 ساعات - استرداد 50%",
  "reservations.cancel.policyNone": "بعد موعد البدء - بدون استرداد",
  "reservations.cancel.resultFull": "استرداد كامل",
  "reservations.cancel.resultPartial": "استرداد جزئي",
  "reservations.cancel.resultNone": "بدون استرداد",
  "reservations.cancel.perReservation": "(لكل حجز)",
  "reservations.cancel.hoursMinutes": "{h}س {m}د",
  "reservations.cancel.confirm": "تأكيد الإلغاء",
```

- [ ] **Step 7: Run the key test**

Run: `cd apps/merchant && npx vitest run src/shared/i18n/keys.test.ts`
Expected: PASS — both dictionaries hold identical key sets.

- [ ] **Step 8: Commit**

```bash
git add packages/i18n/src/locales
git commit -m "i18n(reservations): add the list, form, detail and cancel namespaces"
```

---

### Task 4: Row atoms — avatar, pill, KPI cards

Frame: `Reservations.png`.

**Files:**
- Create: `_shared/guest-avatar.tsx`, `_shared/status-pill.tsx`, `_shared/kpi-cards.tsx`

**Interfaces:**
- Consumes: `displayState`, `deriveKpis`, `Kpis` from `./model`.
- Produces:
  ```tsx
  <GuestAvatar name={string} size?={number} />                       // default size 28
  <StatusPill reservation={Reservation} />
  <KpiCards kpis={Kpis} />
  ```

- [ ] **Step 1: `guest-avatar.tsx`**

Initials from the first two words, uppercased. Background is a hash of the name into a fixed six-colour ring so the same guest is always the same colour and no `Math.random` appears. Round, `text-[11px] font-semibold text-white`, `shrink-0`.

- [ ] **Step 2: `status-pill.tsx`**

`displayState(reservation)` → a dot + label. One tone map, all eleven values:

```ts
const TONE: Record<DisplayState, { dot: string; text: string; bg: string }> = {
  Pending:     { dot: "#F59E0B", text: "text-[#B45309]", bg: "bg-[#F59E0B]/10" },
  Confirmed:   { dot: "#16A34A", text: "text-[#15803D]", bg: "bg-[#16A34A]/10" },
  Arrived:     { dot: "#0D6EFD", text: "text-[#0D6EFD]", bg: "bg-[#0D6EFD]/10" },
  Seated:      { dot: "#7C3AED", text: "text-[#6D28D9]", bg: "bg-[#7C3AED]/10" },
  Completed:   { dot: "#16A34A", text: "text-[#15803D]", bg: "bg-[#16A34A]/10" },
  "No-show":   { dot: "#8B5CF6", text: "text-[#7C3AED]", bg: "bg-[#8B5CF6]/10" },
  Cancelled:   { dot: "#EF4444", text: "text-[#DC2626]", bg: "bg-[#EF4444]/10" },
  "Link Sent": { dot: "#0D6EFD", text: "text-[#0D6EFD]", bg: "bg-[#0D6EFD]/10" },
  Expired:     { dot: "#9CA3AF", text: "text-[var(--octo-text-muted)]", bg: "bg-[var(--octo-track)]" },
  Failed:      { dot: "#F59E0B", text: "text-[#B45309]", bg: "bg-[#F59E0B]/10" },
  Refunded:    { dot: "#EF4444", text: "text-[#DC2626]", bg: "bg-[#EF4444]/10" },
};
```

Label comes from `reservations.state.*`. Shape: `inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium`.

- [ ] **Step 3: `kpi-cards.tsx`**

Five tinted cards in `grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5`. Each: a `rounded-[10px] h-9 w-9 grid place-items-center` icon tile in a solid brand colour with a white lucide icon, then the number at `text-[26px] font-bold leading-none`, the label at `text-[12px] text-[var(--octo-text-muted)]`, then the percentage line.

| Card | Card bg | Tile | Icon | Percent line |
| --- | --- | --- | --- | --- |
| Today's Reservations | `bg-[#0D6EFD]/[0.06]` | `#0D6EFD` | `Users` | green `3.46%` + muted `vs Yesterday` |
| Confirmed | `bg-[#16A34A]/[0.06]` | `#16A34A` | `CalendarCheck` | green `{confirmedPct}%` |
| Pending | `bg-[var(--octo-track)]` | `#475569` | `Timer` | muted `{pendingPct}%` |
| Cancelled | `bg-[#EF4444]/[0.06]` | `#DC2626` | `Hourglass` | red `{cancelledPct}%` |
| No Show | `bg-[#D97706]/[0.06]` | `#D97706` | `Clock` | amber `{noShowPct}%` |

The first card's `3.46% vs Yesterday` has no data behind it — hardcode the frame's figure and leave a comment saying it is a placeholder until a yesterday query exists. The other four percentages come from `kpis`.

- [ ] **Step 4: Type-check**

Run: `cd apps/merchant && npx tsc -b --noEmit`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add apps/merchant/src/pages/reservations/_shared
git commit -m "feat(reservations): add the avatar, status pill and KPI cards"
```

---

### Task 5: Filter bar

Frame: `Reservations.png`, the row under the KPI cards.

**Files:**
- Create: `_shared/filter-bar.tsx`

**Interfaces:**
- Consumes: `ListFilters` from `./model`.
- Produces: `<FilterBar filters={ListFilters} onChange={(next: ListFilters) => void} areas={readonly string[]} />`

- [ ] **Step 1: Build it**

One `flex flex-wrap items-center gap-2` row:

1. `Today` — pill button, `bg-[#0D6EFD] text-white` when `filters.day === "today"`, otherwise the outline style below. Leading `CalendarDays` icon.
2. `Tomorrow` — same, for `"tomorrow"`.
3. A native `<input type="date">` styled as a pill, showing `filters.date`; picking a date sets `day: "date"`.
4. Three `<Select>`s: All Status (the seven statuses), All Areas (from `areas`), All Sources (the five sources). Empty value = the "All …" option.
5. `More Filters` — `SlidersHorizontal` icon + chevron, **disabled** with `title={t("reservations.list.actions.noBackend")}`. The frame shows the control; there are no further filters behind it, so it must not pretend.

Outline pill style, shared: `inline-flex items-center gap-1.5 rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-[7px] text-[12px] text-[var(--octo-text-primary)] transition-colors hover:bg-[var(--octo-hover)]`.

- [ ] **Step 2: Type-check and commit**

Run: `cd apps/merchant && npx tsc -b --noEmit`

```bash
git add apps/merchant/src/pages/reservations/_shared/filter-bar.tsx
git commit -m "feat(reservations): add the day, status, area and source filter bar"
```

---

### Task 6: The two row menus

Frame: `Reservations-actions menu view.png`.

**Files:**
- Create: `_shared/use-dismiss.ts`, `_shared/status-menu.tsx`, `_shared/row-actions-menu.tsx`

**Interfaces:**
- Produces:
  ```ts
  useDismiss(open: boolean, close: () => void): React.RefObject<HTMLDivElement>
  ```
  ```tsx
  <StatusMenu value={ReservationStatus} onSelect={(s: ReservationStatus) => void} />
  <RowActionsMenu onDuplicate={() => void} onSharePaymentLink={() => void} onCancel={() => void} canShareLink={boolean} />
  ```

- [ ] **Step 1: `use-dismiss.ts`**

A hook returning a ref; while `open`, a `mousedown` listener closes on a click outside the ref'd element and a `keydown` listener closes on Escape. Both listeners are removed on cleanup and when `open` goes false. Both menus use it, so the "one menu at a time" behaviour comes free — opening either sets page state that closes the other.

- [ ] **Step 2: `status-menu.tsx`**

A trigger button reading `Status ⌄` in the outline pill style, and a `absolute z-20 mt-1 w-44 rounded-[10px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-1 shadow-lg` panel. Seven items in this order: Pending, Confirmed, Arrived, Seated, Completed, No Show, Cancelled. Each is a full-width button with a coloured dot, the `reservations.state.*` label, and a tinted background from the same `TONE` map Task 4 defined — export it from `status-pill.tsx` and import it here rather than writing it twice.

- [ ] **Step 3: `row-actions-menu.tsx`**

A `MoreVertical` trigger and a `w-52` panel in the same shell. Seven items in frame order:

| Item | Wired? |
| --- | --- |
| Duplicate | yes — `onDuplicate` |
| Add Note | disabled, `title` = `reservations.list.actions.noBackend` |
| Send Reminder | disabled, same |
| View Logs | disabled, same |
| Export To Calendar | disabled, same |
| Share Payment Link | `onSharePaymentLink`, disabled when `!canShareLink` |
| Cancel | yes — `onCancel`, `text-[#EF4444]`, separated by a `border-t border-[var(--octo-divider)]` |

- [ ] **Step 4: Type-check and commit**

```bash
git add apps/merchant/src/pages/reservations/_shared
git commit -m "feat(reservations): add the status and row-action menus"
```

---

### Task 7: The row

Frame: `Reservations.png`, and every row variant in `Reservations-actions menu view.png`.

**Files:**
- Create: `_shared/reservation-row.tsx`

**Interfaces:**
- Consumes: `GuestAvatar`, `StatusPill`, `StatusMenu`, `RowActionsMenu`, `clock12`, `dayLabel`, `isPaid`.
- Produces:
  ```tsx
  <ReservationRow
    reservation={Reservation}
    menu={"none" | "status" | "actions"}
    onOpenMenu={(m: "none" | "status" | "actions") => void}
    onOpen={() => void} onEdit={() => void}
    onStatus={(s: ReservationStatus) => void}
    onDuplicate={() => void} onSharePaymentLink={() => void} onCancel={() => void}
  />
  ```

`menu` and `onOpenMenu` are lifted to the page so only one row's menu is ever open.

- [ ] **Step 1: Build the row**

A `rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)]` card, `flex flex-wrap items-center`. Cells are separated by `border-s border-[var(--octo-divider)]` (logical, so RTL flips), each `px-3 py-2.5`:

1. **Time** — `clock12(startMinutes)` in `text-[15px] font-bold text-[#0D6EFD]`; under it `dayLabel(date)` → Today/Tomorrow/formatted date in `text-[11.5px] text-[var(--octo-text-muted)]`; under that `Ref: #{ref}` in `text-[11px] text-[var(--octo-text-faint)]`.
2. **Guest** — `<GuestAvatar>` + name `text-[12.5px] font-semibold` + phone `text-[11.5px] text-[var(--octo-text-muted)]`.
3. **Party** — `Users` icon + `{n} Guests` (use `guestOne` when `partySize === 1`).
4. **Seating** — a table glyph (`lucide` `Utensils`) + `area` above `table` .
5. **Source** — `Link2` icon + `source` above the channel line.
6. **Payment** — `<StatusPill>`; then, when a deposit exists, `Deposit: SAR {amount}` with a `PAID`/`UNPAID` chip (green `bg-[#16A34A]/10 text-[#15803D]` / grey `bg-[var(--octo-track)] text-[var(--octo-text-muted)]`). When `status === "Cancelled"`, show `Cancelled {cancelledAt}` instead of the deposit line, matching the frame.
7. **Edit** — outline button, `SquarePen` icon, `text-[#0D6EFD]`.
8. **Status ▾** — `<StatusMenu>`.
9. **Contact** — three stacked icon+label buttons: WhatsApp (green `#25D366`), Call (`#0D6EFD`), Email (muted). Each is an `<a>`: `https://wa.me/{digits}`, `tel:`, `mailto:`. Email is disabled when the guest has no `email`.
10. **⋮** — `<RowActionsMenu>`, `canShareLink={Boolean(reservation.paymentLink)}`.

Clicking cells 1–6 fires `onOpen`. Cells 7–10 stop propagation so a menu click never also opens the detail.

- [ ] **Step 2: Type-check and commit**

```bash
git add apps/merchant/src/pages/reservations/_shared/reservation-row.tsx
git commit -m "feat(reservations): add the reservation row"
```

---

### Task 8: The list page

Frame: `Reservations.png`. This is the task that deletes the hub.

**Files:**
- Rewrite: `apps/merchant/src/pages/reservations/index.tsx` (currently the hub, 171 lines)

**Interfaces:**
- Consumes: everything from Tasks 1–7.
- Produces: `ReservationsPage` — the same named export `app/routes/registry.tsx:23` already imports, so the route needs no change.

- [ ] **Step 1: Replace the page**

State: `rows` (from the fixture), `filters` (`EMPTY_FILTERS`), `openMenu` (`{ id, menu } | null`). Derive `visible = visibleRows(rows, filters)` and `kpis = deriveKpis(visible)` with `useMemo`.

Layout, top to bottom, inside the app's standard `px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5`:

1. Header — `h1` "Reservations", `p` the subtitle; on the right, `Print Reservations` (outline, `Printer` icon, calls `window.print()`) and `Add New Reservation` (primary blue, `Plus` icon).
2. `<KpiCards kpis={kpis} />`
3. `<FilterBar />`, with `areas` derived from the distinct `area` values in `rows`.
4. A toolbar row: `All Reservations({n})` on the left, a search `<Input icon={<Search/>}>` in the middle, `Sorted By` + a sort `<Select>` on the right.
5. `visible.map(...)` into `<ReservationRow>` in a `flex flex-col gap-2.5`, or `<EmptyState>` with `reservations.list.empty` when the list is empty.

`onStatus` sets the row's status, except `Cancelled` which opens the cancel dialog (wired in Task 12). `onDuplicate` inserts a copy directly after the original with a fresh `id` and the next `ref`.

- [ ] **Step 2: Verify against the frame**

Start the app (`cd apps/merchant && npm run dev`), open `/reservations`, and compare side by side with `Reservations.png`: five KPI cards, the filter row, the toolbar, the row anatomy. Check the dark theme too — the moon toggle in the top bar. Fix what does not match before moving on.

- [ ] **Step 3: Full check and commit**

Run: `cd apps/merchant && npm test && npx tsc -b --noEmit && npm run lint`

```bash
git add apps/merchant/src/pages/reservations/index.tsx
git commit -m "feat(reservations): replace the hub with the reservations list"
```

---

### Task 9: Add / Edit form

Frames: `Add Reservations-reservation details.png`, `Add Reservations-guest details.png`, `Add Reservations-notes.png`, `Edit Reservations.png`.

**Files:**
- Create: `modals/reservation-form-modal.tsx`

**Interfaces:**
- Produces:
  ```tsx
  <ReservationFormModal
    open={boolean} mode={"add" | "edit"}
    reservation={Reservation | null}          // required when mode === "edit"
    onClose={() => void}
    onSubmit={(draft: Reservation, intent: "pending" | "confirm") => void}
    onRequestCancel={() => void}              // edit mode's red button
  />
  ```

- [ ] **Step 1: Build the shell**

`<Modal className="max-w-[760px]">` with the title from `reservations.form.addTitle` / `.editTitle`, then `<Tabs>` with the three tabs, then the active panel, then a fixed notice bar and footer that are **identical across all three tabs** — the frames show them on every tab.

Notice bar: `rounded-[9px] bg-[#0D6EFD]/[0.06] px-3 py-2.5 text-[12px] text-[#0D6EFD]` with an `Info` icon and `reservations.form.linkNotice`. Render it only while the deposit toggle is on.

Footer:
- add mode — `Cancel` (grey) · `Save As Pending` (outline blue) · `Create & Send Confirmation` (primary, `Send` icon)
- edit mode — `Cancel` (grey) · `Cancel Reservation` (red-tinted, calls `onRequestCancel`) · `Save Changes` (primary)

- [ ] **Step 2: Tab 1 — Reservation Details**

Two-column `grid grid-cols-1 gap-4 sm:grid-cols-2`:
Date (date input) · Time (select, 30-min slots) · Party Size (select 1–20) · Duration (select 1–4 hours) · Area Preference (select) · Table Preference (select, first option `Any Available`).

Then **Source** as a radio row of five pills — `Direct Booking`, `Website`, `Walk In`, `Phone`, `Instagram`. Selected pill: `border-[#0D6EFD] text-[#0D6EFD]` with a filled radio dot. In edit mode the whole group is disabled and rendered as a single greyed read-only field, and a `Reservation Reference` input sits beside it showing `#{ref}`.

Then a `border-t border-[var(--octo-divider)] pt-4` block: `Deposit/ Payment` heading with a toggle switch on the right. When on:
- add mode — two columns: Deposit Amount (an input with a `SAR` prefix chip) and Deposit Type (select).
- edit mode — three columns: the same two plus Deposit Status (select rendered with the PAID/UNPAID chip styling), followed by a `Paid on {when}` bar with a `View Payment` button on the right (disabled, `noBackend` title).

Then `Tag (Optional)` — an `+ Add Tag` outline button plus a chip per tag with an `⊗` remove. Clicking `Add Tag` appends a chip from a small preset list (`Birthday`, `VIP`, `Anniversary`, `Allergy`) not already used; when all four are used the button disables.

Then `Send Payment Link with` — three checkbox pills, WhatsApp checked by default.

Edit mode additionally shows the `Note / Special Request` textarea here and a `Notify Guest (Optional)` row with the `Notify guest about changes` checkbox aligned right, per the frame.

- [ ] **Step 3: Tab 2 — Guest Details**

First Name* / Last Name* side by side, then Phone Number* as a single control: a `+966` prefix with a Saudi flag glyph in a bordered leading chip, then the number input. Then Email `(Optional)`. Required labels carry a red `*`.

- [ ] **Step 4: Tab 3 — Notes & Preferences**

`Note` heading with `Special Request` in muted weight beside it, then a `<Textarea rows={4}>` with the `notePlaceholder`.

- [ ] **Step 5: Validation**

`Create & Send Confirmation` is disabled until first name, last name, phone, date, time and party size are all filled — the frame shows it faded on tab 1 and solid on tab 2 for exactly this reason. `Save As Pending` needs only a name and phone.

- [ ] **Step 6: Verify against all four frames, then commit**

Open each frame beside the running app. Check tab switching keeps entered values.

```bash
git add apps/merchant/src/pages/reservations/modals/reservation-form-modal.tsx
git commit -m "feat(reservations): add the three-tab add and edit form"
```

---

### Task 10: Detail dialog — eight states

Frames: the seven `Reservation detailes-*.png` plus `…confirmed state (1).png`.

**Files:**
- Create: `modals/reservation-detail-modal.tsx`

**Interfaces:**
- Produces:
  ```tsx
  <ReservationDetailModal
    open={boolean} reservation={Reservation | null}
    onClose={() => void} onEdit={() => void} onCancel={() => void}
    onResendLink={() => void} onShareLink={() => void}
  />
  ```

- [ ] **Step 1: The shared frame**

`<Modal className="max-w-[620px]">`. Every state shows, in order:

1. Title `Reservation #{ref}`.
2. A full-width banner: `rounded-[9px] px-3.5 py-2.5 text-[13px] font-semibold` with a leading icon, tinted per the table below.
3. A guest card: `rounded-[9px] bg-[var(--octo-track)] px-3 py-2.5` holding `<GuestAvatar size={36}>`, the name, and the phone with a small WhatsApp glyph before it.
4. A meta row: `Users` `{n} Guests` · `Calendar` date · `Clock` time · table glyph `{area} - {table}`, `text-[12px] text-[var(--octo-text-secondary)]`, wrapping on narrow widths.
5. The state panel (below).
6. The footer.

- [ ] **Step 2: The state switch**

```ts
type DetailState = "confirmed" | "pending" | "link-sent" | "paid" | "failed" | "expired" | "payment-cancelled";
```
Derive it: `deposit.state` maps directly for `link-sent | paid | failed | expired`; `deposit.state === "cancelled"` → `payment-cancelled`; otherwise `status === "Confirmed"` → `confirmed`, else `pending`.

| State | Banner | Panel |
| --- | --- | --- |
| confirmed | green `bg-[#16A34A]/10 text-[#15803D]`, `CheckCircle2` | bordered card: `Reservation Confirmed` heading + `Confirmed On:` / `Confirmed Method:` rows |
| pending | amber `bg-[#F59E0B]/10 text-[#B45309]`, `AlertCircle` | bordered card: `Deposit Information` + `SAR {n} (Required)` right-aligned, then `Status:` (orange `UNPAID`), `Deposit Amount:`, `Due By:`; below the card, an amber note bar with `autoConfirmNote` |
| link-sent | violet `bg-[#7C3AED]/10 text-[#6D28D9]`, `AlertCircle` | bordered card: `Payment Link Sent`, then the url in a `bg-[#0D6EFD]/[0.06]` box with a `Copy` button, then `Sent Via:` / `Sent To:` / `Sent On:` / `Expire On:` |
| paid | green, `CheckCircle2` | bordered card: `Payment Successful`, then `Paid Amount:` / `Paid On:` / `Payment Method:` / `Transaction ID:` |
| failed | red `bg-[#EF4444]/10 text-[#DC2626]`, `AlertCircle` | a bordered box holding `No amount captured` in `text-[#DC2626]` |
| expired | grey `bg-[var(--octo-track)] text-[var(--octo-text-secondary)]`, `AlertCircle` | a bordered box holding `Link no longer valid` in `text-[#DC2626]` |
| payment-cancelled | red, `AlertCircle` | a bordered box holding `Guest canceled the payment` in `text-[#DC2626]` |

Detail rows are `flex items-center justify-between text-[12.5px]` — muted label left, `font-medium` value right.

- [ ] **Step 3: The footers**

| State | Footer |
| --- | --- |
| confirmed | `⋮` · `Send Message` (tinted blue) · `Edit Reservation` (primary, flex-1) |
| pending | `⋮` · `Edit Reservation` (tinted) · `Share Link` (primary, flex-1) |
| link-sent | `⋮` · `Edit Reservation` (tinted) · `Resend Link` (primary, flex-1) |
| paid | `⋮` · `Download Receipt` (tinted blue, full width, `FileDown` icon) |
| failed | `Cancel Reservation` (red-tinted) · `Notify guest` (tinted) · `Resend New Payment Link` (primary, flex-1) |
| expired | `Notify guest` (tinted) · `Resend New Payment Link` (primary, flex-1) |
| payment-cancelled | `Resend New Payment Link` (primary, full width) |

`⋮` opens a small menu with `Cancel Reservation`. `Download Receipt` and `Notify guest` have no backend — disable with the `noBackend` title.

- [ ] **Step 4: The Send Message popover**

Frame `…confirmed state (1).png`: clicking `Send Message` opens a panel **below** the button holding WhatsApp / Call / Email, each an icon + label row, each an `<a>` to the same targets the row uses. Dismiss with `useDismiss`.

- [ ] **Step 5: Copy-link feedback**

The copy button writes `paymentLink.url` with `navigator.clipboard.writeText` and swaps its label to `Copied` for two seconds. Wrap in a `try/catch` — clipboard access throws in some browser contexts, and a thrown error must not blank the dialog.

- [ ] **Step 6: Verify all eight frames, then commit**

Reach each state by clicking the fixture row that carries it (Task 1's table names which ref is which). Screenshot each against its frame.

```bash
git add apps/merchant/src/pages/reservations/modals/reservation-detail-modal.tsx
git commit -m "feat(reservations): add the eight-state reservation detail dialog"
```

---

### Task 11: Cancel dialog

Frame: `Reservation detailes-cancellation state.png`.

**Files:**
- Create: `modals/cancel-reservation-modal.tsx`

**Interfaces:**
- Consumes: `refundPolicy` from `./model`.
- Produces:
  ```tsx
  <CancelReservationModal
    open={boolean} reservation={Reservation | null}
    onClose={() => void}
    onConfirm={(reason: string, note: string) => void}
  />
  ```

- [ ] **Step 1: Build it**

`<Modal className="max-w-[620px]">`, title `Cancel Reservation #{ref}`. Then the same guest card and meta row the detail dialog uses — extract them into `_shared/guest-card.tsx` and `_shared/meta-row.tsx` in this task and have Task 10's component import them too, rather than keeping two copies.

Body: `Action Type *` and `Reason *` selects side by side, then `Note (Option)` textarea with the frame's placeholder.

- [ ] **Step 2: Policy preview**

A `rounded-[9px] bg-[#0D6EFD]/[0.04] px-3.5 py-3` box headed `Policy Preview` with an `Info` icon, holding four label/value rows:

- `Time to event:` — `refundPolicy(...).minutesToEvent` rendered through `reservations.cancel.hoursMinutes`.
- `Policy:` — the `policyFull` / `policyPartial` / `policyNone` string for the tier.
- `Deposit:` — `SAR {amount} (Per Reservation)`, or `—` when there is no deposit.
- `Result:` — a chip: green outline `Full Refund`, amber `Partial Refund`, grey `No Refund`.

Use `NOW_MINUTES` exported from `_shared/model.ts` as "now", so the preview is deterministic and matches the calendar's mock clock.

- [ ] **Step 3: Footer**

`Cancel` (grey, closes) · `Confirm Cancellation` (primary, `flex-1`), disabled until a reason is chosen.

- [ ] **Step 4: Verify against the frame and commit**

```bash
git add apps/merchant/src/pages/reservations/modals/cancel-reservation-modal.tsx \
        apps/merchant/src/pages/reservations/_shared/guest-card.tsx \
        apps/merchant/src/pages/reservations/_shared/meta-row.tsx \
        apps/merchant/src/pages/reservations/modals/reservation-detail-modal.tsx
git commit -m "feat(reservations): add the cancel dialog with its refund policy preview"
```

---

### Task 12: Wire it together and verify every frame

**Files:**
- Modify: `apps/merchant/src/pages/reservations/index.tsx`

- [ ] **Step 1: Hold the dialog state**

Add to the page: `formMode: "add" | "edit" | null`, `detailId: string | null`, `cancelId: string | null`. Only one is non-null at a time.

Transitions, all of which the frames imply:
- `Add New Reservation` → `formMode: "add"`.
- Row body click → `detailId`.
- Row `Edit`, or the detail dialog's `Edit Reservation` → `formMode: "edit"` with that row (closing the detail).
- Row `Status ▾ → Cancelled`, row `⋮ → Cancel`, the edit form's `Cancel Reservation`, or the detail dialog's `Cancel Reservation` → `cancelId`.
- Form submit → insert (add) or replace (edit) in `rows`, then close. `intent: "confirm"` sets `status: "Confirmed"`; `"pending"` sets `status: "Pending"`.
- Cancel confirm → set that row to `status: "Cancelled"` with `cancelledAt` and `cancelReason`, and set `deposit.state` to `refunded` when the policy tier is `full` or `partial`.
- `Share Link` / `Resend Link` → set `deposit.state: "link-sent"` and stamp a fresh `paymentLink`, so the dialog visibly moves to its link-sent state.

- [ ] **Step 2: Walk all fifteen frames**

With the app running, reach and screenshot each one:

1. `Reservations.png` — the list
2. `Reservations-actions menu view.png` — both menus open, and rows showing Link Sent / Expired / Failed / Refunded
3. `Add Reservations-reservation details.png`
4. `Add Reservations-guest details.png`
5. `Add Reservations-notes.png`
6. `Edit Reservations.png`
7. `Reservation detailes-confirmed state.png`
8. `Reservation detailes-confirmed state (1).png` — Send Message open
9. `Reservation detailes-pendding state.png`
10. `Reservation detailes-payment link sent state.png`
11. `Reservation detailes-deposit state.png`
12. `Reservation detailes-deposit failed state.png`
13. `Reservation detailes-Link Expired state.png`
14. `Reservation detailes-Link Expired state (1).png` — payment cancelled
15. `Reservation detailes-cancellation state.png`

Then repeat the list and one dialog in dark mode and in Arabic (RTL) — neither is in the frames, and both are how the app ships.

- [ ] **Step 3: Full check**

Run: `cd apps/merchant && npm test && npx tsc -b --noEmit && npm run lint`
Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add apps/merchant/src/pages/reservations
git commit -m "feat(reservations): wire the list to its form, detail and cancel dialogs"
```

---

## Verification checklist

- [ ] `npm test` in `apps/merchant` — fixture, model and i18n key tests pass
- [ ] `npx tsc -b --noEmit` clean, including Calendar after the `ReservationSource` change
- [ ] `npm run lint` clean
- [ ] All fifteen frames screenshotted and compared
- [ ] The list and one dialog checked in dark mode
- [ ] The list checked in Arabic — the row's logical borders flip, nothing overflows
- [ ] Every disabled control carries a `title` explaining why
- [ ] `/reservations/calendar`, `/floor-plan`, `/waitlist`, `/events` still load
