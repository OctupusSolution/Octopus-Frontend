// Mock data for the Merchant dashboard. Stands in for @octopus/api-client
// until the backend publishes a real OpenAPI spec (see architecture PDF,
// Section 9). Shape mirrors what a real `useDashboardSummary()` query would
// return, so swapping this for a TanStack Query hook is a drop-in change.

/* ------------------------------------------------ shared KPI card (reports) */

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

/* ------------------------------------------------------------ dashboard KPIs */

export type DashboardKpiTone = "blue" | "purple" | "green" | "amber";

export interface DashboardKpi {
  id: "orders" | "reservations" | "revenue" | "avg-value";
  labelKey: string;
  value: string;
  delta: string;
  tone: DashboardKpiTone;
  route: string;
}

export const dashboardKpis: readonly DashboardKpi[] = [
  { id: "orders", labelKey: "dashboard.kpi.totalOrders", value: "220", delta: "3.46%", tone: "blue", route: "/orders" },
  { id: "reservations", labelKey: "dashboard.kpi.totalReservations", value: "220", delta: "3.46%", tone: "purple", route: "/reservations" },
  { id: "revenue", labelKey: "dashboard.totalRevenue", value: "SAR 2.8M", delta: "3.46%", tone: "green", route: "/finance/payments" },
  { id: "avg-value", labelKey: "dashboard.kpi.avgTotalValue", value: "SAR 145.9", delta: "3.46%", tone: "amber", route: "/finance/payments" },
];

/* -------------------------------------------------------- Customers activity */

export const customerActivity: readonly { dayKey: string; value: number }[] = [
  { dayKey: "dashboard.day.mon", value: 122 },
  { dayKey: "dashboard.day.tue", value: 183 },
  { dayKey: "dashboard.day.wed", value: 163 },
  { dayKey: "dashboard.day.thu", value: 244 },
  { dayKey: "dashboard.day.fri", value: 285 },
  { dayKey: "dashboard.day.sat", value: 214 },
  { dayKey: "dashboard.day.sun", value: 193 },
];

export const customerActivityTicks = [0, 70, 140, 210, 280] as const;

/* ---------------------------------------------------------------- AI insights */

export const aiInsight = {
  headlineValue: "22.8%",
} as const;

export const topOpportunity = {
  percent: 70,
} as const;

/* -------------------------------------------------------------- Distribution */

export interface DistributionRow {
  labelKey: string;
  amount: string;
  percent: number;
  /** present on branch-view rows so the global filter can hide them */
  branch?: string;
}

export interface DistributionCard {
  id: "revenue" | "orders";
  titleKey: string;
  total: string;
  color: string;
  branchRows: readonly DistributionRow[];
  channelRows: readonly DistributionRow[];
}

export const distributionCards: readonly DistributionCard[] = [
  {
    id: "revenue",
    titleKey: "dashboard.totalRevenue",
    total: "SAR 187.4K",
    color: "#0D6EFD",
    branchRows: [
      { labelKey: "dashboard.branch.olayaCode", amount: "SAR 62.1K", percent: 33.1, branch: "olaya" },
      { labelKey: "dashboard.branch.cornicheCode", amount: "SAR 48.7K", percent: 26, branch: "corniche" },
    ],
    channelRows: [
      { labelKey: "channels.dineIn", amount: "SAR 85.7K", percent: 45.7 },
      { labelKey: "channels.delivery", amount: "SAR 48.9K", percent: 26.1 },
      { labelKey: "channels.takeaway", amount: "SAR 33.2K", percent: 17.7 },
    ],
  },
  {
    id: "orders",
    titleKey: "dashboard.totalOrders",
    total: "10000",
    color: "#16A34A",
    branchRows: [
      { labelKey: "dashboard.branch.olayaCode", amount: "4600", percent: 46, branch: "olaya" },
      { labelKey: "dashboard.branch.cornicheCode", amount: "5400", percent: 54, branch: "corniche" },
    ],
    channelRows: [
      { labelKey: "channels.dineIn", amount: "4570", percent: 45.7 },
      { labelKey: "channels.delivery", amount: "2610", percent: 26.1 },
      { labelKey: "channels.takeaway", amount: "1770", percent: 17.7 },
    ],
  },
];

/* ---------------------------------------------------------------- Live orders */

export type DashboardOrderStatus = "preparing" | "ready" | "outForDelivery" | "completed" | "cancelled";

export interface DashboardOrder {
  key: string;
  id: string;
  customer: string;
  branch: "olaya" | "corniche";
  channelKey: string;
  items: number;
  total: string;
  status: DashboardOrderStatus;
  createdAt: string;
}

const ORDER_SEED: readonly Omit<DashboardOrder, "key">[] = [
  { id: "#OC-3391", customer: "Table 12", branch: "olaya", channelKey: "channels.dineIn", items: 2, total: "SAR 3,700", status: "preparing", createdAt: "2024-01-15" },
  { id: "#OC-3392", customer: "Faisal A.", branch: "corniche", channelKey: "channels.delivery", items: 4, total: "SAR 3,700", status: "ready", createdAt: "2024-02-20" },
  { id: "#OC-3393", customer: "Noura S.", branch: "corniche", channelKey: "channels.takeaway", items: 2, total: "SAR 3,700", status: "outForDelivery", createdAt: "2024-03-10" },
  { id: "#OC-3394", customer: "Walk-in", branch: "corniche", channelKey: "channels.aggregator", items: 1, total: "SAR 3,700", status: "completed", createdAt: "2024-03-25" },
  { id: "#OC-3395", customer: "Mona K.", branch: "corniche", channelKey: "channels.dineIn", items: 5, total: "SAR 3,700", status: "cancelled", createdAt: "2024-04-05" },
];

export const dashboardLiveOrders: readonly DashboardOrder[] = [...ORDER_SEED, ...ORDER_SEED].map((o, i) => ({ ...o, key: `${o.id}-${i}` }));

/* ------------------------------------------------------------ Recent activity */

export const recentActivity: readonly { key: string; textKey: string; minutesAgo: number }[] = [
  { key: "a1", textKey: "dashboard.activity.orderPlaced", minutesAgo: 35 },
  { key: "a2", textKey: "dashboard.activity.orderCompleted", minutesAgo: 35 },
  { key: "a3", textKey: "dashboard.activity.reservationConfirmed", minutesAgo: 35 },
  { key: "a4", textKey: "dashboard.activity.menuItemAdded", minutesAgo: 35 },
];

/* --------------------------------------------------------------- Global filter */

export interface DashboardBranchOption {
  id: string;
  labelKey: string;
}

export const dashboardBranchOptions: readonly DashboardBranchOption[] = [
  { id: "olaya", labelKey: "dashboard.branch.olaya" },
  { id: "corniche", labelKey: "dashboard.branch.corniche" },
];

export const lastUpdatedLabel = "Last Updated: 30 minutes ago";
export const updatedJustNowLabel = "Updated just now";
