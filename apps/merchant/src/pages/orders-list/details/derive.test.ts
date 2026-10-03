import { describe, expect, it } from "vitest";
import type { OrderLineResponse, OrderResponse, PaymentResponse } from "@octopus/api-client";
import { activityActionLabel, buildTimeline, lineTax, paymentSplit } from "./derive";

const money = (amount: number) => ({ amount, currency: "SAR" });

function line(overrides: Partial<OrderLineResponse>): OrderLineResponse {
  return {
    id: "l1",
    position: 1,
    catalog: { catalogId: "c", publicationId: "p", publicationVersion: 1, entryId: "e" },
    displayName: "Pasta",
    sku: null,
    basePrice: money(50),
    unitPrice: money(50),
    options: [],
    quantity: 1,
    wastedQuantity: 0,
    chargeableQuantity: 1,
    note: null,
    status: "Pending",
    preparingAtUtc: null,
    readyAtUtc: null,
    servedAtUtc: null,
    discount: null,
    termination: null,
    lineGross: money(50),
    lineDiscountAmount: money(0),
    orderDiscountShare: money(0),
    lineNetOfDiscounts: money(50),
    lineTotal: money(57.5),
    ...overrides,
  };
}

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

function payment(id: string, amount: number, state = "Captured"): PaymentResponse {
  return {
    id,
    orderId: "o1",
    kind: "Cash",
    state,
    amount: money(amount),
    gratuity: money(0),
    reference: null,
    linkUrl: null,
    linkExpiresAtUtc: null,
    capturedAtUtc: "2026-05-16T18:30:00Z",
    failureCode: null,
    createdAtUtc: "2026-05-16T18:30:00Z",
  };
}

describe("buildTimeline", () => {
  it("keeps unreached steps pending on an open order", () => {
    const steps = buildTimeline(order({}), [], []);
    expect(steps.map((step) => step.id)).toEqual(["created", "accepted", "preparing", "ready", "served", "payment", "completed"]);
    expect(steps.filter((step) => step.at !== null).map((step) => step.id)).toEqual(["created"]);
  });

  it("counts ready lines against the live ones", () => {
    const steps = buildTimeline(
      order({
        status: "Preparing",
        lines: [
          line({ id: "a", status: "Ready", preparingAtUtc: "2026-05-16T17:05:00Z", readyAtUtc: "2026-05-16T17:20:00Z" }),
          line({ id: "b", status: "Preparing", preparingAtUtc: "2026-05-16T17:06:00Z" }),
          line({ id: "c", status: "Cancelled" }),
        ],
      }),
      [],
      []
    );
    expect(steps.find((step) => step.id === "ready")?.detail).toEqual({ kind: "readyCount", done: 1, total: 2 });
  });

  it("ends a cancelled order at its termination and drops what it never reached", () => {
    const steps = buildTimeline(
      order({
        status: "Cancelled",
        termination: { kind: "Cancel", reasonCode: "customer-request", note: null, byAccountId: null, approvedByAccountId: null, atUtc: "2026-05-16T17:10:00Z" },
      }),
      [],
      []
    );
    expect(steps.map((step) => step.id)).toEqual(["created", "cancelled"]);
    expect(steps[1].detail).toEqual({ kind: "reason", reason: "Customer request" });
  });
});

describe("paymentSplit", () => {
  it("ignores payments that were never captured", () => {
    expect(paymentSplit([payment("a", 100), payment("b", 100, "Failed")]).type).toBe("none");
  });

  it("tells an equal split from a custom one", () => {
    expect(paymentSplit([payment("a", 50), payment("b", 50)]).type).toBe("equal");
    expect(paymentSplit([payment("a", 70), payment("b", 30)]).type).toBe("custom");
  });
});

describe("lineTax", () => {
  it("takes the tax share out of a tax-carrying line total", () => {
    expect(lineTax(line({}), 15)).toBeCloseTo(7.5);
    expect(lineTax(line({}), 0)).toBe(0);
  });
});

describe("activityActionLabel", () => {
  it("drops the order prefix and reads the rest as words", () => {
    expect(activityActionLabel("order.line.status.changed")).toBe("Line status changed");
    expect(activityActionLabel("payment.captured")).toBe("Payment captured");
  });
});
