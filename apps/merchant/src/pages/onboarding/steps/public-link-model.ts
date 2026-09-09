// OnboardingDraft -> StorefrontPreviewModel. The preview widget takes resolved
// values, so everything that needs a translator, a locale or an onboarding
// type — the city name, the opening-hours sentence, the sample prices, the
// seeded category list, and the section labels — is worked out here rather
// than inside the widget.
import type { StorefrontPreviewModel, PreviewDevice } from "@/widgets/storefront-preview";
import { CITIES, summarizeHours } from "../_shared/brand-catalog";
import { serviceCategoriesFor } from "../_shared/ai-insights";
import { formatBrandPrice } from "../_shared/pricing";
import { SECTION_LABELS, sectionLabelKey } from "./public-link-sections";
import { dnsLabel } from "./public-link-tag";
import type { OnboardingDraft } from "../_shared/draft";

// The four product cards' prices, in card order — 45/50/55/60 with was-prices
// 63/70/77/84 — exactly what the pre-move component computed inline as
// `45 + index * 5` / `Math.round(price * 1.4)` for `index` 0..3.
const PRICE_LADDER = [0, 1, 2, 3].map((i) => 45 + i * 5);

// Which storefront photograph belongs to which seeded category. Moved here
// from the widget (see Task 22 final review, finding F4) — a widget keyed on
// one host's own dictionary strings is exactly the coupling this model exists
// to remove. Keyed rather than positional: `serviceCategoriesFor` returns a
// different list per business type, so pairing tile 3 with photo 3 put a rice
// platter on the drinks tile the moment the type changed. Every key
// `serviceCategoriesFor` can return has an entry; the fallback is for
// anything added there later without a matching photo yet.
const CATEGORY_IMAGE_BY_KEY: Record<string, string> = {
  "onboarding.category.signature": "all.png",
  "onboarding.category.appetizers": "appetizers.png",
  "onboarding.category.drinks": "drinks.webp",
  "onboarding.category.desserts": "cake.png",
  "onboarding.category.breakfast": "breakfast.webp",
  "onboarding.category.pastries": "side-dishes.png",
  "onboarding.category.cakes": "cake.png",
  "onboarding.category.coffee": "drinks.webp",
};

function categoryImage(key: string): string {
  return CATEGORY_IMAGE_BY_KEY[key] ?? "all.png";
}

export function previewModelFromOnboarding(
  draft: OnboardingDraft,
  device: PreviewDevice,
  t: (key: string) => string,
  locale: string
): StorefrontPreviewModel {
  const { brand, publicLink } = draft;
  const city = CITIES.find((c) => c.id === brand.city);
  const categories = serviceCategoriesFor(draft.type);

  return {
    businessName: brand.businessName || t("onboarding.businessName"),
    logoDataUrl: brand.logoDataUrl,
    url: `${dnsLabel(publicLink.tag) || "restaurant"}.octopus.app`,
    primary: brand.primary,
    secondary: brand.secondary,
    font: brand.font,
    themeTemplate: brand.themeTemplate,
    sections: publicLink.sections,
    // Explicit rather than positional — see the field's doc comment on
    // StorefrontPreviewModel. Onboarding's own SECTION_LABELS is the single
    // source for these headings.
    sectionLabelKeys: SECTION_LABELS,
    // Home stands in for the hero section in the header nav, so it is left
    // out of `visible` there; the footer's Explore column still lists it.
    navItems: publicLink.sections.map((id) => ({
      labelKey: sectionLabelKey(id),
      visible: id !== "hero",
    })),
    // Home (leading) and About/Contact (trailing) used to be hardcoded in
    // the widget; now each host supplies them. Onboarding has no real Home/
    // About/Contact pages the way the builder does, so they go here rather
    // than into `navItems` — `navItems` also feeds the footer's Explore
    // column unfiltered, and onboarding's Explore list (the 4 homepage
    // sections) must stay exactly as it was, not gain phantom entries for
    // pages that don't exist in this flow.
    navFurniture: {
      leading: [{ labelKey: "onboarding.publicLink.previewHome", visible: true }],
      trailing: [
        { labelKey: "onboarding.publicLink.previewAbout", visible: true },
        { labelKey: "onboarding.publicLink.previewContact", visible: true },
      ],
    },
    // Named, not positional, so the widget marks the same entry active
    // however the merchant reorders `publicLink.sections` elsewhere.
    activeNavLabelKey: "onboarding.publicLink.previewHome",
    categories,
    categoryImages: categories.map(categoryImage),
    cityLabel: city ? t(city.labelKey) : "",
    hoursSummary: summarizeHours(brand.hours, t, locale),
    samplePrices: PRICE_LADDER.map((p) => formatBrandPrice(p, brand.currency, locale)),
    sampleWasPrices: PRICE_LADDER.map((p) => formatBrandPrice(Math.round(p * 1.4), brand.currency, locale)),
    hero: {},
    device,
  };
}
