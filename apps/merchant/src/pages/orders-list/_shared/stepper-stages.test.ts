import { describe, expect, it } from "vitest";
import { stageStatuses } from "./stepper-stages";
import type { OrderRecord } from "./types";

function order(overrides: Partial<OrderRecord> = {}): OrderRecord {
  return {
    id: "#ORD-1",
    date: "May 16, 2026",
    table: "Table 1",
    guests: 2,
    totalSar: 100,
    source: "QR Code",
    payment: "Paid Online",
    state: "Preparing",
    lastStage: "Preparing",
    timeline: { New: "t0", Accepted: "t1", Preparing: "t2" },
    items: [],
    courses: 1,
    subtotalSar: 87,
    taxSar: 13,
    ...overrides,
  };
}

describe("stageStatuses", () => {
  it("marks stages up to and including lastStage as done", () => {
    const statuses = stageStatuses(order());
    expect(statuses.map((s) => [s.stage, s.done])).toEqual([
      ["New", true],
      ["Accepted", true],
      ["Preparing", true],
      ["Ready", false],
      ["Served", false],
      ["Completed", false],
    ]);
  });

  it("marks every stage done for a Completed order", () => {
    const statuses = stageStatuses(order({ state: "Completed", lastStage: "Completed" }));
    expect(statuses.every((s) => s.done)).toBe(true);
  });

  it("freezes a terminal order's stepper at lastStage, not at state", () => {
    const statuses = stageStatuses(order({ state: "Voided", lastStage: "Ready" }));
    expect(statuses.map((s) => [s.stage, s.done])).toEqual([
      ["New", true],
      ["Accepted", true],
      ["Preparing", true],
      ["Ready", true],
      ["Served", false],
      ["Completed", false],
    ]);
  });

  it("carries the timeline timestamp for each stage", () => {
    const statuses = stageStatuses(order());
    expect(statuses.find((s) => s.stage === "Preparing")?.timestamp).toBe("t2");
    expect(statuses.find((s) => s.stage === "Ready")?.timestamp).toBeUndefined();
  });
});
