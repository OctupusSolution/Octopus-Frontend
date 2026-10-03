import { describe, expect, it } from "vitest";
import { customerRecords } from "./mock-data";

describe("customerRecords", () => {
  it("has 26 records", () => {
    expect(customerRecords).toHaveLength(26);
  });

  it("keeps Reem Al-Subaie as record #1 matching the mockup fields", () => {
    const reem = customerRecords[0];
    expect(reem.id).toBe("CUST-1001");
    expect(reem.firstName).toBe("Reem");
    expect(reem.lastName).toBe("Al-Subaie");
    expect(reem.phone).toBe("+966510002877");
    expect(reem.email).toBe("Reemelsubaie@gmail.com");
    expect(reem.tags).toEqual(["VIP", "Frequent Diner", "Birthday May"]);
    expect(reem.visits).toBe(12);
    expect(reem.totalSpendSar).toBe(12500);
    expect(reem.lastVisit).toBe("2026-05-15");
    expect(reem.upcomingReservation).toBe("2026-05-30");
    expect(reem.loyaltyPoints).toBe(1250);
    expect(reem.avgSpendSar).toBe(500);
  });

  it("gives every generated record a unique id", () => {
    const ids = new Set(customerRecords.map((c) => c.id));
    expect(ids.size).toBe(customerRecords.length);
  });

  it("gives every record a unique phone number", () => {
    const phones = new Set(customerRecords.map((c) => c.phone));
    expect(phones.size).toBe(customerRecords.length);
  });
});
