import { describe, expect, it } from "vitest";
import { blankDetectedItem, findItem, type DetectionResult } from "./ai-import";
import {
  applyBulkPrices,
  bulkAdjustedPrice,
  findMatches,
  hasErrors,
  parsePrice,
  parseSigned,
  priceText,
  replaceInItems,
  splitHighlights,
  validateBulkPrices,
  validateFind,
  validateItemForm,
} from "./ai-import-forms";

function fixture(): DetectionResult {
  const item = (id: string, name: string, description: string, price: number | null) => ({
    ...blankDetectedItem(id, name),
    description,
    price,
  });
  return {
    restaurant: { name: "Flavors", tagline: "Kitchen & Cafe" },
    fileName: "menu.pdf",
    pages: 1,
    sections: [
      {
        id: "mains",
        name: "Mains",
        items: [
          item("salmon", "Grilled Salmon", "Served with seasonal vegetables", 99),
          item("chicken", "Grilled Chicken", "Seasonal greens, garlic mayo", 40),
          item("mystery", "Chef Special", "Ask your waiter", null),
        ],
      },
      { id: "drinks", name: "Drinks", items: [item("mojito", "Mojito", "Mint, lime, soda", 12)] },
    ],
  };
}

describe("parsePrice", () => {
  it("accepts plain decimals above zero", () => {
    expect(parsePrice("100")).toEqual({ value: 100, error: null });
    expect(parsePrice(" 12.50 ")).toEqual({ value: 12.5, error: null });
    expect(parsePrice("7.")).toEqual({ value: 7, error: null });
  });

  it("tells empty, non-numeric and non-positive apart", () => {
    expect(parsePrice("  ").error).toBe("required");
    expect(parsePrice("abc").error).toBe("not-a-number");
    expect(parsePrice("12 SAR").error).toBe("not-a-number");
    expect(parsePrice("1.2.3").error).toBe("not-a-number");
    expect(parsePrice(".").error).toBe("not-a-number");
    expect(parsePrice("-5").error).toBe("not-a-number");
    expect(parsePrice("0").error).toBe("not-positive");
    expect(parsePrice("0.00").error).toBe("not-positive");
  });
});

describe("validateItemForm", () => {
  const valid = { name: "Grilled Chicken", priceText: "100", description: "Lorem ipsum", image: "data:x", sectionId: "mains" };

  it("passes a complete item", () => {
    const errors = validateItemForm(valid);
    expect(hasErrors(errors)).toBe(false);
  });

  it("requires every starred field", () => {
    const errors = validateItemForm({ name: "  ", priceText: "", description: " ", image: null, sectionId: null });
    expect(errors).toEqual({
      image: null,
      name: "required",
      price: "required",
      description: "required",
      section: "required",
    });
    expect(hasErrors(errors)).toBe(true);
  });

  it("reports the price's own reason", () => {
    expect(validateItemForm({ ...valid, priceText: "ten" }).price).toBe("not-a-number");
    expect(validateItemForm({ ...valid, priceText: "0" }).price).toBe("not-positive");
  });

  it("skips Section where the editor has no such field", () => {
    const { sectionId: _omit, ...withoutSection } = valid;
    expect(validateItemForm(withoutSection).section).toBeNull();
  });
});

describe("priceText", () => {
  it("is empty for an unread price", () => {
    expect(priceText(null)).toBe("");
    expect(priceText(12.5)).toBe("12.5");
  });
});

describe("parseSigned", () => {
  it("reads signed decimals", () => {
    expect(parseSigned("10")).toBe(10);
    expect(parseSigned("-7.5")).toBe(-7.5);
    expect(parseSigned("+3")).toBe(3);
    expect(parseSigned("  ")).toBeNull();
  });

  it("is NaN for anything else", () => {
    expect(parseSigned("ten")).toBeNaN();
    expect(parseSigned("10%")).toBeNaN();
    expect(parseSigned("-")).toBeNaN();
    expect(parseSigned("1e3")).toBeNaN();
  });
});

describe("validateBulkPrices", () => {
  const base = { itemIds: ["salmon", "chicken"], percentText: "", fixedText: "" };

  it("requires items", () => {
    expect(validateBulkPrices(fixture(), { ...base, itemIds: [], percentText: "10" }).items).toBe("required");
  });

  it("needs a percentage or a fixed amount", () => {
    expect(validateBulkPrices(fixture(), base)).toEqual({ items: null, percent: "one-required", fixed: "one-required" });
    expect(hasErrors(validateBulkPrices(fixture(), { ...base, percentText: "10" }))).toBe(false);
    expect(hasErrors(validateBulkPrices(fixture(), { ...base, fixedText: "5" }))).toBe(false);
  });

  it("rejects text that is not a number", () => {
    expect(validateBulkPrices(fixture(), { ...base, percentText: "ten" }).percent).toBe("not-a-number");
    expect(validateBulkPrices(fixture(), { ...base, percentText: "10", fixedText: "x" }).fixed).toBe("not-a-number");
  });

  it("allows a decrease that keeps every price above zero", () => {
    expect(hasErrors(validateBulkPrices(fixture(), { ...base, percentText: "-50" }))).toBe(false);
    expect(hasErrors(validateBulkPrices(fixture(), { ...base, fixedText: "-39.99" }))).toBe(false);
  });

  it("refuses a change that would make a price zero or less", () => {
    expect(validateBulkPrices(fixture(), { ...base, percentText: "-100" }).percent).toBe("non-positive-result");
    expect(validateBulkPrices(fixture(), { ...base, fixedText: "-40" }).fixed).toBe("non-positive-result");
    expect(validateBulkPrices(fixture(), { ...base, percentText: "-50", fixedText: "-20" }).fixed).toBe("non-positive-result");
  });

  it("ignores items whose price was never read", () => {
    expect(hasErrors(validateBulkPrices(fixture(), { itemIds: ["mystery"], percentText: "-100", fixedText: "" }))).toBe(false);
  });
});

describe("applyBulkPrices", () => {
  it("changes only the chosen items, percentage before fixed", () => {
    const before = fixture();
    const next = applyBulkPrices(before, ["salmon", "mystery"], { percent: 10, fixed: 1 });
    expect(findItem(next, "salmon")?.item.price).toBe(109.9);
    expect(findItem(next, "chicken")?.item.price).toBe(40);
    expect(findItem(next, "mystery")?.item.price).toBeNull();
    // A section with nothing chosen in it is not rebuilt.
    expect(next.sections[1]).toBe(before.sections[1]);
  });

  it("rounds to halalas", () => {
    expect(bulkAdjustedPrice(9.99, 33, 0)).toBe(13.29);
  });
});

describe("find & replace", () => {
  const all = { scope: "all", matchCase: false } as const;

  it("requires something to find", () => {
    expect(validateFind("  ")).toBe("required");
    expect(validateFind("mayo")).toBeNull();
  });

  it("finds across names and descriptions, ignoring case", () => {
    const matches = findMatches(fixture(), "seasonal", all);
    expect(matches.map((m) => m.item.id)).toEqual(["salmon", "chicken"]);
    expect(matches[0]).toMatchObject({ sectionName: "Mains", inName: false, inDescription: true });
  });

  it("honours scope and match case", () => {
    expect(findMatches(fixture(), "grilled", { scope: "descriptions", matchCase: false })).toEqual([]);
    expect(findMatches(fixture(), "grilled", { scope: "names", matchCase: false })).toHaveLength(2);
    expect(findMatches(fixture(), "seasonal", { scope: "all", matchCase: true }).map((m) => m.item.id)).toEqual(["salmon"]);
  });

  it("treats the search text literally", () => {
    expect(findMatches(fixture(), ".*", all)).toEqual([]);
  });

  it("splits a text around its hits", () => {
    expect(splitHighlights("Served with seasonal vegetables", "seasonal", false)).toEqual([
      { text: "Served with ", match: false },
      { text: "seasonal", match: true },
      { text: " vegetables", match: false },
    ]);
    expect(splitHighlights("Mojito", "x", false)).toEqual([{ text: "Mojito", match: false }]);
  });

  it("replaces only inside the selected items", () => {
    const { result, count } = replaceInItems(fixture(), ["salmon"], "seasonal", "garden", all);
    expect(count).toBe(1);
    expect(findItem(result, "salmon")?.item.description).toBe("Served with garden vegetables");
    expect(findItem(result, "chicken")?.item.description).toBe("Seasonal greens, garlic mayo");
  });

  it("hands back the same result when nothing changes", () => {
    const before = fixture();
    expect(replaceInItems(before, [], "seasonal", "x", all)).toEqual({ result: before, count: 0 });
    expect(replaceInItems(before, ["mojito"], "seasonal", "x", all).result).toBe(before);
  });
});
