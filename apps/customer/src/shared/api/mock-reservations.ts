// Stand-in data for booking a table. The storefront has no public reservation
// or waitlist endpoint yet, so the floor, its sections, the bookable times and
// the "fully booked" rule live here, shaped the way those endpoints will answer.
// Swapping them in is a change to this file alone.

export type ZoneId =
  | "indoor"
  | "outdoor"
  | "singles"
  | "families"
  | "majlis"
  | "vip"
  | "smoking"
  | "non_smoking";

/** The sections a table can be filtered by, in the order the picker lists them. */
export const ZONES: readonly ZoneId[] = [
  "indoor",
  "outdoor",
  "singles",
  "families",
  "majlis",
  "vip",
  "smoking",
  "non_smoking",
];

export interface BookableTable {
  id: string;
  /** "T23" — what the floor plan and the confirmation call it. */
  label: string;
  /** Every section the table belongs to; the first names it in the summary. */
  zones: readonly ZoneId[];
}

const ZONE_SETS: readonly (readonly ZoneId[])[] = [
  ["families", "indoor", "non_smoking"],
  ["singles", "indoor", "non_smoking"],
  ["families", "outdoor", "smoking"],
  ["majlis", "indoor", "non_smoking"],
  ["vip", "indoor", "non_smoking"],
];

/** A five-by-five floor, as the picker draws it. */
export const BOOKABLE_TABLES: readonly BookableTable[] = Array.from({ length: 25 }, (_, index) => ({
  id: `table-${index + 1}`,
  label: `T${index + 1}`,
  zones: ZONE_SETS[index % ZONE_SETS.length],
}));

/** The seatings a table can be booked for, HH:mm. */
export const BOOKING_TIMES: readonly string[] = ["19:00", "20:00", "20:30", "21:00", "21:30"];

export const OCCASIONS = ["none", "business", "anniversary", "birthday"] as const;
export type OccasionId = (typeof OCCASIONS)[number];

export const CONTACT_METHODS = ["whatsapp", "sms", "call"] as const;
export type ContactMethodId = (typeof CONTACT_METHODS)[number];

/** Held against the bill; charged to confirm the reservation. */
export const BOOKING_DEPOSIT_SAR = 50;

/** yyyy-mm-dd in the visitor's own time zone. */
export function localDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Same-day tables are taken as gone, which is when the waitlist is offered. */
export function hasFreeTables(dateKey: string, today: string = localDateKey(new Date())): boolean {
  return dateKey !== today;
}

export interface WaitlistQuote {
  position: number;
  minMinutes: number;
  maxMinutes: number;
}

/** Where a party would stand on the waitlist, and the wait that goes with it. */
export function quoteWaitlist(guests: number): WaitlistQuote {
  const position = 4 + Math.min(4, Math.max(1, Math.ceil(guests / 2)));
  return { position, minMinutes: 15, maxMinutes: 20 };
}
