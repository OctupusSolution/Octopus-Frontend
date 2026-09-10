// The customer-facing page itself, as step 8 depicts it.
//
// This is a scale model of a real screen: apps/customer renders the same
// storefront from views/landing/landing-view.tsx, and every block here mirrors
// one of its widgets — StoreHero, SectionHeading, CategoryMosaic,
// ProductRow/ProductCard — down to the mosaic's tall middle column and the same
// photographs, reached through `storefrontAsset`. When that page changes shape,
// this file is the one that has to follow.
//
// What it does NOT copy is the content: the name, colours, typeface, style,
// logo, currency, city, hours and section order all come from the host's own
// resolved model, which is the entire point of showing it to them. Onboarding
// and the Public Link Builder each adapt their own data into that model —
// see `StorefrontPreviewModel` in ./model — which is what keeps this widget
// free of either host's types.
//
// Laid out with logical properties throughout (start/end, ps/pe, text-start)
// rather than left/right, so the page mirrors with the language instead of
// needing a second set of rules.
//
// Nothing here is operable. Every control a real storefront would have — the
// search, the basket, the calls to action, the add buttons, the newsletter box
// — is a span or a div, never a button or an input, and the purely decorative
// ones are aria-hidden. A preview of somebody else's page that answered a
// click, or that a screen reader announced as a form, would be lying about
// what it is.
//
// Figures no draft can supply — the rating, the struck-through "was" price, the
// dish blurb — are visibly one repeated sample rather than invented variety, so
// nobody mistakes them for their own data.
import { ChevronDown, ClipboardList, Globe, Heart, MapPin, Search, ShoppingBag, Star } from "lucide-react";
import clsx from "clsx";
import { useI18n } from "@/app/providers/i18n-provider";
import { storefrontAsset } from "@/shared/lib/storefront-assets";
import { fontStack, readableOn, styleTokens, type StyleTokens } from "@/shared/lib/brand-tokens";
import type { StorefrontPreviewModel } from "./model";

// The five mosaic cells, in the order serviceCategoriesFor fills them. The
// middle column runs tall through both rows — that is what gives the block its
// magazine look rather than an even row.
// One resolver for both places a category name is drawn — the mosaic tiles and
// the product cards. A host that supplies literal labels gets them verbatim;
// everyone else keeps the i18n-key path they already had.
function categoryLabel(
  model: StorefrontPreviewModel,
  index: number,
  t: (key: string) => string
): string {
  const labels = model.categoryLabels;
  if (labels && labels.length > 0) return labels[index % labels.length];
  return t(model.categories[index % model.categories.length]);
}

const MOSAIC: readonly { area: string; tall?: boolean }[] = [
  { area: "1 / 1 / 2 / 2" },
  { area: "1 / 2 / 3 / 3", tall: true },
  { area: "1 / 3 / 2 / 4" },
  { area: "2 / 1 / 3 / 2" },
  { area: "2 / 3 / 3 / 4" },
];

export function StorefrontPreview({ model }: { model: StorefrontPreviewModel }) {
  const { t, locale } = useI18n();
  const mobile = model.device === "mobile";

  const style = styleTokens(model.themeTemplate);
  const onPrimary = readableOn(model.primary);
  const businessName = model.businessName;

  // `sections` and `navItems` are derived independently by each adapter — the
  // builder's `sections` is a filtered list of drawable blocks while its
  // `navItems` is the full page list — so nothing guarantees a shared id sits
  // at the same index in both. The heading therefore comes from the model's
  // own explicit map, not a position lookup.
  function labelKeyFor(id: string): string {
    return model.sectionLabelKeys[id] ?? id;
  }

  const heroHeadline = model.hero.headline ?? businessName;
  const heroSub = model.hero.sub ?? t("onboarding.publicLink.previewTagline");
  const heroPrimaryCta = model.hero.primaryCta ?? t("onboarding.publicLink.previewOrder");
  const heroSecondaryCta = model.hero.secondaryCta ?? t("onboarding.publicLink.previewMenu");
  const heroImage = model.hero.imageUrl ?? storefrontAsset("hero.webp");

  // The storefront's soft tile surface is --octo-store-soft over in the
  // customer app; the merchant app has no such token, so the tint is mixed from
  // the brand colour here — which also makes the tiles the merchant's own
  // rather than a fixed grey.
  const softTile = `color-mix(in srgb, ${model.primary} 6%, var(--octo-hover))`;
  const footerBg = `color-mix(in srgb, ${model.primary} 7%, var(--octo-card))`;

  function productCard(index: number) {
    // A real dish when the host supplied one, otherwise the category-and-sample
    // treatment the storefront hosts rely on.
    const products = model.products;
    const product =
      products && products.length > 0 ? products[index % products.length] : null;
    return (
      <article
        key={index}
        className="flex flex-col border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-2"
        style={{ borderRadius: style.radius }}
      >
        {/* Favourite on the start edge, rating on the end — the storefront card
            puts its best-seller badge in that same slot. */}
        <div className="flex items-center justify-between gap-2" aria-hidden>
          <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border border-[var(--octo-border-card)]">
            <Heart size={9} className="text-[var(--octo-text-faint)]" />
          </span>
          <span className="inline-flex items-center gap-0.5 text-[8.5px] font-semibold text-[var(--octo-text-secondary)]">
            <Star size={9} className="fill-[#FFB020] text-[#FFB020]" />
            4.5
          </span>
        </div>

        <img
          src={
            product?.image ??
            storefrontAsset(model.categoryImages[index % model.categoryImages.length])
          }
          alt=""
          className="mx-auto mt-1.5 h-[76px] w-auto max-w-full object-contain"
        />

        <p className="mt-2 truncate text-start text-[10px] font-bold text-[var(--octo-text-primary)]">
          {product ? product.name : categoryLabel(model, index, t)}
        </p>
        <p className="mt-1 line-clamp-2 text-start text-[8px] leading-[1.6] text-[var(--octo-text-muted)]">
          {product
            ? product.description || t("onboarding.publicLink.previewDish")
            : t("onboarding.publicLink.previewDish")}
        </p>

        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <span
            className="grid h-[20px] w-[20px] shrink-0 place-items-center rounded-full"
            style={{ backgroundColor: model.primary, color: onPrimary }}
            aria-hidden
          >
            <ShoppingBag size={10} />
          </span>
          <span className="min-w-0 text-end">
            {(product || model.samplePrices.length > 0) && (
              <span className="block truncate text-[10px] font-bold text-[var(--octo-text-primary)]">
                {product
                  ? product.price
                  : model.samplePrices[index % model.samplePrices.length]}
              </span>
            )}
            {model.sampleWasPrices.length > 0 && (
              <span className="block truncate text-[8px] text-[var(--octo-text-faint)] line-through">
                {model.sampleWasPrices[index % model.sampleWasPrices.length]}
              </span>
            )}
          </span>
        </div>
      </article>
    );
  }

  // The widget switches structurally on the block kinds it knows how to draw,
  // not on a host's own dictionary of section names — the second host's ids
  // (reservations, testimonials, instagram, …) simply render nothing here.
  function section(id: string) {
    switch (id) {
      // Centred, over a top-to-bottom scrim, with two pills — the storefront
      // StoreHero exactly.
      case "hero":
        return (
          <section key={id} className="relative isolate overflow-hidden">
            <img src={heroImage} alt="" className="h-[190px] w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/45 to-black/30" aria-hidden />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
              <p className="max-w-[80%] text-[19px] font-bold leading-[1.4] text-white">{heroHeadline}</p>
              <p className="max-w-[70%] text-[9.5px] leading-[1.9] text-white/85">{heroSub}</p>
              <div className="mt-1 flex flex-wrap items-center justify-center gap-2" aria-hidden>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[9.5px] font-semibold"
                  style={{ backgroundColor: model.primary, color: onPrimary }}
                >
                  <ClipboardList size={11} />
                  {heroPrimaryCta}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/70 px-4 py-1.5 text-[9.5px] text-white">
                  <ClipboardList size={11} />
                  {heroSecondaryCta}
                </span>
              </div>
            </div>
          </section>
        );

      // Five soft tiles, the middle one running tall through both rows. The
      // photographs are cut-outs on white, so they sit contained beside the
      // label rather than cropped to fill the tile.
      case "menu":
        return (
          <section key={id} className="px-4 pt-5">
            <SectionHeading style={style} accent={model.primary}>{t(labelKeyFor(id))}</SectionHeading>
            <div
              className={clsx("mt-3 grid gap-2", mobile ? "grid-cols-2" : "grid-cols-3")}
              style={mobile ? undefined : { gridTemplateRows: "88px 88px" }}
            >
              {MOSAIC.map((slot, i) => {
                const key = categoryLabel(model, i, t);
                const image = model.categoryImages[i % model.categoryImages.length];
                return (
                  <div
                    key={`${key}-${i}`}
                    className={clsx(
                      "relative flex overflow-hidden border border-[var(--octo-border-card)] p-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
                      slot.tall ? "flex-col" : i % 2 === 0 ? "flex-row" : "flex-row-reverse"
                    )}
                    style={{
                      borderRadius: style.radius,
                      backgroundColor: softTile,
                      ...(mobile ? { minHeight: 88 } : { gridArea: slot.area }),
                    }}
                  >
                    <span
                      className={clsx(
                        "z-10 text-[10px] font-bold text-[var(--octo-text-primary)]",
                        slot.tall ? "text-center" : "flex flex-1 items-center"
                      )}
                    >
                      {key}
                    </span>
                    <img
                      src={storefrontAsset(image)}
                      alt=""
                      loading="lazy"
                      className={clsx("z-10 object-contain", slot.tall ? "mt-1.5 h-full min-h-0 w-full" : "h-full w-1/2")}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        );

      case "bestSeller":
      case "offers":
        return (
          <section key={id} className="px-4 pt-5">
            <SectionHeading style={style} accent={model.primary}>{t(labelKeyFor(id))}</SectionHeading>
            <div className={clsx("mt-3 grid gap-2", mobile ? "grid-cols-2" : "grid-cols-4")}>
              {Array.from({ length: mobile ? 2 : 4 }, (_, i) => productCard(i))}
            </div>
          </section>
        );

      // A model can carry a section id this build no longer renders, or one
      // that belongs to a different host entirely. Skip it rather than
      // throwing.
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
      style={{ fontFamily: fontStack(model.font, locale) }}
    >
      <header className="flex items-center justify-between gap-4 border-b border-[var(--octo-border-card)] bg-[var(--octo-card)] px-4 py-2.5">
        {model.logoDataUrl ? (
          <img src={model.logoDataUrl} alt="" className="h-[22px] shrink-0 object-contain" />
        ) : (
          <span
            className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-lg text-[10px] font-bold"
            style={{ backgroundColor: model.primary, color: onPrimary }}
          >
            {businessName.trim().charAt(0).toUpperCase() || "O"}
          </span>
        )}

        {/* The nav is entirely host-supplied — reorder the sections below (or
            the pages, in the builder) and this menu follows. `navFurniture`
            covers entries with no page of their own: onboarding's Home
            (leading — its own `navItems` has no Home entry at all, since its
            `hero` item is deliberately invisible there and carries a
            different label, "Hero Section", meant for the section editor)
            and its About/Contact (trailing, for the same reason). The
            builder needs neither half — its pages already cover Home, About
            and Contact through real `navItems` entries — so it omits
            `navFurniture` entirely. Either way this widget never hardcodes a
            host's content (the same principle as `sectionLabelKeys`).
            The active/underline treatment is genuine chrome (every
            storefront highlights its current page the same way) but is
            named by the host via `activeNavLabelKey`, matched by label key
            rather than position — a merchant who drags Home out of first
            place in the builder's Page Order must still see Home
            underlined, not whatever now sits first. No match means no
            underline; there is no positional fallback. */}
        {!mobile && (model.showHeaderNav ?? true) && (
          <nav className="flex min-w-0 items-center gap-3.5 overflow-x-auto text-[9px] text-[var(--octo-text-primary)]">
            {[...(model.navFurniture?.leading ?? []), ...model.navItems, ...(model.navFurniture?.trailing ?? [])]
              .filter((item) => item.visible)
              .map((item, i) =>
                item.labelKey === model.activeNavLabelKey ? (
                  <span key={i} className="relative whitespace-nowrap font-semibold" style={{ color: model.primary }}>
                    {t(item.labelKey)}
                    <span
                      className="absolute inset-x-0 -bottom-[11px] h-[2px]"
                      style={{ backgroundColor: model.primary }}
                      aria-hidden
                    />
                  </span>
                ) : (
                  <span key={i} className="whitespace-nowrap">{t(item.labelKey)}</span>
                )
              )}
          </nav>
        )}

        <span className="flex shrink-0 items-center gap-2" aria-hidden>
          <span className="inline-flex items-center gap-0.5 text-[8.5px] text-[var(--octo-text-secondary)]">
            <Globe size={9} />
            {locale === "ar" ? "العربية" : "English"}
            <ChevronDown size={8} />
          </span>
          <Search size={11} className="text-[var(--octo-text-muted)]" />
          <span
            className="grid h-[24px] w-[24px] place-items-center rounded-[8px]"
            style={{ backgroundColor: model.primary, color: onPrimary }}
          >
            <ShoppingBag size={12} />
          </span>
        </span>
      </header>

      {/* The Theme step is designing the menu page, not the landing page, so
          it asks for a different body under the same header and footer rather
          than a second widget that would drift from this one. */}
      {model.composition === "menu" ? (
        <div className="pb-5">
          <div className="flex gap-2 overflow-x-auto px-4 pt-4">
            {(model.categoryLabels ?? model.categories).map((label, i) => (
              <span
                key={`${label}-${i}`}
                className={clsx(
                  "shrink-0 rounded-full border px-3 py-1 text-[10px] font-semibold",
                  i === 0 ? "text-white" : "text-[var(--octo-text-secondary)]"
                )}
                style={
                  i === 0
                    ? { backgroundColor: model.primary, borderColor: model.primary }
                    : { borderColor: "var(--octo-border-card)" }
                }
              >
                {label}
              </span>
            ))}
          </div>
          <div className={clsx("mt-3 grid gap-2 px-4", mobile ? "grid-cols-2" : "grid-cols-4")}>
            {Array.from({ length: mobile ? 6 : 12 }, (_, i) => productCard(i))}
          </div>
        </div>
      ) : (
        <div className="pb-5">{model.sections.map(section)}</div>
      )}

      {/* Only what the model already knows: the name, the sections, the city,
          the hours and the link being shown on this very screen. No invented
          phone numbers or social accounts. */}
      <footer className="px-4 py-4" style={{ backgroundColor: footerBg }}>
        <div className={clsx("grid gap-4", mobile ? "grid-cols-2" : "grid-cols-4")}>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              {model.logoDataUrl ? (
                <img src={model.logoDataUrl} alt="" className="h-4 shrink-0 object-contain" />
              ) : (
                <span
                  className="grid h-4 w-4 shrink-0 place-items-center rounded text-[8px] font-bold"
                  style={{ backgroundColor: model.primary, color: onPrimary }}
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
            {model.navItems.map((item, i) => (
              <p key={i} className="truncate">{t(item.labelKey)}</p>
            ))}
          </FooterColumn>

          <FooterColumn title={t("onboarding.publicLink.previewContact")}>
            {model.cityLabel && (
              <p className="inline-flex items-center gap-1">
                <MapPin size={8} aria-hidden />
                {model.cityLabel}
              </p>
            )}
            <p className="truncate">{model.url}</p>
          </FooterColumn>

          <div className="min-w-0">
            {model.hoursSummary && (
              <>
                <p className="text-start text-[9px] font-bold text-[var(--octo-text-primary)]">
                  {t("onboarding.details.hours")}
                </p>
                <p className="mt-1.5 text-start text-[8px] text-[var(--octo-text-muted)]">
                  {model.hoursSummary}
                </p>
              </>
            )}
            <span className="mt-2 flex items-stretch gap-1" aria-hidden>
              <span className="min-w-0 flex-1 truncate rounded-[6px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-1.5 py-1 text-[8px] text-[var(--octo-text-faint)]">
                {t("onboarding.publicLink.previewNewsletter")}
              </span>
              <span
                className="shrink-0 rounded-[6px] px-2 py-1 text-[8px] font-semibold"
                style={{ backgroundColor: model.primary, color: onPrimary }}
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

// The storefront SectionHeading: a rounded bar in the brand colour on the
// reading-start side, then the label.
function SectionHeading({ style, accent, children }: { style: StyleTokens; accent: string; children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2">
      <span className="h-[14px] w-[3px] shrink-0 rounded-full" style={{ backgroundColor: accent }} aria-hidden />
      <span
        className="text-[13px] text-[var(--octo-text-primary)]"
        style={{
          fontWeight: style.headingWeight,
          letterSpacing: style.headingTracking,
          textTransform: style.headingTransform,
        }}
      >
        {children}
      </span>
    </h3>
  );
}
