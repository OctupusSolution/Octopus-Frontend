import { describe, expect, it } from "vitest";
import { customersToCsv } from "./csv-export";
import { customerRecords } from "./mock-data";

describe("customersToCsv", () => {
  it("writes a header and one line per customer", () => {
    const csv = customersToCsv(customerRecords.slice(0, 2));
    const lines = csv.split("\n");
    expect(lines[0]).toBe("Name,Phone,Email,Tags,Visits,Total Spend (SAR),Last Visit");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe("Reem Al-Subaie,'+966510002877,Reemelsubaie@gmail.com,VIP; Frequent Diner; Birthday May,12,12500.00,2026-05-15");
  });

  it("quotes commas/quotes and neutralises formula prefixes", () => {
    const [reem] = customerRecords;
    const csv = customersToCsv([{ ...reem, firstName: '=cmd', lastName: 'x, "y"' }]);
    expect(csv.split("\n")[1].startsWith(`"'=cmd x, ""y"""`)).toBe(true);
  });
});
