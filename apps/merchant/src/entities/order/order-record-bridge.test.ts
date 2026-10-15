import { describe, expect, it } from "vitest";
import type { OrderResponse } from "@octopus/api-client";
import { mapRealOrderToRecord } from "./order-record-bridge";

const money = (amount: number) => ({ amount, currency: "SAR" });

function order(overrides: Partial<OrderResponse>): OrderResponse {
  return {
    id: "o1",
    businessId: "b",
    branchId: null,
    code: "O-000001",
    sourceCode: "pos",
    fulfilmentCode: "dine-in",
    resource: null,
    visit: null,
    attendeeCount: null,
    customer: { name: null, phone: null, email: null, externalRef: null },
    deliveryAddress: null,
    customerNote: null,
    internalNote: null,
    tags: [],
    placedByAccountId: null,
    placedAtUtc: "2026-05-16T17:00:00Z",
    acceptedAtUtc: null,
    completedAtUtc: null,
    currency: "SAR",
    taxRatePercent: 15,
    taxInclusive: false,
    serviceChargePercent: 0,
    lines: [],
    discount: null,
    totals: {
      linesSubtotal: money(0),
      orderDiscountAmount: money(0),
      discountedSubtotal: money(0),
      serviceChargeAmount: money(0),
      netTotal: money(0),
      taxTotal: money(0),
      grandTotal: money(0),
    },
    status: "New",
    paymentState: "Unpaid",
    termination: null,
    capturedTotal: money(0),
    gratuityTotal: money(0),
    refundedTotal: money(0),
    pendingRefundTotal: money(0),
    balanceDue: money(0),
    excessCaptured: money(0),
    version: 1,
    createdAtUtc: "2026-05-16T17:00:00Z",
    capacityWarning: null,
    ...overrides,
  };
}


describe("mapRealOrderToRecord — who placed it", () => {
  it("marks an order the customer placed from a place code", () => {
    expect(mapRealOrderToRecord(order({ sourceCode: "qr", intakeKind: "self-service" })).selfService).toBe(true);
  });
  it("leaves staff-taken orders unmarked, QR-source ones included", () => {
    expect(mapRealOrderToRecord(order({ sourceCode: "qr" })).selfService).toBe(false);
    expect(mapRealOrderToRecord(order({ intakeKind: "" })).selfService).toBe(false);
  });
});
