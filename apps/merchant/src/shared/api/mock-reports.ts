// Mock data for the Reports module (W2-09) — stands in for @octopus/api-client
// until the backend publishes a real OpenAPI spec. Six report pages share this
// file: sales, margin, channels, customers, compliance, scheduled.
//
// All monetary values are raw SAR numbers; pages format them via the shared
// _shared/format.ts helpers so the date-range Segmented can rescale KPI strips.

import type { KpiCard } from "./mock-dashboard";

/* -------------------------------------------------------------------- ranges */

export type ReportRange = "today" | "7d" | "30d" | "quarter" | "year";

/* --------------------------------------------------------------------- sales */

/** Monthly bases — net = gross − discounts. */
export const salesKpiBase = {
  netSales: 2_840_000,
  grossSales: 3_100_000,
  discounts: 260_000,
  orders: 18_420,
  avgBasket: 152,
} as const;

export interface TrendSeries {
  key: "dineIn" | "takeaway" | "delivery" | "kiosk" | "aggregator";
  labelKey: string; // i18n key, e.g. "channels.dineIn"
  color: string;
}

export const salesTrendSeries: readonly TrendSeries[] = [
  { key: "dineIn", labelKey: "channels.dineIn", color: "#2ec9c0" },
  { key: "takeaway", labelKey: "channels.takeaway", color: "#22c9d9" },
  { key: "delivery", labelKey: "channels.delivery", color: "#5b8def" },
  { key: "kiosk", labelKey: "channels.kiosk", color: "#8b7cf0" },
  { key: "aggregator", labelKey: "channels.aggregator", color: "#4c35d4" },
] as const;

export interface SalesTrendPoint {
  period: string;
  dineIn: number;
  takeaway: number;
  delivery: number;
  aggregator: number;
  kiosk: number;
}

/** Values in SAR thousands. Last 8 months; sums to ≈ SAR 2.84M. */
export const salesTrend: readonly SalesTrendPoint[] = [
  { period: "Jan", dineIn: 131, takeaway: 47, delivery: 78, aggregator: 31, kiosk: 25 },
  { period: "Feb", dineIn: 134, takeaway: 48, delivery: 80, aggregator: 32, kiosk: 26 },
  { period: "Mar", dineIn: 141, takeaway: 51, delivery: 85, aggregator: 34, kiosk: 27 },
  { period: "Apr", dineIn: 138, takeaway: 50, delivery: 83, aggregator: 33, kiosk: 27 },
  { period: "May", dineIn: 146, takeaway: 53, delivery: 88, aggregator: 35, kiosk: 28 },
  { period: "Jun", dineIn: 151, takeaway: 54, delivery: 91, aggregator: 36, kiosk: 29 },
  { period: "Jul", dineIn: 158, takeaway: 57, delivery: 95, aggregator: 38, kiosk: 30 },
  { period: "Aug", dineIn: 164, takeaway: 59, delivery: 99, aggregator: 39, kiosk: 32 },
] as const;

export const salesTrendAxisMax = 400;
export const salesTrendAxisTicks = [0, 80, 160, 240, 320, 400] as const;

export const salesDayParts = {
  total: "SAR 2.84M",
  captionKey: "reports.sales.col.net",
  items: [
    { labelKey: "reports.sales.dayPart.lunch", value: "SAR 1.08M", percent: 38, color: "#2ec9c0" },
    { labelKey: "reports.sales.dayPart.dinner", value: "SAR 1.48M", percent: 52, color: "#5b8def" },
    { labelKey: "reports.sales.dayPart.lateNight", value: "SAR 284K", percent: 10, color: "#4c35d4" },
  ] as readonly { labelKey: string; value: string; percent: number; color: string }[],
} as const;

export interface BranchRevenue {
  branch: string;
  revenue: number; // SAR
  percent: number; // of net sales
  color: string;
}

export const salesByBranch: readonly BranchRevenue[] = [
  { branch: "Riyadh - Olaya", revenue: 812_000, percent: 28.6, color: "#2ec9c0" },
  { branch: "Jeddah - Corniche", revenue: 723_000, percent: 25.5, color: "#22c9d9" },
  { branch: "Riyadh - Narjis", revenue: 640_000, percent: 22.5, color: "#5b8def" },
  { branch: "Dammam - Corniche", revenue: 431_000, percent: 15.2, color: "#8b7cf0" },
  { branch: "Khobar - Rakah", revenue: 234_000, percent: 8.2, color: "#4c35d4" },
] as const;

export interface DailySalesRow {
  date: string;
  dineIn: number;
  takeaway: number;
  delivery: number;
  aggregator: number;
  kiosk: number;
  /** sum of the five channels above */
  total: number;
  /** day-over-day change of total, % */
  growthPct: number;
}

export const dailySales: readonly DailySalesRow[] = [
  { date: "09 Aug 2026", dineIn: 49_772, takeaway: 16_230, delivery: 29_214, aggregator: 8_656, kiosk: 4_328, total: 108_200, growthPct: -3.7 },
  { date: "08 Aug 2026", dineIn: 50_580, takeaway: 17_984, delivery: 30_348, aggregator: 8_992, kiosk: 4_496, total: 112_400, growthPct: 12.4 },
  { date: "07 Aug 2026", dineIn: 47_000, takeaway: 15_000, delivery: 26_000, aggregator: 8_000, kiosk: 4_000, total: 100_000, growthPct: -12.6 },
  { date: "06 Aug 2026", dineIn: 50_336, takeaway: 18_304, delivery: 32_032, aggregator: 9_152, kiosk: 4_576, total: 114_400, growthPct: 29.1 },
  { date: "05 Aug 2026", dineIn: 40_756, takeaway: 13_290, delivery: 23_922, aggregator: 7_088, kiosk: 3_544, total: 88_600, growthPct: -13.6 },
  { date: "04 Aug 2026", dineIn: 46_170, takeaway: 16_416, delivery: 27_702, aggregator: 8_208, kiosk: 4_104, total: 102_600, growthPct: 13.5 },
  { date: "03 Aug 2026", dineIn: 42_488, takeaway: 13_560, delivery: 23_504, aggregator: 7_232, kiosk: 3_616, total: 90_400, growthPct: 11.7 },
  { date: "02 Aug 2026", dineIn: 37_214, takeaway: 12_135, delivery: 21_843, aggregator: 6_472, kiosk: 3_236, total: 80_900, growthPct: -5.3 },
  { date: "01 Aug 2026", dineIn: 38_430, takeaway: 13_664, delivery: 23_058, aggregator: 6_832, kiosk: 3_416, total: 85_400, growthPct: 10.1 },
  { date: "31 Jul 2026", dineIn: 34_144, takeaway: 12_416, delivery: 21_728, aggregator: 6_208, kiosk: 3_104, total: 77_600, growthPct: 0 },
] as const;

/* --------------------------------------------------------------------- margin */

export const marginKpiBase = {
  revenue: 2_840_000,
  cogs: 1_068_000,
  grossMarginPct: 62.4,
  foodCostPct: 37.6,
  labourCostPct: 21.4,
} as const;

export interface MarginTrendPoint {
  period: string;
  revenue: number; // SAR thousands
  cogs: number; // SAR thousands
}

export const marginTrend: readonly MarginTrendPoint[] = [
  { period: "Jan", revenue: 275, cogs: 104 },
  { period: "Feb", revenue: 280, cogs: 105 },
  { period: "Mar", revenue: 292, cogs: 110 },
  { period: "Apr", revenue: 288, cogs: 108 },
  { period: "May", revenue: 305, cogs: 115 },
  { period: "Jun", revenue: 315, cogs: 118 },
  { period: "Jul", revenue: 330, cogs: 123 },
  { period: "Aug", revenue: 344, cogs: 129 },
] as const;

export const marginTrendAxisMax = 400;
export const marginTrendAxisTicks = [0, 100, 200, 300, 400] as const;

export const costStructure = {
  total: "100%",
  captionKey: "reports.margin.costShare",
  items: [
    { labelKey: "reports.margin.cost.food", value: "48%", percent: 48, color: "#2ec9c0" },
    { labelKey: "reports.margin.cost.labour", value: "34%", percent: 34, color: "#5b8def" },
    { labelKey: "reports.margin.cost.overhead", value: "12%", percent: 12, color: "#8b7cf0" },
    { labelKey: "reports.margin.cost.other", value: "6%", percent: 6, color: "#4c35d4" },
  ] as readonly { labelKey: string; value: string; percent: number; color: string }[],
} as const;

export interface MarginItem {
  id: string;
  item: string;
  itemAr: string;
  revenue: number; // SAR
  cost: number; // SAR
  units: number;
  /** share of total margin, 0–100 — table sorts by this descending */
  contributionPct: number;
}

/** Pre-sorted by contribution descending; margin < 40% gets flagged. */
export const marginByItem: readonly MarginItem[] = [
  { id: "m-1", item: "Chicken Shawarma", itemAr: "شاورما دجاج", revenue: 512_300, cost: 190_000, units: 12_840, contributionPct: 23.5 },
  { id: "m-2", item: "Lamb Mandi", itemAr: "مندي لحم", revenue: 461_100, cost: 201_000, units: 7_680, contributionPct: 19.0 },
  { id: "m-3", item: "Mixed Grill", itemAr: "مشاوي مشكلة", revenue: 486_900, cost: 240_000, units: 9_215, contributionPct: 18.0 },
  { id: "m-4", item: "Saudi Coffee", itemAr: "قهوة سعودية", revenue: 197_200, cost: 41_000, units: 9_860, contributionPct: 11.4 },
  { id: "m-5", item: "Kunafa", itemAr: "كنافة", revenue: 184_200, cost: 96_000, units: 6_140, contributionPct: 6.4 },
  { id: "m-6", item: "Grilled Kebab", itemAr: "كباب مشوي", revenue: 153_600, cost: 71_000, units: 5_290, contributionPct: 6.0 },
  { id: "m-7", item: "Hummus", itemAr: "حمص", revenue: 228_600, cost: 152_000, units: 11_430, contributionPct: 5.6 },
  { id: "m-8", item: "Basmati Rice Bowl", itemAr: "بولة أرز بسمتي", revenue: 96_000, cost: 42_000, units: 4_800, contributionPct: 3.9 },
  { id: "m-9", item: "Molokhia", itemAr: "ملوخية", revenue: 141_800, cost: 98_000, units: 4_720, contributionPct: 3.2 },
  { id: "m-10", item: "Fresh Juice", itemAr: "عصير طازج", revenue: 112_000, cost: 72_000, units: 5_600, contributionPct: 2.9 },
] as const;

/* ------------------------------------------------------------------ channels */

export interface ChannelPerformance {
  channel: string; // i18n via labelKey
  orders: number;
  revenue: number; // SAR
  avgBasket: number;
  growth: number; // %
}

/** Orders sum to 18,420 and revenue to SAR 2.84M. */
export const channelPerformance: readonly ChannelPerformance[] = [
  { channel: "Dine-in", orders: 7_040, revenue: 1_152_000, avgBasket: 163, growth: 6.4 },
  { channel: "Takeaway", orders: 2_740, revenue: 418_000, avgBasket: 153, growth: 9.1 },
  { channel: "Delivery", orders: 4_320, revenue: 702_000, avgBasket: 162, growth: 22.8 },
  { channel: "Kiosk", orders: 1_520, revenue: 251_000, avgBasket: 165, growth: 3.2 },
  { channel: "Aggregator", orders: 2_800, revenue: 317_000, avgBasket: 113, growth: 18.5 },
] as const;

export const channelMix = {
  total: "SAR 2.84M",
  captionKey: "reports.col.revenue",
  items: [
    { labelKey: "channels.dineIn", value: "SAR 1.15M", percent: 40.6, color: "#2ec9c0" },
    { labelKey: "channels.takeaway", value: "SAR 418K", percent: 14.7, color: "#22c9d9" },
    { labelKey: "channels.delivery", value: "SAR 702K", percent: 24.7, color: "#5b8def" },
    { labelKey: "channels.kiosk", value: "SAR 251K", percent: 8.8, color: "#8b7cf0" },
    { labelKey: "channels.aggregator", value: "SAR 317K", percent: 11.2, color: "#4c35d4" },
  ] as readonly { labelKey: string; value: string; percent: number; color: string }[],
} as const;

export const branchNames = [
  "Riyadh - Olaya",
  "Riyadh - Narjis",
  "Jeddah - Corniche",
  "Dammam - Corniche",
  "Khobar - Rakah",
] as const;

/** Channel × branch revenue matrix, values in SAR thousands. */
export const channelBranchRevenue: readonly { channel: string; cells: readonly number[] }[] = [
  { channel: "Dine-in", cells: [330, 220, 296, 176, 130] },
  { channel: "Takeaway", cells: [112, 82, 104, 66, 54] },
  { channel: "Delivery", cells: [210, 138, 182, 110, 62] },
  { channel: "Kiosk", cells: [68, 46, 62, 42, 33] },
  { channel: "Aggregator", cells: [94, 58, 82, 50, 33] },
] as const;

/* ------------------------------------------------------------------ customers */

export const customerKpiBase = {
  newCustomers: 1_240,
  returningPct: 41.8,
  retentionRate: 68.5,
  avgFrequency: 3.4,
  clv: 1_240,
} as const;

export interface NewReturningPoint {
  period: string;
  new: number;
  returning: number;
}

export const newVsReturning: readonly NewReturningPoint[] = [
  { period: "Jan", new: 810, returning: 640 },
  { period: "Feb", new: 860, returning: 690 },
  { period: "Mar", new: 940, returning: 720 },
  { period: "Apr", new: 910, returning: 710 },
  { period: "May", new: 1_030, returning: 800 },
  { period: "Jun", new: 1_120, returning: 880 },
  { period: "Jul", new: 1_180, returning: 930 },
  { period: "Aug", new: 1_240, returning: 980 },
] as const;

export const newVsReturningAxisMax = 1400;
export const newVsReturningAxisTicks = [0, 350, 700, 1050, 1400] as const;

export const cohortMonths = ["M0", "M1", "M2", "M3", "M4", "M5", "M6"] as const;

export const cohortRetention: readonly { cohort: string; values: readonly number[] }[] = [
  { cohort: "Jan", values: [100, 78, 66, 58, 51, 46, 42] },
  { cohort: "Feb", values: [100, 80, 68, 59, 53, 47] },
  { cohort: "Mar", values: [100, 76, 64, 55, 48] },
  { cohort: "Apr", values: [100, 82, 70, 61] },
  { cohort: "May", values: [100, 77, 65] },
  { cohort: "Jun", values: [100, 79] },
  { cohort: "Jul", values: [100] },
  { cohort: "Aug", values: [100] },
] as const;

export interface RfmSegment {
  labelKey: string;
  count: number;
  color: string;
}

export const rfmSegments: readonly RfmSegment[] = [
  { labelKey: "reports.customers.rfm.champions", count: 2_840, color: "#2ec9c0" },
  { labelKey: "reports.customers.rfm.loyal", count: 1_930, color: "#5b8def" },
  { labelKey: "reports.customers.rfm.newCustomers", count: 3_120, color: "#8b7cf0" },
  { labelKey: "reports.customers.rfm.atRisk", count: 1_240, color: "#fb923c" },
  { labelKey: "reports.customers.rfm.lost", count: 1_480, color: "#a9a9b2" },
] as const;

export const rfmMaxCount = 3_120;

export interface TopCustomer {
  rank: number;
  name: string;
  visits: number;
  spend: number; // SAR
  avgBasket: number; // SAR, spend ÷ visits
  frequency: number; // visits per month
  /** i18n key, one of reports.customers.rfm.* */
  segmentKey: string;
}

export const topCustomers: readonly TopCustomer[] = [
  { rank: 1, name: "Abdullah Alqahtani", visits: 128, spend: 18_420, avgBasket: 143.9, frequency: 4.2, segmentKey: "reports.customers.rfm.champions" },
  { rank: 2, name: "Noura Alsulami", visits: 115, spend: 16_890, avgBasket: 146.9, frequency: 3.8, segmentKey: "reports.customers.rfm.champions" },
  { rank: 3, name: "Faisal Almalki", visits: 98, spend: 14_320, avgBasket: 146.1, frequency: 3.1, segmentKey: "reports.customers.rfm.champions" },
  { rank: 4, name: "Sara Alharbi", visits: 92, spend: 13_870, avgBasket: 150.8, frequency: 2.9, segmentKey: "reports.customers.rfm.champions" },
  { rank: 5, name: "Mohammed Alotaibi", visits: 87, spend: 12_940, avgBasket: 148.7, frequency: 2.7, segmentKey: "reports.customers.rfm.loyal" },
  { rank: 6, name: "Reem Alzahrani", visits: 82, spend: 12_360, avgBasket: 150.7, frequency: 2.6, segmentKey: "reports.customers.rfm.loyal" },
  { rank: 7, name: "Khalid Almutairi", visits: 76, spend: 11_540, avgBasket: 151.8, frequency: 2.4, segmentKey: "reports.customers.rfm.loyal" },
  { rank: 8, name: "Hessa Alshammari", visits: 71, spend: 10_880, avgBasket: 153.2, frequency: 2.3, segmentKey: "reports.customers.rfm.loyal" },
  { rank: 9, name: "Omar Alharbi", visits: 68, spend: 10_420, avgBasket: 153.2, frequency: 2.2, segmentKey: "reports.customers.rfm.loyal" },
  { rank: 10, name: "Laila Alqahtani", visits: 64, spend: 9_860, avgBasket: 154.1, frequency: 2.1, segmentKey: "reports.customers.rfm.loyal" },
  { rank: 11, name: "Salem Alghamdi", visits: 59, spend: 9_140, avgBasket: 154.9, frequency: 1.9, segmentKey: "reports.customers.rfm.newCustomers" },
  { rank: 12, name: "Aisha Alharbi", visits: 55, spend: 8_760, avgBasket: 159.3, frequency: 1.8, segmentKey: "reports.customers.rfm.newCustomers" },
  { rank: 13, name: "Turki Alsubai", visits: 51, spend: 8_240, avgBasket: 161.6, frequency: 1.7, segmentKey: "reports.customers.rfm.newCustomers" },
  { rank: 14, name: "Dana Alonazi", visits: 47, spend: 7_710, avgBasket: 164.0, frequency: 1.6, segmentKey: "reports.customers.rfm.newCustomers" },
  { rank: 15, name: "Fahad Alqhatani", visits: 44, spend: 7_120, avgBasket: 161.8, frequency: 1.5, segmentKey: "reports.customers.rfm.newCustomers" },
  { rank: 16, name: "Shatha Alomar", visits: 40, spend: 6_540, avgBasket: 163.5, frequency: 1.4, segmentKey: "reports.customers.rfm.newCustomers" },
  { rank: 17, name: "Bandar Alharbi", visits: 37, spend: 6_030, avgBasket: 163.0, frequency: 1.3, segmentKey: "reports.customers.rfm.atRisk" },
  { rank: 18, name: "Yara Almutairi", visits: 33, spend: 5_460, avgBasket: 165.5, frequency: 1.2, segmentKey: "reports.customers.rfm.atRisk" },
  { rank: 19, name: "Nawaf Alsubai", visits: 30, spend: 4_980, avgBasket: 166.0, frequency: 1.1, segmentKey: "reports.customers.rfm.atRisk" },
  { rank: 20, name: "Zainab Alotaibi", visits: 27, spend: 4_420, avgBasket: 163.7, frequency: 1.0, segmentKey: "reports.customers.rfm.atRisk" },
] as const;

/* ------------------------------------------------------------------ compliance */

export const complianceKpiBase = {
  issued: 12_847,
  clearedPct: 99.2,
  reportedPct: 98.4,
  rejected: 8,
  vatCollected: 300_000,
  vatPayable: 178_400,
} as const;

export interface SubmissionDay {
  date: string;
  issued: number;
  cleared: number;
  reported: number;
  rejected: number;
  pending: number;
}

export const submissionSummary: readonly SubmissionDay[] = [
  { date: "09 Aug", issued: 1_420, cleared: 1_410, reported: 1_402, rejected: 2, pending: 8 },
  { date: "08 Aug", issued: 1_386, cleared: 1_378, reported: 1_371, rejected: 1, pending: 7 },
  { date: "07 Aug", issued: 1_290, cleared: 1_281, reported: 1_274, rejected: 2, pending: 7 },
  { date: "06 Aug", issued: 1_358, cleared: 1_350, reported: 1_342, rejected: 1, pending: 6 },
  { date: "05 Aug", issued: 1_244, cleared: 1_236, reported: 1_231, rejected: 2, pending: 6 },
  { date: "04 Aug", issued: 1_311, cleared: 1_303, reported: 1_294, rejected: 0, pending: 8 },
  { date: "03 Aug", issued: 1_188, cleared: 1_179, reported: 1_174, rejected: 1, pending: 8 },
  { date: "02 Aug", issued: 1_106, cleared: 1_100, reported: 1_095, rejected: 1, pending: 5 },
] as const;

export interface VatSummaryRow {
  typeKey: string;
  net: number;
  vat: number;
  total: number;
}

/** VAT = 15% of standard-rated net; zero-rated and exempt carry none. */
export const vatSummary: readonly VatSummaryRow[] = [
  { typeKey: "reports.compliance.vatType.standard", net: 2_000_000, vat: 300_000, total: 2_300_000 },
  { typeKey: "reports.compliance.vatType.zeroRated", net: 800_000, vat: 0, total: 800_000 },
  { typeKey: "reports.compliance.vatType.exempt", net: 120_000, vat: 0, total: 120_000 },
] as const;

export const vatSummaryTotal = { net: 2_920_000, vat: 300_000, total: 3_220_000 } as const;

export const vatDonut = {
  total: "SAR 3.22M",
  captionKey: "reports.compliance.vatType.title",
  items: [
    { labelKey: "reports.compliance.vatType.standard", value: "SAR 2.3M", percent: 71.4, color: "#2ec9c0" },
    { labelKey: "reports.compliance.vatType.zeroRated", value: "SAR 800K", percent: 24.8, color: "#5b8def" },
    { labelKey: "reports.compliance.vatType.exempt", value: "SAR 120K", percent: 3.7, color: "#8b7cf0" },
  ] as readonly { labelKey: string; value: string; percent: number; color: string }[],
} as const;

export type ExceptionStatus = "rejected" | "warning";

export interface InvoiceException {
  id: string;
  date: string;
  typeKey: string;
  amount: number; // SAR
  reasonKey: string; // reports.compliance.reason.*
  status: ExceptionStatus;
}

export const invoiceExceptions: readonly InvoiceException[] = [
  { id: "#INV-33987", date: "09 Aug", typeKey: "reports.compliance.exception.standard", amount: 142.5, reasonKey: "reports.compliance.reason.uuid", status: "rejected" },
  { id: "#INV-33954", date: "09 Aug", typeKey: "reports.compliance.exception.standard", amount: 88.0, reasonKey: "reports.compliance.reason.csid", status: "rejected" },
  { id: "#INV-33912", date: "08 Aug", typeKey: "reports.compliance.exception.standard", amount: 214.0, reasonKey: "reports.compliance.reason.schema", status: "rejected" },
  { id: "#INV-33877", date: "08 Aug", typeKey: "reports.compliance.exception.simplified", amount: 96.4, reasonKey: "reports.compliance.reason.hash", status: "rejected" },
  { id: "#INV-33855", date: "07 Aug", typeKey: "reports.compliance.exception.simplified", amount: 61.25, reasonKey: "reports.compliance.reason.schemaWarning", status: "warning" },
  { id: "#INV-33830", date: "07 Aug", typeKey: "reports.compliance.exception.standard", amount: 175.8, reasonKey: "reports.compliance.reason.reported", status: "rejected" },
  { id: "#INV-33798", date: "06 Aug", typeKey: "reports.compliance.exception.simplified", amount: 44.9, reasonKey: "reports.compliance.reason.schemaWarning", status: "warning" },
  { id: "#INV-33760", date: "06 Aug", typeKey: "reports.compliance.exception.standard", amount: 120.0, reasonKey: "reports.compliance.reason.uuid", status: "rejected" },
] as const;

/* ---------------------------------------------------------------- scheduled */

export type ReportType = "Sales" | "Margin" | "Channels" | "Customers" | "Compliance";
export type ScheduleFrequency = "Daily" | "Weekly" | "Monthly";
export type ReportFormat = "PDF" | "Excel" | "CSV";
export type ScheduleChannel = "Email" | "WhatsApp";
export type ScheduleStatus = "Active" | "Paused" | "Failed";

export interface ScheduledReport {
  id: string;
  name: string;
  type: ReportType;
  frequency: ScheduleFrequency;
  recipients: string[];
  format: ReportFormat;
  channel: ScheduleChannel;
  nextRun: string;
  lastRun: string;
  status: ScheduleStatus;
}

export const scheduledReports: readonly ScheduledReport[] = [
  { id: "rep-1", name: "Daily Sales Summary", type: "Sales", frequency: "Daily", recipients: ["ops@albahri.sa", "gm@albahri.sa"], format: "PDF", channel: "Email", nextRun: "Today 23:00", lastRun: "Yesterday 23:01", status: "Active" },
  { id: "rep-2", name: "Weekly Margin Analysis", type: "Margin", frequency: "Weekly", recipients: ["finance@albahri.sa"], format: "Excel", channel: "Email", nextRun: "Mon 06:00", lastRun: "Last Mon 06:01", status: "Active" },
  { id: "rep-3", name: "Monthly ZATCA Compliance", type: "Compliance", frequency: "Monthly", recipients: ["compliance@albahri.sa", "owner@albahri.sa"], format: "PDF", channel: "WhatsApp", nextRun: "01 Sep 09:00", lastRun: "01 Aug 09:02", status: "Active" },
  { id: "rep-4", name: "Channel Performance Digest", type: "Channels", frequency: "Weekly", recipients: ["marketing@albahri.sa"], format: "PDF", channel: "Email", nextRun: "Sun 08:00", lastRun: "Last Sun 08:00", status: "Active" },
  { id: "rep-5", name: "Top Customers by Spend", type: "Customers", frequency: "Monthly", recipients: ["marketing@albahri.sa", "crm@albahri.sa"], format: "CSV", channel: "Email", nextRun: "05 Sep 10:00", lastRun: "05 Aug 10:01", status: "Paused" },
  { id: "rep-6", name: "VAT Payable Summary", type: "Compliance", frequency: "Monthly", recipients: ["finance@albahri.sa", "compliance@albahri.sa"], format: "Excel", channel: "Email", nextRun: "02 Sep 07:00", lastRun: "02 Aug 07:02", status: "Active" },
  { id: "rep-7", name: "Daily Food Cost", type: "Margin", frequency: "Daily", recipients: ["chef@albahri.sa", "purchasing@albahri.sa"], format: "CSV", channel: "WhatsApp", nextRun: "Today 21:30", lastRun: "Yesterday 21:31", status: "Active" },
  { id: "rep-8", name: "Branch Revenue Report", type: "Sales", frequency: "Weekly", recipients: ["gm@albahri.sa"], format: "PDF", channel: "Email", nextRun: "Mon 09:00", lastRun: "Last Mon 09:05", status: "Failed" },
  { id: "rep-9", name: "Labour Cost Summary", type: "Margin", frequency: "Weekly", recipients: ["hr@albahri.sa", "finance@albahri.sa"], format: "Excel", channel: "Email", nextRun: "Sat 07:30", lastRun: "Last Sat 07:30", status: "Paused" },
  { id: "rep-10", name: "Cohort Retention", type: "Customers", frequency: "Monthly", recipients: ["crm@albahri.sa"], format: "CSV", channel: "Email", nextRun: "10 Sep 12:00", lastRun: "10 Aug 12:03", status: "Active" },
  { id: "rep-11", name: "Kiosk Sales Snapshot", type: "Channels", frequency: "Daily", recipients: ["ops@albahri.sa"], format: "CSV", channel: "WhatsApp", nextRun: "Today 22:00", lastRun: "Today 21:59", status: "Active" },
  { id: "rep-12", name: "Invoice Rejection Alerts", type: "Compliance", frequency: "Daily", recipients: ["compliance@albahri.sa"], format: "PDF", channel: "WhatsApp", nextRun: "Today 23:00", lastRun: "Today 23:00", status: "Failed" },
] as const;

/* ---------------------------------------------------------------- KPIs (shared) */

/** Sparkline traces reused by the scaled KPI strips. */
export const kpiSparklines = {
  blue: [22, 28, 25, 34, 30, 40, 36, 46, 42, 53, 48, 61, 56, 70, 64, 80],
  green: [18, 24, 21, 29, 26, 34, 31, 39, 36, 45, 41, 51, 47, 58, 54, 64],
  orange: [30, 32, 31, 33, 32, 34, 33, 35, 34, 36, 35, 37, 36, 38, 37, 39],
  violet: [50, 51, 50, 52, 53, 52, 54, 55, 54, 56, 57, 56, 58, 59, 58, 60],
  cyan: [28, 31, 29, 35, 32, 38, 36, 41, 39, 44, 42, 48, 45, 51, 49, 55],
} as const;

export function kpiCard(partial: Omit<KpiCard, "id"> & { id: string }): KpiCard {
  return partial as KpiCard;
}
