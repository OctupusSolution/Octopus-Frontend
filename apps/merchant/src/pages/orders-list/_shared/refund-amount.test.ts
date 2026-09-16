// apps/merchant/src/pages/orders-list/_shared/refund-amount.test.ts
import { describe, expect, it } from "vitest";
import { clampAmountSar, maxRefundableSar, selectedItemsTotalSar } from "./refund-amount";
import type { OrderItem, OrderRecord } from "./types";

function order(overrides: Partial<OrderRecord> = {}): OrderRecord {
  return {
    id: "#ORD-1",
    date: "May 16, 2026",
    table: "Table 1",
    guests: 2,
    totalSar: 100,
    source: "QR Code",
    payment: "Paid Online",
    state: "Completed",
    lastStage: "Completed",
    timeline: {},
    items: [],
    courses: 1,
    subtotalSar: 87,
    taxSar: 13,
    ...overrides,
  };
}

describe("maxRefundableSar", () => {
  it("is the order's total", () => {
    expect(maxRefundableSar(order({ totalSar: 186 }))).toBe(186);
  });
});

describe("selectedItemsTotalSar", () => {
  const items: OrderItem[] = [
    { name: "Beef Burger", qty: 1, priceSar: 32 },
    { name: "French Fries", qty: 2, priceSar: 14 },
    { name: "Water", qty: 1, priceSar: 3 },
  ];

  it("sums only the selected items, quantity included", () => {
    // Indices 0 and 1 are "Beef Burger" and "French Fries" in the fixture above.
    expect(selectedItemsTotalSar(items, new Set([0, 1]))).toBe(32 + 2 * 14);
  });

  it("returns 0 when nothing is selected", () => {
    expect(selectedItemsTotalSar(items, new Set())).toBe(0);
  });

  it("distinguishes two items with the same name by index (live orders can repeat names)", () => {
    const duplicateNameItems: OrderItem[] = [
      { name: "Beef Burger", qty: 1, priceSar: 32 },
      { name: "Beef Burger", qty: 1, priceSar: 40 },
    ];
    // Selecting only index 1 should total the second line's price, not both.
    expect(selectedItemsTotalSar(duplicateNameItems, new Set([1]))).toBe(40);
  });
});

describe("clampAmountSar", () => {
  it("clamps to the max", () => {
    expect(clampAmountSar("500", 186)).toBe(186);
  });

  it("floors negative or non-numeric input to 0", () => {
    expect(clampAmountSar("-10", 186)).toBe(0);
    expect(clampAmountSar("abc", 186)).toBe(0);
    expect(clampAmountSar("", 186)).toBe(0);
  });

  it("passes valid amounts through unchanged", () => {
    expect(clampAmountSar("75.5", 186)).toBe(75.5);
  });
});
