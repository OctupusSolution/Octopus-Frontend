// The row shape the Kitchen Display reads, via live-orders.ts's toOrderRow.
// pages/orders-list has its own richer order model — see
// pages/orders-list/_shared/types.ts — and no longer uses this file.

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
