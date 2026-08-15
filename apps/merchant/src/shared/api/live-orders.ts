// Bridge between the canonical order contract shared with the customer
// storefront and mock API, and the OrderRow shape this page already renders.
import { useCallback, useEffect, useState } from "react";
import {
  fetchOrders,
  updateOrderStatus,
  getBranchName,
  formatSar,
  type Order,
  type OrderStatus as CanonicalOrderStatus,
} from "@octopus/api-client";
import type { OrderRow, OrderStatus } from "./mock-orders";

const POLL_INTERVAL_MS = 5000;

const CHANNEL_LABELS: Record<Order["channel"], OrderRow["channel"]> = {
  dine_in: "Dine-in",
  takeaway: "Takeaway",
  delivery: "Delivery",
  kiosk: "Kiosk",
  aggregator: "Aggregator",
};

const STATUS_LABELS: Record<CanonicalOrderStatus, OrderStatus> = {
  new: "New",
  preparing: "Preparing",
  ready: "Ready",
  out_for_delivery: "Out for Delivery",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function toOrderRow(order: Order): OrderRow {
  const minutesAgo = Math.max(0, Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000));
  return {
    id: `#${order.id}`,
    branch: getBranchName(order.branchId),
    channel: CHANNEL_LABELS[order.channel],
    customer: order.tableNumber ? `Table ${order.tableNumber}` : order.customerName,
    items: order.lines.reduce((sum, line) => sum + line.quantity, 0),
    total: formatSar(order.totalSar),
    status: STATUS_LABELS[order.status],
    minutesAgo,
  };
}

export interface UseLiveOrdersResult {
  orders: Order[];
  rows: OrderRow[];
  refresh: () => void;
  advance: (id: string, status: CanonicalOrderStatus) => void;
}

export function useLiveOrders(): UseLiveOrdersResult {
  const [orders, setOrders] = useState<Order[]>([]);

  const load = useCallback(() => {
    // A missing mock API degrades to an empty live list, not an error — the
    // service is optional for a merchant who only needs seeded data.
    fetchOrders()
      .then(setOrders)
      .catch(() => setOrders([]));
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  const advance = useCallback(
    (id: string, status: CanonicalOrderStatus) => {
      updateOrderStatus(id, status)
        .then(load)
        .catch(() => {});
    },
    [load],
  );

  return { orders, rows: orders.map(toOrderRow), refresh: load, advance };
}
