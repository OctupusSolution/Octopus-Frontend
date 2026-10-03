import { describe, expect, it } from "vitest";
import { EMPTY_LIST_FILTERS, hasActiveFilters, matchesListFilters, type ListFilters } from "./list-filter";
import { customerRecords } from "./mock-data";

const reem = customerRecords[0]; // VIP, 12 visits, SAR 12,500, last visit 2026-05-15

function f(patch: Partial<ListFilters>): ListFilters {
  return { ...EMPTY_LIST_FILTERS, ...patch };
}

describe("matchesListFilters", () => {
  it("matches everything with no filters", () => {
    expect(customerRecords.every((c) => matchesListFilters(c, EMPTY_LIST_FILTERS))).toBe(true);
  });

  it("searches name, phone and email case-insensitively", () => {
    expect(matchesListFilters(reem, f({ search: "reem al" }))).toBe(true);
    expect(matchesListFilters(reem, f({ search: "0002877" }))).toBe(true);
    expect(matchesListFilters(reem, f({ search: "REEMELSUBAIE@" }))).toBe(true);
    expect(matchesListFilters(reem, f({ search: "nobody" }))).toBe(false);
  });

  it("ORs the selected tags", () => {
    expect(matchesListFilters(reem, f({ tags: ["At Risk", "VIP"] }))).toBe(true);
    expect(matchesListFilters(reem, f({ tags: ["At Risk"] }))).toBe(false);
  });

  it("applies inclusive numeric ranges", () => {
    expect(matchesListFilters(reem, f({ visits: { from: "12", to: "12" } }))).toBe(true);
    expect(matchesListFilters(reem, f({ visits: { from: "13", to: "" } }))).toBe(false);
    expect(matchesListFilters(reem, f({ spend: { from: "", to: "12499" } }))).toBe(false);
  });

  it("applies inclusive date ranges", () => {
    expect(matchesListFilters(reem, f({ lastVisit: { from: "2026-05-15", to: "2026-05-15" } }))).toBe(true);
    expect(matchesListFilters(reem, f({ lastVisit: { from: "2026-05-16", to: "" } }))).toBe(false);
  });
});

describe("hasActiveFilters", () => {
  it("is false for the empty set and true once anything is set", () => {
    expect(hasActiveFilters(EMPTY_LIST_FILTERS)).toBe(false);
    expect(hasActiveFilters(f({ search: "  " }))).toBe(false);
    expect(hasActiveFilters(f({ tags: ["VIP"] }))).toBe(true);
    expect(hasActiveFilters(f({ spend: { from: "", to: "5" } }))).toBe(true);
  });
});
