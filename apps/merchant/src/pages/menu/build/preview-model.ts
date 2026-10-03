// Adapts the menu being built into what widgets/storefront-preview draws.
//
// The spec settles that there is no second renderer: the Public Link Builder
// and onboarding step 8 already show the customer storefront from this model,
// and a menu-specific copy would drift from the page it claims to depict. This
// file is the whole of the wizard's share — the mapping lives here, the
// drawing stays there.
//
// Brand (logo, colours, typefaces, hero) is not the menu's: it lives on the
// site draft the Public Link Builder shares, so a host passes that in. Without
// one the preview falls back to the menu preset's palette.

import { OFFERS_SECTION_ID, type Item, type ItemTag, type Menu, type Offer, type Section } from "@/entities/menu";
import type { SiteDraft } from "@/entities/site-draft";
import { storefrontAsset } from "@/shared/lib/storefront-assets";
import type { PreviewDevice, StorefrontPreviewModel } from "@/widgets/storefront-preview";
import { presetFor } from "./theme/presets";

// The photographs the customer storefront actually ships, cycled so a section
// without its own image still has a picture on its tile.
const CATEGORY_IMAGES = [
  "burger.webp",
  "breakfast.webp",
  "cake.png",
  "drinks.webp",
  "meat.webp",
  "pizza.png",
] as const;

/** The i18n-key fallback list must never be empty (the widget indexes it
 *  modulo its length). Literal labels may be — the widget draws neutral
 *  placeholder tiles for those instead of repeating one name six times. */
const PLACEHOLDER_LABEL = "—";

// A preview, not the whole menu: a seeded menu has 120 items, and drawing
// every one made the rail a long scroll past the part being designed.
const GROUP_CAP = 6;
const CARDS_PER_GROUP = 4;

// The widget draws exactly four block kinds — hero, menu, bestSeller, offers —
// and `sections` names which of them to draw, in order. It is NOT the
// merchant's own section list: those are the tiles inside the menu block, and
// they travel in `categoryLabels`.
const HERO = "hero";
const MENU = "menu";
const BEST_SELLER = "bestSeller";
const OFFERS = "offers";

const SECTION_LABEL_KEYS: Readonly<Record<string, string>> = {
  [MENU]: "menuWiz.preview.menuHeading",
  [BEST_SELLER]: "menuWiz.preview.bestSellers",
  [OFFERS]: "menuWiz.preview.offersHeading",
};

export interface PreviewOptions {
  /** The shared brand. Omit and the menu preset's palette is used. */
  site?: SiteDraft | null;
  /** Picks the English or Arabic typography pair off the site draft. */
  locale?: string;
  /** Translates an item tag for its badge; omit and no tags are drawn. */
  tagLabel?: (tag: ItemTag) => string;
}

function visibleSections(menu: Menu): Section[] {
  return menu.sections.filter(
    (section) => section.id !== OFFERS_SECTION_ID && section.visibility === "visible"
  );
}

function formatPrice(value: number): string {
  return `SAR ${value}`;
}

/** An uploaded image is a data URL (or a real URL) and is used verbatim; a
 *  bare filename is one of the storefront's own photographs. Prefixing a data
 *  URL with the asset path is what broke section images before. */
export function resolveImage(src: string | null | undefined): string | null {
  if (!src) return null;
  if (/^(data:|blob:|https?:|\/)/i.test(src)) return src;
  return storefrontAsset(src);
}

export function toPreviewModel(
  menu: Menu,
  device: PreviewDevice,
  composition: "landing" | "menu" = "landing",
  /** The restaurant's name. The hero is the customer's view of the business,
   *  not of this particular menu — showing the menu's name there told the
   *  merchant their storefront was called "New Menu". */
  businessName = "",
  options: PreviewOptions = {}
): StorefrontPreviewModel {
  const { site, tagLabel } = options;
  const locale = options.locale === "ar" ? "ar" : "en";
  const preset = presetFor(menu.theme.presetId);
  const sections = visibleSections(menu);
  const labels = sections.map((s) => s.name);

  // The real dishes, in the order the merchant entered them, grouped by the
  // section they belong to. An item with no name yet is skipped rather than
  // drawn as a blank card — it is mid-typing, not a product.
  const products: { name: string; description: string; price: string; image: string | null }[] = [];
  const productTags: string[][] = [];
  const menuGroups = sections.slice(0, GROUP_CAP).map((section) => {
    const indexes: number[] = [];
    for (const item of section.entries as Item[]) {
      if (item.name.trim() === "") continue;
      if (indexes.length < CARDS_PER_GROUP) indexes.push(products.length);
      products.push({
        name: item.name,
        description: item.description,
        price: formatPrice(item.pricing.price),
        image: resolveImage(item.image),
      });
      productTags.push(tagLabel ? item.tags.map(tagLabel) : []);
    }
    return { label: section.name, color: section.color, layout: section.displayStyle, products: indexes };
  });
  // Sections past the cap still contribute their dishes to the landing cards.
  for (const section of sections.slice(GROUP_CAP)) {
    for (const item of section.entries as Item[]) {
      if (item.name.trim() === "") continue;
      products.push({
        name: item.name,
        description: item.description,
        price: formatPrice(item.pricing.price),
        image: resolveImage(item.image),
      });
      productTags.push(tagLabel ? item.tags.map(tagLabel) : []);
    }
  }

  const offerSection = menu.sections.find((s) => s.id === OFFERS_SECTION_ID);
  const offers = ((offerSection?.entries ?? []) as Offer[])
    .filter((offer) => offer.name.trim() !== "")
    .map((offer) => ({
      name: offer.name,
      price: formatPrice(offer.pricing.offerPrice),
      image: resolveImage(offer.image),
    }));

  const blocks = [HERO, MENU, BEST_SELLER, ...(offers.length > 0 ? [OFFERS] : [])];

  const colors = site?.brand.colors ?? preset?.colors ?? null;
  const typography = site?.brand.typography[locale];
  const hero = site?.sectionSettings.hero;

  return {
    businessName: businessName || site?.brand.businessName || "",
    logoDataUrl: site?.brand.logoDataUrl ?? null,
    url: "",
    primary: colors?.primary ?? "#0d6efd",
    secondary: colors?.accent ?? "#eef4ff",
    font: typography?.titles ?? "inter",
    bodyFont: typography?.body,
    themeTemplate: preset?.styleId ?? menu.theme.presetId,
    sections: blocks,
    sectionLabelKeys: SECTION_LABEL_KEYS,
    // The header nav lists the merchant's sections, which are already literal
    // strings — t() returns an unknown key unchanged.
    navItems: labels.map((label) => ({ labelKey: label, visible: true })),
    showHeaderNav: menu.theme.navStyle === "top-bar",
    categories: labels.length > 0 ? labels : [PLACEHOLDER_LABEL],
    categoryLabels: labels,
    categoryImages: CATEGORY_IMAGES,
    categoryImageUrls: sections.map((s) => resolveImage(s.image)),
    categoryColors: sections.map((s) => s.color),
    cityLabel: "",
    hoursSummary: "",
    products,
    productTags,
    samplePrices: products.length > 0 ? products.map((d) => d.price) : [formatPrice(0)],
    // No struck-through "was" price: this menu has no discount, and printing
    // the same number twice with a line through one of them is a lie about a
    // saving that does not exist.
    sampleWasPrices: [],
    hero: hero
      ? {
          headline: hero.heading || undefined,
          sub: hero.subheading || undefined,
          primaryCta: hero.primaryCta || undefined,
          secondaryCta: hero.secondaryCta || undefined,
          imageUrl: hero.imageDataUrl ?? undefined,
        }
      : {},
    composition,
    device,
    categoryStyle: menu.theme.categoryStyle,
    cardStyle: menu.theme.cardStyle,
    navStyle: menu.theme.navStyle,
    showItemTags: menu.theme.showItemTags,
    stickyAddToCart: menu.theme.stickyAddToCart,
    menuGroups,
    offers,
  };
}
