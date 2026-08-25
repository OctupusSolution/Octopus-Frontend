// Step 8 — the customer-facing page, rendered rather than screenshotted, so it
// honours the merchant's colour, logo and language instead of showing someone
// else's restaurant. Desktop and mobile are the same markup at two widths.
//
// The link, theming and connected-modules controls live in the registry's
// `Aside` slot (see public-link-aside.tsx) rather than in a second column
// hand-rolled here, so every side panel in the flow is one width and one
// treatment.
import { useState } from "react";
import { Monitor, Smartphone } from "lucide-react";
import clsx from "clsx";
import { Segmented } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { publicLinkAsset } from "../_shared/assets";
import { serviceCategoriesFor } from "../_shared/ai-insights";
import { readableOn } from "../_shared/brand-catalog";
import { formatBrandPrice } from "../_shared/pricing";
import type { StepProps } from "../_shared/steps";

const CATEGORY_IMAGES = ["cat-desserts.webp", "cat-mains.webp", "cat-breakfast.webp", "cat-drinks.webp"];
// Three dishes exist where the design shows six; they repeat until the rest arrive.
const DISH_IMAGES = ["dish-1.webp", "dish-2.webp", "dish-3.webp", "dish-1.webp", "dish-2.webp", "dish-3.webp"];

const SECTION_LABELS: Record<string, string> = {
  hero: "onboarding.publicLink.section.hero",
  offers: "onboarding.publicLink.section.offers",
  menu: "onboarding.publicLink.section.menu",
  bestSeller: "onboarding.publicLink.section.bestSeller",
};

export function PublicLinkStep({ draft }: StepProps) {
  const { t, locale } = useI18n();
  const [view, setView] = useState<"desktop" | "mobile">("desktop");
  const { brand, publicLink } = draft;

  const categories = serviceCategoriesFor(draft.type);

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Segmented
            options={[
              {
                id: "desktop",
                label: (
                  <>
                    <Monitor size={14} />
                    <span className="sr-only">{t("onboarding.publicLink.desktop")}</span>
                  </>
                ),
              },
              {
                id: "mobile",
                label: (
                  <>
                    <Smartphone size={14} />
                    <span className="sr-only">{t("onboarding.publicLink.mobile")}</span>
                  </>
                ),
              },
            ]}
            value={view}
            onChange={(id) => setView(id as "desktop" | "mobile")}
          />
          <span className="text-[11.5px] text-[var(--octo-text-muted)]">{t("onboarding.publicLink.viewAsCustomer")}</span>
        </div>

        <div className={clsx("mx-auto mt-4 overflow-hidden rounded-xl border border-[var(--octo-border-card)]", view === "mobile" && "max-w-[320px]")}>
          <header className="flex items-center justify-between gap-3 px-3 py-2" style={{ backgroundColor: brand.secondary }}>
            {brand.logoDataUrl ? (
              <img src={brand.logoDataUrl} alt="" className="h-6 object-contain" />
            ) : (
              <span className="text-[12px] font-bold" style={{ color: readableOn(brand.secondary) }}>
                {brand.businessName || "OCTOPUS"}
              </span>
            )}
            <span
              className="rounded-full px-2.5 py-1 text-[10px] font-semibold"
              style={{ backgroundColor: brand.primary, color: readableOn(brand.primary) }}
            >
              {t("onboarding.publicLink.live")}
            </span>
          </header>

          <div className="relative">
            <img src={publicLinkAsset("hero.webp")} alt="" className="h-40 w-full object-cover" />
            <div className="absolute inset-0 grid place-items-center bg-black/45 px-4 text-center">
              <p className="text-[15px] font-bold text-white">{brand.businessName || t("onboarding.businessName")}</p>
            </div>
          </div>

          <div className="bg-[var(--octo-page-bg)] p-3">
            <div className={clsx("grid gap-2", view === "mobile" ? "grid-cols-2" : "grid-cols-4")}>
              {categories.map((key, i) => (
                <div key={key} className="flex items-center gap-2 overflow-hidden rounded-[10px] bg-[var(--octo-card)] p-2">
                  <img src={publicLinkAsset(CATEGORY_IMAGES[i % CATEGORY_IMAGES.length])} alt="" className="h-9 w-9 shrink-0 object-contain" />
                  <span className="truncate text-[10.5px] font-medium text-[var(--octo-text-primary)]">{t(key)}</span>
                </div>
              ))}
            </div>

            <div className={clsx("mt-3 grid gap-2", view === "mobile" ? "grid-cols-2" : "grid-cols-3")}>
              {DISH_IMAGES.map((image, i) => (
                <div key={`${image}-${i}`} className="overflow-hidden rounded-[10px] bg-[var(--octo-card)] p-2">
                  <img src={publicLinkAsset(image)} alt="" className="h-20 w-full object-contain" />
                  <p className="mt-1.5 truncate text-[10.5px] font-medium text-[var(--octo-text-primary)]">
                    {t(categories[i % categories.length])}
                  </p>
                  <p
                    className="mt-1 inline-block rounded-[6px] px-1.5 py-0.5 text-[10.5px] font-bold"
                    style={{ backgroundColor: brand.primary, color: readableOn(brand.primary) }}
                  >
                    {/* Sample prices, but in the currency the merchant chose on
                        step 4 and formatted the way every other figure is. */}
                    {formatBrandPrice(45 + i * 5, brand.currency, locale)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
        <h3 className="text-[13px] font-bold text-[var(--octo-text-primary)]">{t("onboarding.publicLink.customize")}</h3>
        <p className="mt-1 text-[11.5px] text-[var(--octo-text-muted)]">{t("onboarding.publicLink.customizeNote")}</p>
        <ul className="mt-3 flex flex-col gap-1.5">
          {publicLink.sections.map((id) => (
            <li key={id} className="flex items-center gap-2 rounded-[9px] border border-[var(--octo-border-input)] px-3 py-2 text-[11.5px] text-[var(--octo-text-secondary)]">
              {t(SECTION_LABELS[id] ?? id)}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
