// Booking mode: which tables can take a party of N at a given time.
//
// There is no reservations backend behind this build, so a table's existing
// bookings are simulated deterministically from its number and the slot — the
// same table is busy at the same time on every render and after a refresh.
// Bookings a host actually takes are stored and always win over the
// simulation.
import { hashString } from "./live-status";
import type { FloorTable } from "./model";

export const SLOT_MINUTES = 30;
/** Service window the slot picker offers, in local hours. */
export const FIRST_SLOT_HOUR = 12;
export const LAST_SLOT_HOUR = 23;
/** Below this, a "large party only" table is not offered. */
export const LARGE_PARTY_MIN = 6;
export const MAX_PARTY_SIZE = 20;

const MINUTE = 60_000;

export interface Booking {
  id: string;
  tableId: string;
  /** Start of the booked slot. */
  at: number;
  partySize: number;
  guestName: string;
  createdAt: number;
}

export type Availability = "available" | "booked" | "tooSmall" | "blocked" | "notReservable" | "largePartyOnly";

export function roundToSlot(at: number): number {
  const date = new Date(at);
  date.setSeconds(0, 0);
  date.setMinutes(Math.floor(date.getMinutes() / SLOT_MINUTES) * SLOT_MINUTES);
  return date.getTime();
}

export function slotKey(at: number): string {
  const date = new Date(roundToSlot(at));
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}T${date.getHours()}:${date.getMinutes()}`;
}

export function sameSlot(a: number, b: number): boolean {
  return roundToSlot(a) === roundToSlot(b);
}

export function startOfDay(at: number): number {
  const date = new Date(at);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** Every bookable slot of that day, in order. */
export function slotsForDay(at: number): number[] {
  const day = startOfDay(at);
  const perHour = 60 / SLOT_MINUTES;
  return Array.from({ length: (LAST_SLOT_HOUR - FIRST_SLOT_HOUR + 1) * perHour }, (_, i) =>
    day + (FIRST_SLOT_HOUR * 60 + i * SLOT_MINUTES) * MINUTE
  );
}

/** The next bookable slot at or after `now`. Once service has closed for the
 *  day the next one opens tomorrow — never a slot that has already passed. */
export function defaultSlot(now: number): number {
  const today = slotsForDay(now).find((slot) => slot >= now);
  if (today) return today;
  return slotsForDay(startOfDay(now) + 36 * 60 * MINUTE)[0];
}

/** Reservations the restaurant already holds, simulated. */
export function simulatedBooked(table: FloorTable, at: number): boolean {
  return hashString(`${table.number.trim().toUpperCase()}|${slotKey(at)}`) % 100 < 30;
}

export function tableAvailability(
  table: FloorTable,
  query: { at: number; partySize: number },
  bookings: readonly Booking[] = []
): Availability {
  if (table.blocked) return "blocked";
  if (!table.reservable) return "notReservable";
  if (table.largePartyOnly && query.partySize < LARGE_PARTY_MIN) return "largePartyOnly";
  if (table.seats < query.partySize) return "tooSmall";
  if (bookings.some((booking) => booking.tableId === table.id && sameSlot(booking.at, query.at))) return "booked";
  if (simulatedBooked(table, query.at)) return "booked";
  return "available";
}

export function isAvailable(availability: Availability): boolean {
  return availability === "available";
}

export function bookingAt(tableId: string, at: number, bookings: readonly Booking[]): Booking | undefined {
  return bookings.find((booking) => booking.tableId === tableId && sameSlot(booking.at, at));
}

export function createBooking(tableId: string, at: number, partySize: number, guestName: string): Booking {
  return {
    id: `bk-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    tableId,
    at: roundToSlot(at),
    partySize,
    guestName: guestName.trim(),
    createdAt: Date.now(),
  };
}

export interface AvailabilitySummary {
  available: number;
  unavailable: number;
  seats: number;
}

export function availabilitySummary(entries: readonly { table: FloorTable; availability: Availability }[]): AvailabilitySummary {
  const available = entries.filter((entry) => isAvailable(entry.availability));
  return {
    available: available.length,
    unavailable: entries.length - available.length,
    seats: available.reduce((sum, entry) => sum + entry.table.seats, 0),
  };
}
