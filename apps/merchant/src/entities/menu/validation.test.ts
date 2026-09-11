import { describe, expect, it } from "vitest";
import {
  addItem,
  addModifierGroup,
  addSection,
  blankItem,
  blankMenu,
  blankSection,
  updateItem,
} from "./draft";
import { validate } from "./validation";
import type { Item, Menu } from "./menu";

const NOW = "2026-09-10T08:00:00.000Z";

/** A menu with one section and one item that has nothing wrong with it, so each
 *  test can break exactly one thing and see exactly one finding. */
function healthy(): Menu {
  let menu = blankMenu("m1", "b1", NOW);
  menu = addSection(menu, blankSection("s1", "items", "Breakfast", "breakfast.webp"));
  menu = addItem(menu, "s1", blankItem("i1", "Omelette"));
  return updateItem(menu, "s1", "i1", {
    description: "Three eggs, spinach and mushrooms.",
    image: "breakfast.webp",
    tags: ["chef-recommended"],
    pricing: { price: 40, vatRate: 0.15 },
    allergies: { allergens: ["eggs"], note: "" },
  });
}

function patch(menu: Menu, p: Partial<Item>): Menu {
  return updateItem(menu, "s1", "i1", p);
}

function ids(findings: { id: string }[]): string[] {
  return findings.map((f) => f.id);
}

describe("validate", () => {
  it("finds nothing wrong with a complete menu", () => {
    const result = validate(healthy());
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.recommendations).toEqual([]);
  });

  it("raises an error for an item with no price", () => {
    const result = validate(patch(healthy(), { pricing: { price: 0, vatRate: 0.15 } }));
    expect(ids(result.errors)).toContain("itemMissingPrice");
    expect(result.errors.find((f) => f.id === "itemMissingPrice")?.count).toBe(1);
  });

  it("raises an error for an item with no tax configured", () => {
    const result = validate(patch(healthy(), { pricing: { price: 40, vatRate: 0 } }));
    expect(ids(result.errors)).toContain("taxMissing");
  });

  it("counts one error per offending item, not one per menu", () => {
    let menu = patch(healthy(), { pricing: { price: 0, vatRate: 0.15 } });
    menu = addItem(menu, "s1", blankItem("i2", "Shakshuka"));
    const result = validate(menu);
    expect(result.errors.find((f) => f.id === "itemMissingPrice")?.count).toBe(2);
  });

  it("warns about an item with no image", () => {
    const result = validate(patch(healthy(), { image: null }));
    expect(ids(result.warnings)).toContain("itemMissingImage");
  });

  it("warns about an item marked unavailable", () => {
    const result = validate(
      patch(healthy(), {
        availability: { available: false, delivery: true, takeaway: true, dineIn: true },
      })
    );
    expect(ids(result.warnings)).toContain("itemUnavailable");
  });

  it("warns about a modifier group whose rules cannot be satisfied", () => {
    const menu = addModifierGroup(healthy(), "s1", "i1", {
      id: "g1",
      name: "Size",
      type: "single",
      customerLabel: "Choose your size",
      helpText: "",
      min: 3,
      max: 1,
      required: true,
      showAsRadio: true,
      options: [],
    });
    expect(ids(validate(menu).warnings)).toContain("modifierRulesInvalid");
  });

  it("recommends a description, allergens and tags where they are missing", () => {
    const result = validate(
      patch(healthy(), { description: "", tags: [], allergies: { allergens: [], note: "" } })
    );
    expect(ids(result.recommendations)).toEqual(
      expect.arrayContaining(["addDescription", "addAllergens", "addTags"])
    );
  });

  it("ignores the offers section when counting item findings", () => {
    // A menu with no items at all still has its built-in offers section, and
    // an empty offers section is not eight things wrong with the menu — the
    // only error is that there is nothing to order.
    const result = validate(blankMenu("m2", "b1", NOW));
    expect(result.errors).toEqual([{ id: "menuEmpty", count: 1 }]);
    expect(result.warnings).toEqual([]);
  });

  it("blocks publishing a menu with no items", () => {
    let menu = blankMenu("m3", "b1", NOW);
    menu = addSection(menu, blankSection("s1", "items", "Breakfast", null));
    expect(ids(validate(menu).errors)).toContain("menuEmpty");
  });

  it("does not raise menuEmpty once any item exists", () => {
    expect(ids(validate(healthy()).errors)).not.toContain("menuEmpty");
  });

  it("raises an error for a menu with no name", () => {
    const result = validate({ ...healthy(), name: "  " });
    expect(ids(result.errors)).toContain("menuMissingName");
  });
});
