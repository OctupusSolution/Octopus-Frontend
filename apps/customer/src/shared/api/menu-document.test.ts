import { describe, expect, it } from "vitest";
import { menuFromDocument } from "./menu-document";

const item = { name: "Burger", description: null, image: null, price: { amount: 25 }, isAvailable: true, modifierGroupRefs: ["g1"] };
const section = { name: "Mains", description: null, image: null, entries: [{ ref: "i1", kind: "Item" }] };
const options = [{ name: "Small" }, { name: "Large" }];

describe("menuFromDocument", () => {
  it("reads the public read's promptLabel and minSelected for a modifier group", () => {
    const menu = menuFromDocument({
      sections: [section],
      items: { i1: item },
      modifierGroups: { g1: { promptLabel: "Size", minSelected: 1, selectionMode: "Single", options } },
    });
    expect(menu.items[0].modifierGroups[0]).toMatchObject({ label: "Size", required: true });
  });

  it("still reads the canvas's name and isRequired", () => {
    const menu = menuFromDocument({
      sections: [section],
      items: { i1: item },
      modifierGroups: { g1: { name: "Sauce", isRequired: false, minSelected: 1, selectionMode: "Multiple", options } },
    });
    expect(menu.items[0].modifierGroups[0]).toMatchObject({ label: "Sauce", required: false });
  });
});
