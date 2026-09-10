import { describe, expect, it } from "vitest";
import {
  addItem,
  addSection,
  blankItem,
  blankMenu,
  blankSection,
  updateItem,
} from "./draft";
import { individualTotals, offerLines, offerSavings, offerTotals } from "./pricing";
import type { Offer } from "./menu";

const NOW = "2026-09-10T08:00:00.000Z";

// The frame's combo: burger 90, fries 20, drink 20, sold together for 100.
function menuWithParts() {
  let menu = blankMenu("m1", "b1", NOW);
  menu = addSection(menu, blankSection("s1", "items", "Burgers", null));
  for (const [id, name, price] of [
    ["i1", "Classic Burger", 90],
    ["i2", "French Fries", 20],
    ["i3", "Soft Drink", 20],
  ] as const) {
    menu = addItem(menu, "s1", blankItem(id, name));
    menu = updateItem(menu, "s1", id, { pricing: { price, vatRate: 0.15 } });
  }
  return menu;
}

const OFFER: Offer = {
  id: "of1",
  name: "Classic Burger Combo",
  slug: "Classic_Burger_Combo",
  image: null,
  status: "active",
  badge: "Best Value",
  showSavingBadge: true,
  entries: [
    { itemId: "i1", qty: 1, price: 90 },
    { itemId: "i2", qty: 1, price: 20 },
    { itemId: "i3", qty: 1, price: 20 },
  ],
  customerCanChange: false,
  pricing: { role: "fixed", offerPrice: 100, vatRate: 0.15, excludeFromPromotions: false },
  availability: { from: null, to: null, window: null },
  channels: {
    dineIn: true, takeaway: true, delivery: true,
    kiosk: true, onlineOrdering: false, mobileApp: false,
  },
};

describe("offerLines", () => {
  it("resolves each entry to the item it points at", () => {
    expect(offerLines(menuWithParts(), OFFER)).toEqual([
      { name: "Classic Burger", price: 90, qty: 1 },
      { name: "French Fries", price: 20, qty: 1 },
      { name: "Soft Drink", price: 20, qty: 1 },
    ]);
  });

  it("drops an entry whose item has been deleted", () => {
    const offer = { ...OFFER, entries: [...OFFER.entries, { itemId: "gone", qty: 1, price: 5 }] };
    expect(offerLines(menuWithParts(), offer)).toHaveLength(3);
  });
});

describe("individualTotals", () => {
  it("computes the frame's 130 / 19.5 / 149.5", () => {
    expect(individualTotals(menuWithParts(), OFFER)).toEqual({
      subTotal: 130,
      vat: 19.5,
      total: 149.5,
    });
  });

  it("multiplies by quantity", () => {
    const offer = { ...OFFER, entries: [{ itemId: "i2", qty: 3, price: 20 }] };
    expect(individualTotals(menuWithParts(), offer).subTotal).toBe(60);
  });
});

describe("offerTotals", () => {
  it("computes the frame's 100 / 15 / 115", () => {
    expect(offerTotals(OFFER)).toEqual({ price: 100, vat: 15, total: 115 });
  });
});

describe("offerSavings", () => {
  // Open question 6: the frame's two figures disagree. Both totals including
  // VAT is the pair that is consistent, and it keeps the frame's percentage.
  it("compares both totals including VAT", () => {
    expect(offerSavings(menuWithParts(), OFFER)).toEqual({ amount: 34.5, percent: 23 });
  });

  it("reports no saving when the offer costs more than its parts", () => {
    const offer = { ...OFFER, pricing: { ...OFFER.pricing, offerPrice: 200 } };
    expect(offerSavings(menuWithParts(), offer)).toEqual({ amount: 0, percent: 0 });
  });
});
