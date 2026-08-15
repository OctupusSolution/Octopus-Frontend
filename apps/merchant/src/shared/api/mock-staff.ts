// Mock data for the Staff module (Employees, Schedule, Attendance, Tips,
// Payroll Inputs). Stands in for @octopus/api-client — same rule as
// mock-dashboard.ts. Shapes mirror what real endpoints would return so
// swapping these for TanStack Query hooks later is a drop-in change.

import type { KpiCard } from "./mock-dashboard";

export const TODAY = "2026-08-09";

export const branches = [
  "Riyadh - Olaya",
  "Riyadh - Narjis",
  "Jeddah - Corniche",
  "Dammam - Corniche",
  "Khobar - Rakah",
] as const;
export type Branch = (typeof branches)[number];

export type StaffRole = "Owner" | "Branch Manager" | "Cashier" | "Waiter" | "Kitchen" | "Driver";
export const staffRoles: readonly StaffRole[] = ["Owner", "Branch Manager", "Cashier", "Waiter", "Kitchen", "Driver"];

export type ShiftStatus = "On Shift" | "Off Duty" | "On Leave" | "Absent";
export type ContractType = "Full-time" | "Part-time" | "Seasonal";

/* ------------------------------------------------------------------ KPIs */

export const staffStats: readonly KpiCard[] = [
  {
    id: "total-employees",
    label: "TOTAL EMPLOYEES",
    value: "142",
    delta: "+3.1%",
    deltaNote: "vs last month",
    color: "#a78bfa",
    sparkline: [120, 122, 121, 125, 124, 128, 127, 131, 130, 134, 133, 137, 136, 140, 139, 142],
  },
  {
    id: "on-shift-now",
    label: "ON SHIFT NOW",
    value: "38",
    delta: "+5.6%",
    deltaNote: "vs same time yesterday",
    color: "#60a5fa",
    sparkline: [28, 30, 29, 32, 31, 34, 33, 36, 35, 37, 36, 38, 37, 39, 38, 38],
  },
  {
    id: "hours-this-week",
    label: "HOURS THIS WEEK",
    value: "2,847",
    delta: "+2.4%",
    deltaNote: "vs last week",
    color: "#a3e635",
    sparkline: [2600, 2620, 2610, 2650, 2640, 2680, 2670, 2710, 2700, 2740, 2730, 2780, 2770, 2820, 2810, 2847],
  },
  {
    id: "pending-leave",
    label: "PENDING LEAVE REQUESTS",
    value: "7",
    delta: "+2",
    deltaNote: "since yesterday",
    color: "#fb923c",
    sparkline: [3, 4, 3, 5, 4, 6, 5, 6, 5, 6, 5, 7, 6, 7, 6, 7],
  },
] as const;

/* ------------------------------------------------------------------ Employees */

export interface Employee {
  id: string;
  name: string;
  nameAr: string;
  phone: string;
  role: StaffRole;
  branch: Branch;
  status: ShiftStatus;
  todayShift: string; // "14:00–22:00" or "—"
  hoursThisWeek: number;
  attendance: number; // %
  hireDate: string; // ISO
  iqamaExpiry: string; // ISO
  contractType: ContractType;
  salaryBandMin: number;
  salaryBandMax: number;
  emergencyContactName: string;
  emergencyContactPhone: string;
  documents: readonly { name: string; type: string }[];
}

const SALARY_BAND: Record<StaffRole, [number, number]> = {
  Owner: [0, 0],
  "Branch Manager": [6000, 7500],
  Cashier: [2000, 2500],
  Waiter: [2200, 2800],
  Kitchen: [2500, 3200],
  Driver: [2300, 2900],
};

const DOCS = [
  { name: "HR File", type: "PDF" },
  { name: "Employment Contract", type: "PDF" },
  { name: "Iqama Copy", type: "Image" },
] as const;

export const employees: readonly Employee[] = [
  { id: "EMP-001", name: "Abdulrahman Al-Faisal", nameAr: "عبدالرحمن الفيصل", phone: "+966 50 111 2201", role: "Owner", branch: "Riyadh - Olaya", status: "On Shift", todayShift: "09:00 – 17:00", hoursThisWeek: 40, attendance: 100, hireDate: "2019-03-01", iqamaExpiry: "2028-04-12", contractType: "Full-time", salaryBandMin: 0, salaryBandMax: 0, emergencyContactName: "Nourah Al-Faisal", emergencyContactPhone: "+966 55 222 3301", documents: DOCS },
  { id: "EMP-002", name: "Faisal Al-Otaibi", nameAr: "فيصل العتيبي", phone: "+966 50 111 2202", role: "Branch Manager", branch: "Riyadh - Olaya", status: "On Shift", todayShift: "08:00 – 16:00", hoursThisWeek: 42, attendance: 98, hireDate: "2020-06-15", iqamaExpiry: "2026-08-30", contractType: "Full-time", salaryBandMin: 6000, salaryBandMax: 7500, emergencyContactName: "Huda Al-Otaibi", emergencyContactPhone: "+966 55 222 3302", documents: DOCS },
  { id: "EMP-003", name: "Amal Al-Subai'i", nameAr: "أمل السبيعي", phone: "+966 50 111 2203", role: "Branch Manager", branch: "Jeddah - Corniche", status: "On Shift", todayShift: "08:00 – 16:00", hoursThisWeek: 43, attendance: 99, hireDate: "2020-09-20", iqamaExpiry: "2027-11-02", contractType: "Full-time", salaryBandMin: 6000, salaryBandMax: 7500, emergencyContactName: "Sami Al-Subai'i", emergencyContactPhone: "+966 55 222 3303", documents: DOCS },
  { id: "EMP-004", name: "Turki Al-Zahrani", nameAr: "تركي الزهراني", phone: "+966 50 111 2204", role: "Branch Manager", branch: "Riyadh - Narjis", status: "Off Duty", todayShift: "—", hoursThisWeek: 40, attendance: 96, hireDate: "2021-01-10", iqamaExpiry: "2027-05-18", contractType: "Full-time", salaryBandMin: 6000, salaryBandMax: 7500, emergencyContactName: "Lama Al-Zahrani", emergencyContactPhone: "+966 55 222 3304", documents: DOCS },
  { id: "EMP-005", name: "Nasser Al-Qahtani", nameAr: "ناصر القحطاني", phone: "+966 50 111 2205", role: "Branch Manager", branch: "Dammam - Corniche", status: "On Shift", todayShift: "08:00 – 16:00", hoursThisWeek: 41, attendance: 97, hireDate: "2021-04-02", iqamaExpiry: "2027-02-27", contractType: "Full-time", salaryBandMin: 6000, salaryBandMax: 7500, emergencyContactName: "Wafa Al-Qahtani", emergencyContactPhone: "+966 55 222 3305", documents: DOCS },
  { id: "EMP-006", name: "Reem Al-Harbi", nameAr: "ريم الحربي", phone: "+966 50 111 2206", role: "Branch Manager", branch: "Khobar - Rakah", status: "On Shift", todayShift: "08:00 – 16:00", hoursThisWeek: 39, attendance: 95, hireDate: "2021-08-14", iqamaExpiry: "2028-01-09", contractType: "Full-time", salaryBandMin: 6000, salaryBandMax: 7500, emergencyContactName: "Fahad Al-Harbi", emergencyContactPhone: "+966 55 222 3306", documents: DOCS },
  { id: "EMP-007", name: "Sara Al-Qahtani", nameAr: "سارة القحطاني", phone: "+966 50 111 2207", role: "Cashier", branch: "Riyadh - Olaya", status: "On Shift", todayShift: "14:00 – 22:00", hoursThisWeek: 38, attendance: 95, hireDate: "2022-02-01", iqamaExpiry: "2027-07-21", contractType: "Full-time", salaryBandMin: 2000, salaryBandMax: 2500, emergencyContactName: "Aisha Al-Qahtani", emergencyContactPhone: "+966 55 222 3307", documents: DOCS },
  { id: "EMP-008", name: "Hind Al-Ghamdi", nameAr: "هند الغامدي", phone: "+966 50 111 2208", role: "Cashier", branch: "Dammam - Corniche", status: "Absent", todayShift: "—", hoursThisWeek: 22, attendance: 68, hireDate: "2022-05-19", iqamaExpiry: "2027-03-15", contractType: "Full-time", salaryBandMin: 2000, salaryBandMax: 2500, emergencyContactName: "Salman Al-Ghamdi", emergencyContactPhone: "+966 55 222 3308", documents: DOCS },
  { id: "EMP-009", name: "Latifa Al-Mansour", nameAr: "لطيفة المنصور", phone: "+966 50 111 2209", role: "Cashier", branch: "Jeddah - Corniche", status: "On Shift", todayShift: "09:00 – 17:00", hoursThisWeek: 40, attendance: 94, hireDate: "2022-07-03", iqamaExpiry: "2026-09-15", contractType: "Full-time", salaryBandMin: 2000, salaryBandMax: 2500, emergencyContactName: "Mona Al-Mansour", emergencyContactPhone: "+966 55 222 3309", documents: DOCS },
  { id: "EMP-010", name: "Fahad Al-Dosari", nameAr: "فهد الدوسري", phone: "+966 50 111 2210", role: "Cashier", branch: "Riyadh - Narjis", status: "Off Duty", todayShift: "—", hoursThisWeek: 30, attendance: 90, hireDate: "2023-01-22", iqamaExpiry: "2027-09-08", contractType: "Part-time", salaryBandMin: 2000, salaryBandMax: 2500, emergencyContactName: "Reem Al-Dosari", emergencyContactPhone: "+966 55 222 3310", documents: DOCS },
  { id: "EMP-011", name: "Manal Al-Amri", nameAr: "منال العمري", phone: "+966 50 111 2211", role: "Cashier", branch: "Khobar - Rakah", status: "On Shift", todayShift: "14:00 – 22:00", hoursThisWeek: 37, attendance: 93, hireDate: "2023-03-11", iqamaExpiry: "2027-12-30", contractType: "Full-time", salaryBandMin: 2000, salaryBandMax: 2500, emergencyContactName: "Bandar Al-Amri", emergencyContactPhone: "+966 55 222 3311", documents: DOCS },
  { id: "EMP-012", name: "Yara Al-Balawi", nameAr: "يارا البلوي", phone: "+966 50 111 2212", role: "Cashier", branch: "Riyadh - Olaya", status: "On Leave", todayShift: "—", hoursThisWeek: 0, attendance: 100, hireDate: "2023-06-05", iqamaExpiry: "2027-04-19", contractType: "Part-time", salaryBandMin: 2000, salaryBandMax: 2500, emergencyContactName: "Huda Al-Balawi", emergencyContactPhone: "+966 55 222 3312", documents: DOCS },
  { id: "EMP-013", name: "Mohammed Al-Harbi", nameAr: "محمد الحربي", phone: "+966 50 111 2213", role: "Waiter", branch: "Jeddah - Corniche", status: "On Shift", todayShift: "12:00 – 20:00", hoursThisWeek: 36, attendance: 92, hireDate: "2022-09-14", iqamaExpiry: "2027-06-27", contractType: "Full-time", salaryBandMin: 2200, salaryBandMax: 2800, emergencyContactName: "Nada Al-Harbi", emergencyContactPhone: "+966 55 222 3313", documents: DOCS },
  { id: "EMP-014", name: "Noura Al-Dosari", nameAr: "نورة الدوسري", phone: "+966 50 111 2214", role: "Waiter", branch: "Riyadh - Narjis", status: "On Leave", todayShift: "—", hoursThisWeek: 0, attendance: 100, hireDate: "2023-02-08", iqamaExpiry: "2027-10-11", contractType: "Full-time", salaryBandMin: 2200, salaryBandMax: 2800, emergencyContactName: "Yousef Al-Dosari", emergencyContactPhone: "+966 55 222 3314", documents: DOCS },
  { id: "EMP-015", name: "Turki Al-Anzi", nameAr: "تركي العنزي", phone: "+966 50 111 2215", role: "Waiter", branch: "Riyadh - Narjis", status: "On Shift", todayShift: "16:00 – 00:00", hoursThisWeek: 39, attendance: 96, hireDate: "2022-11-30", iqamaExpiry: "2027-08-05", contractType: "Full-time", salaryBandMin: 2200, salaryBandMax: 2800, emergencyContactName: "Dana Al-Anzi", emergencyContactPhone: "+966 55 222 3315", documents: DOCS },
  { id: "EMP-016", name: "Bandar Al-Juhani", nameAr: "بندر الجهني", phone: "+966 50 111 2216", role: "Waiter", branch: "Dammam - Corniche", status: "On Shift", todayShift: "12:00 – 20:00", hoursThisWeek: 35, attendance: 91, hireDate: "2023-04-17", iqamaExpiry: "2026-10-05", contractType: "Full-time", salaryBandMin: 2200, salaryBandMax: 2800, emergencyContactName: "Reema Al-Juhani", emergencyContactPhone: "+966 55 222 3316", documents: DOCS },
  { id: "EMP-017", name: "Dana Al-Otaibi", nameAr: "دانة العتيبي", phone: "+966 50 111 2217", role: "Waiter", branch: "Riyadh - Olaya", status: "On Shift", todayShift: "09:00 – 17:00", hoursThisWeek: 34, attendance: 89, hireDate: "2023-07-21", iqamaExpiry: "2028-02-14", contractType: "Part-time", salaryBandMin: 2200, salaryBandMax: 2800, emergencyContactName: "Faisal Al-Otaibi Jr.", emergencyContactPhone: "+966 55 222 3317", documents: DOCS },
  { id: "EMP-018", name: "Salem Al-Ghamdi", nameAr: "سالم الغامدي", phone: "+966 50 111 2218", role: "Waiter", branch: "Khobar - Rakah", status: "Off Duty", todayShift: "—", hoursThisWeek: 28, attendance: 87, hireDate: "2023-05-09", iqamaExpiry: "2027-01-23", contractType: "Seasonal", salaryBandMin: 2200, salaryBandMax: 2800, emergencyContactName: "Hana Al-Ghamdi", emergencyContactPhone: "+966 55 222 3318", documents: DOCS },
  { id: "EMP-019", name: "Rania Al-Amri", nameAr: "رانية العمري", phone: "+966 50 111 2219", role: "Waiter", branch: "Jeddah - Corniche", status: "On Shift", todayShift: "16:00 – 00:00", hoursThisWeek: 33, attendance: 88, hireDate: "2023-09-02", iqamaExpiry: "2027-12-01", contractType: "Seasonal", salaryBandMin: 2200, salaryBandMax: 2800, emergencyContactName: "Khalid Al-Amri", emergencyContactPhone: "+966 55 222 3319", documents: DOCS },
  { id: "EMP-020", name: "Yousef Al-Rashidi", nameAr: "يوسف الرشيدي", phone: "+966 50 111 2220", role: "Waiter", branch: "Riyadh - Olaya", status: "Absent", todayShift: "—", hoursThisWeek: 20, attendance: 71, hireDate: "2022-12-12", iqamaExpiry: "2026-09-25", contractType: "Full-time", salaryBandMin: 2200, salaryBandMax: 2800, emergencyContactName: "Sultana Al-Rashidi", emergencyContactPhone: "+966 55 222 3320", documents: DOCS },
  { id: "EMP-021", name: "Layla Al-Zahrani", nameAr: "ليلى الزهراني", phone: "+966 50 111 2221", role: "Kitchen", branch: "Jeddah - Corniche", status: "Off Duty", todayShift: "—", hoursThisWeek: 34, attendance: 89, hireDate: "2021-10-04", iqamaExpiry: "2027-07-17", contractType: "Full-time", salaryBandMin: 2500, salaryBandMax: 3200, emergencyContactName: "Omar Al-Zahrani", emergencyContactPhone: "+966 55 222 3321", documents: DOCS },
  { id: "EMP-022", name: "Khalid Al-Mutairi", nameAr: "خالد المطيري", phone: "+966 50 111 2222", role: "Kitchen", branch: "Riyadh - Olaya", status: "On Shift", todayShift: "09:00 – 17:00", hoursThisWeek: 41, attendance: 94, hireDate: "2021-05-25", iqamaExpiry: "2028-03-29", contractType: "Full-time", salaryBandMin: 2500, salaryBandMax: 3200, emergencyContactName: "Maha Al-Mutairi", emergencyContactPhone: "+966 55 222 3322", documents: DOCS },
  { id: "EMP-023", name: "Maha Al-Tamimi", nameAr: "مها التميمي", phone: "+966 50 111 2223", role: "Kitchen", branch: "Riyadh - Narjis", status: "On Shift", todayShift: "12:00 – 20:00", hoursThisWeek: 40, attendance: 93, hireDate: "2022-01-18", iqamaExpiry: "2027-05-06", contractType: "Full-time", salaryBandMin: 2500, salaryBandMax: 3200, emergencyContactName: "Saad Al-Tamimi", emergencyContactPhone: "+966 55 222 3323", documents: DOCS },
  { id: "EMP-024", name: "Saad Al-Shehri", nameAr: "سعد الشهري", phone: "+966 50 111 2224", role: "Kitchen", branch: "Dammam - Corniche", status: "On Shift", todayShift: "08:00 – 16:00", hoursThisWeek: 42, attendance: 95, hireDate: "2021-12-01", iqamaExpiry: "2026-09-01", contractType: "Full-time", salaryBandMin: 2500, salaryBandMax: 3200, emergencyContactName: "Ghada Al-Shehri", emergencyContactPhone: "+966 55 222 3324", documents: DOCS },
  { id: "EMP-025", name: "Ghada Al-Harthy", nameAr: "غادة الحارثي", phone: "+966 50 111 2225", role: "Kitchen", branch: "Khobar - Rakah", status: "On Shift", todayShift: "14:00 – 22:00", hoursThisWeek: 36, attendance: 90, hireDate: "2022-08-27", iqamaExpiry: "2027-11-14", contractType: "Full-time", salaryBandMin: 2500, salaryBandMax: 3200, emergencyContactName: "Waleed Al-Harthy", emergencyContactPhone: "+966 55 222 3325", documents: DOCS },
  { id: "EMP-026", name: "Omar Al-Balawi", nameAr: "عمر البلوي", phone: "+966 50 111 2226", role: "Kitchen", branch: "Jeddah - Corniche", status: "On Leave", todayShift: "—", hoursThisWeek: 0, attendance: 100, hireDate: "2023-03-15", iqamaExpiry: "2028-06-08", contractType: "Full-time", salaryBandMin: 2500, salaryBandMax: 3200, emergencyContactName: "Yara Al-Balawi Sr.", emergencyContactPhone: "+966 55 222 3326", documents: DOCS },
  { id: "EMP-027", name: "Abdullah Al-Shammari", nameAr: "عبدالله الشمري", phone: "+966 50 111 2227", role: "Driver", branch: "Dammam - Corniche", status: "On Shift", todayShift: "10:00 – 18:00", hoursThisWeek: 40, attendance: 97, hireDate: "2022-04-06", iqamaExpiry: "2027-02-09", contractType: "Full-time", salaryBandMin: 2300, salaryBandMax: 2900, emergencyContactName: "Sultan Al-Shammari", emergencyContactPhone: "+966 55 222 3327", documents: DOCS },
  { id: "EMP-028", name: "Majed Al-Enezi", nameAr: "ماجد العنزي", phone: "+966 50 111 2228", role: "Driver", branch: "Riyadh - Olaya", status: "On Shift", todayShift: "16:00 – 00:00", hoursThisWeek: 38, attendance: 92, hireDate: "2022-10-19", iqamaExpiry: "2027-09-30", contractType: "Full-time", salaryBandMin: 2300, salaryBandMax: 2900, emergencyContactName: "Latifa Al-Enezi", emergencyContactPhone: "+966 55 222 3328", documents: DOCS },
  { id: "EMP-029", name: "Waleed Al-Ahmari", nameAr: "وليد الأحمري", phone: "+966 50 111 2229", role: "Driver", branch: "Jeddah - Corniche", status: "Off Duty", todayShift: "—", hoursThisWeek: 32, attendance: 88, hireDate: "2023-08-08", iqamaExpiry: "2028-01-22", contractType: "Part-time", salaryBandMin: 2300, salaryBandMax: 2900, emergencyContactName: "Amal Al-Ahmari", emergencyContactPhone: "+966 55 222 3329", documents: DOCS },
  { id: "EMP-030", name: "Sultan Al-Qarni", nameAr: "سلطان القرني", phone: "+966 50 111 2230", role: "Driver", branch: "Khobar - Rakah", status: "On Shift", todayShift: "10:00 – 18:00", hoursThisWeek: 39, attendance: 94, hireDate: "2022-06-23", iqamaExpiry: "2027-04-27", contractType: "Full-time", salaryBandMin: 2300, salaryBandMax: 2900, emergencyContactName: "Reem Al-Qarni", emergencyContactPhone: "+966 55 222 3330", documents: DOCS },
] as const;

export const employeeById = new Map(employees.map((e) => [e.id, e]));

// Backwards-compatible narrow view used by the original single-table page.
export interface EmployeeRow {
  id: string;
  name: string;
  role: StaffRole;
  branch: string;
  status: ShiftStatus;
  shift: string;
  hoursThisWeek: number;
  attendance: number;
}
export const employeeRows: readonly EmployeeRow[] = employees.map((e) => ({
  id: e.id,
  name: e.name,
  role: e.role,
  branch: e.branch,
  status: e.status,
  shift: e.todayShift,
  hoursThisWeek: e.hoursThisWeek,
  attendance: e.attendance,
}));

/* ------------------------------------------------------------------ Leave requests */

export type LeaveType = "Annual" | "Sick" | "Unpaid" | "Emergency";

export interface LeaveRequestRow {
  id: string;
  employee: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
}

export const leaveRequestRows: readonly LeaveRequestRow[] = [
  { id: "LR-201", employee: "Noura Al-Dosari", type: "Annual", startDate: "12 Aug", endDate: "18 Aug", days: 7 },
  { id: "LR-202", employee: "Yousef Al-Rashidi", type: "Sick", startDate: "9 Aug", endDate: "10 Aug", days: 2 },
  { id: "LR-203", employee: "Rania Al-Amri", type: "Unpaid", startDate: "20 Aug", endDate: "22 Aug", days: 3 },
  { id: "LR-204", employee: "Bandar Al-Juhani", type: "Emergency", startDate: "8 Aug", endDate: "8 Aug", days: 1 },
  { id: "LR-205", employee: "Maha Al-Tamimi", type: "Annual", startDate: "25 Aug", endDate: "31 Aug", days: 7 },
  { id: "LR-206", employee: "Salem Al-Ghamdi", type: "Sick", startDate: "11 Aug", endDate: "12 Aug", days: 2 },
  { id: "LR-207", employee: "Dana Al-Otaibi", type: "Annual", startDate: "14 Aug", endDate: "16 Aug", days: 3 },
] as const;

/* ================================================================== SCHEDULE */

export type ShiftType = "Morning" | "Evening" | "Night";

export const SHIFT_TYPE_COLOR: Record<ShiftType, string> = {
  Morning: "#4DB8FF",
  Evening: "#6C4DFF",
  Night: "#081026",
};

export const SHIFT_TYPE_TIME: Record<ShiftType, { start: string; end: string; hours: number }> = {
  Morning: { start: "08:00", end: "16:00", hours: 8 },
  Evening: { start: "14:00", end: "22:00", hours: 8 },
  Night: { start: "22:00", end: "06:00", hours: 8 },
};

export interface ScheduleShift {
  id: string;
  employeeId: string;
  date: string; // ISO
  type: ShiftType;
  start: string;
  end: string;
  breakMinutes: number;
  role: StaffRole;
  notes: string;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function fromISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}
// Sunday-start week (the schedule grid runs Sun -> Sat per spec).
export function getWeekStart(d: Date): Date {
  const date = new Date(d);
  date.setDate(date.getDate() - date.getDay());
  date.setHours(0, 0, 0, 0);
  return date;
}

export const scheduleStaff: readonly Employee[] = employees.filter((e) => e.role !== "Owner");

const CURRENT_WEEK_START = getWeekStart(fromISO(TODAY));
// weekOffset: -1 last week, 0 current week, +1/+2 next two weeks
const SHIFT_ROLE_TYPES: Record<StaffRole, ShiftType[]> = {
  Owner: [],
  "Branch Manager": ["Morning"],
  Cashier: ["Morning", "Evening"],
  Waiter: ["Morning", "Evening", "Night"],
  Kitchen: ["Morning", "Evening"],
  Driver: ["Evening", "Night"],
};

function generateScheduleShifts(): ScheduleShift[] {
  const out: ScheduleShift[] = [];
  scheduleStaff.forEach((emp, empIndex) => {
    for (let weekOffset = -1; weekOffset <= 2; weekOffset++) {
      const weekStart = addDays(CURRENT_WEEK_START, weekOffset * 7);
      // Rotating single day off, except EMP-013 (Mohammed Al-Harbi) works all
      // 7 days in the current week to demonstrate the >48h/week red flag.
      const forceNoOffDay = weekOffset === 0 && emp.id === "EMP-013";
      const offDay = (empIndex + weekOffset + 2) % 7;
      const types = SHIFT_ROLE_TYPES[emp.role];
      if (types.length === 0) continue;

      for (let day = 0; day < 7; day++) {
        if (!forceNoOffDay && day === offDay) continue;
        const type = types[(empIndex + day) % types.length];
        const time = SHIFT_TYPE_TIME[type];
        const date = toISO(addDays(weekStart, day));
        out.push({
          id: `SH-${emp.id}-${date}`,
          employeeId: emp.id,
          date,
          type,
          start: time.start,
          end: time.end,
          breakMinutes: 30,
          role: emp.role,
          notes: "",
        });
      }
    }
  });
  return out;
}

export const scheduleShifts: readonly ScheduleShift[] = generateScheduleShifts();

export const REQUIRED_MIN_STAFF_PER_DAY = 6;
export const MAX_WEEKLY_HOURS = 48;

/* ================================================================== ATTENDANCE */

export type AttendanceStatus = "Present" | "Late" | "Absent" | "On Leave" | "Holiday";

export interface PunchEntry {
  time: string; // HH:mm
  type: "Clock In" | "Clock Out" | "Break Start" | "Break End";
  device: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string; // ISO
  scheduledStart: string;
  scheduledEnd: string;
  scheduledHours: number;
  clockIn: string | null;
  clockOut: string | null;
  lateMinutes: number;
  breakMinutes: number;
  workedHours: number;
  variance: number;
  status: AttendanceStatus;
  punches: readonly PunchEntry[];
}

export const attendanceStats: readonly KpiCard[] = [
  {
    id: "present-today",
    label: "PRESENT TODAY",
    value: "38",
    delta: "+1.2%",
    deltaNote: "vs yesterday",
    color: "#a78bfa",
    sparkline: [32, 34, 33, 35, 34, 36, 35, 37, 36, 38, 37, 39, 38, 39, 38, 38],
  },
  {
    id: "late-arrivals",
    label: "LATE ARRIVALS",
    value: "6",
    delta: "+1",
    deltaNote: "since yesterday",
    color: "#fb923c",
    sparkline: [3, 4, 3, 5, 4, 5, 4, 6, 5, 6, 5, 6, 5, 6, 5, 6],
  },
  {
    id: "absent-today",
    label: "ABSENT",
    value: "3",
    delta: "-1",
    deltaNote: "vs yesterday",
    color: "#f87171",
    sparkline: [5, 4, 5, 4, 3, 4, 3, 4, 3, 4, 3, 4, 3, 4, 3, 3],
  },
  {
    id: "avg-hours-day",
    label: "AVG HOURS/DAY",
    value: "7.8",
    delta: "+0.2",
    deltaNote: "vs last week",
    color: "#60a5fa",
    sparkline: [7.2, 7.3, 7.1, 7.4, 7.3, 7.5, 7.4, 7.6, 7.5, 7.7, 7.6, 7.8, 7.7, 7.9, 7.8, 7.8],
  },
] as const;

const DEVICES = ["POS Terminal 1", "POS Terminal 2", "Mobile App", "Biometric Reader"] as const;

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function minutesToTime(m: number): string {
  return `${pad2(Math.floor(m / 60) % 24)}:${pad2(m % 60)}`;
}

function generateAttendance(): AttendanceRecord[] {
  const out: AttendanceRecord[] = [];
  const attendanceStaff = employees.filter((e) => e.role !== "Owner");
  const anchor = fromISO(TODAY);
  let n = 0;
  for (let dayBack = 0; dayBack < 10; dayBack++) {
    const date = toISO(addDays(anchor, -dayBack));
    attendanceStaff.forEach((emp, i) => {
      // Skip roughly half the employee/day combinations to land ~55 rows.
      if ((i + dayBack) % 2 !== 0) return;
      const scheduled = SHIFT_ROLE_TYPES[emp.role][(i + dayBack) % SHIFT_ROLE_TYPES[emp.role].length];
      const time = SHIFT_TYPE_TIME[scheduled];
      const scheduledStartMin = timeToMinutes(time.start);
      const scheduledEndMin = timeToMinutes(time.end) + (time.end < time.start ? 24 * 60 : 0);
      const scheduledHours = (scheduledEndMin - scheduledStartMin) / 60;

      n++;
      const cycle = n % 14;
      let status: AttendanceStatus = "Present";
      let lateMinutes = 0;
      if (cycle === 3 || cycle === 7) status = "Late";
      else if (cycle === 11) status = "Absent";
      else if (cycle === 5 && dayBack > 6) status = "On Leave";

      const id = `ATT-${emp.id}-${date}`;
      if (status === "Absent") {
        out.push({
          id, employeeId: emp.id, date, scheduledStart: time.start, scheduledEnd: time.end,
          scheduledHours, clockIn: null, clockOut: null, lateMinutes: 0, breakMinutes: 0,
          workedHours: 0, variance: -scheduledHours, status, punches: [],
        });
        return;
      }
      if (status === "On Leave") {
        out.push({
          id, employeeId: emp.id, date, scheduledStart: time.start, scheduledEnd: time.end,
          scheduledHours, clockIn: null, clockOut: null, lateMinutes: 0, breakMinutes: 0,
          workedHours: 0, variance: 0, status, punches: [],
        });
        return;
      }
      if (status === "Late") lateMinutes = 8 + ((i * 3) % 22);
      const clockInMin = scheduledStartMin + lateMinutes;
      const breakMinutes = 30;
      const clockOutMin = scheduledEndMin - ((i + dayBack) % 3 === 0 ? 6 : 0);
      const workedHours = Math.round(((clockOutMin - clockInMin - breakMinutes) / 60) * 10) / 10;
      const variance = Math.round((workedHours - scheduledHours) * 10) / 10;
      const device = DEVICES[(i + dayBack) % DEVICES.length];

      out.push({
        id, employeeId: emp.id, date,
        scheduledStart: time.start, scheduledEnd: time.end, scheduledHours,
        clockIn: minutesToTime(clockInMin), clockOut: minutesToTime(clockOutMin),
        lateMinutes, breakMinutes, workedHours, variance, status,
        punches: [
          { time: minutesToTime(clockInMin), type: "Clock In", device },
          { time: minutesToTime(clockInMin + 180), type: "Break Start", device },
          { time: minutesToTime(clockInMin + 180 + breakMinutes), type: "Break End", device },
          { time: minutesToTime(clockOutMin), type: "Clock Out", device },
        ],
      });
    });
  }
  return out;
}

export const attendanceRecords: readonly AttendanceRecord[] = generateAttendance();

export const correctionReasons = [
  "System error",
  "Device malfunction",
  "Manual override",
  "Forgot to clock out",
  "Network outage",
] as const;

/* ================================================================== TIPS */

export type TipPoolMethod = "Individual" | "Pooled by branch" | "Pooled by shift";
export type TipPoolRole = "Waiters" | "Kitchen" | "Runners" | "Hosts";
export type TipStatus = "Pending" | "Distributed" | "Paid Out";

export const tipsStats: readonly KpiCard[] = [
  {
    id: "tips-period",
    label: "TIPS THIS PERIOD",
    value: "SAR 42.8K",
    delta: "+6.4%",
    deltaNote: "vs last week",
    color: "#a78bfa",
    sparkline: [30, 32, 31, 34, 33, 36, 35, 38, 37, 40, 39, 41, 40, 42, 41, 42.8],
  },
  {
    id: "avg-tip-pct",
    label: "AVG TIP",
    value: "8.4%",
    delta: "+0.3pp",
    deltaNote: "of check",
    color: "#60a5fa",
    sparkline: [7.8, 7.9, 7.8, 8.0, 8.1, 8.0, 8.2, 8.1, 8.3, 8.2, 8.3, 8.2, 8.4, 8.3, 8.4, 8.4],
  },
  {
    id: "cash-card-split",
    label: "CASH VS CARD SPLIT",
    value: "32% / 68%",
    delta: "-1.1pp",
    deltaNote: "cash share vs last week",
    color: "#a3e635",
    sparkline: [36, 35, 35, 34, 34, 33, 33, 33, 32, 32, 33, 32, 32, 32, 33, 32],
  },
  {
    id: "pending-distribution",
    label: "PENDING DISTRIBUTION",
    value: "SAR 6.2K",
    delta: "+SAR 800",
    deltaNote: "since yesterday",
    color: "#fb923c",
    sparkline: [3.2, 3.6, 3.4, 4.0, 3.8, 4.4, 4.2, 4.8, 4.6, 5.2, 5.0, 5.6, 5.4, 6.0, 5.8, 6.2],
  },
] as const;

export interface TipSplitRule {
  role: TipPoolRole;
  percent: number;
}
export const defaultTipSplitRules: readonly TipSplitRule[] = [
  { role: "Waiters", percent: 55 },
  { role: "Kitchen", percent: 25 },
  { role: "Runners", percent: 12 },
  { role: "Hosts", percent: 8 },
];

export interface TipRecord {
  id: string;
  employeeId: string;
  poolRole: TipPoolRole;
  hours: number;
  poolSharePercent: number;
  cardTips: number;
  cashTips: number;
  status: TipStatus;
}

const TIP_EMPLOYEES: { id: string; poolRole: TipPoolRole; hours: number; card: number; cash: number; status: TipStatus }[] = [
  { id: "EMP-013", poolRole: "Waiters", hours: 42, card: 980, cash: 420, status: "Distributed" },
  { id: "EMP-014", poolRole: "Waiters", hours: 38, card: 860, cash: 360, status: "Distributed" },
  { id: "EMP-015", poolRole: "Waiters", hours: 40, card: 910, cash: 400, status: "Distributed" },
  { id: "EMP-016", poolRole: "Waiters", hours: 36, card: 780, cash: 340, status: "Pending" },
  { id: "EMP-017", poolRole: "Waiters", hours: 34, card: 720, cash: 300, status: "Pending" },
  { id: "EMP-018", poolRole: "Waiters", hours: 28, card: 560, cash: 260, status: "Pending" },
  { id: "EMP-019", poolRole: "Waiters", hours: 33, card: 700, cash: 310, status: "Pending" },
  { id: "EMP-020", poolRole: "Waiters", hours: 20, card: 400, cash: 180, status: "Paid Out" },
  { id: "EMP-021", poolRole: "Kitchen", hours: 34, card: 320, cash: 140, status: "Distributed" },
  { id: "EMP-022", poolRole: "Kitchen", hours: 41, card: 390, cash: 165, status: "Distributed" },
  { id: "EMP-023", poolRole: "Kitchen", hours: 40, card: 380, cash: 160, status: "Pending" },
  { id: "EMP-024", poolRole: "Kitchen", hours: 42, card: 400, cash: 170, status: "Pending" },
  { id: "EMP-025", poolRole: "Kitchen", hours: 36, card: 340, cash: 150, status: "Paid Out" },
  { id: "EMP-027", poolRole: "Runners", hours: 40, card: 260, cash: 110, status: "Pending" },
];

const TIP_TOTAL_HOURS = TIP_EMPLOYEES.reduce((s, r) => s + r.hours, 0);

export const tipRecords: readonly TipRecord[] = TIP_EMPLOYEES.map((r) => ({
  id: `TIP-${r.id}`,
  employeeId: r.id,
  poolRole: r.poolRole,
  hours: r.hours,
  poolSharePercent: Math.round((r.hours / TIP_TOTAL_HOURS) * 1000) / 10,
  cardTips: r.card,
  cashTips: r.cash,
  status: r.status,
}));

/* ================================================================== PAYROLL */

export type PayrollStatus = "Draft" | "Approved" | "Exported" | "Locked";

export interface PayrollPeriod {
  id: string;
  label: string; // "August 2026"
  hijriLabel: string; // "Safar 1448"
  status: PayrollStatus;
  totalInputs: number;
}

export const payrollPeriods: readonly PayrollPeriod[] = [
  { id: "2026-08", label: "August 2026", hijriLabel: "Safar 1448", status: "Draft", totalInputs: 1_240_000 },
  { id: "2026-07", label: "July 2026", hijriLabel: "Muharram 1448", status: "Approved", totalInputs: 1_198_500 },
  { id: "2026-06", label: "June 2026", hijriLabel: "Dhu al-Hijjah 1447", status: "Exported", totalInputs: 1_176_200 },
  { id: "2026-05", label: "May 2026", hijriLabel: "Dhu al-Qadah 1447", status: "Locked", totalInputs: 1_142_900 },
];

export interface PayrollAuditEntry {
  date: string;
  field: string;
  oldValue: string;
  newValue: string;
  editedBy: string;
}

export interface PayrollRow {
  id: string;
  employeeId: string;
  periodId: string;
  baseSalary: number;
  overtimeHours: number;
  overtimePay: number;
  tips: number;
  deductions: number;
  allowances: number;
  gosi: number;
  netInput: number;
  status: PayrollStatus;
  auditTrail: readonly PayrollAuditEntry[];
}

const PAYROLL_STAFF = employees.filter((e) => e.role !== "Owner");
const OT_HOURLY_MULTIPLIER = 1.5;

function payrollRowsForPeriod(period: PayrollPeriod): PayrollRow[] {
  return PAYROLL_STAFF.map((emp, i) => {
    const base = Math.round((emp.salaryBandMin + emp.salaryBandMax) / 2);
    const hourlyRate = base / 240; // 30 days * 8h reference
    const overtimeHours = (i + period.id.length) % 5 === 0 ? 6 : (i % 3 === 0 ? 3 : 0);
    const overtimePay = Math.round(overtimeHours * hourlyRate * OT_HOURLY_MULTIPLIER);
    const tipRecord = period.id === "2026-08" ? tipRecords.find((t) => t.employeeId === emp.id) : undefined;
    const tips = tipRecord ? tipRecord.cardTips + tipRecord.cashTips : 0;
    const deductions = i % 6 === 0 ? 150 : 0;
    const allowances = emp.role === "Driver" ? 400 : emp.role === "Branch Manager" ? 500 : 200;
    const gosi = Math.round(base * 0.1075);
    const netInput = base + overtimePay + tips - deductions - allowances - gosi;

    const auditTrail: PayrollAuditEntry[] =
      period.status === "Draft" && i % 5 === 0
        ? [
            { date: "2026-08-02", field: "Overtime Hours", oldValue: "0", newValue: String(overtimeHours), editedBy: "Amal Al-Subai'i" },
            { date: "2026-08-04", field: "Deductions", oldValue: "0", newValue: String(deductions), editedBy: "Faisal Al-Otaibi" },
            { date: "2026-08-06", field: "Allowances", oldValue: "0", newValue: String(allowances), editedBy: "Amal Al-Subai'i" },
          ]
        : [];

    const status: PayrollStatus = period.status === "Draft" && i % 7 === 0 ? "Approved" : period.status;

    return {
      id: `PR-${emp.id}-${period.id}`,
      employeeId: emp.id,
      periodId: period.id,
      baseSalary: base,
      overtimeHours,
      overtimePay,
      tips,
      deductions,
      allowances,
      gosi,
      netInput,
      status,
      auditTrail,
    };
  });
}

export const payrollRowsByPeriod: Record<string, readonly PayrollRow[]> = Object.fromEntries(
  payrollPeriods.map((p) => [p.id, payrollRowsForPeriod(p)])
);
