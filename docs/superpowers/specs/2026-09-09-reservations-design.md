# Reservations — Design

Rebuild `/reservations` as the full reservations list from the design in
`apps/assets/Reservations/Reservations Desing/`, plus the four dialog families
that hang off it. Fifteen frames, delivered in one pass.

## Goal

The merchant console has a Reservations *hub* — four KPI tiles and quick links
to Calendar, Floor Plan, Waitlist and Events. The design replaces it with the
page the module was missing: every reservation for a day, with the deposit and
payment-link lifecycle visible on each row and editable without leaving the
page.

Scope is the fifteen frames. The Calendar, Floor Plan, Waitlist and Events
pages stay where they are and keep their sidebar entries; only the hub at
`/reservations` is replaced.

## Data model

`shared/api/mock-reservations.ts` drives Calendar, Floor Plan and Waitlist as
well, so this extends it rather than forking it.

### The pill in a row is two things

The row's leading pill shows a reservation status most of the time, but four of
its values are payment states:

| Value shown | What it actually is |
| --- | --- |
| Pending, Confirmed, Arrived, Seated, Completed, No Show, Cancelled | reservation status — the seven in the `Status ▾` menu |
| Link Sent, Expired, Failed, Refunded | deposit state, surfacing in the same slot |

They are stored apart and merged only for display, so the `Status ▾` menu
offers exactly seven choices while a row can still read "Link Sent".

```ts
export type ReservationStatus =
  | "Pending" | "Confirmed" | "Arrived" | "Seated"
  | "Completed" | "No-show" | "Cancelled";

export type DepositState =
  | "none"      // no deposit required
  | "unpaid" | "link-sent" | "paid"
  | "expired" | "failed" | "refunded" | "cancelled";
```

`displayState(reservation)` returns the reservation status unless the deposit
state is `link-sent | expired | failed | refunded`, in which case it returns
that. It is the single place the merge happens.

### New fields

```ts
interface Reservation {
  // …existing: id, date, startMinutes, durationMinutes, guest, phone,
  //   partySize, table, branch, source, status, notes, allergyTags
  ref: string;              // "RSV-1048"
  email?: string;
  area: string;             // "Main Dining" — the row's line above the table
  tags?: readonly string[]; // "Birthday", "VIP"
  deposit?: {
    amount: number;
    currency: "SAR";
    type: "Pre Reservation" | "Per Guest" | "Full Prepayment";
    state: DepositState;
    dueBy?: string;
    paidOn?: string;
    method?: string;        // "mada **** 1236"
    txnId?: string;
  };
  paymentLink?: {
    url: string;
    sentVia: "WhatsApp" | "SMS" | "Email";
    sentTo: string;
    sentOn: string;
    expiresOn: string;
  };
  confirmedOn?: string;
  confirmedMethod?: string; // "AUTO (Deposit Paid)"
  cancelledAt?: string;
  cancelReason?: string;
}
```

### Breaking change: `ReservationSource`

The design's Source radio group is `Direct Booking · website · Walk In ·
Phone · Instagram`. The current union is `Phone | Website | Walk-in |
Mobile App | Aggregator`. The union is replaced, and the files that read it —
`reservations/calendar`, `reservations/floor-plan`, `reservations/waitlist` —
are updated in the same change. `Mobile App` and `Aggregator` rows in the
fixture are re-sourced to `Instagram` and `Website`.

The fixture grows to cover every state: at least one row per reservation status
and one per deposit state, so all eight detail states are reachable by
clicking.

## Files

Fifteen frames in one file would be ~2000 lines. Split by the seam the frames
already have — the page, the pieces of a row, and the dialogs:

```
pages/reservations/
  index.tsx                        list page: state, filtering, wiring
  _shared/
    model.ts                       pure: displayState, filters, KPIs, refund policy
    use-dismiss.ts                 outside-click and Escape for the menus
    guest-avatar.tsx               initials avatar
    guest-card.tsx                 avatar + name + phone, shared by both dialogs
    meta-row.tsx                   guests · date · time · area - table
    status-pill.tsx                the merged pill
    kpi-cards.tsx                  the five tiles
    filter-bar.tsx                 day chips, date, three selects, More Filters
    reservation-row.tsx            one row card
    status-menu.tsx                Status ▾ — the seven statuses
    row-actions-menu.tsx           ⋮ — Duplicate … Cancel
  modals/
    reservation-form-modal.tsx     Add and Edit — one component, `mode` prop
    reservation-detail-modal.tsx   the eight states
    cancel-reservation-modal.tsx   action type, reason, policy preview
```

Everything renders through the existing primitives (`Modal`, `Input`,
`Textarea`, `Select`, `Checkbox`, `Badge`, `Tabs`, `Button`) and the
`--octo-*` tokens. No new primitive is added.

### Add and Edit are one component

The two frames share three tabs, all field layout, and the footer shape. Edit
differs by: Source disabled, a Reservation Reference field beside it, a third
Deposit column (Deposit Status), a "Paid on … / View Payment" bar, the note
textarea inline on tab 1, a "Notify guest about changes" checkbox, and
`Cancel Reservation` in red in the footer instead of `Save As Pending`. That is
a `mode: "add" | "edit"` prop, not a second component.

## The eight detail states

One component, one switch on `deposit.state` and `status`:

| State | Banner | Body | Footer |
| --- | --- | --- | --- |
| Confirmed | green, "Confirmed" | Reservation Confirmed — Confirmed On, Confirmed Method | ⋮ · Send Message · **Edit Reservation** |
| Confirmed, message open | as above | as above + WhatsApp / Call / Email popover under Send Message | as above |
| Pending | amber, "Pending (Deposit Required)" | Deposit Information — Status, Amount, Due By; then "will be automatically confirmed when deposit paid" | ⋮ · Edit Reservation · **Share Link** |
| Link sent | violet, "Payment Link Sent" | link + copy button, Sent Via / Sent To / Sent On / Expire On | ⋮ · Edit Reservation · **Resend Link** |
| Paid | green, "Deposit Paid" | Payment Successful — Paid Amount, Paid On, Payment Method, Transaction ID | ⋮ · **Download Receipt** |
| Failed | red, "Deposit Failed" | "No amount captured" | Cancel Reservation · Notify guest · **Resend New Payment Link** |
| Expired | grey, "Expired Payment Link" | "Link no longer valid" | Notify guest · **Resend New Payment Link** |
| Payment cancelled | red, "Payment Cancelled" | "Guest canceled the payment" | **Resend New Payment Link** |

Every state shares the header (`Reservation #RSV-1049`), the guest card, and
the meta row (`4 Guests · May 20, 2026 · 7:30 PM · Main Dining - Table 12`).

## Behaviour

State is local to the page — `useState` over the fixture, the same shape as
`menu/items`. Nothing is persisted, matching every other console page.

- **Day chips** — `Today` / `Tomorrow` / an explicit date filter the rows and
  drive the KPI counts. The KPI numbers are derived from the filtered set, not
  hardcoded, so they move with the filters.
- **Status ▾** on a row sets the reservation status. Choosing `Cancelled`
  opens the cancel dialog rather than setting it silently.
- **⋮** — Duplicate, Add Note, Send Reminder, View Logs, Export To Calendar,
  Share Payment Link, Cancel. Duplicate, Share Payment Link and Cancel act. The
  rest have no backend to act on; they are rendered disabled with a title
  saying so, rather than wired to a no-op that pretends to work.
- **Detail** opens by clicking the row body. **Edit** opens the form in edit
  mode. Both are reachable from the other.
- **Cancel** computes the policy preview from time-to-event against a fixed
  6-hour rule, and shows Full Refund / Partial / No Refund accordingly.
- **Search** matches guest name, phone and ref. **Sorted By** offers Time
  (Earliest), Time (Latest), Party Size, Status.
- One menu open at a time; Escape and outside-click close menus and dialogs.

## Deviations from the frames, and why

1. **Dark mode.** The frames are light-only; the console has a dark theme.
   Surfaces and text use `--octo-*` tokens so both themes work. Status colours
   are literal, as they are elsewhere in the app.
2. **Guest photos.** The frames show portrait photos. The repo has no such
   assets and none should be invented. Rows use an initials avatar in the
   sidebar's style.
3. **Three typos in the frames are fixed**: "Mange all table reservations" →
   "Manage", "Paid on MAU20,2026" → "May 20, 2026", and "Create& Send
   Confirmation" → "Create & Send Confirmation".
4. **The modal frames' header button reads "Add To Waitlist"** where the list
   frame reads "Add New Reservation". The list frame is the page being built,
   so the button is "Add New Reservation".
5. **Density.** The frames are drawn wider than the console's 12–12.5px scale.
   Layout, order, colour and content match the frames exactly; type sizes and
   radii follow the app's scale so the page sits beside Menu without looking
   imported.

## i18n

`shared/i18n/keys.test.ts` asserts `en` and `ar` hold identical key sets. Every
string lands in both dictionaries under `reservations.*` — roughly 130 keys.
Arabic is a real translation, not a copy of the English.

## Testing

- `keys.test.ts` passes — the dictionaries stay in sync.
- `tsc` and lint clean; the `ReservationSource` change compiles across
  Calendar, Floor Plan and Waitlist.
- The page is exercised in the running app and screenshotted against each
  frame before it is called done: list, both menus, three add tabs, edit, all
  eight detail states, cancel.
