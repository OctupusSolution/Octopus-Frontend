// Pure logic for the Reservations module: the status merge, filtering,
// sorting, KPI derivation and refund policy. No DOM, no React — every later
// screen (Calendar, Floor Plan, Waitlist, Private Rooms & Events) reads the
// mock rows through these functions so the rules live in exactly one place.
import {
  TODAY,
  type DepositState,
  type Reservation,
  type ReservationDeposit,
  type ReservationPaymentLink,
  type ReservationSource,
  type ReservationStatus,
} from "@/shared/api/mock-reservations";

export type DisplayState =
  | ReservationStatus | "Link Sent" | "Expired" | "Failed" | "Refunded" | "Payment Cancelled";
export type SortKey = "time-asc" | "time-desc" | "party" | "status";
type DayFilter = "today" | "tomorrow" | "date";

export interface ListFilters {
  day: DayFilter;
  date: string;
  status: string;
  area: string;
  source: string;
  query: string;
  sort: SortKey;
}

export interface Kpis {
  total: number;
  confirmed: number;
  pending: number;
  cancelled: number;
  noShow: number;
  confirmedPct: number;
  pendingPct: number;
  cancelledPct: number;
  noShowPct: number;
}

export interface RefundPolicy {
  minutesToEvent: number;
  tier: "full" | "partial" | "none";
}

/** The module's fixed "now", 14:30 — matches the calendar's mock clock. */
export const NOW_MINUTES = 870;

export const EMPTY_FILTERS: ListFilters = {
  day: "today",
  date: TODAY,
  status: "",
  area: "",
  source: "",
  query: "",
  sort: "time-asc",
};

// Declaration order for the "status" sort — not alphabetical.
const STATUS_ORDER: readonly ReservationStatus[] = [
  "Pending", "Confirmed", "Arrived", "Seated", "Completed", "No-show", "Cancelled",
];

// The five deposit states that take over the status pill. Anything else
// (none, unpaid, paid) leaves the reservation's own status showing.
// "cancelled" (fix round 4, finding 26) is the guest backing out of paying a
// deposit link — distinct from the reservation itself being cancelled,
// which always wins regardless (see the r.status check below) — so it gets
// its own override rather than falling through to "Pending"/"UNPAID" with
// no hint the guest ever abandoned the payment.
const DEPOSIT_OVERRIDES: Partial<Record<DepositState, DisplayState>> = {
  "link-sent": "Link Sent",
  expired: "Expired",
  failed: "Failed",
  refunded: "Refunded",
  cancelled: "Payment Cancelled",
};

export function displayState(r: Reservation): DisplayState {
  if (r.status === "Cancelled") return "Cancelled";
  const override = r.deposit && DEPOSIT_OVERRIDES[r.deposit.state];
  return override ?? r.status;
}

// The declaration order every status/display-state dropdown in the module
// renders in — the base reservation statuses first (frame order), then the
// four payment-driven overrides, then the fifth (fix round 4, finding 26).
export const DISPLAY_STATE_OPTIONS: readonly DisplayState[] = [
  "Pending", "Confirmed", "Arrived", "Seated", "Completed", "No-show", "Cancelled",
  "Link Sent", "Expired", "Failed", "Refunded", "Payment Cancelled",
];

// One label map for every DisplayState value — the row pill, the list's
// status filter (fix round 4, finding 20) and the calendar all read off
// this instead of each restating their own copy (fix round 4, finding 13).
export const STATE_LABEL_KEY: Record<DisplayState, string> = {
  Pending: "reservations.state.pending",
  Confirmed: "reservations.state.confirmed",
  Arrived: "reservations.state.arrived",
  Seated: "reservations.state.seated",
  Completed: "reservations.state.completed",
  "No-show": "reservations.state.noShow",
  Cancelled: "reservations.state.cancelled",
  "Link Sent": "reservations.state.linkSent",
  Expired: "reservations.state.expired",
  Failed: "reservations.state.failed",
  Refunded: "reservations.state.refunded",
  "Payment Cancelled": "reservations.state.paymentCancelled",
};

// One label map for a reservation's booking source — fix round 4, finding
// 6: this used to be restated in filter-bar.tsx and reservation-form-modal.tsx
// (and reservation-row.tsx printed the raw English value, not even
// translated). Every caller imports this one map instead.
export const SOURCE_LABEL_KEY: Record<ReservationSource, string> = {
  "Direct Booking": "reservations.source.directBooking",
  Website: "reservations.source.website",
  "Walk In": "reservations.source.walkIn",
  Phone: "reservations.source.phone",
  Instagram: "reservations.source.instagram",
};

export function sourceLabel(t: (key: string) => string, source: ReservationSource): string {
  return t(SOURCE_LABEL_KEY[source]);
}

// The channel a payment link was last sent over — the detail dialog's
// "Sent Via:" row used to print `link.sentVia` raw (fix round 4, finding
// 6); the form's own channel pills already had translated labels for the
// same three values, restated here as one shared map.
const CHANNEL_LABEL_KEY: Record<ReservationPaymentLink["sentVia"], string> = {
  WhatsApp: "reservations.list.row.whatsapp",
  SMS: "marketing.channel.sms",
  Email: "reservations.list.row.email",
};

export function channelLabel(t: (key: string) => string, channel: ReservationPaymentLink["sentVia"]): string {
  return t(CHANNEL_LABEL_KEY[channel]);
}

// "1 Guest" / "2 Guests" (dual, Arabic-specific — "ضيفان" not "2 ضيوف") /
// "{n} Guests" — every place that counts guests (the row, the meta row
// shared by the detail/cancel dialogs, the form's party-size select) reads
// off this one function instead of re-deriving the n===1 special case three
// times, one of which (fix round 4, finding 25) forgot Arabic also needs a
// dual (n===2) form.
export function guestsText(t: (key: string) => string, n: number): string {
  if (n === 1) return t("reservations.list.row.guestOne");
  if (n === 2) return t("reservations.list.row.guestsTwo");
  return t("reservations.list.row.guests").replace("{n}", String(n));
}

// "2026-08-08" -> "Aug 8, 2026" for a non-today/tomorrow date badge — the
// row and the meta row both built this inline identically; the KPI title
// (fix round 4, finding 12) needed the same formatting for its "day" label.
export function formatDisplayDate(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    numberingSystem: "latn",
  }).format(new Date(`${date}T00:00:00`));
}

export function isPaid(r: Reservation): boolean | null {
  if (!r.deposit || r.deposit.state === "none") return null;
  return r.deposit.state === "paid";
}

// "T-12" or "T12" -> "Table 12" for display — the fixture writes "T-12", the
// floor plan "T12". The raw id stays in the fixture
// unchanged because Floor Plan and Calendar key off that exact format (fix
// round 1 — presentational only). Anything that doesn't match the shape
// (e.g. a private-room name) is returned as-is rather than mangled.
export function tableLabel(table: string): string {
  const match = /^T-?0*(\d+)$/.exec(table);
  return match ? `Table ${match[1]}` : table;
}

export function clock12(startMinutes: number): string {
  const m = ((startMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(m / 60);
  const minutes = m % 60;
  const period = hours < 12 ? "AM" : "PM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function dayLabel(date: string): "today" | "tomorrow" | "other" {
  if (date === TODAY) return "today";
  if (date === addDays(TODAY, 1)) return "tomorrow";
  return "other";
}

function matchesQuery(r: Reservation, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (
    r.guest.toLowerCase().includes(needle) ||
    r.phone.toLowerCase().includes(needle) ||
    r.ref.toLowerCase().includes(needle)
  );
}

function sortRows(rows: Reservation[], sort: SortKey): Reservation[] {
  const sorted = [...rows];
  switch (sort) {
    case "time-asc":
      sorted.sort((a, b) => a.startMinutes - b.startMinutes);
      break;
    case "time-desc":
      sorted.sort((a, b) => b.startMinutes - a.startMinutes);
      break;
    case "party":
      sorted.sort((a, b) => b.partySize - a.partySize);
      break;
    case "status":
      sorted.sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));
      break;
  }
  return sorted;
}

export function visibleRows(rows: readonly Reservation[], f: ListFilters): Reservation[] {
  const dayFiltered = rows.filter((r) => {
    if (f.day === "today") return r.date === TODAY;
    if (f.day === "tomorrow") return r.date === addDays(TODAY, 1);
    return r.date === f.date;
  });
  // Filters on what the row's pill actually shows (fix round 4, finding
  // 20) — displayState(), not the raw r.status — so picking "Confirmed"
  // never returns a row whose pill reads "Link Sent", and so the four
  // payment-driven pill states (plus "Payment Cancelled") are reachable
  // through this same filter.
  const filtered = dayFiltered
    .filter((r) => (f.status ? displayState(r) === f.status : true))
    .filter((r) => (f.area ? r.area === f.area : true))
    .filter((r) => (f.source ? r.source === f.source : true))
    .filter((r) => matchesQuery(r, f.query));
  return sortRows(filtered, f.sort);
}

export function deriveKpis(rows: readonly Reservation[]): Kpis {
  const total = rows.length;
  const confirmed = rows.filter((r) => r.status === "Confirmed").length;
  const pending = rows.filter((r) => r.status === "Pending").length;
  const cancelled = rows.filter((r) => r.status === "Cancelled").length;
  const noShow = rows.filter((r) => r.status === "No-show").length;

  const pct = (count: number) => (total === 0 ? 0 : Math.round((count / total) * 100 * 100) / 100);

  return {
    total,
    confirmed,
    pending,
    cancelled,
    noShow,
    confirmedPct: pct(confirmed),
    pendingPct: pct(pending),
    cancelledPct: pct(cancelled),
    noShowPct: pct(noShow),
  };
}

// Date-aware (fix round 2, finding 2 of the final review): NOW_MINUTES is a
// clock reading (14:30) with no date of its own — the module's fixed "now"
// is TODAY at NOW_MINUTES. A reservation dated after TODAY is always more
// than `minutesToEvent` minutes away, no matter how its own startMinutes
// compares to NOW_MINUTES in isolation; every whole day between r.date and
// TODAY is folded into the gap so a booking dated tomorrow or next week
// doesn't read as "0h 0m away / No Refund" just because 19:00 < 14:30 as
// bare clock numbers.
function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00Z`).getTime();
  const b = new Date(`${to}T00:00:00Z`).getTime();
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

export function refundPolicy(r: Reservation, nowMinutes: number): RefundPolicy {
  const dayOffset = daysBetween(TODAY, r.date) * 24 * 60;
  const minutesToEvent = dayOffset + r.startMinutes - nowMinutes;
  const tier = minutesToEvent > 360 ? "full" : minutesToEvent > 0 ? "partial" : "none";
  return { minutesToEvent, tier };
}

/* ========================================================== Task 11 cancel */
// Pure derivation for the cancel dialog's policy preview
// (cancel-reservation-modal.tsx).

/** Splits a minute count into whole hours + remainder minutes for the
 *  "Time to event" row, rendered through `reservations.cancel.hoursMinutes`.
 *  Clamped at zero — once the tier is "none" the reservation's slot has
 *  already started and `minutesToEvent` goes negative, which has no sane
 *  "Xh Ym" reading. */
export function hoursMinutesParts(minutes: number): { h: number; m: number } {
  const clamped = Math.max(0, minutes);
  return { h: Math.floor(clamped / 60), m: clamped % 60 };
}

/* ============================================================== Task 9 form */
// Pure helpers for the Add/Edit reservation form (reservation-form-modal.tsx).

export interface TimeOption {
  value: number;
  label: string;
}

// 30-minute slots across the day. When editing a reservation whose stored
// `startMinutes` doesn't land on the grid (several fixture rows sit on a
// 15-minute offset, e.g. 13:15), that exact value is folded in too so the
// select always has a matching option instead of silently showing the
// browser's default (usually the first slot, midnight).
export function timeSlotOptions(currentMinutes?: number): TimeOption[] {
  const slots = new Map<number, string>();
  for (let m = 0; m < 24 * 60; m += 30) slots.set(m, clock12(m));
  if (currentMinutes !== undefined && !slots.has(currentMinutes)) {
    slots.set(currentMinutes, clock12(currentMinutes));
  }
  return Array.from(slots.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([value, label]) => ({ value, label }));
}

// Whole-hour duration slots (1h-4h), the frame's own grid. When editing a
// reservation whose stored `durationMinutes` doesn't land on that grid
// (fix round 4, finding 11 — nine fixture rows sit on a 90-minute booking),
// that exact value is folded in too, mirroring timeSlotOptions above, so
// editing never silently rounds a real duration away.
export function durationMinuteOptions(currentMinutes?: number): number[] {
  const slots = new Set<number>([60, 120, 180, 240]);
  if (currentMinutes !== undefined) slots.add(currentMinutes);
  return Array.from(slots).sort((a, b) => a - b);
}

// Every non-"none" deposit state's label — shared by the edit form's
// Deposit Status select and the detail dialog's "pending" panel (fix round
// 4, finding 5: that panel used to hardcode "UNPAID" instead of reading
// this off the reservation).
export const DEPOSIT_STATE_LABEL_KEY: Record<Exclude<DepositState, "none">, string> = {
  unpaid: "reservations.list.row.unpaid",
  paid: "reservations.list.row.paid",
  "link-sent": "reservations.state.linkSent",
  expired: "reservations.state.expired",
  failed: "reservations.state.failed",
  refunded: "reservations.state.refunded",
  cancelled: "reservations.state.cancelled",
};

export const TAG_PRESETS = ["Birthday", "VIP", "Anniversary", "Allergy"] as const;

/** The preset tag chips not already attached to the draft — the source for
 *  what "+ Add Tag" appends next, and disables once all four are used. */
export function availableTagPresets(tags: readonly string[]): string[] {
  return TAG_PRESETS.filter((preset) => !tags.includes(preset));
}

// The guest phone field splits a Saudi "+966..." number into a fixed prefix
// chip plus the digits the guest actually types/edits.
export function phoneDigitsFrom(phone: string): string {
  return phone.startsWith("+966") ? phone.slice(4) : phone;
}

export function combinePhone(digits: string): string {
  return `+966${digits}`;
}

/* ============================================================== Task 12 wiring */
// Pure helpers for the Reservations list page (pages/reservations/index.tsx):
// timestamps stamped by list-driven state changes (cancel, share/resend
// link) that need to read like the rest of the fixture's pre-formatted
// strings (e.g. "Aug 7, 2026 - 5:30 PM") without reaching for `Date.now()`.

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/** "2026-08-08" + 870 ("14:30") -> "Aug 8, 2026 - 2:30 PM" — the fixture's
 *  own timestamp shape, built from a date + a minutes-from-midnight value
 *  instead of `Date.now()` so it stays deterministic. */
export function formatTimestamp(dateIso: string, minutes: number): string {
  const [y, m, d] = dateIso.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${d}, ${y} - ${clock12(minutes)}`;
}

/** The module's fixed "now" (see `NOW_MINUTES`), formatted the same way. */
export function nowTimestampLabel(): string {
  return formatTimestamp(TODAY, NOW_MINUTES);
}

/** A freshly-"sent" payment link for Share Link / Resend Link — stamped
 *  "now" and expiring a day later, addressed to whichever channel the form
 *  last recorded (falling back to WhatsApp/phone for a reservation that
 *  never went through the form, e.g. the static fixture rows). */
export function freshPaymentLink(r: Reservation): ReservationPaymentLink {
  const sentVia = r.sendLinkChannels?.[0] ?? "WhatsApp";
  const sentTo = sentVia === "Email" ? (r.email ?? r.phone) : r.phone;
  return {
    url: `https://pay.octopus.app/r/${r.ref}`,
    sentVia,
    sentTo,
    sentOn: nowTimestampLabel(),
    expiresOn: formatTimestamp(addDays(TODAY, 1), NOW_MINUTES),
  };
}

/* ============================================================ Task 10 detail */
// Pure derivation for the reservation detail dialog (reservation-detail-modal.tsx).
// Which of the eight frames — plus the ninth, un-designed "cancelled" state
// (fix round 1, finding 2) — a given reservation renders as.

export type DetailState =
  | "confirmed" | "pending" | "link-sent" | "paid" | "failed" | "expired" | "payment-cancelled" | "cancelled"
  // Fix round 4, finding 5 — none of the eight frames cover a reservation
  // that's already Arrived/Seated/Completed, or one marked No-show; the
  // "pending" default used to catch all four and show a bogus "Pending
  // (Deposit Required)" banner (with a Share Link button) on a guest who'd
  // already been seated, or who never showed up at all.
  | "progressed" | "no-show";

export function detailState(r: Reservation): DetailState {
  // A cancelled reservation wins over any deposit state — including a
  // "refunded" or still-"paid" deposit left over from before it was
  // cancelled — exactly the precedence displayState() already gives
  // r.status === "Cancelled" over its own DEPOSIT_OVERRIDES map above.
  // Fixture res-047 is the case this guards: status "Cancelled" with a
  // deposit.state of "refunded", which used to fall through to "pending"
  // (no branch below claims "refunded") and show a bogus "Deposit
  // Required / UNPAID" panel on an already-cancelled, already-refunded
  // booking.
  if (r.status === "Cancelled") return "cancelled";

  switch (r.deposit?.state) {
    // An active deposit flow (a link out, money in, or a failed/expired
    // attempt) always wins, "regardless of reservation status" — Arrived,
    // Seated etc. included — exactly like the four-state test above
    // already asserts for "paid"/"Arrived".
    case "link-sent":
    case "paid":
    case "failed":
    case "expired":
      return r.deposit.state;
    case "cancelled":
      return "payment-cancelled";
    default:
      // The deposit is quiet (none, unpaid, or absent) — fall back to
      // what the reservation itself is doing.
      if (r.status === "Confirmed") return "confirmed";
      // Arrived/Seated/Completed already cleared "pending" — the booking
      // progressed normally, same shape as Confirmed.
      if (r.status === "Arrived" || r.status === "Seated" || r.status === "Completed") return "progressed";
      // No-show is its own outcome, not a cancellation and not "pending" a
      // deposit that was never going to be collected.
      if (r.status === "No-show") return "no-show";
      return "pending";
  }
}

/* ========================================================== Final fix wave */
// The state-transition reducers behind index.tsx's dialog handlers — moved
// out of that file's closures (fix round 4, finding A) so they're plain
// `(rows, ...args) => Reservation[]` functions a test can call directly
// without mounting the page. Every id/ref this module hands out comes from
// `nextId`/`nextRef` below rather than `crypto.randomUUID()` (unavailable
// outside a secure context — `vite preview --host` over a LAN IP throws) or
// `Date.now()` (the module's "now" is NOW_MINUTES, not the wall clock).

/** The next free "RSV-xxxx" ref, scanned off whatever is currently in state
 *  (not the static fixture) so repeated duplicates keep incrementing. */
export function nextRef(rows: readonly Reservation[]): string {
  let max = 0;
  for (const r of rows) {
    const match = /^RSV-(\d+)$/.exec(r.ref);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `RSV-${max + 1}`;
}

/** A fresh, deterministic row id — "new-1", "new-2", … — scanned off
 *  whatever's currently in state the same way `nextRef` scans refs. */
export function nextId(rows: readonly Reservation[]): string {
  let max = 0;
  for (const r of rows) {
    const match = /^new-(\d+)$/.exec(r.id);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `new-${max + 1}`;
}

/** Appends an optional free-text note onto a reason, the one place the
 *  cancel dialog's Note field's value actually lands (fix round 4, finding
 *  3 — it used to be collected and then silently dropped). */
function withNote(reason: string, note: string): string {
  const trimmed = note.trim();
  return trimmed ? `${reason} — ${trimmed}` : reason;
}

export type CancelPayload = { actionType: "guest" | "restaurant" | "no-show"; reason: string; note: string };

/** The Add/Edit form's submit — add inserts a new row (status derived from
 *  `intent`); edit replaces the existing row in place but always keeps the
 *  row's *existing* status, and with it its cancelledAt/cancelReason taken
 *  from the row rather than the draft (fix round 4, finding 1 — this used
 *  to recompute status from `intent` even in edit mode, which forced every
 *  edited reservation to "Confirmed", reviving cancelled ones and
 *  reverting Seated/Arrived/Completed ones). Since status can't change via
 *  this path, cancelledAt/cancelReason never need clearing here — only
 *  `applyCancel`'s guest/restaurant branch and a direct status change away
 *  from Cancelled (see index.tsx's handleStatus) can do that. */
export function applyFormSubmit(
  rows: readonly Reservation[],
  draft: Reservation,
  intent: "pending" | "confirm",
  mode: "add" | "edit",
  editingId: string | null
): Reservation[] {
  if (mode === "add") {
    const status: ReservationStatus = intent === "confirm" ? "Confirmed" : "Pending";
    const row: Reservation = { ...draft, id: nextId(rows), ref: nextRef(rows), status };
    return [...rows, row];
  }
  if (mode === "edit" && editingId) {
    return rows.map((r) =>
      r.id === editingId
        ? { ...draft, id: r.id, ref: r.ref, status: r.status, cancelledAt: r.cancelledAt, cancelReason: r.cancelReason }
        : r
    );
  }
  return rows.slice();
}

/** Cancel-dialog confirm. "no-show" is not a cancellation — it sets status
 *  to "No-show", records the required reason (plus the optional note) the
 *  same way a real cancellation does, and leaves the deposit untouched
 *  (fix round 4, finding 3 — this used to discard both, even though Reason
 *  gates the dialog's Confirm button as required). A genuine cancellation
 *  ("guest"/"restaurant") sets status: "Cancelled" with a cancelledAt
 *  timestamp and the chosen reason+note, and refunds the deposit only when
 *  the refund policy's tier is "full" or "partial" (never for "none", and
 *  never when there's no deposit to refund). */
export function applyCancel(rows: readonly Reservation[], id: string, payload: CancelPayload): Reservation[] {
  return rows.map((r) => {
    if (r.id !== id) return r;
    if (payload.actionType === "no-show") {
      return { ...r, status: "No-show" as const, cancelReason: withNote(payload.reason, payload.note) };
    }
    const tier = refundPolicy(r, NOW_MINUTES).tier;
    const deposit =
      r.deposit && (tier === "full" || tier === "partial") ? { ...r.deposit, state: "refunded" as const } : r.deposit;
    return {
      ...r,
      status: "Cancelled" as const,
      cancelledAt: nowTimestampLabel(),
      cancelReason: withNote(payload.reason, payload.note),
      deposit,
    };
  });
}

/** Share Link (row's "…" menu, pending state) and Resend Link (the detail
 *  dialog's link-sent/failed/expired footers) both stamp a fresh payment
 *  link and move the deposit to "link-sent". */
export function applyShareLink(rows: readonly Reservation[], id: string): Reservation[] {
  return rows.map((r) => {
    if (r.id !== id || !r.deposit) return r;
    return { ...r, deposit: { ...r.deposit, state: "link-sent" }, paymentLink: freshPaymentLink(r) };
  });
}

/** Duplicate — inserted directly after the source row, with a fresh
 *  id/ref, and reset to a brand-new booking's state (fix round 4, finding
 *  10): status back to Pending, deposit progress back to unpaid (the
 *  amount/type preference carries over, the payment progress doesn't), and
 *  every payment-link/confirmation/cancellation timestamp cleared. Before
 *  this fix, duplicating a Completed, paid reservation produced a new
 *  booking that was already Completed, already paid (with the original's
 *  real txnId), and already linked to the original's payment link. */
export function applyDuplicate(rows: readonly Reservation[], id: string): Reservation[] {
  const index = rows.findIndex((r) => r.id === id);
  if (index === -1) return rows.slice();
  const source = rows[index];
  const deposit: ReservationDeposit | undefined = source.deposit
    ? { amount: source.deposit.amount, currency: source.deposit.currency, type: source.deposit.type, state: "unpaid" }
    : undefined;
  const copy: Reservation = {
    ...source,
    id: nextId(rows),
    ref: nextRef(rows),
    status: "Pending",
    deposit,
    paymentLink: undefined,
    confirmedOn: undefined,
    confirmedMethod: undefined,
    cancelledAt: undefined,
    cancelReason: undefined,
  };
  const next = rows.slice();
  next.splice(index + 1, 0, copy);
  return next;
}
