// Mock data for the Order History page — same "stands in for @octopus/api-client"
// rule as mock-orders.ts.
import type { KpiCard } from "./mock-dashboard";

export const orderHistoryStats: readonly KpiCard[] = [
  {
    id: "history-total",
    label: "TOTAL ORDERS",
    value: "12,847",
    delta: "+8.2%",
    deltaNote: "vs yesterday",
    color: "#60a5fa",
    sparkline: [8, 9, 9, 11, 10, 12, 11, 13, 12, 14, 13, 15, 14, 16, 15, 17],
  },
  {
    id: "history-completed",
    label: "COMPLETED",
    value: "11,982",
    delta: "+9.4%",
    deltaNote: "vs yesterday",
    color: "#a3e635",
    sparkline: [7, 8, 8, 10, 9, 11, 10, 12, 11, 13, 12, 14, 13, 15, 14, 16],
  },
  {
    id: "history-cancelled",
    label: "CANCELLED",
    value: "438",
    delta: "-2.1%",
    deltaNote: "vs yesterday",
    color: "#fb923c",
    sparkline: [5, 5, 4, 5, 4, 4, 3, 4, 3, 3, 2, 3, 2, 2, 2, 2],
  },
  {
    id: "history-avg-basket",
    label: "AVG BASKET",
    value: "SAR 152",
    delta: "+3.7%",
    deltaNote: "vs yesterday",
    color: "#a78bfa",
    sparkline: [10, 11, 10, 12, 11, 12, 13, 12, 13, 14, 13, 14, 15, 14, 15, 16],
  },
] as const;

export type OrderHistoryStatus = "Completed" | "Cancelled" | "Refunded";

export type PaymentMethod = "Mada" | "Apple Pay" | "STC Pay" | "Visa" | "Cash";

export interface OrderHistoryRow {
  id: string;
  branch: string;
  channel: "Dine-in" | "Takeaway" | "Delivery" | "Kiosk" | "Aggregator";
  customer: string;
  items: number;
  total: string;
  payment: PaymentMethod;
  status: OrderHistoryStatus;
  day: "Today" | "Yesterday";
  time: string;
}

export const orderHistoryRows: readonly OrderHistoryRow[] = [
  { id: "#OC-3380", branch: "Riyadh - Olaya", channel: "Dine-in", customer: "Table 7", items: 3, total: "SAR 164.00", payment: "Cash", status: "Completed", day: "Today", time: "13:42" },
  { id: "#OC-3379", branch: "Jeddah - Corniche", channel: "Delivery", customer: "Sultan R.", items: 2, total: "SAR 98.50", payment: "Mada", status: "Completed", day: "Today", time: "13:15" },
  { id: "#OC-3378", branch: "Riyadh - Narjis", channel: "Aggregator", customer: "Jahez", items: 4, total: "SAR 187.00", payment: "Visa", status: "Cancelled", day: "Today", time: "12:58" },
  { id: "#OC-3377", branch: "Dammam - Corniche", channel: "Takeaway", customer: "Laila M.", items: 1, total: "SAR 39.00", payment: "STC Pay", status: "Completed", day: "Today", time: "12:31" },
  { id: "#OC-3376", branch: "Riyadh - Olaya", channel: "Kiosk", customer: "Walk-in", items: 2, total: "SAR 76.50", payment: "Apple Pay", status: "Refunded", day: "Today", time: "11:52" },
  { id: "#OC-3375", branch: "Jeddah - Corniche", channel: "Dine-in", customer: "Table 3", items: 5, total: "SAR 258.00", payment: "Mada", status: "Completed", day: "Today", time: "11:40" },
  { id: "#OC-3374", branch: "Riyadh - Narjis", channel: "Delivery", customer: "Hessa A.", items: 2, total: "SAR 92.00", payment: "Cash", status: "Completed", day: "Today", time: "11:04" },
  { id: "#OC-3373", branch: "Dammam - Corniche", channel: "Aggregator", customer: "HungerStation", items: 3, total: "SAR 134.00", payment: "Visa", status: "Cancelled", day: "Yesterday", time: "22:47" },
  { id: "#OC-3372", branch: "Riyadh - Olaya", channel: "Dine-in", customer: "Table 11", items: 6, total: "SAR 314.50", payment: "Apple Pay", status: "Completed", day: "Yesterday", time: "22:18" },
  { id: "#OC-3371", branch: "Jeddah - Corniche", channel: "Takeaway", customer: "Nawaf D.", items: 2, total: "SAR 84.00", payment: "STC Pay", status: "Refunded", day: "Yesterday", time: "21:36" },
] as const;
