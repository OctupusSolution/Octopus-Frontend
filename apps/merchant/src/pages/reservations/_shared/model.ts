// Pure logic for the Reservations module: the status merge, filtering,
// sorting, KPI derivation and refund policy. No DOM, no React — every later
// screen (Calendar, Floor Plan, Waitlist, Private Rooms & Events) reads the
// mock rows through these functions so the rules live in exactly one place.
import { TODAY, type DepositState, type Reservation, type ReservationStatus } from "@/shared/api/mock-reservations";

export type DisplayState = ReservationStatus | "Link Sent" | "Expired" | "Failed" | "Refunded";
export type SortKey = "time-asc" | "time-desc" | "party" | "status";
export type DayFilter = "today" | "tomorrow" | "date";

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

// The four deposit states that take over the status pill. Anything else
// (none, unpaid, paid, cancelled) leaves the reservation's own status showing.
const DEPOSIT_OVERRIDES: Partial<Record<DepositState, DisplayState>> = {
  "link-sent": "Link Sent",
  expired: "Expired",
  failed: "Failed",
  refunded: "Refunded",
};

export function displayState(r: Reservation): DisplayState {
  if (r.status === "Cancelled") return "Cancelled";
  const override = r.deposit && DEPOSIT_OVERRIDES[r.deposit.state];
  return override ?? r.status;
}

export function isPaid(r: Reservation): boolean | null {
  if (!r.deposit || r.deposit.state === "none") return null;
  return r.deposit.state === "paid";
}

// "T-12" -> "Table 12" for display; the raw "T-NN" id stays in the fixture
// unchanged because Floor Plan and Calendar key off that exact format (fix
// round 1 — presentational only). Anything that doesn't match the shape
// (e.g. a private-room name) is returned as-is rather than mangled.
export function tableLabel(table: string): string {
  const match = /^T-0*(\d+)$/.exec(table);
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

function addDays(date: string, days: number): string {
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
  const filtered = dayFiltered
    .filter((r) => (f.status ? r.status === f.status : true))
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

export function refundPolicy(r: Reservation, nowMinutes: number): RefundPolicy {
  const minutesToEvent = r.startMinutes - nowMinutes;
  const tier = minutesToEvent > 360 ? "full" : minutesToEvent > 0 ? "partial" : "none";
  return { minutesToEvent, tier };
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
