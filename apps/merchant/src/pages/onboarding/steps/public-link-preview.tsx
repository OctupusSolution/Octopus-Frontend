// The customer-facing page itself, as step 8 depicts it: nav bar, the sections
// the merchant has chosen, and a footer. Rendered rather than screenshotted, so
// it follows their colour, logo, typeface, style, currency and language — and
// so it reads right-to-left in Arabic, which is what the design shows.
//
// Laid out with logical properties throughout (`start`/`end`, `ps`/`pe`,
// `text-start`, `border-s`) rather than left/right, so the whole page mirrors
// with the language instead of needing a second set of rules.
//
// Nothing in here is operable. Every control a real storefront would have — the
// search, the basket, the calls to action, the add buttons, the newsletter box —
// is a <span> or a <div>, never a <button> or an <input>, and the purely
// decorative ones are aria-hidden. A preview of somebody else's page that
// answered a click, or that a screen reader announced as a form, would be lying
// about what it is.
//
// Figures no draft can supply — the rating, the struck-through "was" price, the
// dish blurb — are visibly one repeated sample rather than invented variety, so
// nobody mistakes them for their own data.
import { ChevronDown, Globe, Heart, MapPin, Plus, Search, ShoppingCart, Star } from "lucide-react";
import clsx from "clsx";
import { useI18n } from "@/app/providers/i18n-provider";
import { publicLinkAsset } from "../_shared/assets";
import { serviceCategoriesFor } from "../_shared/ai-insights";
import {
  CITIES, fontStack, readableOn, styleTokens, summarizeHours, type StyleTokens,
} from "../_shared/brand-catalog";
import { formatBrandPrice } from "../_shared/pricing";
import { sectionLabelKey } from "./public-link-sections";
import { dnsLabel } from "./public-link-tag";
import type { OnboardingDraft } from "../_shared/draft";

const CATEGORY_IMAGES = ["cat-desserts.webp", "cat-mains.webp", "cat-breakfast.webp", "cat-drinks.webp"];
// Three dishes exist where the design shows four per row; they repeat until the
// rest arrive, which is also why every card carries the same sample blurb.
const DISH_IMAGES = ["dish-1.webp", "dish-2.webp", "dish-3.webp"];

/** The menu tiles do not sit in an even row in the design — they alternate one
 *  narrow, one double-width, which is what gives the block its magazine look.
 *  Four categories over a three-column grid come out as two full rows. */
const MENU_SPANS = ["span 1", "span 2", "span 2", "span 1"];

export function PublicLinkPreview({ draft, mobile }: { draft: OnboardingDraft; mobile: boolean }) {
  const { t, locale } = useI18n();
  const { brand, publicLink } = draft;

  const style = styleTokens(brand.themeTemplate);
  const categories = serviceCategoriesFor(draft.type);
  const city = CITIES.find((c) => c.id === brand.city);
  const url = `${dnsLabel(publicLink.tag) || "restaurant"}.octopus.app`;
  const onPrimary = readableOn(brand.primary);
  const businessName = brand.businessName || t("onboarding.businessName");

  // The footer in the design is a pale wash of the brand colour, not a slab of
  // it — mixed against the card surface so it stays pale in either theme.
  const footerBg = `color-mix(in srgb, ${brand.primary} 7%, var(--octo-card))`;

  const cardsPerRow = mobile ? 2 : 4;

  function dishCard(index: number) {
    const price = 45 + index * 5;
    return (
      <article
        key={index}
        className="flex flex-col overflow-hidden border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-2"
        style={{ borderRadius: style.radius }}
      >
        {/* Wishlist and rating sit above the photo in the design, not on it. */}
        <div className="flex items-center justify-between gap-2" aria-hidden>
          <Heart size={10} className="text-[var(--octo-text-faint)]" />
          <span className="inline-flex items-center gap-0.5 text-[8.5px] font-semibold text-[var(--octo-text-secondary)]">
            <Star size={9} className="fill-[#FFB020] text-[#FFB020]" />
            4.5
          </span>
        </div>

        <img
          src={publicLinkAsset(DISH_IMAGES[index % DISH_IMAGES.length])}
          alt=""
          className="mt-1.5 h-[84px] w-full object-contain"
        />

        <p className="mt-1.5 truncate text-start text-[10px] font-bold text-[var(--octo-text-primary)]">
          {t(categories[index % categories.length])}
        </p>
        <p className="mt-0.5 line-clamp-2 text-start text-[8px] leading-[1.55] text-[var(--octo-text-muted)]">
          {t("onboarding.publicLink.previewDish")}
        </p>

        <div className="mt-auto flex items-end justify-between gap-2 pt-1.5">
          <span
            className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full"
            style={{ backgroundColor: brand.primary, color: onPrimary }}
            aria-hidden
          >
            <Plus size={10} strokeWidth={3} />
          </span>
          <span className="min-w-0 text-end">
            <span className="block truncate text-[10px] font-bold text-[var(--octo-text-primary)]">
              {formatBrandPrice(price, brand.currency, locale)}
            </span>
            <span className="block truncate text-[8px] text-[var(--octo-text-faint)] line-through">
              {formatBrandPrice(Math.round(price * 1.4), brand.currency, locale)}
            </span>
          </span>
        </div>
      </article>
    );
  }

  function section(id: string) {
    switch (id) {
      // Copy sits at the reading-start edge, not centred — the design runs the
      // headline, the blurb and the two calls to action all flush right in
      // Arabic, which `text-start` gives for free in either language.
      case "hero":
        return (
          <section key={id} className="relative">
            <img src={publicLinkAsset("hero.webp")} alt="" className="h-[168px] w-full object-cover" />
            <div
              className="absolute inset-0 flex flex-col justify-center px-5"
              style={{ backgroundColor: style.heroScrim }}
            >
              <p className="max-w-[62%] text-start text-[22px] font-bold leading-[1.3] text-white">
                {businessName}
              </p>
              <p className="mt-2 max-w-[46%] text-start text-[9.5px] leading-[1.8] text-white/75">
                {t("onboarding.publicLink.previewTagline")}
              </p>
              <div className="mt-3 flex items-center gap-2" aria-hidden>
                <span
                  className="px-3.5 py-1.5 text-[9.5px] font-semibold"
                  style={{ backgroundColor: brand.primary, color: onPrimary, borderRadius: style.radius }}
                >
                  {t("onboarding.publicLink.previewOrder")}
                </span>
                <span
                  className="border border-white/60 px-3.5 py-1.5 text-[9.5px] font-semibold text-white"
                  style={{ borderRadius: style.radius }}
                >
                  {t("onboarding.publicLink.previewMenu")}
                </span>
              </div>
            </div>
          </section>
        );

      // The menu tiles are photographs cropped to fill their card, which is why
      // they get `object-cover` where the cut-out dish shots get
      // `object-contain`. The label sits on the photo, top-start.
      case "menu":
        return (
          <section key={id} className="px-4 pt-4">
            <SectionHeading style={style} accent={brand.primary}>{t(sectionLabelKey(id))}</SectionHeading>
            <div className={clsx("mt-2 grid gap-2", mobile ? "grid-cols-2" : "grid-cols-3")}>
              {categories.map((key, i) => (
                <div
                  key={key}
                  className="relative overflow-hidden bg-[var(--octo-card)]"
                  style={{
                    borderRadius: style.radius,
                    gridColumn: mobile ? undefined : MENU_SPANS[i % MENU_SPANS.length],
                  }}
                >
                  <img
                    src={publicLinkAsset(CATEGORY_IMAGES[i % CATEGORY_IMAGES.length])}
                    alt=""
                    className={clsx("w-full object-cover", mobile ? "h-[124px]" : "h-[190px]")}
                  />
                  <span className="absolute start-2 top-2 rounded-[6px] bg-[var(--octo-card)]/85 px-2 py-1 text-[10.5px] font-bold text-[var(--octo-text-primary)] backdrop-blur-[2px]">
                    {t(key)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        );

      case "bestSeller":
      case "offers":
        return (
          <section key={id} className="px-4 pt-4">
            <SectionHeading style={style} accent={brand.primary}>{t(sectionLabelKey(id))}</SectionHeading>
            <div
              className="mt-2 grid gap-2"
              style={{ gridTemplateColumns: `repeat(${cardsPerRow}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: cardsPerRow }, (_, i) => dishCard(i))}
            </div>
          </section>
        );

      // A draft can carry a section id this build no longer renders. Skip it
      // rather than throwing: the customise list still shows and can remove it.
      default:
        return null;
    }
  }

  return (
    <div
      className={clsx(
        "mx-auto overflow-hidden rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-page-bg)]",
        mobile && "max-w-[320px]"
      )}
      // The merchant's typeface applies to the depicted page only — the wizard
      // chrome around it stays in the app's own face.
      style={{ fontFamily: fontStack(brand.font, locale) }}
    >
      <header className="flex items-center gap-3 bg-[var(--octo-card)] px-4 py-2.5">
        {brand.logoDataUrl ? (
          <img src={brand.logoDataUrl} alt="" className="h-[22px] shrink-0 object-contain" />
        ) : (
          <span
            className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-lg text-[10px] font-bold"
            style={{ backgroundColor: brand.primary, color: onPrimary }}
          >
            {businessName.trim().charAt(0).toUpperCase() || "O"}
          </span>
        )}

        {/* The nav is the merchant's own section list, in their own order:
            reorder the sections below and this menu follows. The two ends —
            Home, and the About/Contact pair — are page furniture every
            storefront has, not sections the merchant can move. */}
        {!mobile && (
          <nav className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden text-[9px] text-[var(--octo-text-secondary)]">
            <span className="whitespace-nowrap font-bold" style={{ color: brand.primary }}>
              {t("onboarding.publicLink.previewHome")}
            </span>
            {publicLink.sections
              .filter((id) => id !== "hero")
              .map((id) => (
                <span key={id} className="whitespace-nowrap">{t(sectionLabelKey(id))}</span>
              ))}
            <span className="whitespace-nowrap">{t("onboarding.publicLink.previewAbout")}</span>
            <span className="whitespace-nowrap">{t("onboarding.publicLink.previewContact")}</span>
          </nav>
        )}

        <span className="ms-auto flex shrink-0 items-center gap-2" aria-hidden>
          <span className="inline-flex items-center gap-0.5 text-[8.5px] text-[var(--octo-text-secondary)]">
            <Globe size={9} />
            {locale === "ar" ? "العربية" : "English"}
            <ChevronDown size={8} />
          </span>
          <Search size={11} className="text-[var(--octo-text-muted)]" />
          <span
            className="grid h-[22px] w-[22px] place-items-center rounded-lg"
            style={{ backgroundColor: brand.primary, color: onPrimary }}
          >
            <ShoppingCart size={11} />
          </span>
        </span>
      </header>

      <div className="pb-5">{publicLink.sections.map(section)}</div>

      {/* Only what the draft already knows: the name, the sections, the city,
          the hours from step 4 and the link being chosen on this very screen.
          No invented phone numbers or social accounts. */}
      <footer className="px-4 py-4" style={{ backgroundColor: footerBg }}>
        <div className={clsx("grid gap-4", mobile ? "grid-cols-2" : "grid-cols-4")}>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              {brand.logoDataUrl ? (
                <img src={brand.logoDataUrl} alt="" className="h-4 shrink-0 object-contain" />
              ) : (
                <span
                  className="grid h-4 w-4 shrink-0 place-items-center rounded text-[8px] font-bold"
                  style={{ backgroundColor: brand.primary, color: onPrimary }}
                >
                  {businessName.trim().charAt(0).toUpperCase() || "O"}
                </span>
              )}
              <p className="truncate text-[9.5px] font-bold text-[var(--octo-text-primary)]">{businessName}</p>
            </div>
            <p className="mt-1.5 text-start text-[8px] leading-[1.7] text-[var(--octo-text-muted)]">
              {t("onboarding.publicLink.previewTagline")}
            </p>
          </div>

          <FooterColumn title={t("onboarding.publicLink.previewExplore")}>
            {publicLink.sections.map((id) => (
              <p key={id} className="truncate">{t(sectionLabelKey(id))}</p>
            ))}
          </FooterColumn>

          <FooterColumn title={t("onboarding.publicLink.previewContact")}>
            {city && (
              <p className="inline-flex items-center gap-1">
                <MapPin size={8} aria-hidden />
                {t(city.labelKey)}
              </p>
            )}
            <p className="truncate">{url}</p>
          </FooterColumn>

          <div className="min-w-0">
            <p className="text-start text-[9px] font-bold text-[var(--octo-text-primary)]">
              {t("onboarding.details.hours")}
            </p>
            <p className="mt-1.5 text-start text-[8px] text-[var(--octo-text-muted)]">
              {summarizeHours(brand.hours, t, locale)}
            </p>
            <span className="mt-2 flex items-stretch gap-1" aria-hidden>
              <span className="min-w-0 flex-1 truncate rounded-[6px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-1.5 py-1 text-[8px] text-[var(--octo-text-faint)]">
                {t("onboarding.publicLink.previewNewsletter")}
              </span>
              <span
                className="shrink-0 rounded-[6px] px-2 py-1 text-[8px] font-semibold"
                style={{ backgroundColor: brand.primary, color: onPrimary }}
              >
                {t("onboarding.publicLink.previewSubscribe")}
              </span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 text-start">
      <p className="text-[9px] font-bold text-[var(--octo-text-primary)]">{title}</p>
      <div className="mt-1.5 flex flex-col gap-1 text-[8px] text-[var(--octo-text-muted)]">{children}</div>
    </div>
  );
}

/** The design's section headings: a short bar in the brand colour on the
 *  reading-start side, then the label. `border-s` rather than `border-l` so it
 *  swaps sides with the language. */
function SectionHeading({ style, accent, children }: { style: StyleTokens; accent: string; children: React.ReactNode }) {
  return (
    <p
      className="border-s-[3px] ps-2 text-start text-[12.5px] text-[var(--octo-text-primary)]"
      style={{
        borderColor: accent,
        fontWeight: style.headingWeight,
        letterSpacing: style.headingTracking,
        textTransform: style.headingTransform,
      }}
    >
      {children}
    </p>
  );
}
