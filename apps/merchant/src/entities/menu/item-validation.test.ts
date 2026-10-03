import { describe, expect, it } from "vitest";
import {
  ITEM_NAME_MAX,
  ITEM_SKU_MAX,
  parseAmount,
  validateItemGeneral,
  validateItemModifiers,
  validateItemPricing,
  validateItemSchedule,
  validateModifierGroup,
  validateModifierGroupForm,
  validateModifierOptionForm,
  validateNutrition,
} from "./item-validation";
import type { ModifierGroup, ModifierOption } from "./menu";

const IMAGE = "data:image/png;base64,AAAA";

function option(id: string, name: string): ModifierOption {
  return { id, name, subLabel: "", priceType: "no-change", price: 0, isDefault: false, available: true };
}

function group(patch: Partial<ModifierGroup> = {}): ModifierGroup {
  return {
    id: "g1",
    name: "Size",
    type: "single",
    customerLabel: "Choose your size",
    helpText: "Select your preferred size",
    min: 1,
    max: 1,
    required: true,
    showAsRadio: true,
    options: [option("o1", "Small"), option("o2", "Large")],
    ...patch,
  };
}

describe("parseAmount", () => {
  it("reads plain decimals", () => {
    expect(parseAmount("12")).toBe(12);
    expect(parseAmount(" 12.50 ")).toBe(12.5);
    expect(parseAmount(".5")).toBe(0.5);
    expect(parseAmount("-3")).toBe(-3);
  });

  it("refuses anything that is not a number", () => {
    for (const text of ["", "abc", "1e3", "1,5", "12 SAR", "-", "."]) expect(parseAmount(text)).toBeNull();
  });
});

describe("validateItemGeneral", () => {
  const valid = { name: "Classic Breakfast", shortName: "Breakfast", image: IMAGE, sku: "BREAKFAST-SAL-001" };

  it("accepts a complete item, with or without a SKU", () => {
    expect(validateItemGeneral(valid)).toEqual({});
    expect(validateItemGeneral({ ...valid, sku: "" })).toEqual({});
  });

  it("requires name, short name and image", () => {
    expect(validateItemGeneral({ name: "  ", shortName: "", image: null, sku: "" })).toEqual({
      name: "menuWiz.item.v.nameRequired",
      shortName: "menuWiz.item.v.shortNameRequired",
      image: "menuWiz.item.v.imageRequired",
    });
  });

  it("limits the name's length", () => {
    expect(validateItemGeneral({ ...valid, name: "a".repeat(ITEM_NAME_MAX) })).toEqual({});
    expect(validateItemGeneral({ ...valid, name: "a".repeat(ITEM_NAME_MAX + 1) }).name).toBe("menuWiz.item.v.nameTooLong");
  });

  it("refuses a SKU with spaces or symbols, or one that is too long", () => {
    expect(validateItemGeneral({ ...valid, sku: "BRK 001" }).sku).toBe("menuWiz.item.v.skuFormat");
    expect(validateItemGeneral({ ...valid, sku: "BRK#1" }).sku).toBe("menuWiz.item.v.skuFormat");
    expect(validateItemGeneral({ ...valid, sku: "A".repeat(ITEM_SKU_MAX + 1) }).sku).toBe("menuWiz.item.v.skuTooLong");
  });
});

describe("validateItemPricing", () => {
  it("accepts a positive price and a VAT between 0 and 100", () => {
    expect(validateItemPricing({ price: "130", vat: "15" })).toEqual({});
    expect(validateItemPricing({ price: "0.5", vat: "0" })).toEqual({});
    expect(validateItemPricing({ price: "1", vat: "100" })).toEqual({});
  });

  it("requires both", () => {
    expect(validateItemPricing({ price: "", vat: " " })).toEqual({
      price: "menuWiz.item.v.priceRequired",
      vat: "menuWiz.item.v.vatRequired",
    });
  });

  it("refuses a price that is zero, negative or not a number", () => {
    expect(validateItemPricing({ price: "0", vat: "15" }).price).toBe("menuWiz.item.v.pricePositive");
    expect(validateItemPricing({ price: "-4", vat: "15" }).price).toBe("menuWiz.item.v.pricePositive");
    expect(validateItemPricing({ price: "ten", vat: "15" }).price).toBe("menuWiz.item.v.priceNumber");
  });

  it("refuses a VAT outside 0–100 or not a number", () => {
    expect(validateItemPricing({ price: "10", vat: "101" }).vat).toBe("menuWiz.item.v.vatRange");
    expect(validateItemPricing({ price: "10", vat: "-1" }).vat).toBe("menuWiz.item.v.vatRange");
    expect(validateItemPricing({ price: "10", vat: "15%" }).vat).toBe("menuWiz.item.v.vatNumber");
  });
});

describe("validateNutrition", () => {
  it("accepts numbers and blank optional fields", () => {
    expect(validateNutrition({ calories: "520", protein: "", carb: "22.5", fat: "0" }, ["calories"])).toEqual({});
  });

  it("requires the required keys, even when they are absent", () => {
    expect(validateNutrition({ protein: "3" }, ["calories"])).toEqual({ calories: "menuWiz.item.v.nutritionRequired" });
  });

  it("refuses text and negatives", () => {
    expect(validateNutrition({ calories: "lots", fat: "-2" }, ["calories"])).toEqual({
      calories: "menuWiz.item.v.nutritionNumber",
      fat: "menuWiz.item.v.nutritionNegative",
    });
  });
});

describe("validateItemSchedule", () => {
  it("never faults All Day", () => {
    expect(validateItemSchedule({ mode: "all-day" })).toEqual({});
  });

  it("accepts a custom window that ends after it starts on at least one day", () => {
    expect(validateItemSchedule({ mode: "custom", start: "10:00", end: "12:00", days: ["sun"] })).toEqual({});
  });

  it("refuses an end at or before the start", () => {
    expect(validateItemSchedule({ mode: "custom", start: "12:00", end: "12:00", days: ["sun"] }).end).toBe(
      "menuWiz.item.v.endAfterStart"
    );
    expect(validateItemSchedule({ mode: "custom", start: "12:00", end: "09:00", days: ["sun"] }).end).toBe(
      "menuWiz.item.v.endAfterStart"
    );
  });

  it("requires a day", () => {
    expect(validateItemSchedule({ mode: "custom", start: "10:00", end: "12:00", days: [] })).toEqual({
      days: "menuWiz.item.v.daysRequired",
    });
  });
});

describe("validateModifierGroupForm", () => {
  it("requires a name", () => {
    expect(validateModifierGroupForm({ name: " " }).name).toBe("menuWiz.mod.v.nameRequired");
  });

  it("refuses a name another group of the item has, ignoring case and padding", () => {
    expect(validateModifierGroupForm({ name: " size " }, ["Size", "Sauce"]).name).toBe("menuWiz.mod.v.nameTaken");
    expect(validateModifierGroupForm({ name: "Extras" }, ["Size", "Sauce"])).toEqual({});
  });
});

describe("validateModifierGroup", () => {
  it("accepts a complete group", () => {
    expect(validateModifierGroup(group())).toEqual({});
  });

  it("requires the customer label and help text", () => {
    expect(validateModifierGroup(group({ customerLabel: "", helpText: "  " }))).toEqual({
      customerLabel: "menuWiz.mod.v.customerLabelRequired",
      helpText: "menuWiz.mod.v.helpTextRequired",
    });
  });

  it("refuses a minimum above the maximum", () => {
    expect(validateModifierGroup(group({ type: "multi", min: 2, max: 1 })).min).toBe("menuWiz.mod.v.minAboveMax");
  });

  it("needs a minimum of one for a required group", () => {
    expect(validateModifierGroup(group({ required: true, min: 0 })).min).toBe("menuWiz.mod.v.minRequired");
    expect(validateModifierGroup(group({ required: false, min: 0 }))).toEqual({});
  });

  it("caps the maximum at the number of options, once there are options", () => {
    expect(validateModifierGroup(group({ type: "multi", max: 3 })).max).toBe("menuWiz.mod.v.maxAboveOptions");
    expect(validateModifierGroup(group({ options: [] }))).toEqual({});
  });
});

describe("validateModifierOptionForm", () => {
  it("accepts a priced option and an unpriced No change one", () => {
    expect(validateModifierOptionForm({ name: "Medium", priceType: "add-amount", price: "8" })).toEqual({});
    expect(validateModifierOptionForm({ name: "Small", priceType: "no-change", price: "" })).toEqual({});
    expect(validateModifierOptionForm({ name: "Free", priceType: "fixed", price: "0" })).toEqual({});
  });

  it("requires name, price type and price", () => {
    expect(validateModifierOptionForm({ name: "", priceType: "", price: "" })).toEqual({
      name: "menuWiz.mod.v.optionNameRequired",
      priceType: "menuWiz.mod.v.priceTypeRequired",
      price: "menuWiz.mod.v.priceRequired",
    });
  });

  it("refuses a negative or non-numeric price", () => {
    expect(validateModifierOptionForm({ name: "A", priceType: "fixed", price: "-1" }).price).toBe("menuWiz.mod.v.priceNegative");
    expect(validateModifierOptionForm({ name: "A", priceType: "fixed", price: "x" }).price).toBe("menuWiz.mod.v.priceNumber");
  });

  it("refuses a name another option of the group has", () => {
    expect(validateModifierOptionForm({ name: "small", priceType: "no-change", price: "" }, ["Small"]).name).toBe(
      "menuWiz.mod.v.optionNameTaken"
    );
  });
});

describe("validateItemModifiers", () => {
  it("reports only the groups with something wrong, keyed by id", () => {
    const result = validateItemModifiers({
      modifierGroups: [group(), group({ id: "g2", name: "size" }), group({ id: "g3", name: "Sauce" })],
    });
    expect(Object.keys(result).sort()).toEqual(["g1", "g2"]);
    expect(result.g2?.name).toBe("menuWiz.mod.v.nameTaken");
  });
});
