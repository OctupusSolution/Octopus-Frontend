// apps/merchant/src/pages/customers/_shared/mock-data.ts
import { avatarPhoto } from "./avatar-photos";
import type { CustomerRecord, CustomerTag } from "./types";

const NAME_POOL: readonly [string, string, "Male" | "Female"][] = [
  ["Abdullah", "Al-Qahtani", "Male"],
  ["Noura", "Al-Harbi", "Female"],
  ["Faisal", "Al-Zahrani", "Male"],
  ["Sara", "Al-Otaibi", "Female"],
  ["Khalid", "Al-Dosari", "Male"],
  ["Lama", "Al-Ghamdi", "Female"],
  ["Turki", "Al-Shehri", "Male"],
  ["Hessa", "Al-Mutairi", "Female"],
  ["Majed", "Al-Anazi", "Male"],
  ["Bandar", "Al-Rashidi", "Male"],
  ["Alanoud", "Al-Malki", "Female"],
  ["Omar", "Al-Faraj", "Male"],
  ["Dana", "Al-Amri", "Female"],
  ["Yousef", "Al-Suwaidi", "Male"],
  ["Nadia", "Al-Qurashi", "Female"],
  ["Saad", "Al-Balawi", "Male"],
  ["Rima", "Al-Juhani", "Female"],
  ["Fahad", "Al-Zahid", "Male"],
  ["Aisha", "Al-Harthi", "Female"],
  ["Mansour", "Al-Dawsari", "Male"],
  ["Haya", "Al-Ruwaili", "Female"],
  ["Rakan", "Al-Sulaimani", "Male"],
  ["Jawaher", "Al-Khalidi", "Female"],
  ["Sultan", "Al-Nasser", "Male"],
  ["Munira", "Al-Fahad", "Female"],
];

const TAG_SETS: readonly CustomerTag[][] = [
  ["VIP", "Frequent Diner"],
  ["Frequent Diner"],
  ["New Customer"],
  ["At Risk"],
  ["Birthday May"],
  [],
];

const BRANCHES: readonly string[] = ["Riyadh", "Jeddah", "Dammam", "Khobar"];
const AREAS: readonly string[] = ["Indoor", "Outdoor", "Private Room", "Bar Seating"];
const CUISINES: readonly string[][] = [
  ["Seafood", "Japanese", "Italian"],
  ["Grills", "Middle Eastern"],
  ["Italian", "French"],
  ["Indian", "Asian Fusion"],
];
const SOURCES: readonly string[] = ["Instagram", "Walk-in", "Website", "Referral"];

function buildCustomer(index: number, [firstName, lastName, gender]: readonly [string, string, "Male" | "Female"]): CustomerRecord {
  const visits = 1 + ((index * 7) % 40);
  const avgSpendSar = 60 + ((index * 13) % 140);
  const totalSpendSar = visits * avgSpendSar;
  const lastVisit = new Date(Date.UTC(2026, 4, 1 + (index % 28)));
  const customerSince = new Date(Date.UTC(2022 + (index % 4), index % 12, 1 + (index % 27)));
  const tags = TAG_SETS[index % TAG_SETS.length];

  return {
    id: `CUST-${1002 + index}`,
    firstName,
    lastName,
    gender,
    dateOfBirth: new Date(Date.UTC(1966 + ((index * 7) % 38), (index * 5) % 12, 1 + ((index * 11) % 28))).toISOString().slice(0, 10),
    tags: [...tags],
    phone: `+9665${String(20000000 + index * 137).slice(0, 8)}`,
    email: `${firstName.toLowerCase()}.${lastName.replace("Al-", "").toLowerCase()}@gmail.com`,
    isBlocked: false,
    visits,
    totalSpendSar,
    lastVisit: lastVisit.toISOString().slice(0, 10),
    upcomingReservation: index % 3 === 0 ? new Date(Date.UTC(2026, 5, 1 + (index % 20))).toISOString().slice(0, 10) : undefined,
    loyaltyPoints: totalSpendSar * 2,
    avgSpendSar,
    customerSince: customerSince.toISOString().slice(0, 10),
    firstVisit: customerSince.toISOString().slice(0, 10),
    preferredBranch: BRANCHES[index % BRANCHES.length],
    preferredAreaTable: AREAS[index % AREAS.length],
    vipSince: tags.includes("VIP") ? customerSince.toISOString().slice(0, 10) : undefined,
    referredBy: SOURCES[index % SOURCES.length],
    marketingConsent: index % 5 === 0 ? "Opted out" : "Opted in",
    cuisinePreference: CUISINES[index % CUISINES.length],
    dietaryPreference: index % 4 === 0 ? "No Nuts" : "None",
    occasion: index % 6 === 0 ? "Birthday" : "None",
    visitTime: index % 2 === 0 ? "Evenings, Weekends" : "Lunch, Weekdays",
    communicationPreference: ["WhatsApp"],
    specialRequests: index % 3 === 0 ? "Likes quiet area, window seating" : "",
    notes: [],
    recentReservations: [],
    recentOrders: [],
    recentPayments: [],
  };
}

// Record #1: Reem Al-Subaie, matching the mockups' Customer Info / Payment
// Link / Send Message frames verbatim for every field they display. The
// mockups themselves disagree on Total Spend between the list row (SAR
// 1,500) and the Customer Info page (SAR 12,500) — the richer detail-page
// figure is treated as canonical and the list row reflects it too, since
// both can't be simultaneously true and the detail page reads as the
// "real" profile total.
const REEM_AL_SUBAIE: CustomerRecord = {
  id: "CUST-1001",
  firstName: "Reem",
  lastName: "Al-Subaie",
  gender: "Female",
  avatarUrl: avatarPhoto("Female", 1),
  dateOfBirth: "1997-05-12",
  tags: ["VIP", "Frequent Diner", "Birthday May"],
  phone: "+966510002877",
  email: "Reemelsubaie@gmail.com",
  isBlocked: false,
  visits: 12,
  totalSpendSar: 12500,
  lastVisit: "2026-05-15",
  upcomingReservation: "2026-05-30",
  loyaltyPoints: 1250,
  avgSpendSar: 500,
  customerSince: "2022-09-16",
  firstVisit: "2022-09-16",
  preferredBranch: "Jeddah",
  preferredAreaTable: "Outdoor",
  vipSince: "2024-09-16",
  referredBy: "Instagram",
  marketingConsent: "Opted in",
  cuisinePreference: ["Seafood", "Japanese", "Italian"],
  dietaryPreference: "No Nuts",
  occasion: "Birthday",
  visitTime: "Evenings, Weekends",
  communicationPreference: ["WhatsApp"],
  specialRequests: "Likes quiet area, window seating",
  notes: [
    { date: "2026-05-14", text: "Requested window seat, loved the seafood platter." },
    { date: "2026-05-20", text: "Requested window seat, loved the seafood platter." },
    { date: "2026-05-30", text: "Requested window seat, loved the seafood platter." },
  ],
  recentReservations: [
    { date: "2026-05-10T19:30:00", table: "T22", guests: 2, status: "Confirmed" },
    { date: "2026-05-17T19:30:00", table: "T22", guests: 2, status: "Confirmed" },
    { date: "2026-05-24T19:30:00", table: "T22", guests: 2, status: "Confirmed" },
  ],
  recentOrders: [
    { id: "#ORD-00123654", date: "2025-05-10", items: "Seafood platter, Truffle pasta, Mocktail x2", totalSar: 186 },
    { id: "#ORD-00123412", date: "2025-04-26", items: "Seafood platter, Truffle pasta, Mocktail x2", totalSar: 186 },
    { id: "#ORD-00123180", date: "2025-04-12", items: "Seafood platter, Truffle pasta, Mocktail x2", totalSar: 186 },
  ],
  recentPayments: [
    { date: "2025-05-10", cardLast4: "4242", amountSar: 186, status: "PAID" },
    { date: "2025-04-26", cardLast4: "4242", amountSar: 186, status: "PAID" },
    { date: "2025-04-12", cardLast4: "4242", amountSar: 186, status: "PAID" },
  ],
};

export const customerRecords: readonly CustomerRecord[] = [
  REEM_AL_SUBAIE,
  ...withPhotos(NAME_POOL.map((entry, index) => buildCustomer(index, entry))),
];

// Photo #1 of the women's set belongs to Reem, so the generated women start at #2.
function withPhotos(customers: CustomerRecord[]): CustomerRecord[] {
  const next = { Female: 2, Male: 1 };
  return customers.map((customer) => ({ ...customer, avatarUrl: avatarPhoto(customer.gender, next[customer.gender]++) }));
}

// The 6 header stat cards are hand-authored to match the mockup's exact
// headline numbers ("SAE 1,40M" read as a currency-code/decimal-separator
// typo for "SAR 1.40M", corrected here) — decorative business KPIs, not a
// filter-pill count that must equal the visible/generated row count the
// way Orders' stats do.
export const customerStats = {
  total: { value: 2845, delta: "15%" },
  active: { value: 1986, delta: "10%" },
  newThisMonth: { value: 156, delta: "15%" },
  vip: { value: 312, delta: "12%" },
  returning: { value: 1247, delta: "20%" },
  totalSpend: { display: "SAR 1.40M", delta: "50%" },
} as const;
