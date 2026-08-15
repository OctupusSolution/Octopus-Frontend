// Mock data for the Pre-Orders & Scheduled page — same "stands in for
// @octopus/api-client" rule as mock-orders.ts.
import type { KpiCard } from "./mock-dashboard";

export const preOrderStats: readonly KpiCard[] = [
  {
    id: "preorder-upcoming",
    label: "UPCOMING PRE-ORDERS",
    value: "24",
    delta: "+4",
    deltaNote: "vs yesterday",
    color: "#60a5fa",
    sparkline: [10, 11, 12, 11, 13, 12, 14, 13, 15, 14, 16, 15, 17, 16, 18, 17],
  },
  {
    id: "preorder-today",
    label: "SCHEDULED TODAY",
    value: "17",
    delta: "+3",
    deltaNote: "vs yesterday",
    color: "#fb923c",
    sparkline: [8, 8, 9, 9, 10, 9, 10, 11, 10, 11, 12, 11, 12, 13, 12, 13],
  },
  {
    id: "preorder-collected",
    label: "COLLECTED TODAY",
    value: "31",
    delta: "+6",
    deltaNote: "vs yesterday",
    color: "#a3e635",
    sparkline: [9, 10, 9, 11, 10, 12, 11, 13, 12, 14, 13, 15, 14, 16, 15, 17],
  },
  {
    id: "preorder-lead-time",
    label: "AVG LEAD TIME",
    value: "45 min",
    delta: "-5 min",
    deltaNote: "vs yesterday",
    color: "#a78bfa",
    sparkline: [14, 13, 14, 13, 12, 13, 12, 11, 12, 11, 10, 11, 10, 10, 9, 10],
  },
] as const;

export type PreOrderStatus = "Scheduled" | "Preparing" | "Ready" | "Collected" | "No-show";

export interface PreOrderRow {
  id: string;
  channel: "Dine-in" | "Takeaway" | "Delivery" | "Aggregator";
  customer: string;
  items: number;
  total: string;
  day: "Today" | "Tomorrow" | "Yesterday";
  time: string;
  status: PreOrderStatus;
}

export const preOrderRows: readonly PreOrderRow[] = [
  { id: "#PO-412", channel: "Takeaway", customer: "Fahad N.", items: 3, total: "SAR 142.00", day: "Today", time: "14:00", status: "Scheduled" },
  { id: "#PO-411", channel: "Delivery", customer: "Reem S.", items: 2, total: "SAR 86.50", day: "Today", time: "14:15", status: "Scheduled" },
  { id: "#PO-410", channel: "Dine-in", customer: "Table 9 · 5 guests", items: 8, total: "SAR 396.00", day: "Today", time: "14:30", status: "Scheduled" },
  { id: "#PO-409", channel: "Aggregator", customer: "Keeta", items: 4, total: "SAR 158.00", day: "Today", time: "13:30", status: "Preparing" },
  { id: "#PO-408", channel: "Takeaway", customer: "Maha K.", items: 1, total: "SAR 45.00", day: "Today", time: "13:15", status: "Preparing" },
  { id: "#PO-407", channel: "Delivery", customer: "Omar B.", items: 2, total: "SAR 97.00", day: "Today", time: "13:00", status: "Ready" },
  { id: "#PO-406", channel: "Dine-in", customer: "Table 2 · 2 guests", items: 4, total: "SAR 178.50", day: "Today", time: "12:45", status: "Collected" },
  { id: "#PO-405", channel: "Aggregator", customer: "Jahez", items: 3, total: "SAR 126.00", day: "Today", time: "12:30", status: "Collected" },
  { id: "#PO-404", channel: "Takeaway", customer: "Sara H.", items: 2, total: "SAR 72.00", day: "Today", time: "12:15", status: "No-show" },
  { id: "#PO-403", channel: "Delivery", customer: "Nasser A.", items: 5, total: "SAR 224.00", day: "Today", time: "12:00", status: "Collected" },
] as const;
