// Mock data for the Customers module (list, segments, feedback). Shape mirrors
// what real `useCustomersSummary()` / `useCustomerList()` / `useCustomerSegments()` /
// `useFeedback()` queries would return.

import type { KpiCard } from "./mock-dashboard";

export type CustomerSegment = "VIP" | "Regular" | "New" | "At Risk" | "Churned";
export type LoyaltyTier = "Bronze" | "Silver" | "Gold" | "Platinum";

export const customerStats: readonly KpiCard[] = [
  {
    id: "total-customers",
    label: "TOTAL CUSTOMERS",
    value: "12,847",
    delta: "+6.1%",
    deltaNote: "vs last year",
    color: "#a78bfa",
    sparkline: [40, 42, 41, 45, 44, 48, 47, 51, 49, 54, 52, 57, 55, 60, 58, 63],
  },
  {
    id: "new-this-month",
    label: "NEW THIS MONTH",
    value: "486",
    delta: "+9.4%",
    deltaNote: "vs last month",
    color: "#60a5fa",
    sparkline: [20, 24, 22, 27, 25, 30, 28, 33, 31, 36, 34, 39, 37, 42, 40, 45],
  },
  {
    id: "repeat-rate",
    label: "REPEAT RATE",
    value: "38.4%",
    delta: "+2.2%",
    deltaNote: "vs last quarter",
    color: "#a3e635",
    sparkline: [30, 31, 33, 32, 34, 35, 34, 36, 37, 36, 38, 39, 38, 40, 39, 41],
  },
  {
    id: "avg-ltv",
    label: "AVG LIFETIME VALUE",
    value: "SAR 1,240",
    delta: "+4.8%",
    deltaNote: "vs last quarter",
    color: "#fb923c",
    sparkline: [50, 52, 51, 54, 53, 56, 55, 58, 57, 60, 59, 62, 61, 64, 63, 66],
  },
];

export interface SavedPaymentMethod {
  method: string;
  masked: string;
}

export interface VisitHistoryEntry {
  orderId: string;
  date: string;
  branch: string;
  total: string;
  items: number;
}

export interface CustomerRow {
  id: string;
  name: string;
  phone: string;
  email: string;
  segment: CustomerSegment;
  visits: number;
  totalSpent: string;
  avgBasket: string;
  loyaltyTier: LoyaltyTier;
  loyaltyPoints: number;
  lastVisit: string;
  favouriteItems: readonly string[];
  savedPaymentMethods: readonly SavedPaymentMethod[];
  notes: string;
  visitHistory: readonly VisitHistoryEntry[];
}

export const customerRows: readonly CustomerRow[] = [
  {
    id: "CUST-1001", name: "Abdullah Al-Qahtani", phone: "+966 50 123 4567", email: "abdullah.q@gmail.com",
    segment: "VIP", visits: 62, totalSpent: "SAR 8,420", avgBasket: "SAR 135.80", loyaltyTier: "Platinum",
    loyaltyPoints: 4210, lastVisit: "2 days ago",
    favouriteItems: ["Grilled Hammour", "Saffron Rice", "Arabic Coffee"],
    savedPaymentMethods: [{ method: "Mada", masked: "•••• 4421" }, { method: "Apple Pay", masked: "Wallet" }],
    notes: "Prefers window seating. Allergic to shellfish.",
    visitHistory: [
      { orderId: "ORD-88231", date: "6 Aug 2026, 19:40", branch: "Riyadh - Olaya", total: "SAR 214.50", items: 4 },
      { orderId: "ORD-87904", date: "29 Jul 2026, 20:05", branch: "Riyadh - Olaya", total: "SAR 168.00", items: 3 },
      { orderId: "ORD-87310", date: "18 Jul 2026, 13:20", branch: "Riyadh - Narjis", total: "SAR 96.40", items: 2 },
      { orderId: "ORD-86712", date: "5 Jul 2026, 21:10", branch: "Riyadh - Olaya", total: "SAR 241.00", items: 5 },
    ],
  },
  {
    id: "CUST-1002", name: "Noura Al-Harbi", phone: "+966 55 234 5678", email: "noura.harbi@outlook.com",
    segment: "Regular", visits: 28, totalSpent: "SAR 3,150", avgBasket: "SAR 112.50", loyaltyTier: "Gold",
    loyaltyPoints: 1840, lastVisit: "5 days ago",
    favouriteItems: ["Chicken Shawarma Plate", "Fattoush"],
    savedPaymentMethods: [{ method: "Visa", masked: "•••• 9012" }],
    notes: "",
    visitHistory: [
      { orderId: "ORD-88012", date: "3 Aug 2026, 13:05", branch: "Jeddah - Corniche", total: "SAR 78.00", items: 2 },
      { orderId: "ORD-87455", date: "22 Jul 2026, 19:30", branch: "Jeddah - Corniche", total: "SAR 145.50", items: 3 },
    ],
  },
  {
    id: "CUST-1003", name: "Faisal Al-Zahrani", phone: "+966 54 345 6789", email: "f.zahrani@icloud.com",
    segment: "New", visits: 2, totalSpent: "SAR 210", avgBasket: "SAR 105.00", loyaltyTier: "Bronze",
    loyaltyPoints: 105, lastVisit: "1 day ago",
    favouriteItems: ["Beef Burger"],
    savedPaymentMethods: [{ method: "STC Pay", masked: "Wallet" }],
    notes: "Signed up via referral.",
    visitHistory: [
      { orderId: "ORD-88301", date: "7 Aug 2026, 20:15", branch: "Riyadh - Narjis", total: "SAR 110.00", items: 2 },
      { orderId: "ORD-87990", date: "31 Jul 2026, 12:40", branch: "Riyadh - Narjis", total: "SAR 100.00", items: 1 },
    ],
  },
  {
    id: "CUST-1004", name: "Sara Al-Otaibi", phone: "+966 56 456 7890", email: "sara.otaibi@gmail.com",
    segment: "VIP", visits: 74, totalSpent: "SAR 11,860", avgBasket: "SAR 160.30", loyaltyTier: "Platinum",
    loyaltyPoints: 5920, lastVisit: "Today",
    favouriteItems: ["Mixed Grill", "Um Ali", "Fresh Lemonade"],
    savedPaymentMethods: [{ method: "Mada", masked: "•••• 2287" }, { method: "Tamara", masked: "Pay in 4" }],
    notes: "VIP — always greeted by branch manager.",
    visitHistory: [
      { orderId: "ORD-88350", date: "8 Aug 2026, 12:50", branch: "Riyadh - Olaya", total: "SAR 302.00", items: 6 },
      { orderId: "ORD-88190", date: "2 Aug 2026, 20:30", branch: "Riyadh - Olaya", total: "SAR 189.50", items: 4 },
      { orderId: "ORD-87801", date: "27 Jul 2026, 19:10", branch: "Riyadh - Olaya", total: "SAR 156.00", items: 3 },
    ],
  },
  {
    id: "CUST-1005", name: "Khalid Al-Dosari", phone: "+966 53 567 8901", email: "khalid.dosari@yahoo.com",
    segment: "At Risk", visits: 14, totalSpent: "SAR 1,640", avgBasket: "SAR 117.10", loyaltyTier: "Silver",
    loyaltyPoints: 640, lastVisit: "48 days ago",
    favouriteItems: ["Kabsa", "Green Salad"],
    savedPaymentMethods: [{ method: "Cash", masked: "—" }],
    notes: "Had a delayed delivery complaint on 12 Jun.",
    visitHistory: [
      { orderId: "ORD-84210", date: "21 Jun 2026, 18:20", branch: "Dammam - Corniche", total: "SAR 132.00", items: 3 },
      { orderId: "ORD-83905", date: "9 Jun 2026, 13:15", branch: "Dammam - Corniche", total: "SAR 88.50", items: 2 },
    ],
  },
  {
    id: "CUST-1006", name: "Lama Al-Ghamdi", phone: "+966 59 678 9012", email: "lama.ghamdi@gmail.com",
    segment: "Regular", visits: 19, totalSpent: "SAR 2,080", avgBasket: "SAR 109.50", loyaltyTier: "Silver",
    loyaltyPoints: 720, lastVisit: "9 days ago",
    favouriteItems: ["Molten Chocolate Cake", "Cappuccino"],
    savedPaymentMethods: [{ method: "Apple Pay", masked: "Wallet" }],
    notes: "",
    visitHistory: [
      { orderId: "ORD-87610", date: "30 Jul 2026, 17:45", branch: "Khobar - Rakah", total: "SAR 94.00", items: 2 },
      { orderId: "ORD-87102", date: "16 Jul 2026, 20:00", branch: "Khobar - Rakah", total: "SAR 121.50", items: 3 },
    ],
  },
  {
    id: "CUST-1007", name: "Turki Al-Shehri", phone: "+966 50 789 0123", email: "turki.shehri@gmail.com",
    segment: "Churned", visits: 6, totalSpent: "SAR 540", avgBasket: "SAR 90.00", loyaltyTier: "Bronze",
    loyaltyPoints: 80, lastVisit: "112 days ago",
    favouriteItems: ["Falafel Wrap"],
    savedPaymentMethods: [],
    notes: "No response to last two campaigns.",
    visitHistory: [
      { orderId: "ORD-79102", date: "18 Apr 2026, 12:30", branch: "Jeddah - Corniche", total: "SAR 76.00", items: 2 },
    ],
  },
  {
    id: "CUST-1008", name: "Hessa Al-Mutairi", phone: "+966 55 890 1234", email: "hessa.mutairi@hotmail.com",
    segment: "New", visits: 1, totalSpent: "SAR 95", avgBasket: "SAR 95.00", loyaltyTier: "Bronze",
    loyaltyPoints: 45, lastVisit: "Today",
    favouriteItems: ["Chicken Caesar Salad"],
    savedPaymentMethods: [{ method: "Mada", masked: "•••• 7734" }],
    notes: "First order — via mobile app.",
    visitHistory: [
      { orderId: "ORD-88352", date: "8 Aug 2026, 13:10", branch: "Riyadh - Olaya", total: "SAR 95.00", items: 2 },
    ],
  },
  {
    id: "CUST-1009", name: "Majed Al-Anazi", phone: "+966 54 901 2345", email: "majed.anazi@gmail.com",
    segment: "Regular", visits: 33, totalSpent: "SAR 3,920", avgBasket: "SAR 118.80", loyaltyTier: "Gold",
    loyaltyPoints: 1980, lastVisit: "3 days ago",
    favouriteItems: ["Lamb Ouzi", "Tabbouleh"],
    savedPaymentMethods: [{ method: "Visa", masked: "•••• 5560" }],
    notes: "",
    visitHistory: [
      { orderId: "ORD-88060", date: "5 Aug 2026, 19:25", branch: "Riyadh - Narjis", total: "SAR 176.00", items: 4 },
      { orderId: "ORD-87498", date: "23 Jul 2026, 20:40", branch: "Riyadh - Narjis", total: "SAR 142.00", items: 3 },
    ],
  },
  {
    id: "CUST-1010", name: "Reem Al-Subaie", phone: "+966 58 012 3456", email: "reem.subaie@gmail.com",
    segment: "VIP", visits: 51, totalSpent: "SAR 7,310", avgBasket: "SAR 143.30", loyaltyTier: "Platinum",
    loyaltyPoints: 3650, lastVisit: "Yesterday",
    favouriteItems: ["Seafood Platter", "Mango Mousse"],
    savedPaymentMethods: [{ method: "Mada", masked: "•••• 3391" }],
    notes: "Regularly books the private room for family events.",
    visitHistory: [
      { orderId: "ORD-88240", date: "7 Aug 2026, 20:50", branch: "Dammam - Corniche", total: "SAR 268.00", items: 5 },
      { orderId: "ORD-87880", date: "28 Jul 2026, 19:15", branch: "Dammam - Corniche", total: "SAR 194.00", items: 4 },
    ],
  },
  {
    id: "CUST-1011", name: "Bandar Al-Rashidi", phone: "+966 56 123 4567", email: "bandar.rashidi@gmail.com",
    segment: "At Risk", visits: 11, totalSpent: "SAR 1,120", avgBasket: "SAR 101.80", loyaltyTier: "Bronze",
    loyaltyPoints: 310, lastVisit: "39 days ago",
    favouriteItems: ["Grilled Chicken Wrap"],
    savedPaymentMethods: [{ method: "STC Pay", masked: "Wallet" }],
    notes: "",
    visitHistory: [
      { orderId: "ORD-85110", date: "30 Jun 2026, 13:40", branch: "Khobar - Rakah", total: "SAR 92.00", items: 2 },
    ],
  },
  {
    id: "CUST-1012", name: "Alanoud Al-Malki", phone: "+966 50 234 5678", email: "alanoud.malki@gmail.com",
    segment: "Regular", visits: 22, totalSpent: "SAR 2,610", avgBasket: "SAR 118.60", loyaltyTier: "Silver",
    loyaltyPoints: 890, lastVisit: "6 days ago",
    favouriteItems: ["Beef Kofta", "Hummus"],
    savedPaymentMethods: [{ method: "Tabby", masked: "Pay in 4" }],
    notes: "",
    visitHistory: [
      { orderId: "ORD-87710", date: "2 Aug 2026, 18:05", branch: "Riyadh - Olaya", total: "SAR 108.00", items: 2 },
      { orderId: "ORD-87220", date: "19 Jul 2026, 20:20", branch: "Riyadh - Olaya", total: "SAR 138.50", items: 3 },
    ],
  },
];

/* -------------------------------------------------------------- segments */

export interface CustomerSegmentDef {
  id: string;
  name: string;
  memberCount: number;
  percentOfBase: number;
  avgSpend: string;
  growth: number;
  ruleSummary: string;
  membershipTrend: readonly number[];
}

export const customerSegments: readonly CustomerSegmentDef[] = [
  { id: "seg-vip", name: "VIP", memberCount: 842, percentOfBase: 6.6, avgSpend: "SAR 1,840", growth: 4.2,
    ruleSummary: "Visits ≥ 40 AND Total spent ≥ SAR 5,000",
    membershipTrend: [60, 62, 64, 63, 66, 68, 70, 72] },
  { id: "seg-regular", name: "Regular", memberCount: 4180, percentOfBase: 32.5, avgSpend: "SAR 420",
    growth: 1.8, ruleSummary: "Visits ≥ 10 AND Last visit < 30 days",
    membershipTrend: [300, 310, 305, 320, 330, 325, 340, 350] },
  { id: "seg-new", name: "New", memberCount: 1260, percentOfBase: 9.8, avgSpend: "SAR 110", growth: 9.4,
    ruleSummary: "Account age < 30 days",
    membershipTrend: [70, 80, 78, 90, 95, 100, 110, 118] },
  { id: "seg-at-risk", name: "At Risk", memberCount: 968, percentOfBase: 7.5, avgSpend: "SAR 640",
    growth: -3.1, ruleSummary: "Last visit 30–60 days AND Visits ≥ 5",
    membershipTrend: [110, 105, 108, 100, 98, 95, 92, 90] },
  { id: "seg-churned", name: "Churned", memberCount: 2140, percentOfBase: 16.7, avgSpend: "SAR 480",
    growth: -1.4, ruleSummary: "Last visit > 90 days",
    membershipTrend: [230, 228, 232, 235, 233, 238, 240, 242] },
  { id: "seg-big-spenders", name: "Big Spenders", memberCount: 512, percentOfBase: 4.0, avgSpend: "SAR 2,610",
    growth: 6.7, ruleSummary: "Avg basket ≥ SAR 200",
    membershipTrend: [40, 42, 44, 46, 48, 50, 53, 56] },
  { id: "seg-ramadan-only", name: "Ramadan Only", memberCount: 1830, percentOfBase: 14.2, avgSpend: "SAR 380",
    growth: 2.0, ruleSummary: "Visits only during Ramadan period",
    membershipTrend: [20, 25, 40, 80, 140, 180, 90, 30] },
  { id: "seg-delivery-only", name: "Delivery Only", memberCount: 1420, percentOfBase: 11.1, avgSpend: "SAR 165",
    growth: 3.6, ruleSummary: "100% of orders via Delivery channel",
    membershipTrend: [180, 190, 195, 205, 210, 215, 225, 230] },
] as const;

export const segmentRuleFields = [
  "Visits", "Total spent", "Avg basket", "Last visit (days ago)", "Account age (days)", "Loyalty tier",
] as const;

export const segmentRuleOperators = [">=", "<=", "=", "<", ">"] as const;

/* -------------------------------------------------------------- feedback */

export type FeedbackChannel = "In-app" | "WhatsApp" | "Google" | "Aggregator";
export type FeedbackCategory =
  | "Food Quality" | "Service" | "Delivery Time" | "Wrong Order" | "Cleanliness" | "Pricing";
export type FeedbackStatus = "New" | "In Progress" | "Resolved" | "Escalated";

export interface FeedbackNote {
  author: string;
  note: string;
  time: string;
}

export interface FeedbackRow {
  id: string;
  date: string;
  customer: string;
  branch: string;
  channel: FeedbackChannel;
  rating: number;
  category: FeedbackCategory;
  status: FeedbackStatus;
  assignedTo: string;
  orderId: string;
  comment: string;
  internalNotes: readonly FeedbackNote[];
}

export const feedbackStats: readonly KpiCard[] = [
  { id: "avg-rating", label: "AVG RATING", value: "4.6", delta: "+0.2", deltaNote: "vs last month",
    color: "#a78bfa", sparkline: [42, 43, 44, 43, 45, 46, 45, 47, 46, 48, 47, 49, 48, 50, 49, 51] },
  { id: "reviews-month", label: "REVIEWS THIS MONTH", value: "284", delta: "+11.0%", deltaNote: "vs last month",
    color: "#60a5fa", sparkline: [20, 22, 21, 24, 23, 26, 25, 28, 27, 30, 29, 32, 31, 34, 33, 36] },
  { id: "open-complaints", label: "OPEN COMPLAINTS", value: "12", delta: "-8.3%", deltaNote: "vs last week",
    color: "#fb923c", sparkline: [18, 17, 19, 16, 18, 15, 17, 14, 16, 13, 15, 12, 14, 11, 13, 12] },
  { id: "avg-resolution", label: "AVG RESOLUTION TIME", value: "6.4 hrs", delta: "-14.2%", deltaNote: "vs last month",
    color: "#a3e635", sparkline: [9, 8.6, 9.2, 8.4, 8.8, 8, 7.6, 8.2, 7.4, 7.8, 7, 7.4, 6.8, 7, 6.4, 6.6] },
];

export const ratingDistribution: readonly { stars: number; count: number }[] = [
  { stars: 5, count: 172 },
  { stars: 4, count: 68 },
  { stars: 3, count: 26 },
  { stars: 2, count: 11 },
  { stars: 1, count: 7 },
];

export const feedbackRows: readonly FeedbackRow[] = [
  { id: "FB-3001", date: "8 Aug 2026, 14:20", customer: "Abdullah Al-Qahtani", branch: "Riyadh - Olaya",
    channel: "In-app", rating: 5, category: "Food Quality", status: "Resolved", assignedTo: "Sara (CX)",
    orderId: "ORD-88231", comment: "Best hammour I've had — perfectly grilled and the rice was fragrant.",
    internalNotes: [{ author: "Sara (CX)", note: "Thanked customer, no action needed.", time: "8 Aug 2026, 15:00" }] },
  { id: "FB-3002", date: "7 Aug 2026, 21:05", customer: "Khalid Al-Dosari", branch: "Dammam - Corniche",
    channel: "WhatsApp", rating: 2, category: "Delivery Time", status: "Escalated", assignedTo: "Omar (Ops)",
    orderId: "ORD-84210", comment: "Order arrived over an hour late and the food was cold.",
    internalNotes: [{ author: "Omar (Ops)", note: "Escalated to delivery zone lead for the second time this month.", time: "7 Aug 2026, 21:40" }] },
  { id: "FB-3003", date: "7 Aug 2026, 13:15", customer: "Reem Al-Subaie", branch: "Dammam - Corniche",
    channel: "Google", rating: 5, category: "Service", status: "New", assignedTo: "Unassigned",
    orderId: "ORD-88240", comment: "Staff were incredibly attentive for our family gathering.",
    internalNotes: [] },
  { id: "FB-3004", date: "6 Aug 2026, 20:30", customer: "Turki Al-Shehri", branch: "Jeddah - Corniche",
    channel: "Aggregator", rating: 1, category: "Wrong Order", status: "In Progress", assignedTo: "Layla (CX)",
    orderId: "ORD-79102", comment: "Received a completely different order, missing the falafel wrap entirely.",
    internalNotes: [{ author: "Layla (CX)", note: "Refund initiated, awaiting confirmation from Jahez.", time: "6 Aug 2026, 21:00" }] },
  { id: "FB-3005", date: "6 Aug 2026, 12:50", customer: "Lama Al-Ghamdi", branch: "Khobar - Rakah",
    channel: "In-app", rating: 4, category: "Food Quality", status: "Resolved", assignedTo: "Sara (CX)",
    orderId: "ORD-87610", comment: "Cake was great, portion could be a bit bigger for the price.",
    internalNotes: [] },
  { id: "FB-3006", date: "5 Aug 2026, 19:40", customer: "Majed Al-Anazi", branch: "Riyadh - Narjis",
    channel: "WhatsApp", rating: 3, category: "Cleanliness", status: "In Progress", assignedTo: "Omar (Ops)",
    orderId: "ORD-88060", comment: "Table was a bit sticky when we sat down, food itself was fine.",
    internalNotes: [{ author: "Omar (Ops)", note: "Flagged to branch manager for extra table checks.", time: "5 Aug 2026, 20:00" }] },
  { id: "FB-3007", date: "4 Aug 2026, 18:10", customer: "Sara Al-Otaibi", branch: "Riyadh - Olaya",
    channel: "Google", rating: 5, category: "Service", status: "Resolved", assignedTo: "Sara (CX)",
    orderId: "ORD-88190", comment: "Always a great experience, the team knows us by name now.",
    internalNotes: [] },
  { id: "FB-3008", date: "4 Aug 2026, 13:05", customer: "Bandar Al-Rashidi", branch: "Khobar - Rakah",
    channel: "In-app", rating: 2, category: "Pricing", status: "New", assignedTo: "Unassigned",
    orderId: "ORD-85110", comment: "Prices went up but portion sizes feel smaller than before.",
    internalNotes: [] },
  { id: "FB-3009", date: "3 Aug 2026, 21:20", customer: "Noura Al-Harbi", branch: "Jeddah - Corniche",
    channel: "Aggregator", rating: 3, category: "Delivery Time", status: "Resolved", assignedTo: "Layla (CX)",
    orderId: "ORD-88012", comment: "Delivery took a while but the rider apologised and was polite.",
    internalNotes: [] },
  { id: "FB-3010", date: "3 Aug 2026, 12:35", customer: "Alanoud Al-Malki", branch: "Riyadh - Olaya",
    channel: "In-app", rating: 4, category: "Food Quality", status: "Resolved", assignedTo: "Sara (CX)",
    orderId: "ORD-87710", comment: "Kofta was well seasoned, would order again.",
    internalNotes: [] },
  { id: "FB-3011", date: "2 Aug 2026, 20:00", customer: "Faisal Al-Zahrani", branch: "Riyadh - Narjis",
    channel: "WhatsApp", rating: 1, category: "Wrong Order", status: "Escalated", assignedTo: "Omar (Ops)",
    orderId: "ORD-88301", comment: "Second time this month my order has been mixed up with someone else's.",
    internalNotes: [{ author: "Omar (Ops)", note: "Escalated to branch manager, pattern of repeat errors.", time: "2 Aug 2026, 20:30" }] },
  { id: "FB-3012", date: "1 Aug 2026, 14:45", customer: "Hessa Al-Mutairi", branch: "Riyadh - Olaya",
    channel: "In-app", rating: 5, category: "Service", status: "New", assignedTo: "Unassigned",
    orderId: "ORD-88352", comment: "Loved my first visit, the waiter recommended the caesar salad and it was perfect.",
    internalNotes: [] },
];
