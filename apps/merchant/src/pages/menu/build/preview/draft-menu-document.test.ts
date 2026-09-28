import { describe, expect, it } from "vitest";
import type { Item, Menu, Offer, Section } from "@/entities/menu";
import { draftMenuDocument } from "./draft-menu-document";

function item(id: string, patch: Partial<Item> = {}): Item {
  return {
    id, name: id.toUpperCase(), shortName: "", description: "", sku: "", image: null, video: null, tags: [], status: "active",
    availability: { available: true, delivery: true, takeaway: true, dineIn: true }, schedule: { mode: "all-day" }, modifierGroups: [],
    pricing: { price: 10, vatRate: 15 }, nutrition: { calories: null, protein: null, carb: null, fat: null }, allergies: { allergens: [], note: "" },
    ...patch,
  };
}
function section(id: string, entries: (Item | Offer)[], patch: Partial<Section> = {}): Section {
  return { id, kind: "items", name: id, image: null, description: "", visibility: "visible", displayStyle: "grid", color: null, entries, ...patch };
}
const offer: Offer = {
  id: "of1", name: "Combo", slug: "combo", image: "data:image/png;base64,AA", status: "active", badge: "New", showSavingBadge: true,
  entries: [{ itemId: "a", qty: 2, price: 10 }], customerCanChange: false,
  pricing: { role: "fixed", offerPrice: 15, discount: null, vatRate: 15, excludeFromPromotions: false },
  availability: { from: null, to: null, window: null },
  channels: { dineIn: true, takeaway: true, delivery: true, kiosk: true, onlineOrdering: true, mobileApp: true },
};

function menu(sections: Section[], theme: Partial<Menu["theme"]> = {}): Menu {
  return {
    id: "m", name: "Lunch", cover: null, status: "pending", branchId: "b", sections,
    theme: { presetId: "ocean", navStyle: "pill-scroll", categoryStyle: "image-text", cardStyle: "image-left", itemDetails: "overlay", stickyAddToCart: true, showItemTags: true, ...theme },
    schedule: { type: "all-day", start: "", end: "", days: [], timezone: "", branchIds: [], fallbackMenuId: null, allowPreorderOutsideSchedule: false },
    channels: { pos: "off", publicLink: "off", tableQr: "off" } as Menu["channels"],
    updatedAt: "", publishedAt: null, version: 1,
  };
}

describe("draftMenuDocument", () => {
  const a = item("a", { image: "https://cdn/a.jpg", tags: ["chef-recommended"], modifierGroups: [
    { id: "g", name: "internal", type: "single", customerLabel: "Size", helpText: "", min: 1, max: 1, required: true, showAsRadio: true,
      options: [{ id: "o", name: "Large", subLabel: "", priceType: "add-amount", price: 3, isDefault: true, available: false }] },
  ] });
  const draft = menu([
    section("mains", [a, item("b", { name: "  " }), item("c", { status: "unavailable" })]),
    section("hidden", [item("d")], { visibility: "hidden" }),
    section("archived", [item("e")], { visibility: "archived" }),
    section("offers", [offer], { kind: "offers", displayStyle: "carousel" }),
  ]);
  const { document, sectionIds } = draftMenuDocument(draft, { currency: "SAR", language: "ar", tagLabel: (t) => `#${t}` });

  it("keeps only visible sections, in order, including the offers section", () => {
    expect(document.sections.map((s) => [s.name, s.displayStyle])).toEqual([["mains", "Grid"], ["offers", "Carousel"]]);
    expect(sectionIds).toEqual(["mains", "offers"]);
  });

  it("skips half-typed items and refs entries in order of first appearance", () => {
    expect(document.sections[0].entries).toEqual([{ ref: "i1", kind: "Item" }, { ref: "i2", kind: "Item" }]);
    expect(document.items.i1).toMatchObject({ name: "A", price: { amount: 10, currency: "SAR" }, tags: ["#chef-recommended"], isAvailable: true, image: { url: "https://cdn/a.jpg" }, modifierGroupRefs: ["m1"] });
    expect(document.items.i2.isAvailable).toBe(false);
  });

  it("carries modifier groups the way the public read does", () => {
    expect(document.modifierGroups.m1).toEqual({
      promptLabel: "Size", helpText: null, selectionMode: "Single", minSelected: 1, maxSelected: 1,
      options: [{ name: "Large", effect: { kind: "AddAmount", amount: { amount: 3, currency: "SAR" } }, isDefault: true, isAvailable: false }],
    });
  });

  it("prices offers from their components", () => {
    expect(document.sections[1].entries).toEqual([{ ref: "o1", kind: "Offer" }]);
    expect(document.offers.o1).toMatchObject({
      name: "Combo", badge: "New", showSavingBadge: true, components: [{ itemRef: "i1", quantity: 2 }], isAvailable: true,
      price: { referenceTotal: { amount: 20 }, price: { amount: 15 }, saving: { amount: 5 }, savingPercent: 25 },
      image: { url: "data:image/png;base64,AA" },
    });
  });

  it("maps the theme to the backend's vocabulary and carries the menu's brand", () => {
    expect(document.menu.theme).toMatchObject({ navigationStyle: "PillScroll", sectionNavStyle: "ImageAndText", cardStyle: "ImageLeft", itemDetailsBehavior: "Overlay", stickyPrimaryAction: true, showItemTags: true });
    const branded = draftMenuDocument(menu([], { brand: { colors: { primary: "#111111", light: "#eeeeee", accent: "#ff0000", dark: "#000000" }, logoUrl: "blob:x", heroUrl: "https://cdn/h.jpg", heroText: "Hi", heroSubtext: "" } } as Partial<Menu["theme"]>), { currency: null, language: "en" });
    expect(branded.document.menu.theme).toMatchObject({ primaryColor: "#111111", lightColor: "#eeeeee", logo: null, hero: { url: "https://cdn/h.jpg" }, heroText: "Hi", heroSubtext: null });
    expect(branded.document.currency).toBeNull();
  });

  it("gives the currency its precision", () => {
    expect(document.currency).toEqual({ code: "SAR", minorUnits: 2 });
    expect(draftMenuDocument(draft, { currency: "KWD", language: "ar" }).document.currency).toEqual({ code: "KWD", minorUnits: 3 });
  });
});
