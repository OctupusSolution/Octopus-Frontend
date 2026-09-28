import { describe, expect, it } from "vitest";
import type { MenuPreviewResponse } from "@octopus/api-client";
import { builderMenuDocument, menuFromDocument, menuMediaIds } from "./preview-menu";

const draft = {
  sections: [
    { name: "Main", description: null, image: { assetId: "a", kind: "Image" }, displayStyle: "grid", color: null, entries: [{ ref: "i1", kind: "Item" }, { ref: "o1", kind: "Offer" }] },
  ],
  items: {
    i1: {
      name: "Burger",
      description: null,
      image: { assetId: "b", kind: "Image" },
      video: null,
      tags: ["spicy"],
      price: { amount: 25, currency: "SAR" },
      facts: [],
      advisories: { labels: [], additionalInfo: null },
      isAvailable: true,
      modifierGroupRefs: ["g1"],
    },
  },
  modifierGroups: {
    g1: {
      promptLabel: "Size",
      helpText: null,
      selectionMode: "Single",
      minSelected: 1,
      maxSelected: 1,
      options: [{ name: "Large", effect: { kind: "Add", amount: { amount: 5, currency: "SAR" } }, isDefault: true, isAvailable: true }],
    },
  },
} as unknown as MenuPreviewResponse;

describe("preview menu documents", () => {
  it("lists every image the menu needs resolved", () => {
    expect(menuMediaIds(draft).sort()).toEqual(["a", "b"]);
  });

  it("turns the draft menu read into the public menu document, images as URLs", () => {
    const doc = builderMenuDocument(draft, (id) => (id === "a" ? "https://cdn/a.jpg" : null));
    expect(doc.sections[0]).toEqual({ name: "Main", description: null, image: "https://cdn/a.jpg", entries: draft.sections[0].entries });
    expect(doc.items.i1).toEqual({ name: "Burger", description: null, image: null, price: { amount: 25 }, isAvailable: true, modifierGroupRefs: ["g1"], tags: ["spicy"] });
    expect(doc.modifierGroups.g1).toEqual({ name: "Size", selectionMode: "Single", isRequired: true, options: [{ name: "Large", effect: { amount: { amount: 5 } }, isDefault: true }] });
  });

  it("reads the document the way the storefront does", () => {
    const menu = menuFromDocument(builderMenuDocument(draft, (id) => (id === "a" ? "https://cdn/a.jpg" : null)), "/all.png");
    expect(menu.categories).toEqual([{ id: "cat-1", slug: "main", name: "Main", imageUrl: "https://cdn/a.jpg" }]);
    expect(menu.items).toEqual([{ id: "cat-1-i1", categoryId: "cat-1", name: "Burger", description: "", price: 25, imageUrl: "/all.png" }]);
  });
});
