import { describe, expect, it } from "vitest";
import type { MenuItem } from "@octopus/api-client";
import { quickAddOf } from "./quick-add";

const item = (over: Partial<MenuItem>): MenuItem => ({
  id: "cat-1-i1",
  categoryId: "cat-1",
  name: "Tea",
  description: "",
  priceSar: 10,
  imageUrl: "",
  available: true,
  availableFor: ["dine_in"],
  modifierGroups: [],
  ...over,
});

describe("quickAddOf", () => {
  it("adds a plain item straight to the cart", () => {
    expect(quickAddOf(item({}))).toBe("add");
  });
  it("opens an item with choices to make", () => {
    expect(quickAddOf(item({ modifierGroups: [{ id: "m1", label: "Size", required: true, multiple: false, options: [] }] }))).toBe("open");
  });
  it("offers nothing for an item that cannot be ordered", () => {
    expect(quickAddOf(item({ inStock: false }))).toBe("none");
    expect(quickAddOf(item({ available: false }))).toBe("none");
  });
});
