// apps/merchant/src/pages/orders-list/_shared/stats.test.ts
import { describe, expect, it } from "vitest";
import { orderRecords } from "./mock-data";
import { computeOrderStats, pillCount } from "./stats";

describe("computeOrderStats", () => {
  it("matches the seeded fixture's totals", () => {
    const stats = computeOrderStats(orderRecords);
    expect(stats.totalOrders).toBe(140);
    expect(stats.openOrders).toBe(40); // New 4 + Accepted 4 + Preparing 20 + Ready 12
    expect(stats.completed).toBe(25);
    expect(stats.cancelled).toBe(6);
    expect(stats.salesGrossSar).toBeGreaterThan(0);
  });

  it("excludes Voided and Canceled orders from sales gross", () => {
    const voidedAndCancelled = orderRecords.filter((o) => o.state === "Voided" || o.state === "Canceled");
    expect(computeOrderStats(voidedAndCancelled).salesGrossSar).toBe(0);
  });
});

describe("pillCount", () => {
  it("counts orders per state", () => {
    expect(pillCount(orderRecords, "Ready")).toBe(12);
    expect(pillCount(orderRecords, "Refunded")).toBe(8);
  });
});
