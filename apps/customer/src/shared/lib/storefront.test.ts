import { describe, expect, it } from "vitest";
import type { MenuItem, OrderLine } from "@octopus/api-client";
import {
  bestSellers, computeCartPricing, computeLinePricing, discountPercent,
  filterItems, offers, parseFilters, relatedItems,
} from "./storefront";

function item(overrides: Partial<MenuItem> & { id: string }): MenuItem {
  return {
    categoryId: "cat-main", name: "x", description: "", priceSar: 100,
    imageUrl: "", available: true, availableFor: ["delivery"], modifierGroups: [],
    ...overrides,
  };
}

describe("discountPercent", () => {
  it("derives the design's 10% from 153 against 170", () => {
    expect(discountPercent(item({ id: "a", priceSar: 153, compareAtPriceSar: 170 }))).toBe(10);
  });

  it("is null without a compare-at price", () => {
    expect(discountPercent(item({ id: "a", priceSar: 153 }))).toBeNull();
  });

  it("is null when the compare-at price is not higher, rather than reporting a negative discount", () => {
    expect(discountPercent(item({ id: "a", priceSar: 170, compareAtPriceSar: 170 }))).toBeNull();
    expect(discountPercent(item({ id: "a", priceSar: 180, compareAtPriceSar: 170 }))).toBeNull();
  });

  it("rounds to a whole percent", () => {
    expect(discountPercent(item({ id: "a", priceSar: 66, compareAtPriceSar: 100 }))).toBe(34);
  });
});

describe("parseFilters", () => {
  it("reads every supported parameter", () => {
    const f = parseFilters(new URLSearchParams("group=burger&best=1&available=1&price=50-150&diet=spicy&allergen=nuts"));
    expect(f).toEqual({
      group: "burger", bestSellersOnly: true, availableOnly: true,
      minPriceSar: 50, maxPriceSar: 150, dietary: ["spicy"], excludeAllergens: ["nuts"],
    });
  });

  it("defaults to an empty filter set", () => {
    expect(parseFilters(new URLSearchParams())).toEqual({
      group: null, bestSellersOnly: false, availableOnly: false,
      minPriceSar: null, maxPriceSar: null, dietary: [], excludeAllergens: [],
    });
  });

  it("ignores a group that is not a known id", () => {
    expect(parseFilters(new URLSearchParams("group=sandwiches")).group).toBeNull();
  });

  it("treats the all chip as no group filter", () => {
    expect(parseFilters(new URLSearchParams("group=all")).group).toBeNull();
  });

  it("ignores a malformed price range instead of filtering everything out", () => {
    const f = parseFilters(new URLSearchParams("price=cheap"));
    expect(f.minPriceSar).toBeNull();
    expect(f.maxPriceSar).toBeNull();
  });

  it("reads an open-ended upper price range", () => {
    const f = parseFilters(new URLSearchParams("price=200-"));
    expect(f.minPriceSar).toBe(200);
    expect(f.maxPriceSar).toBeNull();
  });
});

describe("filterItems", () => {
  const items = [
    item({ id: "burger", group: "burger", priceSar: 153, badges: ["best_seller"], inStock: true, allergens: ["gluten"], dietary: ["spicy"] }),
    item({ id: "salad", group: "salads", priceSar: 42, inStock: true, dietary: ["healthy", "vegetarian"] }),
    item({ id: "sold-out", group: "meat", priceSar: 210, inStock: false }),
  ];
  const none = parseFilters(new URLSearchParams());

  it("returns everything when nothing is set", () => {
    expect(filterItems(items, none).map((i) => i.id)).toEqual(["burger", "salad", "sold-out"]);
  });

  it("filters by group", () => {
    expect(filterItems(items, { ...none, group: "salads" }).map((i) => i.id)).toEqual(["salad"]);
  });

  it("filters by best seller badge", () => {
    expect(filterItems(items, { ...none, bestSellersOnly: true }).map((i) => i.id)).toEqual(["burger"]);
  });

  it("filters out items that are not in stock", () => {
    expect(filterItems(items, { ...none, availableOnly: true }).map((i) => i.id)).toEqual(["burger", "salad"]);
  });

  it("treats a missing inStock as in stock", () => {
    const legacy = [item({ id: "legacy", priceSar: 10 })];
    expect(filterItems(legacy, { ...none, availableOnly: true })).toHaveLength(1);
  });

  it("filters by price range inclusively", () => {
    expect(filterItems(items, { ...none, minPriceSar: 42, maxPriceSar: 153 }).map((i) => i.id)).toEqual(["burger", "salad"]);
  });

  it("filters by dietary preference", () => {
    expect(filterItems(items, { ...none, dietary: ["healthy"] }).map((i) => i.id)).toEqual(["salad"]);
  });

  it("excludes items containing an unwanted allergen", () => {
    expect(filterItems(items, { ...none, excludeAllergens: ["gluten"] }).map((i) => i.id)).toEqual(["salad", "sold-out"]);
  });

  it("combines filters as AND", () => {
    expect(filterItems(items, { ...none, availableOnly: true, maxPriceSar: 100 }).map((i) => i.id)).toEqual(["salad"]);
  });

  it("keeps an ungrouped item out of every group filter but in the unfiltered list", () => {
    const ungrouped = [item({ id: "cake", priceSar: 153 })];
    expect(filterItems(ungrouped, none)).toHaveLength(1);
    expect(filterItems(ungrouped, { ...none, group: "burger" })).toHaveLength(0);
  });
});

describe("derivations", () => {
  const items = [
    item({ id: "a", badges: ["best_seller"], categoryId: "cat-main", group: "burger" }),
    item({ id: "b", badges: ["offer"], compareAtPriceSar: 200, categoryId: "cat-main", group: "burger" }),
    item({ id: "c", categoryId: "cat-lunch", group: "salads" }),
  ];

  it("picks out best sellers", () => {
    expect(bestSellers(items).map((i) => i.id)).toEqual(["a"]);
  });

  it("picks out offers", () => {
    expect(offers(items).map((i) => i.id)).toEqual(["b"]);
  });

  it("honours the limit", () => {
    const many = Array.from({ length: 9 }, (_, n) => item({ id: `x${n}`, badges: ["best_seller"] }));
    expect(bestSellers(many, 4)).toHaveLength(4);
  });

  it("relates by group and never includes the item itself", () => {
    const related = relatedItems(items, items[0]);
    expect(related.map((i) => i.id)).toEqual(["b"]);
  });

  it("falls back to the same category when the group has nothing else", () => {
    const related = relatedItems(items, items[2]);
    expect(related.map((i) => i.id)).not.toContain("c");
  });

  it("never relates an ungrouped item to every other ungrouped item by accident", () => {
    const pool = [
      item({ id: "cake", categoryId: "cat-desserts" }),
      item({ id: "kunafa", categoryId: "cat-desserts" }),
      item({ id: "burger", categoryId: "cat-main", group: "burger" }),
    ];
    expect(relatedItems(pool, pool[0]).map((i) => i.id)).toEqual(["kunafa"]);
  });
});

describe("computeLinePricing", () => {
  function line(overrides: Partial<OrderLine> = {}): OrderLine {
    return {
      lineId: "l1", menuItemId: "m1", name: "x", unitPriceSar: 153,
      quantity: 1, modifiers: [], notes: "", ...overrides,
    };
  }

  it("splits the cake's 153 base and 30 of candles into the comp's 183 total", () => {
    expect(computeLinePricing(line({
      modifiers: [{ groupId: "g", optionId: "o", label: "شموع", priceDeltaSar: 30 }],
    }))).toEqual({ baseSar: 153, addonsSar: 30, totalSar: 183 });
  });

  it("reports no additions for a line without modifiers", () => {
    expect(computeLinePricing(line())).toEqual({ baseSar: 153, addonsSar: 0, totalSar: 153 });
  });

  it("multiplies both halves by the quantity", () => {
    expect(computeLinePricing(line({
      quantity: 3,
      modifiers: [{ groupId: "g", optionId: "o", label: "شموع", priceDeltaSar: 30 }],
    }))).toEqual({ baseSar: 459, addonsSar: 90, totalSar: 549 });
  });

  it("counts a free modifier as no addition at all", () => {
    expect(computeLinePricing(line({
      modifiers: [{ groupId: "g", optionId: "o", label: "شوكولاتة", priceDeltaSar: 0 }],
    })).addonsSar).toBe(0);
  });

  it("sums several modifiers", () => {
    expect(computeLinePricing(line({
      modifiers: [
        { groupId: "g", optionId: "a", label: "شموع", priceDeltaSar: 30 },
        { groupId: "g", optionId: "b", label: "رسالة", priceDeltaSar: 30 },
      ],
    })).addonsSar).toBe(60);
  });
});

describe("computeCartPricing", () => {
  const a: OrderLine = {
    lineId: "a", menuItemId: "m1", name: "cake", unitPriceSar: 153, quantity: 1,
    modifiers: [{ groupId: "g", optionId: "o", label: "شموع", priceDeltaSar: 30 }], notes: "",
  };
  const b: OrderLine = {
    lineId: "b", menuItemId: "m2", name: "donut", unitPriceSar: 50, quantity: 2,
    modifiers: [], notes: "",
  };

  it("adds the lines up, keeping the split", () => {
    expect(computeCartPricing([a, b])).toEqual({ baseSar: 253, addonsSar: 30, totalSar: 283 });
  });

  it("is all zeroes for an empty cart", () => {
    expect(computeCartPricing([])).toEqual({ baseSar: 0, addonsSar: 0, totalSar: 0 });
  });
});
