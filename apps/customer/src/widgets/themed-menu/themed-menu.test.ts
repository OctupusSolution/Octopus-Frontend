import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { PublicMenuDocument } from "@octopus/api-client";
import { StoreI18nProvider } from "@/app/providers";
import { OrderingSessionProvider } from "@/entities/order";
import { ThemedMenu } from "./themed-menu";

const money = (amount: number) => ({ amount, currency: "SAR" });
function doc(themePatch: Partial<PublicMenuDocument["menu"]["theme"]> = {}, patch: Partial<PublicMenuDocument> = {}): PublicMenuDocument {
  return {
    availability: "Available", nextAvailableAtUtc: null, servedAsFallback: false, locationLabel: null, language: "en", availableLanguages: ["en"],
    menu: {
      name: "Lunch",
      theme: {
        presetCode: null, logo: null, hero: null, heroText: null, heroSubtext: null, titleFontCode: null, bodyFontCode: null,
        primaryColor: "#aa0000", lightColor: null, accentColor: null, darkColor: null,
        navigationStyle: "TopBar", sectionNavStyle: "TextOnly", cardStyle: "Classic", itemDetailsBehavior: "Overlay", stickyPrimaryAction: true, showItemTags: true,
        ...themePatch,
      },
    },
    sections: [
      { name: "Mains", description: null, image: null, displayStyle: "Grid", color: "#00aa00", entries: [{ ref: "i1", kind: "Item" }, { ref: "i2", kind: "Item" }] },
      { name: "Deals", description: null, image: null, displayStyle: "Carousel", color: null, entries: [{ ref: "o1", kind: "Offer" }] },
    ],
    items: {
      i1: { name: "Burger", description: "Beef", image: { assetId: "a", kind: "Image", url: "https://cdn/b.jpg" }, video: null, tags: ["Spicy"], price: money(25), facts: [], advisories: { labels: [], additionalInfo: null }, isAvailable: true, modifierGroupRefs: [] },
      i2: { name: "Soup", description: null, image: null, video: null, tags: [], price: money(9), facts: [], advisories: { labels: [], additionalInfo: null }, isAvailable: false, modifierGroupRefs: [] },
    },
    modifierGroups: {},
    offers: {
      o1: {
        name: "Combo", image: null, badge: null, showSavingBadge: true, components: [{ itemRef: "i1", quantity: 1 }],
        pricingRule: { kind: "Fixed", fixedPrice: money(20), discountPercent: null, discountAmount: null, dynamicBasePrice: null },
        price: { referenceTotal: money(25), price: money(20), saving: money(5), savingPercent: 20 }, isAvailable: true,
      },
    },
    currency: { code: "SAR", minorUnits: 2 },
    tax: { configured: false, pricesIncludeTax: null },
    ...patch,
  };
}

function render(document: PublicMenuDocument, mode: "order" | "view", selectable = false) {
  return renderToStaticMarkup(
    createElement(StoreI18nProvider, {
      locale: "en",
      children: createElement(OrderingSessionProvider, { persist: false, children: createElement(ThemedMenu, { document, mode, selectable }) }),
    })
  );
}

describe("ThemedMenu", () => {
  it("draws sections, items, offers, tags and prices with the menu's colours", () => {
    const html = render(doc(), "order");
    for (const text of ["Mains", "Deals", "Burger", "Soup", "Combo", "Spicy", "25.00", "20.00", "https://cdn/b.jpg", "#aa0000", "#00aa00"]) expect(html).toContain(text);
    expect(html).toContain('data-section-ref="s0"');
    expect(html).toContain("Unavailable");
  });

  it("renders every navigation, category, card and display style without failing", () => {
    for (const navigationStyle of ["TopBar", "SideDrawer", "BottomBar", "PillScroll", "Unknown"])
      for (const sectionNavStyle of ["IconAndText", "TextOnly", "IconOnly", "ImageAndText"])
        for (const cardStyle of ["Classic", "CleanMinimal", "ImageTop", "ImageLeft"]) {
          const html = render(doc({ navigationStyle, sectionNavStyle, cardStyle }), "order");
          expect(html).toContain("Burger");
        }
  });

  it("never shows ordering controls in view mode", () => {
    const order = render(doc(), "order");
    const view = render(doc(), "view");
    expect(order).toContain('data-menu-add="i1"');
    expect(order).toContain("data-sticky-cart");
    expect(view).not.toContain("data-menu-add");
    expect(view).not.toContain("data-sticky-cart");
  });

  it("hides tags when the theme says so and marks sections selectable only when asked", () => {
    expect(render(doc({ showItemTags: false }), "order")).not.toContain("Spicy");
    expect(render(doc(), "view", true)).toContain("data-selectable");
    expect(render(doc(), "view", false)).not.toContain("data-selectable");
  });

  it("explains a menu that is not served now, and an empty menu", () => {
    expect(render(doc({}, { availability: "NotAvailableNow" }), "view")).toContain("not being served right now");
    expect(render(doc({}, { sections: [] }), "view")).toContain("no items yet");
  });
});
