import type { CreateOrderRequest, Order } from "../contracts/order";

// The customer storefront's local mock-api; the backend has no public order
// endpoints yet.
const baseUrl = "http://localhost:4000";

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
