// SiteDraft -> StorefrontPreviewModel. The preview widget takes resolved
// values, so everything that needs a translator, a locale or a builder type —
// the hostname, the theme's concrete style, the sample prices, the seeded
// category list, and which nav items survive both the pages step and the
// navigation step — is worked out here rather than inside the widget.
//
// Three rulings bind this file (see the Task 7 dispatch notes):
//
// A — SiteDraft carries no city, no opening hours and no currency, so
//     `cityLabel`/`hoursSummary` are always "" (the widget renders nothing for
//     an empty string there) and prices are formatted in SAR with a local
//     helper rather than `formatBrandPrice`, which needs a currency the draft
//     does not have.
// B — the widget only knows how to draw four block kinds (hero, menu,
//     bestSeller, offers) and this builder's section catalog is bigger than
//     that. Enabled sections are mapped through SECTION_WIDGET_MAP, in the
//     draft's order; anything with no entry there (reservations,
//     reservationsCta, events, testimonials, instagram, waitlist) is dropped.
// D — the widget indexes `categories`/`samplePrices`/`sampleWasPrices` modulo
//     their length, so an empty array would render `undefined`. All three are
//     therefore fixed-size and independent of the draft — never conditionally
//     built down to nothing.
//
// `sectionLabelKeys` is built explicitly by id (SECTION_LABEL_KEYS below), not
// read positionally off `navItems` — this builder's `sections` (drawable
// blocks, after Ruling B) and `navItems` (page modules) come from different
// lists of different lengths, so a shared id is not guaranteed to share an
// index between them.
import type { StorefrontPreviewModel, PreviewDevice } from "@/widgets/storefront-preview";
import { dnsLabel } from "@/pages/onboarding/steps/public-link-tag";
import { PAGE_MODULES } from "./page-catalog";
import { SITE_THEMES } from "./theme-catalog";
import { toLegacyFontId, type SiteDraft } from "./site-draft";

// The four product cards' prices, in card order — 45/50/55/60 with was-prices
// 63/70/77/84 — the same ladder onboarding's adapter uses, so a merchant who
// has seen one preview does not see a second, unrelated set of numbers.
const PRICE_LADDER = [0, 1, 2, 3].map((i) => 45 + i * 5);

// A fixed seed list, not derived from the draft — the mosaic needs *some*
// category tiles before a merchant has connected a menu, and Ruling D means
// this list must never be empty.
const CATEGORY_KEYS = [
  "publicLink.category.signature",
  "publicLink.category.appetizers",
  "publicLink.category.drinks",
  "publicLink.category.desserts",
  "publicLink.category.breakfast",
] as const;

// Parallel to CATEGORY_KEYS — same order, same length — so the mosaic and the
// four product cards show five genuinely different photographs instead of
// the widget falling through to one shared default (final review finding
// F4). Chosen to mirror onboarding's own default (non-T4/T5) category set,
// which resolves to these same five files.
const CATEGORY_IMAGES: readonly string[] = [
  "all.png",
  "appetizers.png",
  "drinks.webp",
  "cake.png",
  "breakfast.webp",
];

// Only the block kinds the widget actually draws. Everything else in
// SECTION_IDS (reservations, reservationsCta, events, testimonials,
// instagram, waitlist) has no entry and is dropped in `previewModelFromSite`.
const SECTION_WIDGET_MAP: Record<string, string> = {
  hero: "hero",
  menu: "menu",
  offers: "offers",
};

// Explicit id -> heading map, keyed by widget id — not read positionally off
// `navItems`, because `sections` (drawable blocks) and `navItems` (page modules)
// are unrelated lists here. The headings are the customer-facing page names
// ("Menu", "Offers"), not the builder's own section labels ("Menu & Order",
// "Offers Banner"), which describe a section to the merchant and would read
// oddly as a heading on their storefront.
const SECTION_LABEL_KEYS: Readonly<Record<string, string>> = {
  menu: "publicLink.page.menu",
  offers: "publicLink.page.offers",
};

function formatSitePrice(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar" : "en-US", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 0,
  }).format(amount);
}

// `dnsLabel` only collapses repeated hyphens and trims the ends — it assumes
// its input is already lowercase and hyphen-safe, which a merchant's free-text
// business name is not. This lowercases and turns runs of anything else into
// a single hyphen first, then hands the result to `dnsLabel` for the trim.
//
// The slug is capped at MAX_SLUG_LENGTH before that trim (final review finding
// F1): the Preview step's QR encodes `https://{slug}.octopus.app?preview=test`,
// whose non-slug characters are a fixed 33 bytes ("https://" [8] +
// ".octopus.app" [12] + "?preview=test" [13]). `encodeQr` throws above 78
// bytes total (version-4 byte-mode capacity, see qr-encode.ts), so the slug
// alone must stay at or under 78 - 33 = 45 bytes — the binding constraint,
// tighter than the 63-character DNS label limit `sanitizeTag` uses, because
// that limit governs the label's own legality, not this page's QR budget.
const MAX_SLUG_LENGTH = 45;

function hostLabelFromName(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, MAX_SLUG_LENGTH);
  return dnsLabel(slug);
}

export function previewModelFromSite(
  draft: SiteDraft,
  device: PreviewDevice,
  t: (key: string) => string,
  locale: string
): StorefrontPreviewModel {
  const { brand, theme } = draft;
  const activeTheme = SITE_THEMES.find((entry) => entry.id === theme.id);
  const hero = draft.sectionSettings.hero;

  // `.flatMap` rather than `.map(...)!`: a stored draft can carry a page id
  // this build's catalog no longer knows (final review finding F2 — the same
  // failure mode every comparable lookup in this feature already guards
  // against). Skip the unknown id instead of crashing the whole app on
  // mount.
  const navItems = draft.pages
    .filter((page) => page.inNav)
    .flatMap((page) => {
      const module = PAGE_MODULES.find((m) => m.id === page.id);
      if (!module) return [];
      return [{ labelKey: module.labelKey, visible: !draft.navigation.hidden.includes(page.id) }];
    });

  // Named, not positional: whichever page is first in nav order AND not
  // eye-toggled hidden is "home" for this preview, however the merchant has
  // reordered pages. No qualifying page (e.g. every page hidden) means no
  // entry is drawn as active — never a fallback to the first item regardless
  // of visibility.
  const activeNavLabelKey = navItems.find((item) => item.visible)?.labelKey;

  // The hero's Advanced tab can hide it per device; tablet reads as desktop.
  const heroVisible = device === "mobile" ? hero.showOnMobile : hero.showOnDesktop;

  const sections = draft.sections
    .filter((section) => section.enabled)
    .filter((section) => section.id !== "hero" || heroVisible)
    .map((section) => SECTION_WIDGET_MAP[section.id])
    .filter((id): id is string => id !== undefined);

  return {
    businessName: brand.businessName || t("publicLink.defaultBusinessName"),
    logoDataUrl: brand.logoDataUrl,
    url: `${hostLabelFromName(brand.businessName) || "restaurant"}.octopus.app`,
    primary: brand.colors.primary,
    secondary: brand.colors.accent,
    // The widget resolves faces by brand-tokens FONTS id; catalogue codes map to the nearest one.
    font: toLegacyFontId(brand.typography[locale === "ar" ? "ar" : "en"].titles),
    themeTemplate: activeTheme?.styleId ?? null,
    sections,
    sectionLabelKeys: SECTION_LABEL_KEYS,
    navItems,
    // "Show in Header" (Navigation step) hides the header's nav strip
    // entirely — final review finding F5. The builder's pages already cover
    // Home/About/Contact through real `navItems` entries, so there is no
    // separate furniture list to gate here.
    showHeaderNav: draft.navigation.showInHeader,
    activeNavLabelKey,
    // The Navigation step's three global options, each drawn by the widget:
    // a pinned header, the active-page underline, and a new-tab glyph on
    // every link when "Open Links in Same Tab" is off.
    stickyHeader: draft.navigation.stickyHeader,
    activeIndicator: draft.navigation.activeIndicator,
    navOpensNewTab: !draft.navigation.sameTab,
    categories: CATEGORY_KEYS,
    categoryImages: CATEGORY_IMAGES,
    cityLabel: "",
    hoursSummary: "",
    samplePrices: PRICE_LADDER.map((p) => formatSitePrice(p, locale)),
    sampleWasPrices: PRICE_LADDER.map((p) => formatSitePrice(Math.round(p * 1.4), locale)),
    hero: {
      headline: hero.heading || t("publicLink.hero.defaultHeadline"),
      sub: hero.subheading || undefined,
      primaryCta: hero.primaryCta || undefined,
      secondaryCta: hero.secondaryCta || undefined,
      imageUrl: hero.imageDataUrl ?? undefined,
      overlay: hero.overlay,
      align: hero.textAlign,
      height: hero.height,
    },
    device,
  };
}
