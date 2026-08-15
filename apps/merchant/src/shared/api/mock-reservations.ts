// Mock data for the Reservations module (Calendar, Floor Plan, Waitlist,
// Private Rooms & Events). Stands in for @octopus/api-client — shaped like a
// real API response so swapping this for TanStack Query hooks later is a
// one-file change. "Today" for every relative calculation in this module is
// fixed at 2026-08-08 (a Saturday — the Saudi week runs Sat -> Fri).
import type { KpiCard } from "./mock-dashboard";

export const TODAY = "2026-08-08";

export const branches = [
  "Riyadh - Olaya",
  "Riyadh - Narjis",
  "Jeddah - Corniche",
  "Dammam - Corniche",
  "Khobar - Rakah",
] as const;
export type Branch = (typeof branches)[number];

// Deterministic small "trend" generator so KPI sparklines don't need 16
// hand-typed numbers each — still fully static per render, no Math.random.
function buildSparkline(start: number, end: number, wobble: number): number[] {
  const points = 16;
  return Array.from({ length: points }, (_, i) => {
    const p = i / (points - 1);
    const base = start + (end - start) * p;
    const wave = Math.sin(i * 1.3) * wobble;
    return Math.round((base + wave) * 10) / 10;
  });
}

/* ================================================================== Calendar */

export type ReservationStatus = "Confirmed" | "Seated" | "Completed" | "No-show" | "Cancelled";
export type ReservationSource = "Phone" | "Website" | "Walk-in" | "Mobile App" | "Aggregator";

export interface Reservation {
  id: string;
  /** ISO date, e.g. "2026-08-08" */
  date: string;
  /** minutes from midnight; 10:00 -> 600, next-day 02:00 -> 1560 (24 + 2 = 26h) */
  startMinutes: number;
  durationMinutes: number;
  guest: string;
  phone: string;
  partySize: number;
  table: string;
  branch: Branch;
  source: ReservationSource;
  status: ReservationStatus;
  notes?: string;
  allergyTags?: readonly string[];
}

// hour < 10 means "after midnight", stored as the next-day offset (24 + hour).
function at(hour: number, minute: number): number {
  const h = hour < 10 ? hour + 24 : hour;
  return h * 60 + minute;
}

function phoneFor(index: number): string {
  return `+9665${String(10000000 + index * 137).slice(0, 8)}`;
}

// 15 hand-authored reservations across the current week (Sat 8 -> Fri 14 Aug
// 2026), mixing every status and source so Day/Week/Month all have something
// to show without needing generated filler.
export const reservations: Reservation[] = [
  // --- Sat 8 Aug (today) ---
  { id: "res-001", date: "2026-08-08", startMinutes: at(12, 0), durationMinutes: 90, guest: "Faisal Al-Otaibi", phone: phoneFor(1), partySize: 4, table: "T-12", branch: "Riyadh - Olaya", source: "Phone", status: "Completed" },
  { id: "res-002", date: "2026-08-08", startMinutes: at(12, 30), durationMinutes: 60, guest: "Noura Al-Harbi", phone: phoneFor(2), partySize: 2, table: "T-04", branch: "Jeddah - Corniche", source: "Website", status: "Completed" },
  { id: "res-003", date: "2026-08-08", startMinutes: at(13, 0), durationMinutes: 120, guest: "Abdullah Al-Qahtani", phone: phoneFor(3), partySize: 6, table: "T-21", branch: "Riyadh - Narjis", source: "Mobile App", status: "Seated" },
  { id: "res-004", date: "2026-08-08", startMinutes: at(13, 15), durationMinutes: 90, guest: "Sara Al-Dosari", phone: phoneFor(4), partySize: 3, table: "T-08", branch: "Dammam - Corniche", source: "Walk-in", status: "Seated", notes: "Prefers a quiet corner table.", allergyTags: ["Shellfish"] },
  { id: "res-005", date: "2026-08-08", startMinutes: at(14, 0), durationMinutes: 60, guest: "Maha Al-Shammari", phone: phoneFor(5), partySize: 2, table: "T-02", branch: "Jeddah - Corniche", source: "Phone", status: "No-show" },
  { id: "res-006", date: "2026-08-08", startMinutes: at(18, 30), durationMinutes: 120, guest: "Omar Al-Ghamdi", phone: phoneFor(6), partySize: 8, table: "T-30", branch: "Riyadh - Narjis", source: "Website", status: "Confirmed", notes: "Birthday — requested a small cake at the table." },
  { id: "res-007", date: "2026-08-08", startMinutes: at(19, 0), durationMinutes: 90, guest: "Lama Al-Zahrani", phone: phoneFor(7), partySize: 4, table: "T-11", branch: "Dammam - Corniche", source: "Mobile App", status: "Confirmed" },
  { id: "res-008", date: "2026-08-08", startMinutes: at(19, 15), durationMinutes: 60, guest: "Turki Al-Anazi", phone: phoneFor(8), partySize: 2, table: "T-06", branch: "Riyadh - Olaya", source: "Walk-in", status: "Cancelled" },
  { id: "res-009", date: "2026-08-08", startMinutes: at(20, 30), durationMinutes: 90, guest: "Hessa Al-Amri", phone: phoneFor(9), partySize: 2, table: "T-01", branch: "Dammam - Corniche", source: "Website", status: "Confirmed", allergyTags: ["Nuts", "Gluten"] },

  // --- Sun 9 Aug ---
  { id: "res-010", date: "2026-08-09", startMinutes: at(12, 30), durationMinutes: 90, guest: "Fahad Al-Rashidi", phone: phoneFor(10), partySize: 2, table: "T-05", branch: "Riyadh - Olaya", source: "Aggregator", status: "Confirmed" },

  // --- Mon 10 Aug ---
  { id: "res-011", date: "2026-08-10", startMinutes: at(13, 0), durationMinutes: 90, guest: "Dana Al-Balawi", phone: phoneFor(16), partySize: 4, table: "T-16", branch: "Jeddah - Corniche", source: "Website", status: "Confirmed" },

  // --- Tue 11 Aug ---
  { id: "res-012", date: "2026-08-11", startMinutes: at(19, 30), durationMinutes: 105, guest: "Khalid Al-Mutairi", phone: phoneFor(18), partySize: 4, table: "T-13", branch: "Riyadh - Narjis", source: "Mobile App", status: "Confirmed" },

  // --- Wed 12 Aug ---
  { id: "res-013", date: "2026-08-12", startMinutes: at(12, 0), durationMinutes: 90, guest: "Omar Al-Ghamdi", phone: phoneFor(6), partySize: 4, table: "T-15", branch: "Riyadh - Olaya", source: "Phone", status: "Confirmed" },

  // --- Thu 13 Aug ---
  { id: "res-014", date: "2026-08-13", startMinutes: at(19, 30), durationMinutes: 120, guest: "Nawaf Al-Qarni", phone: phoneFor(13), partySize: 8, table: "T-28", branch: "Riyadh - Narjis", source: "Aggregator", status: "Confirmed", notes: "Corporate dinner — needs the bill split three ways." },

  // --- Fri 14 Aug ---
  { id: "res-015", date: "2026-08-14", startMinutes: at(20, 0), durationMinutes: 150, guest: "Abdullah Al-Qahtani", phone: phoneFor(3), partySize: 10, table: "T-30", branch: "Khobar - Rakah", source: "Website", status: "Confirmed", notes: "Family gathering, needs two tables joined." },
];

/* ================================================================ Floor plan */

export type ZoneName = "Main Hall" | "Terrace" | "Family Section" | "Private Rooms";
export const zones: readonly ZoneName[] = ["Main Hall", "Terrace", "Family Section", "Private Rooms"];

export type TableShape = "round" | "rect";
export type TableStatus = "Available" | "Occupied" | "Reserved" | "Needs Cleaning" | "Blocked";

export interface FloorTable {
  id: string;
  zone: ZoneName;
  number: string;
  shape: TableShape;
  seats: number;
  occupiedSeats?: number;
  x: number; // percent, left
  y: number; // percent, top
  size: number; // percent, width/diameter of the table footprint
  status: TableStatus;
  currentOrder?: { id: string; items: number; total: string; startedAt: string };
}

export const zoneMetrics: Record<ZoneName, { avgTurnTimeMin: number }> = {
  "Main Hall": { avgTurnTimeMin: 68 },
  Terrace: { avgTurnTimeMin: 74 },
  "Family Section": { avgTurnTimeMin: 92 },
  "Private Rooms": { avgTurnTimeMin: 140 },
};

export const floorTables: readonly FloorTable[] = [
  // Main Hall — 8 tables, 2 rows x 4 cols
  { id: "ft-01", zone: "Main Hall", number: "T-01", shape: "round", seats: 2, occupiedSeats: 2, x: 12, y: 18, size: 12, status: "Occupied", currentOrder: { id: "ORD-9931", items: 3, total: "SAR 142.00", startedAt: "12:40" } },
  { id: "ft-02", zone: "Main Hall", number: "T-02", shape: "round", seats: 2, x: 32, y: 18, size: 12, status: "Available" },
  { id: "ft-03", zone: "Main Hall", number: "T-03", shape: "rect", seats: 4, occupiedSeats: 3, x: 52, y: 16, size: 16, status: "Occupied", currentOrder: { id: "ORD-9934", items: 5, total: "SAR 268.50", startedAt: "13:05" } },
  { id: "ft-04", zone: "Main Hall", number: "T-04", shape: "rect", seats: 4, x: 76, y: 16, size: 16, status: "Reserved" },
  { id: "ft-05", zone: "Main Hall", number: "T-05", shape: "round", seats: 2, x: 12, y: 55, size: 12, status: "Needs Cleaning" },
  { id: "ft-06", zone: "Main Hall", number: "T-06", shape: "round", seats: 2, x: 32, y: 55, size: 12, status: "Available" },
  { id: "ft-07", zone: "Main Hall", number: "T-07", shape: "rect", seats: 6, occupiedSeats: 6, x: 56, y: 53, size: 20, status: "Occupied", currentOrder: { id: "ORD-9940", items: 9, total: "SAR 512.00", startedAt: "12:15" } },
  { id: "ft-08", zone: "Main Hall", number: "T-08", shape: "round", seats: 2, x: 84, y: 55, size: 12, status: "Blocked" },

  // Terrace — 8 tables, 2 rows x 4 cols
  { id: "ft-13", zone: "Terrace", number: "T-13", shape: "rect", seats: 4, x: 12, y: 24, size: 16, status: "Available" },
  { id: "ft-14", zone: "Terrace", number: "T-14", shape: "rect", seats: 4, occupiedSeats: 2, x: 36, y: 24, size: 16, status: "Occupied", currentOrder: { id: "ORD-9950", items: 2, total: "SAR 88.00", startedAt: "13:40" } },
  { id: "ft-15", zone: "Terrace", number: "T-15", shape: "rect", seats: 4, x: 60, y: 24, size: 16, status: "Reserved" },
  { id: "ft-16", zone: "Terrace", number: "T-16", shape: "rect", seats: 4, x: 84, y: 24, size: 16, status: "Available" },
  { id: "ft-17", zone: "Terrace", number: "T-17", shape: "round", seats: 2, x: 16, y: 62, size: 12, status: "Needs Cleaning" },
  { id: "ft-18", zone: "Terrace", number: "T-18", shape: "round", seats: 2, x: 40, y: 62, size: 12, status: "Available" },
  { id: "ft-19", zone: "Terrace", number: "T-19", shape: "round", seats: 2, x: 64, y: 62, size: 12, status: "Blocked" },
  { id: "ft-20", zone: "Terrace", number: "T-20", shape: "round", seats: 2, x: 88, y: 62, size: 12, status: "Available" },

  // Family Section — 6 tables, larger
  { id: "ft-21", zone: "Family Section", number: "T-21", shape: "rect", seats: 6, occupiedSeats: 5, x: 16, y: 26, size: 22, status: "Occupied", currentOrder: { id: "ORD-9955", items: 7, total: "SAR 384.00", startedAt: "12:55" } },
  { id: "ft-22", zone: "Family Section", number: "T-22", shape: "rect", seats: 6, x: 50, y: 26, size: 22, status: "Reserved" },
  { id: "ft-23", zone: "Family Section", number: "T-23", shape: "rect", seats: 8, x: 82, y: 30, size: 24, status: "Available" },
  { id: "ft-24", zone: "Family Section", number: "T-24", shape: "rect", seats: 6, x: 16, y: 68, size: 22, status: "Available" },
  { id: "ft-25", zone: "Family Section", number: "T-25", shape: "rect", seats: 6, x: 50, y: 68, size: 22, status: "Needs Cleaning" },
  { id: "ft-26", zone: "Family Section", number: "T-26", shape: "rect", seats: 8, x: 84, y: 70, size: 24, status: "Available" },

  // Private Rooms — 4 large rooms
  { id: "ft-27", zone: "Private Rooms", number: "Room A", shape: "rect", seats: 10, occupiedSeats: 8, x: 25, y: 28, size: 32, status: "Occupied", currentOrder: { id: "ORD-9960", items: 14, total: "SAR 1,240.00", startedAt: "19:10" } },
  { id: "ft-28", zone: "Private Rooms", number: "Room B", shape: "rect", seats: 10, x: 75, y: 28, size: 32, status: "Reserved" },
  { id: "ft-29", zone: "Private Rooms", number: "Room C", shape: "rect", seats: 14, x: 25, y: 70, size: 36, status: "Available" },
  { id: "ft-30", zone: "Private Rooms", number: "Room D", shape: "rect", seats: 12, x: 75, y: 70, size: 34, status: "Blocked" },
];

/* =================================================================== Waitlist */

export type WaitlistStatus = "Waiting" | "Notified" | "Seated" | "Left";

export interface WaitlistRow {
  id: string;
  position: number;
  guest: string;
  phone: string;
  partySize: number;
  quotedWaitMin: number;
  actualWaitMin: number;
  status: WaitlistStatus;
}

export const waitlistStats: readonly KpiCard[] = [
  { id: "parties-waiting", label: "PARTIES WAITING", value: "12", delta: "+3", deltaNote: "vs last hour",
    color: "#fb923c", sparkline: buildSparkline(6, 12, 1) },
  { id: "avg-wait", label: "AVG WAIT", value: "18", valueUnit: "common.minuteShort", delta: "+2", deltaUnit: "common.minuteShort", deltaNote: "vs last hour",
    color: "#a78bfa", sparkline: buildSparkline(12, 18, 1.5) },
  { id: "longest-wait", label: "LONGEST WAIT", value: "41", valueUnit: "common.minuteShort", delta: "+6", deltaUnit: "common.minuteShort", deltaNote: "vs last hour",
    color: "#f59e0b", sparkline: buildSparkline(28, 41, 2) },
  { id: "quoted-accuracy", label: "QUOTED ACCURACY", value: "92%", delta: "+1.4%", deltaNote: "vs last week",
    color: "#60a5fa", sparkline: buildSparkline(88, 92, 1) },
] as const;

export const waitlistRows: WaitlistRow[] = [
  { id: "wl-1", position: 1, guest: "Reem Al-Subaie", phone: phoneFor(21), partySize: 3, quotedWaitMin: 15, actualWaitMin: 18, status: "Waiting" },
  { id: "wl-2", position: 2, guest: "Yousef Al-Harthi", phone: phoneFor(22), partySize: 6, quotedWaitMin: 25, actualWaitMin: 22, status: "Notified" },
  { id: "wl-3", position: 3, guest: "Fahad Al-Rashidi", phone: phoneFor(23), partySize: 2, quotedWaitMin: 10, actualWaitMin: 9, status: "Waiting" },
  { id: "wl-4", position: 4, guest: "Amal Al-Enezi", phone: phoneFor(24), partySize: 4, quotedWaitMin: 20, actualWaitMin: 31, status: "Waiting" },
  { id: "wl-5", position: 5, guest: "Bandar Al-Juhani", phone: phoneFor(25), partySize: 5, quotedWaitMin: 30, actualWaitMin: 5, status: "Waiting" },
  { id: "wl-6", position: 6, guest: "Nawaf Al-Qarni", phone: phoneFor(26), partySize: 2, quotedWaitMin: 12, actualWaitMin: 12, status: "Seated" },
  { id: "wl-7", position: 7, guest: "Aisha Al-Malki", phone: phoneFor(27), partySize: 3, quotedWaitMin: 18, actualWaitMin: 41, status: "Waiting" },
  { id: "wl-8", position: 8, guest: "Salman Al-Otaibi", phone: phoneFor(28), partySize: 2, quotedWaitMin: 15, actualWaitMin: 14, status: "Left" },
  { id: "wl-9", position: 9, guest: "Dana Al-Balawi", phone: phoneFor(29), partySize: 4, quotedWaitMin: 22, actualWaitMin: 20, status: "Notified" },
  { id: "wl-10", position: 10, guest: "Rakan Al-Shehri", phone: phoneFor(30), partySize: 2, quotedWaitMin: 10, actualWaitMin: 3, status: "Waiting" },
];

/* ====================================================== Private Rooms & Events */

export type DepositStatus = "Deposit Paid" | "Pending" | "Refunded";
export type EventFilterPeriod = "Upcoming" | "This Month" | "Past";
export type EventStatus = "Confirmed" | "Reminder Sent" | "Completed" | "Cancelled";

export interface EventTimelineStep {
  time: string;
  label: string;
}

export interface EventAvRequirement {
  label: string;
  enabled: boolean;
}

export interface EventBooking {
  id: string;
  name: string;
  room: string;
  date: string; // ISO date
  time: string;
  guestCount: number;
  organiser: string;
  organiserPhone: string;
  depositStatus: DepositStatus;
  status: EventStatus;
  package: string;
  paid: number;
  total: number;
  avRequirements?: readonly EventAvRequirement[];
  notes?: string;
  timeline?: readonly EventTimelineStep[];
}

export const eventStats: readonly KpiCard[] = [
  { id: "upcoming-events", label: "UPCOMING EVENTS", value: "9", delta: "+2", deltaNote: "vs last week",
    color: "#a78bfa", sparkline: buildSparkline(5, 9, 1) },
  { id: "rooms-booked", label: "ROOMS BOOKED THIS WEEK", value: "14", delta: "+3", deltaNote: "vs last week",
    color: "#60a5fa", sparkline: buildSparkline(9, 14, 1) },
  { id: "deposit-held", label: "DEPOSIT HELD", value: "SAR 48.5K", delta: "+9.1%", deltaNote: "vs last month",
    color: "#a3e635", sparkline: buildSparkline(38, 48.5, 3) },
  { id: "avg-event-value", label: "AVG EVENT VALUE", value: "SAR 6,200", delta: "+4.6%", deltaNote: "vs last month",
    color: "#fb923c", sparkline: buildSparkline(5400, 6200, 200) },
] as const;

export const eventBookings: readonly EventBooking[] = [
  { id: "evt-1", name: "Al-Fahad Wedding Reception", room: "Room A", date: "2026-08-09", time: "19:00", guestCount: 80, organiser: "Munira Al-Fahad", organiserPhone: phoneFor(31), depositStatus: "Deposit Paid", status: "Confirmed", package: "Grand Celebration Package", paid: 25000, total: 32000,
    avRequirements: [
      { label: "Stage lighting", enabled: true },
      { label: "Wireless mic x2", enabled: true },
      { label: "Projector for family video", enabled: true },
    ],
    notes: "Bride requests an all-white floral theme.",
    timeline: [{ time: "17:00", label: "Room setup begins" }, { time: "18:30", label: "Catering staff briefing" }, { time: "19:00", label: "Guest arrival" }, { time: "23:00", label: "Event end / breakdown" }] },
  { id: "evt-2", name: "Aramco Quarterly Dinner", room: "Room B", date: "2026-08-10", time: "20:00", guestCount: 40, organiser: "Khalid Al-Otaibi", organiserPhone: phoneFor(32), depositStatus: "Deposit Paid", status: "Confirmed", package: "Corporate Dinner Package", paid: 12000, total: 12000,
    avRequirements: [
      { label: "HDMI presentation screen", enabled: true },
      { label: "Podium mic", enabled: true },
    ],
    notes: "Requires a halal-certified menu card printed in English and Arabic.",
    timeline: [{ time: "19:30", label: "Room setup begins" }, { time: "20:00", label: "Guest arrival" }, { time: "22:30", label: "Event end / breakdown" }] },
  { id: "evt-3", name: "Al-Ghamdi Family Iftar", room: "Room C", date: "2026-08-12", time: "18:45", guestCount: 55, organiser: "Sultan Al-Ghamdi", organiserPhone: phoneFor(33), depositStatus: "Pending", status: "Confirmed", package: "Ramadan Majlis Package", paid: 0, total: 9500 },
  { id: "evt-4", name: "STC Product Launch", room: "Room B", date: "2026-08-14", time: "17:00", guestCount: 60, organiser: "Lujain Al-Harbi", organiserPhone: phoneFor(34), depositStatus: "Deposit Paid", status: "Confirmed", package: "Corporate Dinner Package", paid: 9000, total: 18000,
    avRequirements: [
      { label: "Full AV stage", enabled: true },
      { label: "Live-stream camera feed", enabled: true },
      { label: "Branded backdrop", enabled: false },
    ],
    timeline: [{ time: "15:00", label: "AV crew load-in" }, { time: "16:30", label: "Sound check" }, { time: "17:00", label: "Guest arrival" }] },
  { id: "evt-5", name: "Bin Salamah 40th Birthday", room: "Room A", date: "2026-08-18", time: "20:30", guestCount: 70, organiser: "Reem Bin Salamah", organiserPhone: phoneFor(35), depositStatus: "Deposit Paid", status: "Confirmed", package: "Grand Celebration Package", paid: 20000, total: 28000 },
  { id: "evt-6", name: "Ministry Delegation Lunch", room: "Room D", date: "2026-08-21", time: "13:00", guestCount: 24, organiser: "Faisal Al-Zahrani", organiserPhone: phoneFor(36), depositStatus: "Pending", status: "Confirmed", package: "Executive Lunch Package", paid: 0, total: 7200 },
  { id: "evt-7", name: "Al-Rasheed Engagement", room: "Room C", date: "2026-08-27", time: "19:30", guestCount: 90, organiser: "Haifa Al-Rasheed", organiserPhone: phoneFor(37), depositStatus: "Deposit Paid", status: "Reminder Sent", package: "Grand Celebration Package", paid: 15000, total: 34000 },
  { id: "evt-8", name: "Tamimi Group Board Dinner", room: "Room B", date: "2026-07-22", time: "20:00", guestCount: 18, organiser: "Waleed Al-Tamimi", organiserPhone: phoneFor(38), depositStatus: "Refunded", status: "Completed", package: "Executive Lunch Package", paid: 0, total: 5400 },
  { id: "evt-9", name: "Al-Dosari Graduation Dinner", room: "Room A", date: "2026-07-15", time: "19:00", guestCount: 45, organiser: "Nada Al-Dosari", organiserPhone: phoneFor(39), depositStatus: "Deposit Paid", status: "Completed", package: "Corporate Dinner Package", paid: 8000, total: 8000 },
];
