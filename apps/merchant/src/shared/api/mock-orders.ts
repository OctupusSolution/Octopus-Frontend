// Mock data for the Orders page — same "stands in for @octopus/api-client"
// rule as mock-dashboard.ts.
import type { KpiCard } from "./mock-dashboard";

export const orderStats: readonly KpiCard[] = [
  {
    id: "open-orders",
    label: "OPEN ORDERS",
    value: "38",
    delta: "+6.1%",
    deltaNote: "vs yesterday",
    color: "#60a5fa",
    sparkline: [12, 14, 13, 16, 15, 18, 17, 20, 19, 23, 21, 26, 24, 29, 27, 32],
  },
  {
    id: "preparing",
    label: "PREPARING",
    value: "14",
    delta: "+2.3%",
    deltaNote: "vs yesterday",
    color: "#fb923c",
    sparkline: [6, 7, 6, 8, 7, 9, 8, 10, 9, 11, 10, 12, 11, 13, 12, 14],
  },
  {
    id: "ready",
    label: "READY FOR PICKUP",
    value: "9",
    delta: "+4.8%",
    deltaNote: "vs yesterday",
    color: "#a3e635",
    sparkline: [3, 4, 3, 5, 4, 6, 5, 7, 6, 8, 7, 9, 8, 10, 9, 11],
  },
  {
    id: "avg-prep",
    label: "AVG PREP TIME",
    value: "12.4 min",
    delta: "-3.5%",
    deltaNote: "vs yesterday",
    subNote: "within 15 min SLA",
    color: "#a78bfa",
    sparkline: [16, 15, 16, 14, 15, 13, 14, 12, 13, 12, 11, 12, 11, 12, 11, 12],
  },
] as const;

export type OrderStatus = "New" | "Preparing" | "Ready" | "Out for Delivery" | "Completed" | "Cancelled";

export interface OrderRow {
  id: string;
  branch: string;
  channel: "Dine-in" | "Takeaway" | "Delivery" | "Kiosk" | "Aggregator";
  customer: string;
  items: number;
  total: string;
  status: OrderStatus;
  minutesAgo: number;
}

export const orderRows: readonly OrderRow[] = [
  { id: "#OC-3391", branch: "Riyadh - Olaya", channel: "Dine-in", customer: "Table 12", items: 4, total: "SAR 186.00", status: "Preparing", minutesAgo: 2 },
  { id: "#OC-3390", branch: "Jeddah - Corniche", channel: "Delivery", customer: "Faisal A.", items: 2, total: "SAR 94.50", status: "Out for Delivery", minutesAgo: 6 },
  { id: "#OC-3389", branch: "Riyadh - Narjis", channel: "Takeaway", customer: "Noura S.", items: 1, total: "SAR 42.00", status: "Ready", minutesAgo: 8 },
  { id: "#OC-3388", branch: "Dammam - Corniche", channel: "Kiosk", customer: "Walk-in", items: 3, total: "SAR 128.00", status: "Preparing", minutesAgo: 9 },
  { id: "#OC-3387", branch: "Riyadh - Olaya", channel: "Aggregator", customer: "HungerStation", items: 5, total: "SAR 214.00", status: "Completed", minutesAgo: 14 },
  { id: "#OC-3386", branch: "Jeddah - Corniche", channel: "Dine-in", customer: "Table 4", items: 6, total: "SAR 302.50", status: "Completed", minutesAgo: 18 },
  { id: "#OC-3385", branch: "Riyadh - Narjis", channel: "Delivery", customer: "Mona K.", items: 2, total: "SAR 88.00", status: "Cancelled", minutesAgo: 21 },
  { id: "#OC-3384", branch: "Riyadh - Olaya", channel: "Takeaway", customer: "Abdullah M.", items: 1, total: "SAR 35.00", status: "Completed", minutesAgo: 25 },
] as const;
