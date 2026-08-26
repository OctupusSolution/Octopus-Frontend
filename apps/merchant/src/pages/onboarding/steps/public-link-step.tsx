// Step 8 — the customer-facing page, rendered rather than screenshotted, so it
// honours the merchant's colour, logo, typeface, style and language instead of
// showing someone else's restaurant. Desktop and mobile are the same markup at
// two widths.
//
// The preview is built from `publicLink.sections`, the same array the customise
// card below it edits: reorder or remove a section there and the page here
// changes to match. That array used to be read by nobody, which made the card
// under the preview a picture of a control rather than one.
//
// The link, theming and connected-modules controls live in the registry's
// `Aside` slot (see public-link-aside.tsx) rather than in a second column
// hand-rolled here, so every side panel in the flow is one width and one
// treatment.
import { useState } from "react";
import { MapPin, Monitor, Search, ShoppingCart, Smartphone } from "lucide-react";
import clsx from "clsx";
import { Segmented } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { publicLinkAsset } from "../_shared/assets";
import { serviceCategoriesFor } from "../_shared/ai-insights";
import { CITIES, fontStack, readableOn, styleTokens, type StyleTokens } from "../_shared/brand-catalog";
import { formatBrandPrice } from "../_shared/pricing";
import { PublicLinkSections, sectionLabelKey } from "./public-link-sections";
import { dnsLabel } from "./public-link-tag";
import type { StepProps } from "../_shared/steps";

const CATEGORY_IMAGES = ["cat-desserts.webp", "cat-mains.webp", "cat-breakfast.webp", "cat-drinks.webp"];
// Three dishes exist where the design shows six; they repeat until the rest arrive.
const DISH_IMAGES = ["dish-1.webp", "dish-2.webp", "dish-3.webp", "dish-1.webp", "dish-2.webp", "dish-3.webp"];

export function PublicLinkStep({ draft, dispatch }: StepProps) {
  const { t, locale } = useI18n();
  const [view, setView] = useState<"desktop" | "mobile">("desktop");
  const { brand, publicLink } = draft;

  const mobile = view === "mobile";
  const categories = serviceCategoriesFor(draft.type);
  const style = styleTokens(brand.themeTemplate);
  const city = CITIES.find((c) => c.id === brand.city);
  // Built the same way the aside builds it, from the same helper, so the URL in
  // the footer of the preview cannot disagree with the one being edited.
  const publicUrl = `${dnsLabel(publicLink.tag) || "restaurant"}.octopus.app`;

  function dishCard(image: string, index: number, compact = false) {
    return (
      <div
        key={`${image}-${index}`}
        className="overflow-hidden bg-[var(--octo-card)] p-2"
        style={{ borderRadius: style.radius }}
      >
        <img
          src={publicLinkAsset(image)}
          alt=""
          className={clsx("w-full object-contain", compact ? "h-12" : "h-20")}
          style={{ borderRadius: style.radius }}
        />
        <p className="mt-1.5 truncate text-[10.5px] font-medium text-[var(--octo-text-primary)]">
          {t(categories[index % categories.length])}
        </p>
        <p
          className="mt-1 inline-block px-1.5 py-0.5 text-[10.5px] font-bold"
          style={{ backgroundColor: brand.primary, color: readableOn(brand.primary), borderRadius: style.radius }}
        >
          {/* Sample prices, but in the currency the merchant chose on step 4 and
              formatted the way every other figure in the app is. */}
          {formatBrandPrice(45 + index * 5, brand.currency, locale)}
        </p>
      </div>
    );
  }

  function section(id: string) {
    switch (id) {
      case "hero":
        return (
          <div key={id} className="relative">
            <img src={publicLinkAsset("hero.webp")} alt="" className="h-40 w-full object-cover" />
            <div
              className="absolute inset-0 grid place-items-center px-4 text-center"
              style={{ backgroundColor: style.heroScrim }}
            >
              <div>
                <p className="text-[15px] font-bold text-white">
                  {brand.businessName || t("onboarding.businessName")}
                </p>
                {/* Depicted, not offered: these are spans, not buttons, because
                    nothing inside a preview of somebody else's page is
                    clickable and a real button here would say otherwise. */}
                <div className="mt-2 flex items-center justify-center gap-2">
                  <span
                    className="px-2.5 py-1 text-[10px] font-semibold"
                    style={{ backgroundColor: brand.primary, color: readableOn(brand.primary), borderRadius: style.radius }}
                  >
                    {t("onboarding.publicLink.previewOrder")}
                  </span>
                  <span
                    className="border border-white/70 px-2.5 py-1 text-[10px] font-semibold text-white"
                    style={{ borderRadius: style.radius }}
                  >
                    {t("onboarding.publicLink.previewMenu")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );

      case "offers":
        return (
          <div key={id} className="px-3 pt-3">
            <SectionHeading style={style}>{t(sectionLabelKey(id))}</SectionHeading>
            {/* A brand-coloured band, because that is what an offers banner is.
                The dishes inside carry no invented discount — there is no offer
                data in the draft to show, and a made-up "-20%" would be the kind
                of decoration this screen is meant to be free of. */}
            <div
              className="grid gap-2 p-2"
              style={{
                backgroundColor: brand.primary,
                borderRadius: style.radius,
                gridTemplateColumns: `repeat(${mobile ? 2 : 3}, minmax(0, 1fr))`,
              }}
            >
              {DISH_IMAGES.slice(0, mobile ? 2 : 3).map((image, i) => dishCard(image, i, true))}
            </div>
          </div>
        );

      case "menu":
        return (
          <div key={id} className="px-3 pt-3">
            <SectionHeading style={style}>{t(sectionLabelKey(id))}</SectionHeading>
            <div className={clsx("grid gap-2", mobile ? "grid-cols-2" : "grid-cols-4")}>
              {categories.map((key, i) => (
                <div
                  key={key}
                  className="flex items-center gap-2 overflow-hidden bg-[var(--octo-card)] p-2"
                  style={{ borderRadius: style.radius }}
                >
                  <img
                    src={publicLinkAsset(CATEGORY_IMAGES[i % CATEGORY_IMAGES.length])}
                    alt=""
                    className="h-9 w-9 shrink-0 object-contain"
                  />
                  <span className="truncate text-[10.5px] font-medium text-[var(--octo-text-primary)]">{t(key)}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case "bestSeller":
        return (
          <div key={id} className="px-3 pt-3">
            <SectionHeading style={style}>{t(sectionLabelKey(id))}</SectionHeading>
            <div className={clsx("grid gap-2", mobile ? "grid-cols-2" : "grid-cols-3")}>
              {DISH_IMAGES.map((image, i) => dishCard(image, i))}
            </div>
          </div>
        );

      // A draft can carry a section id this build no longer renders. Skip it
      // rather than throwing: the customise list still shows and can remove it.
      default:
        return null;
    }
  }

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

        <div
          className={clsx(
            "mx-auto mt-4 overflow-hidden rounded-xl border border-[var(--octo-border-card)]",
            mobile && "max-w-[320px]"
          )}
          // The merchant's typeface applies to the previewed page only — the
          // wizard chrome around it stays in the app's own face.
          style={{ fontFamily: fontStack(brand.font, locale) }}
        >
          <header
            className="flex items-center justify-between gap-3 px-3 py-2"
            style={{ backgroundColor: brand.secondary }}
          >
            {brand.logoDataUrl ? (
              <img src={brand.logoDataUrl} alt="" className="h-6 object-contain" />
            ) : (
              <span className="text-[12px] font-bold" style={{ color: readableOn(brand.secondary) }}>
                {brand.businessName || "OCTOPUS"}
              </span>
            )}
            <span className="flex items-center gap-2">
              {/* Depicted chrome, so aria-hidden: a customer's page has a search
                  and a basket, but nothing here is operable and a screen reader
                  announcing them as controls would be lying about that. */}
              <Search size={12} aria-hidden style={{ color: readableOn(brand.secondary) }} />
              <ShoppingCart size={12} aria-hidden style={{ color: readableOn(brand.secondary) }} />
              <span
                className="px-2.5 py-1 text-[10px] font-semibold"
                style={{ backgroundColor: brand.primary, color: readableOn(brand.primary), borderRadius: "999px" }}
              >
                {t("onboarding.publicLink.live")}
              </span>
            </span>
          </header>

          {/* The category strip sits between the bar and the sections rather
              than among them: it is navigation for the page, not a block the
              merchant can reorder or take off. */}
          <nav
            className="flex items-center gap-1.5 overflow-x-auto border-b border-[var(--octo-border-card)] bg-[var(--octo-card)] px-3 py-1.5"
            aria-hidden
          >
            {categories.map((key) => (
              <span
                key={key}
                className="whitespace-nowrap px-2 py-0.5 text-[10px] text-[var(--octo-text-secondary)]"
                style={{ borderRadius: style.radius }}
              >
                {t(key)}
              </span>
            ))}
          </nav>

          <div className="bg-[var(--octo-page-bg)] pb-3">{publicLink.sections.map(section)}</div>

          {/* The page's own footer. It carries only what the draft already
              knows — the name, the city and the link the merchant is choosing
              on this very screen — rather than invented contact details. */}
          <footer
            className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
            style={{ backgroundColor: brand.secondary, color: readableOn(brand.secondary) }}
          >
            <span className="text-[10.5px] font-semibold">{brand.businessName || "OCTOPUS"}</span>
            <span className="flex items-center gap-3 text-[10px] opacity-80">
              {city && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={10} aria-hidden />
                  {t(city.labelKey)}
                </span>
              )}
              <span className="truncate">{publicUrl}</span>
            </span>
          </footer>
        </div>
      </section>

      <PublicLinkSections draft={draft} dispatch={dispatch} />
    </div>
  );
}

function SectionHeading({ style, children }: { style: StyleTokens; children: React.ReactNode }) {
  return (
    <p
      className="mb-2 text-[11.5px] text-[var(--octo-text-primary)]"
      style={{
        fontWeight: style.headingWeight,
        letterSpacing: style.headingTracking,
        textTransform: style.headingTransform,
      }}
    >
      {children}
    </p>
  );
}
