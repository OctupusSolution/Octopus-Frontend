// OnboardingDraft -> StorefrontPreviewModel. The preview widget takes resolved
// values, so everything that needs a translator, a locale or an onboarding
// type — the city name, the opening-hours sentence, the sample prices, the
// seeded category list, and the section labels — is worked out here rather
// than inside the widget.
import type { StorefrontPreviewModel, PreviewDevice } from "@/widgets/storefront-preview";
import { CITIES, summarizeHours } from "../_shared/brand-catalog";
import { serviceCategoriesFor } from "../_shared/ai-insights";
import { formatBrandPrice } from "../_shared/pricing";
import { sectionLabelKey } from "./public-link-sections";
import { dnsLabel } from "./public-link-tag";
import type { OnboardingDraft } from "../_shared/draft";

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
    // Home stands in for the hero section in the header nav, so it is left
    // out of `visible` there; the footer's Explore column still lists it.
    navItems: publicLink.sections.map((id) => ({
      labelKey: sectionLabelKey(id),
      visible: id !== "hero",
    })),
    categories: serviceCategoriesFor(draft.type),
    cityLabel: city ? t(city.labelKey) : "",
    hoursSummary: summarizeHours(brand.hours, t, locale),
    samplePrice: formatBrandPrice(153, brand.currency, locale),
    sampleWasPrice: formatBrandPrice(170, brand.currency, locale),
    hero: {},
    device,
  };
}
