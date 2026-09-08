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
import { SITE_SECTIONS } from "./section-catalog";
import { SITE_THEMES } from "./theme-catalog";
import type { SiteDraft } from "./site-draft";

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

// Only the block kinds the widget actually draws. Everything else in
// SECTION_IDS (reservations, reservationsCta, events, testimonials,
// instagram, waitlist) has no entry and is dropped in `previewModelFromSite`.
const SECTION_WIDGET_MAP: Record<string, string> = {
  hero: "hero",
  menu: "menu",
  offers: "offers",
};

// Explicit id -> heading map, keyed by widget id, sourced from SITE_SECTIONS's
// own labels — not read positionally off `navItems`. `sections` (drawable
// blocks) and `navItems` (page modules) are unrelated lists here, so nothing
// guarantees a shared id lands at the same index in both.
const SECTION_LABEL_KEYS: Readonly<Record<string, string>> = Object.fromEntries(
  SITE_SECTIONS.flatMap((section) => {
    const widgetId = SECTION_WIDGET_MAP[section.id];
    return widgetId ? [[widgetId, section.labelKey]] : [];
  })
);

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
function hostLabelFromName(name: string): string {
  return dnsLabel(name.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
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

  const navItems = draft.pages
    .filter((page) => page.inNav)
    .map((page) => ({
      labelKey: PAGE_MODULES.find((module) => module.id === page.id)!.labelKey,
      visible: !draft.navigation.hidden.includes(page.id),
    }));

  const sections = draft.sections
    .filter((section) => section.enabled)
    .map((section) => SECTION_WIDGET_MAP[section.id])
    .filter((id): id is string => id !== undefined);

  return {
    businessName: brand.businessName || t("publicLink.defaultBusinessName"),
    logoDataUrl: brand.logoDataUrl,
    url: `${hostLabelFromName(brand.businessName) || "restaurant"}.octopus.app`,
    primary: brand.colors.primary,
    secondary: brand.colors.accent,
    font: brand.typography[locale === "ar" ? "ar" : "en"].titles,
    themeTemplate: activeTheme?.styleId ?? null,
    sections,
    sectionLabelKeys: SECTION_LABEL_KEYS,
    navItems,
    categories: CATEGORY_KEYS,
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
    },
    device,
  };
}
