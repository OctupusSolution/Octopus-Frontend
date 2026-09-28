import { describe, expect, it } from "vitest";
import type { PublicMenuDocument } from "@octopus/api-client";
import { menuView } from "./menu-model";

const money = (amount: number) => ({ amount, currency: "SAR" });
const doc: PublicMenuDocument = {
  availability: "PreOrder", nextAvailableAtUtc: "2026-09-29T08:00:00Z", servedAsFallback: false, locationLabel: null,
  language: "ar", availableLanguages: ["ar"],
  menu: {
    name: "Lunch",
    theme: {
      presetCode: null, logo: { assetId: "l", kind: "Image", url: "https://cdn/l.png" }, hero: null, heroText: "Hi", heroSubtext: null,
      titleFontCode: null, bodyFontCode: null, primaryColor: null, lightColor: null, accentColor: null, darkColor: null,
      navigationStyle: "TopBar", sectionNavStyle: "IconAndText", cardStyle: "Classic", itemDetailsBehavior: "SamePage", stickyPrimaryAction: false, showItemTags: true,
    },
  },
  sections: [
    { name: "Mains", description: "Hot", image: null, displayStyle: "Grid", color: "#123456", entries: [{ ref: "i1", kind: "Item" }, { ref: "i9", kind: "Item" }, { ref: "o1", kind: "Offer" }] },
    { name: "Empty", description: null, image: null, displayStyle: "List", color: null, entries: [] },
  ],
  items: {
    i1: { name: "Burger", description: null, image: null, video: null, tags: ["Spicy"], price: money(25), facts: [], advisories: { labels: [], additionalInfo: null }, isAvailable: false, modifierGroupRefs: [] },
  },
  modifierGroups: {},
  offers: {
    o1: {
      name: "Combo", image: null, badge: "New", showSavingBadge: true, components: [{ itemRef: "i1", quantity: 2 }],
      pricingRule: { kind: "Fixed", fixedPrice: money(40), discountPercent: null, discountAmount: null, dynamicBasePrice: null },
      price: { referenceTotal: money(50), price: money(40), saving: money(10), savingPercent: 20 }, isAvailable: true,
    },
  },
  currency: { code: "SAR", minorUnits: 2 },
  tax: { configured: false, pricesIncludeTax: null },
};

describe("menuView", () => {
  const view = menuView(doc, (code) => code);

  it("keeps the document's sections in order with s{index} refs, skipping unknown entries", () => {
    expect(view.sections.map((s) => [s.ref, s.name, s.displayStyle, s.entries.length])).toEqual([
      ["s0", "Mains", "grid", 2],
      ["s1", "Empty", "list", 0],
    ]);
  });

  it("carries items and offers ready to draw", () => {
    expect(view.sections[0].entries[0]).toEqual({ kind: "item", ref: "i1", name: "Burger", description: "", imageUrl: null, price: "25.00 SAR", available: false, tags: ["Spicy"] });
    expect(view.sections[0].entries[1]).toEqual({ kind: "offer", ref: "o1", name: "Combo", imageUrl: null, price: "40.00 SAR", was: "50.00 SAR", badge: "New", saving: "20%", available: true });
  });

  it("carries brand and availability", () => {
    expect(view).toMatchObject({ name: "Lunch", logoUrl: "https://cdn/l.png", heroText: "Hi", heroUrl: null, availability: "PreOrder", nextAvailableAtUtc: "2026-09-29T08:00:00Z" });
  });
});
