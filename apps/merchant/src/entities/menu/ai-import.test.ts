import { describe, expect, it } from "vitest";
import {
  adjustPrices,
  bandFor,
  blankDetectedItem,
  duplicateDetectedItem,
  findAndReplace,
  findItem,
  firstWithIssue,
  menuNameFromFile,
  moveItemToSection,
  openIssues,
  parseItemsCsv,
  removeDetectedSection,
  reorderItems,
  reorderSections,
  siblingItem,
  splitBalanced,
  summarize,
  toMenu,
  updateDetectedItem,
  type DetectionResult,
} from "./ai-import";
import { mockDetection } from "./ai-import-mock";
import type { Item } from "./menu";

const fixture = () => mockDetection("menu_breakfast_Lunch_dinner.pdf");

describe("bandFor", () => {
  it("draws the lines the legends state", () => {
    expect(bandFor(100)).toBe("high");
    expect(bandFor(90)).toBe("high");
    expect(bandFor(89)).toBe("medium");
    expect(bandFor(70)).toBe("medium");
    expect(bandFor(69)).toBe("low");
  });
});

describe("summarize", () => {
  it("reads the fixture as the frames do", () => {
    expect(summarize(fixture())).toEqual({
      sections: 8,
      items: 64,
      high: 59,
      needReview: 5,
      highPct: 92,
      reviewPct: 8,
      issues: { "price-unclear": 2, "description-short": 2, "allergen-missing": 1 },
    });
  });

  it("moves when the merchant fixes or confirms an item", () => {
    let result = fixture();
    const soup = firstWithIssue(result, "price-unclear")!;
    result = updateDetectedItem(result, soup.id, { price: 24 });
    expect(summarize(result).issues["price-unclear"]).toBe(1);
    // Fixing the field clears the issue, but only confirming clears review.
    expect(summarize(result).needReview).toBe(5);
    result = updateDetectedItem(result, soup.id, { reviewed: true });
    expect(summarize(result).needReview).toBe(4);
  });

  it("is all zeroes for nothing", () => {
    const empty: DetectionResult = { ...fixture(), sections: [] };
    expect(summarize(empty)).toMatchObject({ items: 0, highPct: 0, reviewPct: 0 });
  });
});

describe("openIssues", () => {
  it("derives each flag from the field it is about", () => {
    const item = { ...blankDetectedItem("x", "X"), reviewed: false, issues: ["description-short", "allergen-missing"] as const };
    expect(openIssues({ ...item, issues: [...item.issues] })).toEqual(["description-short", "allergen-missing"]);
    expect(openIssues({ ...item, issues: [...item.issues], description: "A long enough description", allergens: ["nuts"] })).toEqual([]);
  });
});

describe("item transforms", () => {
  it("moves an item to another section's end, and ignores its own section", () => {
    const result = fixture();
    const moved = moveItemToSection(result, "ai-s1-i1", "ai-s2");
    expect(findItem(moved, "ai-s1-i1")?.section.id).toBe("ai-s2");
    expect(moved.sections[1].items.at(-1)?.id).toBe("ai-s1-i1");
    expect(moveItemToSection(result, "ai-s1-i1", "ai-s1")).toBe(result);
  });

  it("duplicates right after the original", () => {
    const next = duplicateDetectedItem(fixture(), "ai-s3-i1", "copy");
    expect(next.sections[2].items.map((i) => i.id).slice(0, 2)).toEqual(["ai-s3-i1", "copy"]);
  });

  it("reorders items and sections, refusing out-of-range moves", () => {
    const result = fixture();
    expect(reorderItems(result, "ai-s1", 0, 2).sections[0].items[2].id).toBe("ai-s1-i1");
    expect(reorderSections(result, 0, 7).sections[7].id).toBe("ai-s1");
    expect(reorderSections(result, 0, 99)).toBe(result);
  });

  it("walks items across section boundaries", () => {
    const result = fixture();
    expect(siblingItem(result, "ai-s1-i8", 1)?.id).toBe("ai-s2-i1");
    expect(siblingItem(result, "ai-s1-i1", -1)).toBeNull();
  });

  it("removes a section with its items", () => {
    expect(summarize(removeDetectedSection(fixture(), "ai-s3")).items).toBe(52);
  });
});

describe("adjustPrices", () => {
  it("applies percent or fixed to one section, leaving unread prices alone", () => {
    const result = fixture();
    const up = adjustPrices(result, "ai-s1", { mode: "percent", amount: 10 });
    expect(up.sections[0].items[0].price).toBe(41.8);
    expect(up.sections[0].items[7].price).toBeNull();
    expect(up.sections[1]).toBe(result.sections[1]);
    const down = adjustPrices(result, "ai-s1", { mode: "fixed", amount: -100 });
    expect(down.sections[0].items[0].price).toBe(0);
  });
});

describe("findAndReplace", () => {
  it("replaces case-insensitively and counts changed fields", () => {
    const { result, count } = findAndReplace(fixture(), "grilled", "Chargrilled");
    expect(count).toBeGreaterThan(2);
    expect(findItem(result, "ai-s3-i1")?.item.name).toBe("Chargrilled Salmon");
  });

  it("treats the search as literal text", () => {
    expect(findAndReplace(fixture(), "(", "x").count).toBe(0);
  });
});

describe("parseItemsCsv", () => {
  it("skips the header, honours quotes and nulls a bad price", () => {
    const csv = 'name,description,price\n"Wings, spicy","Six pieces, ""hot""",32\nMystery,,abc\n,,5\n';
    const items = parseItemsCsv(csv, (i) => `csv-${i}`);
    expect(items.map((i) => [i.id, i.name, i.description, i.price])).toEqual([
      ["csv-0", "Wings, spicy", 'Six pieces, "hot"', 32],
      ["csv-1", "Mystery", "", null],
    ]);
  });
});

describe("splitBalanced", () => {
  it("keeps order and fills every group", () => {
    const groups = splitBalanced(fixture().sections, 3);
    expect(groups).toHaveLength(3);
    expect(groups.flat().map((s) => s.id)).toEqual(fixture().sections.map((s) => s.id));
    expect(groups.every((g) => g.length > 0)).toBe(true);
  });
});

describe("menuNameFromFile", () => {
  it("titles the file name and says Menu once", () => {
    expect(menuNameFromFile("menu_breakfast_Lunch_dinner.pdf")).toBe("Breakfast Lunch Dinner Menu");
    expect(menuNameFromFile("Dinner Menu.png")).toBe("Dinner Menu");
    expect(menuNameFromFile("menu.pdf")).toBe("Imported Menu");
    expect(menuNameFromFile("IMG_2041.jpeg")).toBe("Img Menu");
  });
});

describe("toMenu", () => {
  it("turns every section and item into the builder's shape", () => {
    let n = 0;
    const menu = toMenu(fixture(), {
      id: "m1",
      branchId: "b1",
      now: "2026-09-11T00:00:00.000Z",
      newId: () => `n${++n}`,
      name: "Breakfast Lunch Dinner Menu",
    });
    expect(menu.name).toBe("Breakfast Lunch Dinner Menu");
    // Eight imported sections, then the built-in Offers last.
    expect(menu.sections.map((s) => s.name)).toEqual([
      "Starters", "Salads", "Mains", "Pasta", "Burgers", "Sandwiches", "Desserts", "Drinks", "Offers",
    ]);
    expect(menu.sections.slice(0, 8).reduce((c, s) => c + s.entries.length, 0)).toBe(64);

    const salmon = menu.sections[2].entries[0] as Item;
    expect(salmon).toMatchObject({ name: "Grilled Salmon", status: "active", pricing: { price: 88 } });
    expect(salmon.allergies.allergens).toEqual(["fish", "dairy"]);

    const soup = menu.sections[0].entries[7] as Item;
    expect(soup).toMatchObject({ status: "draft", pricing: { price: 0 } });
  });
});
