import { describe, expect, it } from "vitest";
import {
  OFFERS_SECTION_ID,
  addItem,
  addOffer,
  blankOffer,
  removeOffer,
  removeOfferEntry,
  setOfferEntry,
  updateOffer,
  addItemToSections,
  addModifierGroup,
  addModifierOption,
  addSection,
  blankItem,
  blankMenu,
  blankSection,
  duplicateItem,
  modifierTotal,
  moveSection,
  removeItem,
  removeModifierOption,
  removeSection,
  updateItem,
  duplicateOffer,
  moveModifierGroup,
  moveModifierOption,
  updateModifierOption,
  updateModifierGroup,
  updateSection,
  archiveSection,
  restoreSection,
  toggleSectionVisibility,
  neighbourSectionId,
} from "./draft";
import type { Item, ModifierGroup, Offer } from "./menu";

const NOW = "2026-09-10T08:00:00.000Z";

function base() {
  return blankMenu("m1", "jeddah-corniche", NOW);
}

function withBreakfast() {
  return addSection(base(), blankSection("s1", "items", "Breakfast", null));
}

describe("blankMenu", () => {
  it("starts with only the built-in offers section", () => {
    const menu = base();
    expect(menu.sections.map((s) => s.id)).toEqual([OFFERS_SECTION_ID]);
    expect(menu.sections[0].kind).toBe("offers");
  });

  it("starts as a draft nobody has published", () => {
    const menu = base();
    expect(menu.status).toBe("pending");
    expect(menu.publishedAt).toBeNull();
    expect(menu.updatedAt).toBe(NOW);
  });
});

describe("sections", () => {
  it("appends a new section before the offers section", () => {
    const menu = withBreakfast();
    expect(menu.sections.map((s) => s.id)).toEqual(["s1", OFFERS_SECTION_ID]);
  });

  it("patches only the named section", () => {
    const menu = updateSection(withBreakfast(), "s1", { visibility: "hidden" });
    expect(menu.sections[0].visibility).toBe("hidden");
    expect(menu.sections[0].name).toBe("Breakfast");
  });

  it("removes a section and its entries with it", () => {
    let menu = withBreakfast();
    menu = addItem(menu, "s1", blankItem("i1", "Omelette"));
    menu = removeSection(menu, "s1");
    expect(menu.sections.map((s) => s.id)).toEqual([OFFERS_SECTION_ID]);
  });

  it("refuses to remove the built-in offers section", () => {
    const menu = removeSection(base(), OFFERS_SECTION_ID);
    expect(menu.sections.map((s) => s.id)).toEqual([OFFERS_SECTION_ID]);
  });

  it("reorders sections", () => {
    let menu = withBreakfast();
    menu = addSection(menu, blankSection("s2", "items", "Mains", null));
    menu = moveSection(menu, 1, 0);
    expect(menu.sections.map((s) => s.id)).toEqual(["s2", "s1", OFFERS_SECTION_ID]);
  });

  it("leaves the order alone when an index is out of range", () => {
    const menu = moveSection(withBreakfast(), 5, 0);
    expect(menu.sections.map((s) => s.id)).toEqual(["s1", OFFERS_SECTION_ID]);
  });

  it("toggles visible and hidden, but never touches an archived section", () => {
    let menu = toggleSectionVisibility(withBreakfast(), "s1");
    expect(menu.sections[0].visibility).toBe("hidden");
    menu = toggleSectionVisibility(menu, "s1");
    expect(menu.sections[0].visibility).toBe("visible");
    menu = toggleSectionVisibility(archiveSection(menu, "s1"), "s1");
    expect(menu.sections[0].visibility).toBe("archived");
  });

  it("restores an archived section to visible and ignores others", () => {
    const hidden = updateSection(withBreakfast(), "s1", { visibility: "hidden" });
    expect(restoreSection(hidden, "s1").sections[0].visibility).toBe("hidden");
    const archived = archiveSection(hidden, "s1");
    expect(restoreSection(archived, "s1").sections[0].visibility).toBe("visible");
  });

  it("picks the next section after a removal, else the previous, else null", () => {
    let menu = withBreakfast();
    menu = addSection(menu, blankSection("s2", "items", "Mains", null));
    expect(neighbourSectionId(menu, "s1")).toBe("s2");
    expect(neighbourSectionId(menu, OFFERS_SECTION_ID)).toBe("s2");
    expect(neighbourSectionId(base(), OFFERS_SECTION_ID)).toBeNull();
    expect(neighbourSectionId(menu, "missing")).toBeNull();
  });
});

describe("items", () => {
  it("adds an item to the named section", () => {
    const menu = addItem(withBreakfast(), "s1", blankItem("i1", "Omelette"));
    expect(menu.sections[0].entries.map((e) => e.id)).toEqual(["i1"]);
  });

  it("patches only the named item", () => {
    let menu = addItem(withBreakfast(), "s1", blankItem("i1", "Omelette"));
    menu = addItem(menu, "s1", blankItem("i2", "Shakshuka"));
    menu = updateItem(menu, "s1", "i2", { sku: "BR-002" });
    expect((menu.sections[0].entries[1] as Item).sku).toBe("BR-002");
    expect((menu.sections[0].entries[0] as Item).sku).toBe("");
  });

  it("removes an item", () => {
    let menu = addItem(withBreakfast(), "s1", blankItem("i1", "Omelette"));
    menu = removeItem(menu, "s1", "i1");
    expect(menu.sections[0].entries).toEqual([]);
  });

  it("duplicates an item under a new id, right after the original", () => {
    let menu = addItem(withBreakfast(), "s1", blankItem("i1", "Omelette"));
    menu = addItem(menu, "s1", blankItem("i2", "Shakshuka"));
    menu = duplicateItem(menu, "s1", "i1", "i1-copy");
    expect(menu.sections[0].entries.map((e) => e.id)).toEqual(["i1", "i1-copy", "i2"]);
    expect(menu.sections[0].entries[1].name).toBe("Omelette");
  });

  it("copies an item into several other sections at once", () => {
    let menu = withBreakfast();
    menu = addSection(menu, blankSection("s2", "items", "Mains", null));
    menu = addSection(menu, blankSection("s3", "items", "Kids", null));
    menu = addItem(menu, "s1", blankItem("i1", "Omelette"));
    menu = addItemToSections(menu, "i1", "s1", ["s2", "s3"], (i) => `i1-copy-${i}`);
    expect(menu.sections[1].entries.map((e) => e.id)).toEqual(["i1-copy-0"]);
    expect(menu.sections[2].entries.map((e) => e.id)).toEqual(["i1-copy-1"]);
    expect(menu.sections[0].entries.map((e) => e.id)).toEqual(["i1"]);
  });
});

describe("modifiers", () => {
  const size: ModifierGroup = {
    id: "g1",
    name: "Size",
    type: "single",
    customerLabel: "Choose your size",
    helpText: "Select your preferred size",
    min: 1,
    max: 1,
    required: true,
    showAsRadio: true,
    options: [],
  };

  function withGroup() {
    let menu = addItem(withBreakfast(), "s1", blankItem("i1", "Burger"));
    menu = updateItem(menu, "s1", "i1", { pricing: { price: 100, vatRate: 0.15 } });
    return addModifierGroup(menu, "s1", "i1", size);
  }

  function firstItem(menu: ReturnType<typeof withGroup>): Item {
    return menu.sections[0].entries[0] as Item;
  }

  it("adds a group to the item", () => {
    expect(firstItem(withGroup()).modifierGroups.map((g) => g.id)).toEqual(["g1"]);
  });

  it("patches a group", () => {
    const menu = updateModifierGroup(withGroup(), "s1", "i1", "g1", { required: false });
    expect(firstItem(menu).modifierGroups[0].required).toBe(false);
    expect(firstItem(menu).modifierGroups[0].name).toBe("Size");
  });

  it("adds and removes options", () => {
    let menu = addModifierOption(withGroup(), "s1", "i1", "g1", {
      id: "o1", name: "Medium", subLabel: "160g beef",
      priceType: "add-amount", price: 8, isDefault: true, available: true,
    });
    expect(firstItem(menu).modifierGroups[0].options.map((o) => o.id)).toEqual(["o1"]);
    menu = removeModifierOption(menu, "s1", "i1", "g1", "o1");
    expect(firstItem(menu).modifierGroups[0].options).toEqual([]);
  });

  it("totals the base price plus every defaulted surcharge", () => {
    let menu = addModifierOption(withGroup(), "s1", "i1", "g1", {
      id: "o1", name: "120g beef", subLabel: "",
      priceType: "no-change", price: 0, isDefault: false, available: true,
    });
    menu = addModifierOption(menu, "s1", "i1", "g1", {
      id: "o2", name: "Medium", subLabel: "160g beef",
      priceType: "add-amount", price: 8, isDefault: true, available: true,
    });
    menu = addModifierGroup(menu, "s1", "i1", {
      ...size, id: "g2", name: "Cheese", type: "multi", required: false,
      options: [
        { id: "o3", name: "American", subLabel: "", priceType: "add-amount", price: 2, isDefault: true, available: true },
        { id: "o4", name: "Cheddar", subLabel: "", priceType: "add-amount", price: 3, isDefault: true, available: true },
        { id: "o5", name: "Blue", subLabel: "", priceType: "add-amount", price: 3, isDefault: false, available: false },
      ],
    });
    // The frame's SAR 113: base 100 + Medium 8 + American 2 + Cheddar 3.
    expect(modifierTotal(firstItem(menu))).toBe(113);
  });

  it("applies a chosen fixed price as the base before any surcharge, whatever the group order", () => {
    const surcharge: ModifierGroup = {
      ...size, id: "gA", type: "multi",
      options: [{ id: "a1", name: "Bacon", subLabel: "", priceType: "add-amount", price: 5, isDefault: true, available: true }],
    };
    const fixed: ModifierGroup = {
      ...size, id: "gF",
      options: [{ id: "f1", name: "Family", subLabel: "", priceType: "fixed", price: 150, isDefault: true, available: true }],
    };
    let menu = updateItem(withGroup(), "s1", "i1", { modifierGroups: [surcharge, fixed] });
    expect(modifierTotal(firstItem(menu))).toBe(155);
    menu = updateItem(menu, "s1", "i1", { modifierGroups: [fixed, surcharge] });
    expect(modifierTotal(firstItem(menu))).toBe(155);
  });

  function withThreeOptions() {
    let menu = withGroup();
    for (const id of ["o1", "o2", "o3"]) {
      menu = addModifierOption(menu, "s1", "i1", "g1", {
        id, name: id, subLabel: "", priceType: "no-change", price: 0,
        isDefault: id === "o1", available: true,
      });
    }
    return menu;
  }

  it("keeps a single-choice group to one default when a defaulted option is added", () => {
    const menu = addModifierOption(withThreeOptions(), "s1", "i1", "g1", {
      id: "o4", name: "o4", subLabel: "", priceType: "no-change", price: 0,
      isDefault: true, available: true,
    });
    expect(firstItem(menu).modifierGroups[0].options.filter((o) => o.isDefault).map((o) => o.id))
      .toEqual(["o4"]);
  });

  it("moves the default when another single-choice option is made default", () => {
    const menu = updateModifierOption(withThreeOptions(), "s1", "i1", "g1", "o3", { isDefault: true });
    expect(firstItem(menu).modifierGroups[0].options.map((o) => o.isDefault)).toEqual([false, false, true]);
  });

  it("lets a default be unticked, leaving none", () => {
    const menu = updateModifierOption(withThreeOptions(), "s1", "i1", "g1", "o1", { isDefault: false });
    expect(firstItem(menu).modifierGroups[0].options.some((o) => o.isDefault)).toBe(false);
  });

  it("allows several defaults in a multi-choice group", () => {
    let menu = updateModifierGroup(withThreeOptions(), "s1", "i1", "g1", { type: "multi" });
    menu = updateModifierOption(menu, "s1", "i1", "g1", "o2", { isDefault: true });
    expect(firstItem(menu).modifierGroups[0].options.map((o) => o.isDefault)).toEqual([true, true, false]);
  });

  it("reorders options, and ignores an out-of-range move", () => {
    let menu = moveModifierOption(withThreeOptions(), "s1", "i1", "g1", 2, 0);
    expect(firstItem(menu).modifierGroups[0].options.map((o) => o.id)).toEqual(["o3", "o1", "o2"]);
    menu = moveModifierOption(menu, "s1", "i1", "g1", 0, 9);
    expect(firstItem(menu).modifierGroups[0].options.map((o) => o.id)).toEqual(["o3", "o1", "o2"]);
  });

  it("reorders groups", () => {
    let menu = addModifierGroup(withGroup(), "s1", "i1", { ...size, id: "g2", name: "Cheese" });
    menu = moveModifierGroup(menu, "s1", "i1", 1, 0);
    expect(firstItem(menu).modifierGroups.map((g) => g.id)).toEqual(["g2", "g1"]);
  });

  it("ignores an unavailable option even when it is defaulted", () => {
    const menu = addModifierOption(withGroup(), "s1", "i1", "g1", {
      id: "o1", name: "Large", subLabel: "",
      priceType: "add-amount", price: 14, isDefault: true, available: false,
    });
    expect(modifierTotal(firstItem(menu))).toBe(100);
  });
});

describe("offers", () => {
  function withOffer() {
    const menu = base();
    return addOffer(menu, blankOffer("of1", "Classic Burger Combo"));
  }

  function offers(menu: ReturnType<typeof withOffer>): Offer[] {
    return menu.sections.find((s) => s.id === OFFERS_SECTION_ID)!.entries as Offer[];
  }

  it("adds an offer to the built-in offers section", () => {
    expect(offers(withOffer()).map((o) => o.id)).toEqual(["of1"]);
  });

  it("slugs the name so the offer has a stable public address", () => {
    expect(blankOffer("of1", "Classic Burger Combo").slug).toBe("Classic_Burger_Combo");
  });

  it("patches only the named offer", () => {
    let menu = withOffer();
    menu = addOffer(menu, blankOffer("of2", "Family Box"));
    menu = updateOffer(menu, "of2", { badge: "Best Value" });
    expect(offers(menu)[1].badge).toBe("Best Value");
    expect(offers(menu)[0].badge).toBeNull();
  });

  it("removes an offer", () => {
    expect(offers(removeOffer(withOffer(), "of1"))).toEqual([]);
  });

  it("starts with no discount", () => {
    expect(blankOffer("of1", "Combo").pricing.discount).toBeNull();
  });

  it("duplicates an offer right after the original, named and slugged as a copy", () => {
    let menu = addOffer(withOffer(), blankOffer("of2", "Family Box"));
    menu = duplicateOffer(menu, "of1", "of1-copy");
    expect(offers(menu).map((o) => o.id)).toEqual(["of1", "of1-copy", "of2"]);
    expect(offers(menu)[1].name).toBe("Classic Burger Combo (Copy)");
    expect(offers(menu)[1].slug).toBe("Classic_Burger_Combo_(Copy)");
  });

  it("adds an entry, then changes its quantity in place", () => {
    let menu = setOfferEntry(withOffer(), "of1", "i1", 1, 90);
    expect(offers(menu)[0].entries).toEqual([{ itemId: "i1", qty: 1, price: 90 }]);
    menu = setOfferEntry(menu, "of1", "i1", 3, 90);
    expect(offers(menu)[0].entries).toEqual([{ itemId: "i1", qty: 3, price: 90 }]);
  });

  it("drops an entry when its quantity reaches zero", () => {
    let menu = setOfferEntry(withOffer(), "of1", "i1", 1, 90);
    menu = setOfferEntry(menu, "of1", "i1", 0, 90);
    expect(offers(menu)[0].entries).toEqual([]);
  });

  it("removes an entry outright", () => {
    let menu = setOfferEntry(withOffer(), "of1", "i1", 2, 90);
    menu = removeOfferEntry(menu, "of1", "i1");
    expect(offers(menu)[0].entries).toEqual([]);
  });
});
