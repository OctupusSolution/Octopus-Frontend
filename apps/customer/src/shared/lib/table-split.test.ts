import { describe, expect, it } from "vitest";
import type { OrderLine } from "@octopus/api-client";
import { allLinesAssigned, initials, personShares, splitTotals, type SplitState } from "./table-split";

const line = (lineId: string, unitPriceSar: number): OrderLine => ({
  lineId, menuItemId: lineId, name: lineId, unitPriceSar, quantity: 1, modifiers: [], notes: "",
});

const people = (...ids: string[]) => ids.map((id) => ({ id, name: id, status: "unpaid" as const }));

describe("personShares", () => {
  it("splits equally and settles the rounding on the last person", () => {
    const split: SplitState = { mode: "equal", people: people("a", "b", "c"), assignments: {} };
    const shares = personShares(split, [], 100);
    expect(shares).toEqual({ a: 33.33, b: 33.33, c: 33.34 });
  });

  it("weights an items split by what each person took, sharing a shared item", () => {
    const split: SplitState = {
      mode: "items",
      people: people("a", "b"),
      assignments: { burger: ["a"], fries: ["a", "b"] },
    };
    // a carries 60 + 20, b carries 20 → 80% and 20% of a 115 bill (fees included).
    const shares = personShares(split, [line("burger", 60), line("fries", 40)], 115);
    expect(shares).toEqual({ a: 92, b: 23 });
  });

  it("uses the entered amounts for a custom split", () => {
    const split: SplitState = {
      mode: "custom",
      people: [
        { id: "a", name: "a", status: "unpaid", amountSar: 40 },
        { id: "b", name: "b", status: "unpaid" },
      ],
      assignments: {},
    };
    expect(personShares(split, [], 100)).toEqual({ a: 40, b: 0 });
  });
});

describe("splitTotals", () => {
  it("counts a shared link as still unpaid", () => {
    const split: SplitState = {
      mode: "equal",
      people: [
        { id: "a", name: "a", status: "paid" },
        { id: "b", name: "b", status: "shared" },
      ],
      assignments: {},
    };
    expect(splitTotals(split, { a: 50, b: 50 }, 100)).toEqual({ paidSar: 50, unpaidSar: 50, remainingSar: 50 });
  });
});

describe("allLinesAssigned", () => {
  it("ignores an assignment to a person who was removed", () => {
    const split: SplitState = { mode: "items", people: people("a"), assignments: { burger: ["gone"] } };
    expect(allLinesAssigned(split, [line("burger", 60)])).toBe(false);
  });
});

describe("initials", () => {
  it("takes the first letter of the first two words", () => {
    expect(initials("أحمد محمد علي")).toBe("أ م");
    expect(initials("  sara ")).toBe("S");
  });
});
