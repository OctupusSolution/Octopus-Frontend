import { describe, expect, it } from "vitest";
import { EMPTY_LIST_FILTERS } from "../list-filter";
import { customerRecords } from "../mock-data";
import { EMPTY_AUDIENCE_FILTERS, ageOn, audienceOf, estimatedCostSar, matchesAudience, visitFrequencyOf, type AudienceFilters } from "./audience";

const reem = customerRecords[0]; // Female, VIP, born 1997-05-12, SAR 12,500
const TODAY = "2026-09-18";

function f(patch: Partial<AudienceFilters>): AudienceFilters {
  return { ...EMPTY_AUDIENCE_FILTERS, ...patch };
}

describe("ageOn", () => {
  it("counts whole years and respects the birthday", () => {
    expect(ageOn("1997-05-12", "2026-05-11")).toBe(28);
    expect(ageOn("1997-05-12", "2026-05-12")).toBe(29);
  });
});

describe("visitFrequencyOf", () => {
  it("buckets by average visits per month", () => {
    const base = { firstVisit: "2026-01-01", lastVisit: "2026-03-01" }; // 2 months
    expect(visitFrequencyOf({ ...base, visits: 1 })).toBe("firstTime");
    expect(visitFrequencyOf({ ...base, visits: 8 })).toBe("weekly");
    expect(visitFrequencyOf({ ...base, visits: 3 })).toBe("monthly");
    expect(visitFrequencyOf({ firstVisit: "2024-01-01", lastVisit: "2026-01-01", visits: 5 })).toBe("occasional");
  });
});

describe("matchesAudience", () => {
  it("matches everyone with no filters", () => {
    expect(customerRecords.every((c) => matchesAudience(c, EMPTY_AUDIENCE_FILTERS, TODAY))).toBe(true);
  });

  it("filters by tag, gender and spend", () => {
    expect(matchesAudience(reem, f({ tag: "VIP", gender: "Female", totalSpendFrom: "12500" }), TODAY)).toBe(true);
    expect(matchesAudience(reem, f({ gender: "Male" }), TODAY)).toBe(false);
    expect(matchesAudience(reem, f({ totalSpendTo: "100" }), TODAY)).toBe(false);
  });

  it("filters by age range from the date of birth", () => {
    expect(matchesAudience(reem, f({ ageRange: "25-30" }), TODAY)).toBe(true);
    expect(matchesAudience(reem, f({ ageRange: "31-40" }), TODAY)).toBe(false);
    expect(matchesAudience({ ...reem, dateOfBirth: undefined }, f({ ageRange: "25-30" }), TODAY)).toBe(false);
  });

  it("applies a saved segment's list filters", () => {
    const segment = { id: "s1", name: "Big spenders", filters: { ...EMPTY_LIST_FILTERS, spend: { from: "10000", to: "" } } };
    expect(matchesAudience(reem, f({ segment }), TODAY)).toBe(true);
    const narrow = { ...segment, filters: { ...segment.filters, tags: ["At Risk"] } };
    expect(matchesAudience(reem, f({ segment: narrow }), TODAY)).toBe(false);
  });
});

describe("audienceOf", () => {
  it("leaves blocked customers out", () => {
    const blocked = { ...reem, isBlocked: true };
    expect(audienceOf([reem, blocked], EMPTY_AUDIENCE_FILTERS, TODAY)).toEqual([reem]);
  });
});

describe("estimatedCostSar", () => {
  it("reproduces the frame's WhatsApp estimate", () => {
    expect(estimatedCostSar("WhatsApp", 2312)).toBe(289);
    expect(estimatedCostSar("SMS", 3)).toBe(0.3);
  });
});
