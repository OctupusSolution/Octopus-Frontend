// apps/merchant/src/pages/orders-list/_shared/mock-data.test.ts
import { describe, expect, it } from "vitest";
import { orderRecords } from "./mock-data";

describe("orderRecords", () => {
  it("produces exactly 140 seeded orders", () => {
    expect(orderRecords).toHaveLength(140);
  });

  it("matches the state counts the filter pills and stat cards rely on", () => {
    const counts = orderRecords.reduce<Record<string, number>>((acc, order) => {
      acc[order.state] = (acc[order.state] ?? 0) + 1;
      return acc;
    }, {});
    expect(counts).toEqual({
      New: 4,
      Accepted: 4,
      Preparing: 20,
      Ready: 12,
      Served: 55,
      Completed: 25,
      Refunded: 8,
      Voided: 6,
      Canceled: 6,
    });
  });

  it("gives every order a unique id", () => {
    const ids = new Set(orderRecords.map((order) => order.id));
    expect(ids.size).toBe(orderRecords.length);
  });

  it("only marks timeline stages up to and including lastStage as reached", () => {
    const voided = orderRecords.find((order) => order.state === "Voided");
    expect(voided?.lastStage).toBe("Preparing");
    expect(Object.keys(voided?.timeline ?? {})).toEqual(["New", "Accepted", "Preparing"]);
  });

  it("never leaves New/Accepted orders paid", () => {
    const early = orderRecords.filter((order) => order.state === "New" || order.state === "Accepted");
    expect(early.every((order) => order.payment === "Unpaid")).toBe(true);
  });
});
