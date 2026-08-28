// Canonical order contract shared by the customer storefront, the mock API,
// and the merchant console. This is the seam that replaces a real backend.

export type OrderChannel = "dine_in" | "takeaway" | "delivery" | "kiosk" | "aggregator";

export type OrderStatus =
  | "new"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "completed"
  | "cancelled";

export interface OrderLineModifier {
  groupId: string;
  /** "الحجم". The cart prints the group's name beside the chosen option, and a
   *  line already persisted must not have to re-open the menu — which may have
   *  changed under it — to translate an id into a label. */
  groupLabel?: string;
  optionId: string;
  label: string;
  priceDeltaSar: number;
}

export interface OrderLine {
  lineId: string;
  menuItemId: string;
  name: string;
  unitPriceSar: number;
  quantity: number;
  modifiers: OrderLineModifier[];
  notes: string;
  /** Name and size only, never the bytes: the cart is persisted to
   *  localStorage and a base64 image would risk the whole quota, taking the
   *  cart with it. */
  customerImageName?: string;
  customerImageSize?: number;
}

export interface Order {
  id: string;
  tenantId: string;
  branchId: string | null;
  channel: OrderChannel;
  status: OrderStatus;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string | null;
  tableNumber: string | null;
  lines: OrderLine[];
  subtotalSar: number;
  discountSar: number;
  totalSar: number;
  createdAt: string;
  updatedAt: string;
}

export type CreateOrderRequest = Omit<Order, "id" | "status" | "createdAt" | "updatedAt">;

// `cancelled` is reachable from anywhere and deliberately excluded from these sequences.
export const STATUS_FLOW: Record<OrderChannel, readonly OrderStatus[]> = {
  dine_in: ["new", "preparing", "ready", "completed"],
  takeaway: ["new", "preparing", "ready", "completed"],
  kiosk: ["new", "preparing", "ready", "completed"],
  delivery: ["new", "preparing", "out_for_delivery", "completed"],
  aggregator: ["new", "preparing", "out_for_delivery", "completed"],
};

export function nextStatus(channel: OrderChannel, current: OrderStatus): OrderStatus {
  const flow = STATUS_FLOW[channel];
  const index = flow.indexOf(current);
  if (index === -1) return current;
  if (index === flow.length - 1) return current;
  return flow[index + 1];
}
