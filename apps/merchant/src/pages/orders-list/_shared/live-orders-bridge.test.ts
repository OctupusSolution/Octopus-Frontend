// apps/merchant/src/pages/orders-list/_shared/live-orders-bridge.test.ts
import { describe, expect, it } from "vitest";
import type { Order } from "@octopus/api-client";
import { mapLiveOrderToRecord } from "./live-orders-bridge";

function fakeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: "oc-9001",
    tenantId: "t1",
    branchId: "b1",
    channel: "dine_in",
    status: "preparing",
    customerName: "Walk-in",
    customerPhone: "",
    deliveryAddress: null,
    tableNumber: "12",
    lines: [
      { lineId: "l1", menuItemId: "m1", name: "Beef Burger", unitPriceSar: 32, quantity: 2, modifiers: [], notes: "" },
    ],
    subtotalSar: 64,
    discountSar: 0,
    totalSar: 64,
    createdAt: "2026-05-16T18:00:00.000Z",
    updatedAt: "2026-05-16T18:00:00.000Z",
    ...overrides,
  };
}

describe("mapLiveOrderToRecord", () => {
  it("maps a dine-in preparing order", () => {
    const record = mapLiveOrderToRecord(fakeOrder());
    expect(record.id).toBe("#oc-9001");
    expect(record.source).toBe("QR Code");
    expect(record.state).toBe("Preparing");
    expect(record.lastStage).toBe("Preparing");
    expect(record.table).toBe("12");
    expect(record.items).toEqual([{ name: "Beef Burger", qty: 2, priceSar: 32 }]);
    expect(Object.keys(record.timeline)).toEqual(["New", "Accepted", "Preparing"]);
  });

  it("maps a cancelled order to the Canceled terminal state", () => {
    const record = mapLiveOrderToRecord(fakeOrder({ status: "cancelled" }));
    expect(record.state).toBe("Canceled");
    expect(record.lastStage).toBe("New");
  });

  it("maps delivery channels to Phone Order and out_for_delivery to Served", () => {
    const record = mapLiveOrderToRecord(fakeOrder({ channel: "delivery", status: "out_for_delivery" }));
    expect(record.source).toBe("Phone Order");
    expect(record.lastStage).toBe("Served");
  });

  it("maps kiosk channel to KIOSK Order", () => {
    const record = mapLiveOrderToRecord(fakeOrder({ channel: "kiosk", status: "ready" }));
    expect(record.source).toBe("KIOSK Order");
    expect(record.lastStage).toBe("Ready");
  });
});
