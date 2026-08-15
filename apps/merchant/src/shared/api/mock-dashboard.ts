// Mock data for the Merchant dashboard. Stands in for @octopus/api-client
// until the backend publishes a real OpenAPI spec (see architecture PDF,
// Section 9). Shape mirrors what a real `useDashboardSummary()` query would
// return, so swapping this for a TanStack Query hook is a drop-in change.
//
// All values are typed consts; components receive them as props.

/* ------------------------------------------------------------------ KPI row */

export interface KpiCard {
  id: string;
  label: string;
  value: string;
  delta: string;
  deltaNote: string;
  /** optional second line, e.g. "88.6% of target achieved" */
  subNote?: string;
  /** translated unit suffix appended to `value` (a dict key), e.g. "common.minuteShort" */
  valueUnit?: string;
  /** translated unit suffix appended to `delta` */
  deltaUnit?: string;
  color: string;
  sparkline: number[];
}

export const kpiCards: readonly KpiCard[] = [
  {
    id: "orders-today",
    label: "TOTAL ORDERS ACTIVE",
    value: "1,284",
    delta: "+12.5%",
    deltaNote: "vs last year",
    color: "#a78bfa",
    sparkline: [30, 34, 31, 38, 35, 42, 39, 46, 43, 52, 48, 57, 54, 62, 59, 68],
  },
  {
    id: "reservations",
    label: "TOTAL RESERVATIONS",
    value: "324",
    delta: "+8.3%",
    deltaNote: "vs last year",
    color: "#60a5fa",
    sparkline: [22, 26, 24, 30, 28, 33, 31, 37, 35, 41, 38, 45, 43, 49, 47, 53],
  },
  {
    id: "revenue",
    label: "TOTAL REVENUE",
    value: "SAR 2.8M",
    delta: "+15.8%",
    deltaNote: "vs last year",
    color: "#a3e635",
    sparkline: [18, 24, 21, 29, 26, 34, 31, 39, 36, 45, 41, 51, 47, 58, 54, 64],
  },
  {
    id: "avg-order",
    label: "AVG ORDER VALUE",
    value: "SAR 145.9",
    delta: "+9.2%",
    deltaNote: "vs last year",
    subNote: "88.6% of target achieved",
    color: "#fb923c",
    sparkline: [28, 31, 29, 35, 32, 38, 36, 41, 39, 44, 42, 48, 45, 51, 49, 55],
  },
] as const;

/* -------------------------------------------------- Revenue by channel (bars) */

export interface ChannelSeries {
  key: "dineIn" | "takeaway" | "delivery" | "kiosk" | "aggregator";
  label: string;
  color: string;
}

export const channelSeries: readonly ChannelSeries[] = [
  { key: "dineIn", label: "Dine-in", color: "#2ec9c0" },
  { key: "takeaway", label: "Takeaway", color: "#22c9d9" },
  { key: "delivery", label: "Delivery", color: "#5b8def" },
  { key: "kiosk", label: "Kiosk", color: "#8b7cf0" },
  { key: "aggregator", label: "Aggregator", color: "#4c35d4" },
] as const;

export interface QuarterRevenue {
  period: string;
  dineIn: number;
  takeaway: number;
  delivery: number;
  kiosk: number;
  aggregator: number;
}

/** Values in SAR thousands. */
export const revenueByQuarter: readonly QuarterRevenue[] = [
  { period: "Q3 24", dineIn: 48, takeaway: 20, delivery: 28, kiosk: 10, aggregator: 7 },
  { period: "Q4 24", dineIn: 52, takeaway: 22, delivery: 30, kiosk: 11, aggregator: 8 },
  { period: "Q1 25", dineIn: 56, takeaway: 23, delivery: 33, kiosk: 12, aggregator: 8 },
  { period: "Q2 25", dineIn: 61, takeaway: 25, delivery: 36, kiosk: 13, aggregator: 9 },
  { period: "Q3 25", dineIn: 65, takeaway: 27, delivery: 39, kiosk: 14, aggregator: 10 },
  { period: "Q4 25", dineIn: 72, takeaway: 29, delivery: 43, kiosk: 15, aggregator: 11 },
  { period: "Q1 26", dineIn: 80, takeaway: 32, delivery: 48, kiosk: 17, aggregator: 12 },
  { period: "Q2 26", dineIn: 76, takeaway: 31, delivery: 46, kiosk: 16, aggregator: 11 },
] as const;

export const revenueAxisMax = 200;
export const revenueAxisTicks = [0, 40, 80, 120, 160, 200] as const;

/* ------------------------------------------------ Revenue contribution (donut) */

export interface ContributionItem {
  label: string;
  value: string;
  color: string;
}

export const contribution = {
  total: "SAR 187.4K",
  target: "/ SAR 210K Target",
  /** 0..1 — fraction of the ring that is filled */
  filled: 0.886,
  items: [
    { label: "Dine-in", value: "85.7K", color: "#2ec9c0" },
    { label: "Takeaway", value: "33.2K", color: "#22c9d9" },
    { label: "Delivery", value: "48.9K", color: "#5b8def" },
    { label: "Kiosk", value: "12.4K", color: "#8b7cf0" },
    { label: "Aggregator", value: "7.2K", color: "#4c35d4" },
  ] as readonly ContributionItem[],
} as const;

/* ---------------------------------------------------------------- AI insights */

export const aiInsight = {
  headlinePrefix: "Delivery channel performance outperformed last year by",
  headlineValue: "22.8%",
  body: "driven by strong growth in the Jeddah - Corniche branch.",
  cta: "View full analysis",
} as const;

export const topOpportunity = {
  title: "Top Opportunity",
  body: "Riyadh - Olaya has the highest potential improvement with 70% achievement rate vs target.",
  percent: 70,
} as const;

/* ------------------------------------------------------------------- Heatmap */

export const heatmapColumns = ["2022", "2023", "2024", "2025", "2026"] as const;

export interface HeatmapRow {
  id: string;
  branch: string;
  values: readonly number[];
}

export const performanceHeatmap: readonly HeatmapRow[] = [
  { id: "olaya", branch: "Olaya", values: [85, 88, 90, 91, 93] },
  { id: "corniche", branch: "Corniche", values: [92, 94, 96, 98, 97] },
  { id: "narjis", branch: "Narjis", values: [90, 93, 97, 98, 99] },
] as const;

/* -------------------------------------------------------------- Distribution */

export interface DistributionRow {
  label: string;
  amount: string;
  percent: number;
  /** optional branch id — present on branch-view rows so the global filter can hide rows */
  branch?: string;
}

export interface DistributionColumn {
  title: string;
  total: string;
  color: string;
  rows: readonly DistributionRow[];
}

export const distributionColumns: readonly DistributionColumn[] = [
  {
    title: "Total Revenue",
    total: "SAR 187.4K",
    color: "#d4ec3f",
    rows: [
      { label: "Riyadh - Olaya (OLY)", amount: "SAR 62.1K", percent: 45.8, branch: "olaya" },
      { label: "Jeddah - Corniche (JED)", amount: "SAR 48.7K", percent: 39.3, branch: "corniche" },
    ],
  },
  {
    title: "Total Orders",
    total: "1,284",
    color: "#2ed3ae",
    rows: [
      { label: "Riyadh - Olaya", amount: "412", percent: 45.8, branch: "olaya" },
      { label: "Jeddah - Corniche", amount: "356", percent: 39.3, branch: "corniche" },
    ],
  },
] as const;

/* ------------------------------------------------ Distribution by channel (Channel view) */

export const channelDistributionColumns: readonly DistributionColumn[] = [
  {
    title: "Total Revenue",
    total: "SAR 187.4K",
    color: "#2ec9c0",
    rows: [
      { label: "Dine-in", amount: "SAR 85.7K", percent: 45.7 },
      { label: "Delivery", amount: "SAR 48.9K", percent: 26.1 },
      { label: "Takeaway", amount: "SAR 33.2K", percent: 17.7 },
      { label: "Kiosk", amount: "SAR 12.4K", percent: 6.6 },
      { label: "Aggregator", amount: "SAR 7.2K", percent: 3.8 },
    ],
  },
  {
    title: "Total Orders",
    total: "1,284",
    color: "#22c9d9",
    rows: [
      { label: "Dine-in", amount: "587", percent: 45.7 },
      { label: "Delivery", amount: "335", percent: 26.1 },
      { label: "Takeaway", amount: "227", percent: 17.7 },
      { label: "Kiosk", amount: "85", percent: 6.6 },
      { label: "Aggregator", amount: "49", percent: 3.8 },
    ],
  },
] as const;

/* --------------------------------------------------------------- Global filter */

export interface DashboardRangeOption {
  id: string;
  label: string;
  /** how many of the trailing quarters the revenue chart should show */
  quarters: number;
}

export const dashboardRangeOptions: readonly DashboardRangeOption[] = [
  { id: "quarter", label: "This Quarter", quarters: 1 },
  { id: "halfYear", label: "Last 2 Quarters", quarters: 2 },
  { id: "year", label: "Last 4 Quarters", quarters: 4 },
  { id: "all", label: "Last 8 Quarters", quarters: 8 },
] as const;

export interface DashboardBranchOption {
  id: string;
  label: string;
}

export const dashboardBranchOptions: readonly DashboardBranchOption[] = [
  { id: "olaya", label: "Riyadh - Olaya" },
  { id: "corniche", label: "Jeddah - Corniche" },
  { id: "narjis", label: "Riyadh - Narjis" },
] as const;

export const lastUpdatedLabel = "Last Updated: 30 minutes ago";
export const updatedJustNowLabel = "Updated just now";
