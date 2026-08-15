import type { CreateOrderRequest, Order, OrderStatus } from "../contracts/order";

// Do not read import.meta.env or process.env here — this package is consumed
// by both a Vite app and a Next app and must not depend on either bundler's
// env mechanism. Callers use configureApiClient() to point elsewhere.
let baseUrl = "http://localhost:4000";

export function configureApiClient(url: string): void {
  baseUrl = url;
}

export async function fetchOrders(): Promise<Order[]> {
  const res = await fetch(`${baseUrl}/api/orders`);
  if (!res.ok) throw new Error(`fetchOrders failed: ${res.status}`);
  return res.json();
}

export async function fetchOrder(id: string): Promise<Order | null> {
  const res = await fetch(`${baseUrl}/api/orders/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`fetchOrder failed: ${res.status}`);
  return res.json();
}

export async function createOrder(payload: CreateOrderRequest): Promise<Order> {
  const res = await fetch(`${baseUrl}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`createOrder failed: ${res.status}`);
  return res.json();
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
  const res = await fetch(`${baseUrl}/api/orders/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(`updateOrderStatus failed: ${res.status}`);
  return res.json();
}
