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

export function previewModelFromOnboarding(
  draft: OnboardingDraft,
  device: PreviewDevice,
  t: (key: string) => string,
  locale: string
): StorefrontPreviewModel {
  const { brand, publicLink } = draft;
  const city = CITIES.find((c) => c.id === brand.city);

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
    // The header nav's trailing About/Contact used to be hardcoded in the
    // widget; now each host supplies them. Onboarding has no real About/
    // Contact pages the way the builder does, so they go here rather than
    // into `navItems` — `navItems` also feeds the footer's Explore column
    // unfiltered, and onboarding's Explore list (the 4 homepage sections)
    // must stay exactly as it was, not gain two phantom entries for pages
    // that don't exist in this flow.
    navFurniture: [
      { labelKey: "onboarding.publicLink.previewAbout", visible: true },
      { labelKey: "onboarding.publicLink.previewContact", visible: true },
    ],
    categories: serviceCategoriesFor(draft.type),
    cityLabel: city ? t(city.labelKey) : "",
    hoursSummary: summarizeHours(brand.hours, t, locale),
    samplePrices: PRICE_LADDER.map((p) => formatBrandPrice(p, brand.currency, locale)),
    sampleWasPrices: PRICE_LADDER.map((p) => formatBrandPrice(Math.round(p * 1.4), brand.currency, locale)),
    hero: {},
    device,
  };
}
