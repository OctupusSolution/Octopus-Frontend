// Mock data for the Staff module (Staff / Roles & Permissions / Shifts).
// Stands in for @octopus/api-client — same rule as mock-dashboard.ts. Shapes
// mirror what real endpoints would return so swapping these for TanStack
// Query hooks later is a drop-in change.

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

/* ------------------------------------------------------------------ Member profile (Staff tab rebuild) */

const ROLE_JOB_TITLE: Record<StaffRole, string> = {
  Owner: "Owner",
  "Branch Manager": "Restaurant Manager",
  Cashier: "Cashier",
  Waiter: "Waiter",
  Kitchen: "Kitchen Staff",
  Driver: "Delivery Driver",
};

const ROLE_DEPARTMENT: Record<StaffRole, string> = {
  Owner: "Management",
  "Branch Manager": "Management",
  Cashier: "Front of House",
  Waiter: "Front of House",
  Kitchen: "Back of House",
  Driver: "Delivery",
};

const CONTRACT_TO_EMPLOYMENT_TYPE: Record<ContractType, "Full time" | "Part time"> = {
  "Full-time": "Full time",
  "Part-time": "Part time",
  Seasonal: "Part time",
};

const ROLE_ACCESS_LEVEL: Record<StaffRole, string> = {
  Owner: "Full access",
  "Branch Manager": "Full access",
  Cashier: "Limited access",
  Waiter: "Limited access",
  Kitchen: "Limited access",
  Driver: "Limited access",
};

const ALL_MODULE_IDS: readonly ModuleId[] = [
  "dashboard", "reservations", "waitlist", "floorPlan", "orders", "paymentRefund",
  "menuPos", "inventory", "reports", "customerCrm", "staffManagement", "settingIntegrations",
];

const ROLE_MODULES_ACCESS: Record<StaffRole, readonly ModuleId[]> = {
  Owner: ALL_MODULE_IDS,
  "Branch Manager": ALL_MODULE_IDS,
  Cashier: ["orders", "paymentRefund", "menuPos"],
  Waiter: ["reservations", "waitlist", "floorPlan", "orders"],
  Kitchen: ["orders", "menuPos", "inventory"],
  Driver: ["orders"],
};

const ROLE_ASSIGNED_ROLE: Record<StaffRole, RoleId> = {
  Owner: "owner",
  "Branch Manager": "manager",
  Cashier: "cashier",
  Waiter: "host",
  Kitchen: "kitchen",
  Driver: "custom",
};

// Deterministic 4-digit PIN and boolean flag from an employee id, so the
// mock data stays stable across renders without needing a stored seed.
function hashCode(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

export const JOB_TITLES = ["Owner", "Restaurant Manager", "Cashier", "Waiter", "Kitchen Staff", "Delivery Driver"] as const;
export const DEPARTMENTS = ["Management", "Front of House", "Back of House", "Delivery"] as const;
export const ACCESS_LEVELS = ["Full access", "Limited access", "View only"] as const;
export const LANGUAGE_OPTIONS = ["English, Arabic", "Arabic", "English"] as const;
export const TWO_FACTOR_METHODS = ["Authenticator App", "SMS", "Email"] as const;
export type LoginMethod = "PIN" | "Password" | "Both";

export interface MemberProfile {
  employee: Employee;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string; // ISO
  gender: "Male" | "Female";
  nationality: string;
  languages: string;
  jobTitle: string;
  department: string;
  reportsTo: string;
  employmentType: "Full time" | "Part time";
  assignedRole: string;
  accessLevel: string;
  modulesAccess: readonly ModuleId[];
  loginMethod: LoginMethod;
  pinCode: string;
  twoFactorEnabled: boolean;
  twoFactorMethod: string;
  allowSystemLogin: boolean;
  allowAccessOutsideBranch: boolean;
  locked: boolean;
  lastAccess: string; // ISO date-time
  activeSection: { device: string; location: string; since: string };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function toMemberProfile(e: Employee): MemberProfile {
  const hash = hashCode(e.id);
  const [firstName, ...rest] = e.name.split(" ");
  const lastName = rest.join(" ");
  const managerForBranch = employees.find((m) => m.role === "Branch Manager" && m.branch === e.branch && m.id !== e.id);
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
  const lastAccessDay = 9 - (hash % 5);
  const lastAccess = `2026-08-${pad(lastAccessDay)}T${pad(8 + (hash % 10))}:${pad((hash % 4) * 15)}`;

  return {
    employee: e,
    employeeCode: e.id,
    firstName,
    lastName,
    email: `${slug(firstName)}.${slug(lastName) || "staff"}@gmail.com`,
    dateOfBirth: `${1984 + (hash % 16)}-${pad(1 + (hash % 12))}-${pad(1 + (hash % 28))}`,
    gender: hash % 2 === 0 ? "Male" : "Female",
    nationality: "Saudi Arabia",
    languages: "English, Arabic",
    jobTitle: ROLE_JOB_TITLE[e.role],
    department: ROLE_DEPARTMENT[e.role],
    reportsTo: e.role === "Owner" ? "" : (managerForBranch?.name ?? "Abdulrahman Al-Faisal"),
    employmentType: CONTRACT_TO_EMPLOYMENT_TYPE[e.contractType],
    assignedRole: ROLE_ASSIGNED_ROLE[e.role],
    accessLevel: ROLE_ACCESS_LEVEL[e.role],
    modulesAccess: ROLE_MODULES_ACCESS[e.role],
    loginMethod: "PIN",
    pinCode: String(1000 + (hash % 9000)),
    twoFactorEnabled: e.role === "Owner" || e.role === "Branch Manager",
    twoFactorMethod: "Authenticator App",
    allowSystemLogin: true,
    allowAccessOutsideBranch: e.role === "Owner",
    locked: false,
    lastAccess,
    activeSection: {
      device: hash % 3 === 0 ? "POS Terminal" : "iPad Pro",
      location: e.branch,
      since: lastAccess,
    },
  };
}

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
function getWeekStart(d: Date): Date {
  const date = new Date(d);
  date.setDate(date.getDate() - date.getDay());
  date.setHours(0, 0, 0, 0);
  return date;
}

const scheduleStaff: readonly Employee[] = employees.filter((e) => e.role !== "Owner");

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

/* ================================================================== ROLES & PERMISSIONS */

export type ModuleId =
  | "dashboard" | "reservations" | "waitlist" | "floorPlan" | "orders"
  | "paymentRefund" | "menuPos" | "inventory" | "reports" | "customerCrm"
  | "staffManagement" | "settingIntegrations";

export const MODULES: readonly { id: ModuleId; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "reservations", label: "Reservations" },
  { id: "waitlist", label: "Wait list" },
  { id: "floorPlan", label: "Floor Plan" },
  { id: "orders", label: "Orders" },
  { id: "paymentRefund", label: "Payment & Refund" },
  { id: "menuPos", label: "Menu & POS" },
  { id: "inventory", label: "Inventory" },
  { id: "reports", label: "Reports" },
  { id: "customerCrm", label: "Customer CRM" },
  { id: "staffManagement", label: "Staff Management" },
  { id: "settingIntegrations", label: "Setting & Integrations" },
];

// The finer-grained screens behind each module row. A module's toggle in the
// matrix is ON only while every one of its features is ON for that action.
export const MODULE_FEATURES: Record<ModuleId, readonly string[]> = {
  dashboard: ["overview", "salesWidgets"],
  reservations: ["bookings", "calendar", "deposits"],
  waitlist: ["queue", "notifications"],
  floorPlan: ["tables", "sections"],
  orders: ["liveOrders", "orderHistory", "refunds"],
  paymentRefund: ["payments", "refunds", "settlements"],
  menuPos: ["menuItems", "pricing", "posTerminal"],
  inventory: ["stock", "purchaseOrders", "transfers"],
  reports: ["salesReports", "staffReports"],
  customerCrm: ["profiles", "segments", "loyalty"],
  staffManagement: ["team", "roles", "shifts"],
  settingIntegrations: ["businessSettings", "integrations", "devices"],
};

export type PermissionAction = "view" | "create" | "edit" | "delete" | "approve" | "export" | "setting";
export const PERMISSION_ACTIONS: readonly PermissionAction[] = ["view", "create", "edit", "delete", "approve", "export", "setting"];

export type RoleId = "owner" | "manager" | "cashier" | "host" | "kitchen" | "barista" | "custom";

export interface StaffRoleDef {
  id: RoleId;
  name: string;
  description: string;
  isSystemRole: boolean;
  memberCount: number;
}

export const staffRoleDefs: readonly StaffRoleDef[] = [
  { id: "owner", name: "Owner", description: "Full system access", isSystemRole: true, memberCount: 1 },
  { id: "manager", name: "Manager", description: "Manage operations & staff", isSystemRole: false, memberCount: 2 },
  { id: "cashier", name: "Cashier", description: "Handle billing & Payment", isSystemRole: false, memberCount: 2 },
  { id: "host", name: "Host", description: "Manage reservations & seating", isSystemRole: false, memberCount: 2 },
  { id: "kitchen", name: "Kitchen", description: "View & manage kitchen orders", isSystemRole: false, memberCount: 3 },
  { id: "barista", name: "Barista", description: "Prepare beverages", isSystemRole: false, memberCount: 2 },
  { id: "custom", name: "Custom Role", description: "Marketing Access", isSystemRole: false, memberCount: 1 },
];

type AccessLevel = "full" | "view" | "none";

function permissionsFor(level: AccessLevel): Record<PermissionAction, boolean> {
  if (level === "full") return { view: true, create: true, edit: true, delete: true, approve: true, export: true, setting: true };
  if (level === "view") return { view: true, create: false, edit: false, delete: false, approve: false, export: false, setting: false };
  return { view: false, create: false, edit: false, delete: false, approve: false, export: false, setting: false };
}

// Per-role, per-module override; any module not listed falls back to the
// role's `default` level. Mirrors the "Owner = everything on" / narrower
// roles mockup without hand-writing 7 roles x 12 modules x 7 actions.
const ROLE_ACCESS: Record<RoleId, { default: AccessLevel; overrides?: Partial<Record<ModuleId, AccessLevel>> }> = {
  owner: { default: "full" },
  manager: { default: "full", overrides: { settingIntegrations: "view" } },
  cashier: {
    default: "none",
    overrides: { orders: "full", paymentRefund: "full", menuPos: "view", customerCrm: "view" },
  },
  host: {
    default: "none",
    overrides: { reservations: "full", waitlist: "full", floorPlan: "full", customerCrm: "view" },
  },
  kitchen: {
    default: "none",
    overrides: { orders: "full", menuPos: "view", inventory: "view" },
  },
  barista: {
    default: "none",
    overrides: { orders: "view", menuPos: "view", inventory: "view" },
  },
  custom: {
    default: "none",
    overrides: { reports: "view", customerCrm: "full" },
  },
};

export type PermissionMatrix = Record<RoleId, Record<ModuleId, Record<PermissionAction, boolean>>>;

function buildPermissionMatrix(): PermissionMatrix {
  const matrix = {} as PermissionMatrix;
  for (const role of staffRoleDefs) {
    const access = ROLE_ACCESS[role.id];
    matrix[role.id] = {} as Record<ModuleId, Record<PermissionAction, boolean>>;
    for (const mod of MODULES) {
      const level = access.overrides?.[mod.id] ?? access.default;
      matrix[role.id][mod.id] = permissionsFor(level);
    }
  }
  return matrix;
}

export const defaultPermissionMatrix: PermissionMatrix = buildPermissionMatrix();

/* ================================================================== SHIFTS TAB PALETTE */

// Cycled by employee row index in the Shifts tab grid; kept separate from
// SHIFT_TYPE_COLOR (which colors by shift type, not by employee).
export const SHIFT_PILL_COLORS: readonly string[] = [
  "#7C6EF6", "#2E90FA", "#12B76A", "#F79009", "#06AED4", "#EE46BC", "#667085",
];
