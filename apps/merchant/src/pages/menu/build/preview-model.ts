// Adapts the menu being built into what widgets/storefront-preview draws.
//
// The spec settles that there is no second renderer: the Public Link Builder
// and onboarding step 8 already show the customer storefront from this model,
// and a menu-specific copy would drift from the page it claims to depict. This
// file is the whole of the wizard's share — the mapping lives here, the
// drawing stays there.

import { OFFERS_SECTION_ID, type Item, type Menu, type Section } from "@/entities/menu";
import type { PreviewDevice, StorefrontPreviewModel } from "@/widgets/storefront-preview";

// The photographs the customer storefront actually ships, cycled so a menu of
// any length has a picture per tile. Sections carry no real imagery yet.
const CATEGORY_IMAGES = [
  "burger.webp",
  "breakfast.webp",
  "cake.png",
  "drinks.webp",
  "meat.webp",
  "pizza.png",
] as const;

/** Shown when the merchant has not made a visible section yet. The widget
 *  indexes into `categoryLabels` modulo its length, so an empty array would
 *  divide by zero and draw nothing at all — worse than a placeholder that
 *  plainly reads as one. */
const PLACEHOLDER_LABEL = "—";

// The widget draws exactly four block kinds — hero, menu, bestSeller, offers —
// and `sections` names which of them to draw, in order. It is NOT the
// merchant's own section list: those are the tiles inside the menu block, and
// they travel in `categoryLabels`. Passing section names here drew a preview
// with a header and a footer and nothing in between.
const HERO = "hero";
const MENU = "menu";
const BEST_SELLER = "bestSeller";
const OFFERS = "offers";

const SECTION_LABEL_KEYS: Readonly<Record<string, string>> = {
  [MENU]: "menuWiz.preview.menuHeading",
  [BEST_SELLER]: "menuWiz.preview.bestSellers",
  [OFFERS]: "menuWiz.preview.offersHeading",
};

function visibleSections(menu: Menu): Section[] {
  return menu.sections.filter(
    (section) => section.id !== OFFERS_SECTION_ID && section.visibility === "visible"
  );
}

function formatPrice(value: number): string {
  return `SAR ${value}`;
}

export function toPreviewModel(
  menu: Menu,
  device: PreviewDevice,
  composition: "landing" | "menu" = "landing",
  /** The restaurant's name. The hero is the customer's view of the business,
   *  not of this particular menu — showing the menu's name there told the
   *  merchant their storefront was called "New Menu". */
  businessName = ""
): StorefrontPreviewModel {
  const sections = visibleSections(menu);
  const labels = sections.length > 0 ? sections.map((s) => s.name) : [PLACEHOLDER_LABEL];

  // The real dishes, in the order the merchant entered them. An item with no
  // name yet is skipped rather than drawn as a blank card — it is mid-typing,
  // not a product.
  const dishes = sections
    .flatMap((section) => section.entries as Item[])
    .filter((item) => item.name.trim() !== "")
    .map((item) => ({
      name: item.name,
      description: item.description,
      price: formatPrice(item.pricing.price),
      image: item.image,
    }));

  const offers = menu.sections.find((s) => s.id === OFFERS_SECTION_ID);
  const blocks = [
    HERO,
    MENU,
    BEST_SELLER,
    ...(offers && offers.entries.length > 0 ? [OFFERS] : []),
  ];

  return {
    businessName,
    logoDataUrl: null,
    url: "",
    primary: "#0d6efd",
    secondary: "#eef4ff",
    font: "inter",
    themeTemplate: menu.theme.presetId,
    sections: blocks,
    sectionLabelKeys: SECTION_LABEL_KEYS,
    // The header nav lists the merchant's sections, which are already literal
    // strings — t() returns an unknown key unchanged, and these are the same
    // labels the mosaic draws, so they stay legible either way.
    navItems: labels.map((label) => ({ labelKey: label, visible: true })),
    showHeaderNav: menu.theme.navStyle === "top-bar",
    categories: labels,
    categoryLabels: labels,
    categoryImages: CATEGORY_IMAGES.slice(0, Math.max(1, labels.length)),
    cityLabel: "",
    hoursSummary: "",
    products: dishes,
    samplePrices: dishes.length > 0 ? dishes.map((d) => d.price) : [formatPrice(0)],
    // No struck-through "was" price: this menu has no discount, and printing
    // the same number twice with a line through one of them is a lie about a
    // saving that does not exist.
    sampleWasPrices: [],
    hero: {},
    composition,
    device,
  };
}
