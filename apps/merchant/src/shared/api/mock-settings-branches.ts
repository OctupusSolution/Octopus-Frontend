// Mock data for /settings/branches — 12 branches, 6 cities, 34 sections,
// 287 tables. Table rows are generated deterministically (mulberry32, same
// approach as mock-finance) so the file stays readable. KPI values are
// computed from the arrays so the cards can never disagree with the table.
import type { KpiCard } from "./mock-dashboard";

export type BranchType = "Dine-in" | "Cloud Kitchen" | "Drive-thru" | "Kiosk";
export type BranchStatus = "Active" | "Inactive";
export type TableStatus = "Available" | "Reserved" | "Occupied";
export type DayKey = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

export interface BranchTable {
  name: string;
  seats: number;
  status: TableStatus;
}
export interface BranchSection {
  name: string;
  capacity: number;
  tables: readonly BranchTable[];
}
export interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}
export interface Branch {
  id: string;
  nameEn: string;
  nameAr: string;
  city: string;
  type: BranchType;
  address: string;
  staff: number;
  status: BranchStatus;
  sections: readonly BranchSection[];
  hours: Readonly<Record<DayKey, DayHours>>;
  /** Present only when the branch runs a Ramadan schedule. */
  ramadan?: { enabled: boolean; hours: Readonly<Record<DayKey, DayHours>> };
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TABLE_STATUS_POOL: readonly TableStatus[] = ["Available", "Available", "Available", "Available", "Reserved", "Occupied"];

function makeTables(sectionName: string, count: number, seed: number): readonly BranchTable[] {
  const rnd = mulberry32(seed);
  const prefix = sectionName.includes("Lane") || sectionName.includes("Line") ? "L" : "T";
  return Array.from({ length: count }, (_, i) => ({
    name: `${prefix}${String(i + 1).padStart(2, "0")}`,
    seats: [2, 2, 4, 4, 4, 6, 6, 8][Math.floor(rnd() * 8)],
    status: TABLE_STATUS_POOL[Math.floor(rnd() * TABLE_STATUS_POOL.length)],
  }));
}

function makeSection(name: string, capacity: number, tables: number, seed: number): BranchSection {
  return { name, capacity, tables: makeTables(name, tables, seed) };
}

type SectionSpec = readonly [name: string, capacity: number, tables: number, seed: number];
type BranchSpec = readonly [
  id: string, nameEn: string, nameAr: string, city: string, type: BranchType,
  address: string, staff: number, status: BranchStatus,
  hours: "dine-in" | "24h" | "tahlia" | "balad" | "makkah",
  ramadan: boolean, sections: readonly SectionSpec[],
];

const HOURS_TEMPLATES: Record<"dine-in" | "24h" | "tahlia" | "balad" | "makkah", Readonly<Record<DayKey, DayHours>>> = {
  "dine-in": {
    sun: { open: "10:00", close: "23:00", closed: false },
    mon: { open: "10:00", close: "23:00", closed: false },
    tue: { open: "10:00", close: "23:00", closed: false },
    wed: { open: "10:00", close: "23:00", closed: false },
    thu: { open: "10:00", close: "23:59", closed: false },
    fri: { open: "12:30", close: "23:59", closed: false },
    sat: { open: "12:30", close: "23:00", closed: false },
  },
  "24h": {
    sun: { open: "00:00", close: "23:59", closed: false },
    mon: { open: "00:00", close: "23:59", closed: false },
    tue: { open: "00:00", close: "23:59", closed: false },
    wed: { open: "00:00", close: "23:59", closed: false },
    thu: { open: "00:00", close: "23:59", closed: false },
    fri: { open: "00:00", close: "23:59", closed: false },
    sat: { open: "00:00", close: "23:59", closed: false },
  },
  tahlia: {
    sun: { open: "08:00", close: "02:00", closed: false },
    mon: { open: "08:00", close: "02:00", closed: false },
    tue: { open: "08:00", close: "02:00", closed: false },
    wed: { open: "08:00", close: "02:00", closed: false },
    thu: { open: "08:00", close: "03:00", closed: false },
    fri: { open: "08:00", close: "03:00", closed: false },
    sat: { open: "08:00", close: "02:00", closed: false },
  },
  balad: {
    sun: { open: "16:00", close: "23:00", closed: false },
    mon: { open: "16:00", close: "23:00", closed: false },
    tue: { open: "16:00", close: "23:00", closed: false },
    wed: { open: "16:00", close: "23:00", closed: false },
    thu: { open: "16:00", close: "23:00", closed: false },
    fri: { open: "16:00", close: "23:00", closed: false },
    sat: { open: "16:00", close: "23:00", closed: false },
  },
  makkah: {
    sun: { open: "08:00", close: "23:59", closed: false },
    mon: { open: "08:00", close: "23:59", closed: false },
    tue: { open: "08:00", close: "23:59", closed: false },
    wed: { open: "08:00", close: "23:59", closed: false },
    thu: { open: "08:00", close: "23:59", closed: false },
    fri: { open: "08:00", close: "23:59", closed: false },
    sat: { open: "08:00", close: "23:59", closed: false },
  },
};

const RAMADAN_HOURS: Readonly<Record<DayKey, DayHours>> = {
  sun: { open: "13:00", close: "23:59", closed: false },
  mon: { open: "13:00", close: "23:59", closed: false },
  tue: { open: "13:00", close: "23:59", closed: false },
  wed: { open: "13:00", close: "23:59", closed: false },
  thu: { open: "13:00", close: "02:00", closed: false },
  fri: { open: "13:00", close: "02:00", closed: false },
  sat: { open: "13:00", close: "02:00", closed: false },
};

const BRANCH_SPECS: readonly BranchSpec[] = [
  ["br-1", "Riyadh - Olaya", "الرياض - العليا", "Riyadh", "Dine-in", "King Fahd Road, Al Olaya District, Riyadh 12211", 24, "Active", "dine-in", true, [
    ["Main Hall", 18, 17, 1], ["Terrace", 14, 14, 2], ["Family", 12, 10, 3], ["Private Rooms", 8, 8, 4], ["Business Lounge", 6, 4, 5],
  ]],
  ["br-2", "Riyadh - Narjis", "الرياض - النرجس", "Riyadh", "Dine-in", "Prince Mohammed bin Salman Rd, Al Narjis District, Riyadh 13326", 18, "Active", "dine-in", true, [
    ["Main Hall", 14, 10, 6], ["Family", 10, 8, 7], ["Outdoor", 10, 8, 8], ["Family Majlis", 8, 6, 9],
  ]],
  ["br-3", "Riyadh - Airport", "الرياض - المطار", "Riyadh", "Cloud Kitchen", "King Khalid International Airport, Terminal 5, Riyadh 11564", 9, "Active", "24h", false, [
    ["Production Line A", 4, 2, 10], ["Production Line B", 4, 2, 11],
  ]],
  ["br-4", "Jeddah - Corniche", "جدة - الكورنيش", "Jeddah", "Dine-in", "Corniche Road, Ash Shati District, Jeddah 23613", 31, "Active", "dine-in", true, [
    ["Main Hall", 20, 20, 12], ["Terrace", 16, 16, 13], ["Seafront", 12, 12, 14], ["Private", 8, 6, 15], ["Sheesha Terrace", 8, 6, 16],
  ]],
  ["br-5", "Jeddah - Tahlia", "جدة - التحلية", "Jeddah", "Drive-thru", "Prince Mohammed bin Abdulaziz St, Al Tahlia, Jeddah 21371", 14, "Active", "tahlia", false, [
    ["Drive Lanes", 4, 2, 17],
  ]],
  ["br-6", "Jeddah - Balad", "جدة - البلد", "Jeddah", "Kiosk", "Al Balad, Souq Al Alawi, Jeddah 22233", 5, "Active", "balad", false, [
    ["Kiosk Line", 4, 2, 18],
  ]],
  ["br-7", "Dammam - Corniche", "الدمام - الكورنيش", "Dammam", "Dine-in", "Corniche Road, Al Shatea District, Dammam 32414", 22, "Active", "dine-in", false, [
    ["Main Hall", 16, 16, 19], ["Family", 12, 12, 20], ["Private", 6, 4, 21], ["Kids Zone", 6, 4, 22],
  ]],
  ["br-8", "Al Khobar - Rakah", "الخبر - الراكة", "Al Khobar", "Dine-in", "Prince Faisal bin Fahd Rd, Ar Rakah, Al Khobar 34424", 17, "Active", "dine-in", false, [
    ["Main Hall", 16, 16, 23], ["Family", 8, 6, 24], ["Terrace", 12, 11, 25], ["Family Majlis", 6, 3, 26],
  ]],
  ["br-9", "Makkah - Aziziyah", "مكة - العزيزية", "Makkah", "Cloud Kitchen", "Ibrahim Al Khalil Rd, Al Aziziyah, Makkah 24243", 6, "Inactive", "24h", true, [
    ["Production Line", 4, 2, 27],
  ]],
  ["br-10", "Makkah - Ibrahim Khalil", "مكة - إبراهيم الخليل", "Makkah", "Dine-in", "Ibrahim Al Khalil Rd, Haram District, Makkah 24231", 26, "Active", "makkah", true, [
    ["Main Hall", 18, 18, 28], ["Family", 14, 14, 29], ["Upper Gallery", 8, 6, 30],
  ]],
  ["br-11", "Madinah - Quba", "المدينة - قباء", "Madinah", "Dine-in", "Quba Road, Al Qiblatain, Madinah 42351", 15, "Active", "dine-in", false, [
    ["Main Hall", 12, 12, 31], ["Family", 8, 6, 32],
  ]],
  ["br-12", "Madinah - Airport", "المدينة - المطار", "Madinah", "Cloud Kitchen", "Prince Mohammed bin Abdulaziz International Airport, Madinah 42352", 7, "Active", "24h", false, [
    ["Production Line A", 4, 2, 33], ["Production Line B", 4, 2, 34],
  ]],
];

export const branches: readonly Branch[] = BRANCH_SPECS.map((spec) => {
  const [id, nameEn, nameAr, city, type, address, staff, status, hoursKey, hasRamadan, sectionsSpec] = spec;
  return {
    id, nameEn, nameAr, city, type, address, staff, status,
    hours: HOURS_TEMPLATES[hoursKey],
    ...(hasRamadan ? { ramadan: { enabled: true, hours: RAMADAN_HOURS } } : {}),
    sections: sectionsSpec.map(([name, capacity, tables, seed]) => makeSection(name, capacity, tables, seed)),
  };
}) as readonly Branch[];

/* ---------------------------------------------------------------- KPI row */

const cityCount = new Set(branches.map((b) => b.city)).size;
const sectionCount = branches.reduce((sum, b) => sum + b.sections.length, 0);
const tableCount = branches.reduce(
  (sum, b) => sum + b.sections.reduce((s, sec) => s + sec.tables.length, 0),
  0
);

export const branchKpis: readonly KpiCard[] = [
  {
    id: "br-kpi-branches",
    label: "Branches",
    value: String(branches.length),
    delta: "+2",
    deltaNote: "vs last quarter",
    color: "#a78bfa",
    sparkline: [8, 9, 9, 10, 10, 11, 11, 12],
  },
  {
    id: "br-kpi-cities",
    label: "Cities",
    value: String(cityCount),
    delta: "+1",
    deltaNote: "vs last quarter",
    color: "#60a5fa",
    sparkline: [4, 4, 5, 5, 5, 6, 6, 6],
  },
  {
    id: "br-kpi-sections",
    label: "Sections",
    value: String(sectionCount),
    delta: "+4",
    deltaNote: "vs last quarter",
    color: "#a3e635",
    sparkline: [26, 27, 29, 30, 31, 32, 33, 34],
  },
  {
    id: "br-kpi-tables",
    label: "Tables",
    value: String(tableCount),
    delta: "+23",
    deltaNote: "vs last quarter",
    color: "#fb923c",
    sparkline: [240, 248, 255, 260, 268, 274, 281, 287],
  },
] as const;
