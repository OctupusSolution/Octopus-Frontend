// apps/merchant/src/pages/orders-list/_shared/csv-export.test.ts
import { describe, expect, it } from "vitest";
import { ordersToCsv } from "./csv-export";
import type { OrderRecord } from "./types";

function order(overrides: Partial<OrderRecord> = {}): OrderRecord {
  return {
    id: "#ORD-2001",
    date: "May 16, 2026",
    table: "Table 12",
    guests: 4,
    totalSar: 186,
    source: "QR Code",
    payment: "Paid Online",
    state: "Completed",
    lastStage: "Completed",
    timeline: {},
    items: [],
    courses: 1,
    subtotalSar: 160,
    taxSar: 26,
    ...overrides,
  };
}

describe("ordersToCsv", () => {
  it("writes a header row followed by one row per order", () => {
    const csv = ordersToCsv([order()]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("Order,Date,Table,Guests,Source,Payment,Status,Total (SAR)");
    // The date field itself contains a comma, so it's quoted.
    expect(lines[1]).toBe('#ORD-2001,"May 16, 2026",Table 12,4,QR Code,Paid Online,Completed,186.00');
  });

  it("escapes fields containing commas or quotes", () => {
    const csv = ordersToCsv([order({ table: 'Table "A", VIP' })]);
    expect(csv.split("\n")[1]).toContain('"Table ""A"", VIP"');
  });

  it("renders null table/guests as empty fields", () => {
    const csv = ordersToCsv([order({ table: null, guests: null })]);
    const line = csv.split("\n")[1];
    expect(line).toContain(",,,QR Code,");
  });

  it("neutralizes formula-injection payloads in exported fields", () => {
    const csv = ordersToCsv([order({ table: "=HYPERLINK(http://evil,x)" })]);
    const line = csv.split("\n")[1];
    // The leading `'` forces spreadsheet apps to treat the cell as text
    // instead of evaluating it as a live formula.
    expect(line).toContain("'=HYPERLINK(http://evil,x)");
  });
});
