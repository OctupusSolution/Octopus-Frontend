import { describe, expect, it } from "vitest";
import { ApiError, type OrderLineStatus } from "@octopus/api-client";
import { canComplete, isApprovalNeeded, nextLineStatus, nextOrderStage, orderErrorMessage } from "./order-model";

const money = (amount: number) => ({ amount, currency: "SAR" });
const lines = (...statuses: OrderLineStatus[]) => statuses.map((status) => ({ status })) as never;

describe("line and order moves", () => {
  it("only moves a line forward", () => {
    expect(nextLineStatus("Pending")).toBe("Preparing");
    expect(nextLineStatus("Ready")).toBe("Served");
    expect(nextLineStatus("Served")).toBeNull();
    expect(nextLineStatus("Voided")).toBeNull();
  });

  it("advances an order from its least-advanced live line, never while New", () => {
    expect(nextOrderStage({ status: "Accepted", lines: lines("Pending", "Ready") })).toBe("Preparing");
    expect(nextOrderStage({ status: "Preparing", lines: lines("Preparing", "Cancelled") })).toBe("Ready");
    expect(nextOrderStage({ status: "Served", lines: lines("Served") })).toBeNull();
    expect(nextOrderStage({ status: "New", lines: lines("Pending") })).toBeNull();
  });

  it("completes only a served order with nothing owed", () => {
    expect(canComplete({ status: "Served", balanceDue: money(0), excessCaptured: money(0) })).toBe(true);
    expect(canComplete({ status: "Served", balanceDue: money(5), excessCaptured: money(0) })).toBe(false);
    expect(canComplete({ status: "Ready", balanceDue: money(0), excessCaptured: money(0) })).toBe(false);
  });
});

describe("errors", () => {
  it("reads approval-needed and the most specific message", () => {
    const err = new ApiError(422, { errorCode: "order.approval.needed", detail: "Needs approval" });
    expect(isApprovalNeeded(err)).toBe(true);
    expect(orderErrorMessage(err)).toBe("Needs approval");
    const validation = new ApiError(422, { errors: { Quantity: ["Too many"] }, detail: "Invalid" });
    expect(orderErrorMessage(validation)).toBe("Too many");
  });
});
