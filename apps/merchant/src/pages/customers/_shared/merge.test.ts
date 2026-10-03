import { describe, expect, it } from "vitest";
import { mergeCustomers } from "./merge";
import { customerRecords } from "./mock-data";

describe("mergeCustomers", () => {
  const [a, b] = customerRecords;

  it("keeps the first record's identity and sums the activity", () => {
    const merged = mergeCustomers([a, b]);
    expect(merged.id).toBe(a.id);
    expect(merged.firstName).toBe(a.firstName);
    expect(merged.visits).toBe(a.visits + b.visits);
    expect(merged.totalSpendSar).toBe(a.totalSpendSar + b.totalSpendSar);
    expect(merged.avgSpendSar).toBe(Math.round((a.totalSpendSar + b.totalSpendSar) / (a.visits + b.visits)));
  });

  it("unions tags without duplicates and takes the widest date span", () => {
    const merged = mergeCustomers([a, b]);
    expect(merged.tags).toEqual([...new Set([...a.tags, ...b.tags])]);
    expect(merged.lastVisit).toBe(a.lastVisit > b.lastVisit ? a.lastVisit : b.lastVisit);
    expect(merged.customerSince).toBe(a.customerSince < b.customerSince ? a.customerSince : b.customerSince);
  });

  it("returns a single record unchanged", () => {
    expect(mergeCustomers([a])).toBe(a);
  });

  it("rejects an empty list", () => {
    expect(() => mergeCustomers([])).toThrow();
  });
});
