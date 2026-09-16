// What is happening at each table right now.
//
// There is no POS or reservations feed behind this build, so a table's live
// state is simulated — but deterministically, from its number, so the same
// table shows the same guest on every render and after a refresh. Anything a
// host changes by hand (seating a walk-in, marking a table clean) is stored as
// an override and always wins over the simulation. A table configured as
// Blocked is blocked, whatever either source says.
import type { FloorTable } from "./model";

export type LiveStatus = "cleaning" | "available" | "reserved" | "blocked" | "occupied";

/** Legend order, as the frames list it. */
export const LIVE_STATUSES: readonly LiveStatus[] = ["cleaning", "available", "reserved", "blocked", "occupied"];

export interface LiveTableState {
  status: LiveStatus;
  guests: number;
  guestName: string;
  orderId: string;
  server: string;
  note: string;
  /** Occupied / cleaning: when it started. Reserved: when the party arrives. */
  since: number;
}

export type LiveOverride = LiveTableState;
export type LiveOverrides = Record<string, LiveOverride>;

const GUESTS = [
  "Alaa Khamis", "Reem Al-Subaie", "Yousef Al-Harthi", "Fahad Al-Rashidi", "Amal Al-Enezi",
  "Nawaf Al-Qarni", "Dana Al-Balawi", "Sara Al-Otaibi", "Majed Al-Shehri", "Lama Al-Dosari",
];
const SERVERS = ["Hassan", "Omar", "Lina", "Majed", "Noura", "Faisal"];
const NOTES = ["Birthday", "Window seat", "Allergy: nuts", "Anniversary", "High chair needed", ""];

const MINUTE = 60_000;

export function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Rounded to the quarter hour so simulated times do not drift between two
 *  renders a second apart, yet still move over a working session. */
export function simulationAnchor(now: number): number {
  return Math.floor(now / (15 * MINUTE)) * 15 * MINUTE;
}

export function simulatedState(table: FloorTable, anchor: number): LiveTableState {
  const h = hashString(table.number.trim().toUpperCase() || table.id);
  const roll = h % 100;
  const guestName = GUESTS[h % GUESTS.length];
  const server = SERVERS[(h >>> 3) % SERVERS.length];
  const note = NOTES[(h >>> 5) % NOTES.length];
  const orderId = `ORD-${100 + (h % 900)}`;
  const guests = Math.max(1, Math.min(table.seats, 1 + ((h >>> 7) % table.seats)));

  if (table.blocked) {
    return { status: "blocked", guests: 0, guestName: "", orderId: "", server: "", note: table.note, since: anchor };
  }
  if (roll < 56) {
    return { status: "available", guests: 0, guestName: "", orderId: "", server: "", note: "", since: anchor - ((h >>> 9) % 50) * MINUTE };
  }
  if (roll < 76) {
    return { status: "occupied", guests, guestName, orderId, server, note, since: anchor - (20 + ((h >>> 9) % 100)) * MINUTE };
  }
  if (roll < 88) {
    return { status: "reserved", guests, guestName, orderId: "", server, note, since: anchor + (60 + ((h >>> 9) % 60)) * MINUTE };
  }
  return { status: "cleaning", guests: 0, guestName: "", orderId: "", server, note: "", since: anchor - (2 + ((h >>> 9) % 12)) * MINUTE };
}

export function resolveLiveState(table: FloorTable, overrides: LiveOverrides, anchor: number): LiveTableState {
  if (table.blocked) return simulatedState(table, anchor);
  return overrides[table.id] ?? simulatedState(table, anchor);
}

export function liveCounts(states: readonly LiveTableState[]): Record<LiveStatus, number> {
  const counts: Record<LiveStatus, number> = { cleaning: 0, available: 0, reserved: 0, blocked: 0, occupied: 0 };
  for (const state of states) counts[state.status] += 1;
  return counts;
}

/** Share of walk-in seats a host could put a party at right now. */
export function walkInCapacity(entries: readonly { table: FloorTable; state: LiveTableState }[]): number {
  const walkIn = entries.filter((e) => e.table.walkIn && !e.table.blocked);
  const total = walkIn.reduce((sum, e) => sum + e.table.seats, 0);
  if (total === 0) return 0;
  const free = walkIn.filter((e) => e.state.status === "available").reduce((sum, e) => sum + e.table.seats, 0);
  return Math.round((free / total) * 100);
}

/** Minutes since `since`, or until it for a reservation. Never negative. */
export function minutesBetween(state: LiveTableState, now: number): number {
  const diff = state.status === "reserved" ? state.since - now : now - state.since;
  return Math.max(0, Math.round(diff / MINUTE));
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}
