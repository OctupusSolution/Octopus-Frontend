import type { CreateOrderRequest, Order, OrderStatus } from "@octopus/api-client";

// Continues the merchant app's existing seeded series (#OC-3384...#OC-3391)
// so live orders and seeded orders read as one list.
let nextIdNumber = 3392;

const orders: Order[] = [];

function generateId(): string {
  return `OC-${nextIdNumber++}`;
}

export function listOrders(): Order[] {
  return [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getOrder(id: string): Order | undefined {
  return orders.find((order) => order.id === id);
}

export function addOrder(payload: CreateOrderRequest): Order {
  const now = new Date().toISOString();
  const order: Order = {
    ...payload,
    id: generateId(),
    status: "new",
    createdAt: now,
    updatedAt: now,
  };
  orders.push(order);
  return order;
}

export function setOrderStatus(id: string, status: OrderStatus): Order | undefined {
  const order = getOrder(id);
  if (!order) return undefined;
  order.status = status;
  order.updatedAt = new Date().toISOString();
  return order;
}
