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
// The menu builder additionally passes theme options (category, card and nav
// style, tags, sticky cart, per-section groups). Every one is optional, and a
// host that passes none gets exactly the page it got before.
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
import {
  ChevronDown,
  ClipboardList,
  ExternalLink,
  Globe,
  Heart,
  House,
  LayoutGrid,
  MapPin,
  Menu as MenuIcon,
  Search,
  ShoppingBag,
  Star,
  User,
} from "lucide-react";
import clsx from "clsx";
import type { CSSProperties, ReactNode } from "react";
import { useI18n } from "@/app/providers/i18n-provider";
import { storefrontAsset } from "@/shared/lib/storefront-assets";
import { fontStack, readableOn, styleTokens, type StyleTokens } from "@/shared/lib/brand-tokens";
import type { StorefrontPreviewModel } from "./model";

// One resolver for both places a category name is drawn — the mosaic tiles and
// the product cards. A host that supplies literal labels gets them verbatim,
// and an index past their end is a placeholder (null) rather than the first
// label again; everyone else keeps the i18n-key path they already had.
function categoryLabel(
  model: StorefrontPreviewModel,
  index: number,
  t: (key: string) => string
): string | null {
  const labels = model.categoryLabels;
  if (labels) return index < labels.length ? labels[index] : null;
  return t(model.categories[index % model.categories.length]);
}

// The five mosaic cells, in the order serviceCategoriesFor fills them. The
// middle column runs tall through both rows — that is what gives the block its
// magazine look rather than an even row.
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
  const titleFont = fontStack(model.font, locale);
  const bodyFont = fontStack(model.bodyFont ?? model.font, locale);
  const cardStyle = model.cardStyle ?? "classic";
  const navStyle = model.navStyle;

  // `sections` and `navItems` are derived independently by each adapter, so
  // the heading comes from the model's own explicit map, not a position lookup.
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

  /** The section's own upload when there is one, else the stock photograph. */
  function categoryImage(index: number): string {
    return (
      model.categoryImageUrls?.[index] ??
      storefrontAsset(model.categoryImages[index % model.categoryImages.length])
    );
  }

  function tagBadge(tags: readonly string[]) {
    if (tags.length === 0) return null;
    return (
      <span
        className="inline-block max-w-full truncate rounded-full px-1.5 py-[1px] text-[7.5px] font-semibold"
        style={{ backgroundColor: `color-mix(in srgb, ${model.primary} 14%, transparent)`, color: model.primary }}
      >
        {tags[0]}
      </span>
    );
  }

  function productCard(index: number) {
    // A real dish when the host supplied one, otherwise the category-and-sample
    // treatment the storefront hosts rely on.
    const products = model.products;
    const hasProducts = Boolean(products && products.length > 0);
    const productIndex = hasProducts ? index % products!.length : -1;
    const product = hasProducts ? products![productIndex] : null;
    const title = product ? product.name : (categoryLabel(model, index, t) ?? t("menuTheme.previewItemPlaceholder"));
    const description = product?.description || t("onboarding.publicLink.previewDish");
    const image = product?.image ?? storefrontAsset(model.categoryImages[index % model.categoryImages.length]);
    const price = product
      ? product.price
      : model.samplePrices.length > 0
        ? model.samplePrices[index % model.samplePrices.length]
        : null;
    const was =
      model.sampleWasPrices.length > 0 ? model.sampleWasPrices[index % model.sampleWasPrices.length] : null;
    const tags = model.showItemTags && product ? (model.productTags?.[productIndex] ?? []) : [];

    const addButton = (
      <span
        className="grid h-[20px] w-[20px] shrink-0 place-items-center rounded-full"
        style={{ backgroundColor: model.primary, color: onPrimary }}
        aria-hidden
      >
        <ShoppingBag size={10} />
      </span>
    );
    // Never truncated: a price cut to "SAR…" is the one figure a customer
    // cannot be left guessing. It wraps under the button before it clips.
    const priceBlock = (
      <span className="shrink-0 text-end">
        {price && (
          <span className="block whitespace-nowrap text-[10px] font-bold text-[var(--octo-text-primary)]">{price}</span>
        )}
        {was && (
          <span className="block whitespace-nowrap text-[8px] text-[var(--octo-text-faint)] line-through">{was}</span>
        )}
      </span>
    );
    const name = (
      <p className="truncate text-start text-[10px] font-bold text-[var(--octo-text-primary)]" style={{ fontFamily: titleFont }}>
        {title}
      </p>
    );

    if (cardStyle === "clean-minimal") {
      return (
        <article key={index} className="flex flex-col gap-1 border-b border-[var(--octo-border-card)] px-1 py-2">
          {tagBadge(tags)}
          <div className="flex items-baseline justify-between gap-2">
            <div className="min-w-0">{name}</div>
            {priceBlock}
          </div>
          <p className="line-clamp-2 text-start text-[8px] leading-[1.6] text-[var(--octo-text-muted)]">{description}</p>
        </article>
      );
    }

    if (cardStyle === "image-top") {
      return (
        <article
          key={index}
          className="flex flex-col overflow-hidden border border-[var(--octo-border-card)] bg-[var(--octo-card)]"
          style={{ borderRadius: style.radius }}
        >
          <div className="relative h-[72px] w-full" style={{ backgroundColor: softTile }}>
            <img src={image} alt="" className="h-full w-full object-cover" />
            {tags.length > 0 && <span className="absolute start-1.5 top-1.5">{tagBadge(tags)}</span>}
          </div>
          <div className="flex flex-1 flex-col p-2">
            {name}
            <p className="mt-1 line-clamp-2 text-start text-[8px] leading-[1.6] text-[var(--octo-text-muted)]">{description}</p>
            <div className="mt-auto flex flex-wrap items-end justify-between gap-1 pt-2">
              {addButton}
              {priceBlock}
            </div>
          </div>
        </article>
      );
    }

    if (cardStyle === "image-left") {
      return (
        <article
          key={index}
          className="flex items-stretch gap-2 border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-2"
          style={{ borderRadius: style.radius }}
        >
          <img
            src={image}
            alt=""
            className="h-[58px] w-[58px] shrink-0 rounded-[8px] object-cover"
            style={{ backgroundColor: softTile }}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            {tagBadge(tags)}
            {name}
            <p className="line-clamp-1 text-start text-[8px] text-[var(--octo-text-muted)]">{description}</p>
            <div className="mt-auto flex flex-wrap items-end justify-between gap-1">
              {priceBlock}
              {addButton}
            </div>
          </div>
        </article>
      );
    }

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
        {tags.length > 0 && <div className="mt-1">{tagBadge(tags)}</div>}

        <img src={image} alt="" className="mx-auto mt-1.5 h-[76px] w-auto max-w-full object-contain" />

        <div className="mt-2">{name}</div>
        <p className="mt-1 line-clamp-2 text-start text-[8px] leading-[1.6] text-[var(--octo-text-muted)]">{description}</p>

        <div className="mt-auto flex flex-wrap items-end justify-between gap-1 pt-2">
          {addButton}
          {priceBlock}
        </div>
      </article>
    );
  }

  function offerCards() {
    const offers = model.offers ?? [];
    return offers.slice(0, mobile ? 2 : 4).map((offer, i) => (
      <article
        key={`${offer.name}-${i}`}
        className="flex flex-col overflow-hidden border border-[var(--octo-border-card)] bg-[var(--octo-card)]"
        style={{ borderRadius: style.radius }}
      >
        <div className="h-[64px]" style={{ backgroundColor: softTile }}>
          <img
            src={offer.image ?? storefrontAsset(model.categoryImages[i % model.categoryImages.length])}
            alt=""
            className="h-full w-full object-contain"
          />
        </div>
        <div className="flex flex-1 flex-col gap-1 p-2">
          <p className="line-clamp-2 text-start text-[10px] font-bold text-[var(--octo-text-primary)]" style={{ fontFamily: titleFont }}>
            {offer.name}
          </p>
          <span className="mt-auto whitespace-nowrap text-start text-[10px] font-bold" style={{ color: model.primary }}>
            {offer.price}
          </span>
        </div>
      </article>
    ));
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
            <img
              src={heroImage}
              alt=""
              className={clsx(
                "w-full object-cover",
                model.hero.height === "compact" ? "h-[150px]" : model.hero.height === "tall" ? "h-[240px]" : "h-[190px]"
              )}
            />
            {/* A host-set darkness is a flat scrim of that strength; without
                one, the storefront's own gradient. */}
            {model.hero.overlay !== undefined ? (
              <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${model.hero.overlay / 100})` }} aria-hidden />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/45 to-black/30" aria-hidden />
            )}
            <div
              className={clsx(
                "absolute inset-0 flex flex-col justify-center gap-2 px-6",
                model.hero.align === "start" ? "items-start ps-8 text-start" : "items-center text-center"
              )}
            >
              <p className="max-w-[80%] text-[19px] font-bold leading-[1.4] text-white" style={{ fontFamily: titleFont }}>
                {heroHeadline}
              </p>
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
      // label rather than cropped to fill the tile. A host with fewer literal
      // labels than tiles gets neutral placeholders, not a repeated name.
      case "menu":
        return (
          <section key={id} className="px-4 pt-5">
            <SectionHeading style={style} accent={model.primary} font={titleFont}>{t(labelKeyFor(id))}</SectionHeading>
            <div
              className={clsx("mt-3 grid gap-2", mobile ? "grid-cols-2" : "grid-cols-3")}
              style={mobile ? undefined : { gridTemplateRows: "88px 88px" }}
            >
              {MOSAIC.map((slot, i) => {
                const label = categoryLabel(model, i, t);
                const placeholder = label === null;
                const accent = model.categoryColors?.[i] ?? null;
                return (
                  <div
                    key={`${label ?? "placeholder"}-${i}`}
                    className={clsx(
                      "relative flex overflow-hidden border p-2.5",
                      placeholder
                        ? "items-center justify-center border-dashed border-[var(--octo-border-input)]"
                        : "border-[var(--octo-border-card)] shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
                      !placeholder && (slot.tall ? "flex-col" : i % 2 === 0 ? "flex-row" : "flex-row-reverse")
                    )}
                    style={{
                      borderRadius: style.radius,
                      backgroundColor: placeholder ? "transparent" : softTile,
                      ...(accent ? { borderInlineStartWidth: 3, borderInlineStartColor: accent } : null),
                      ...(mobile ? { minHeight: 88 } : { gridArea: slot.area }),
                    }}
                  >
                    {placeholder ? (
                      <span className="text-[9px] text-[var(--octo-text-faint)]">
                        {t("menuTheme.previewSectionPlaceholder")}
                      </span>
                    ) : (
                      <>
                        <span
                          className={clsx(
                            "z-10 text-[10px] font-bold text-[var(--octo-text-primary)]",
                            slot.tall ? "text-center" : "flex flex-1 items-center"
                          )}
                        >
                          {label}
                        </span>
                        <img
                          src={categoryImage(i)}
                          alt=""
                          loading="lazy"
                          className={clsx("z-10 object-contain", slot.tall ? "mt-1.5 h-full min-h-0 w-full" : "h-full w-1/2")}
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );

      case "bestSeller":
      case "offers": {
        const realOffers = id === "offers" && model.offers && model.offers.length > 0;
        return (
          <section key={id} className="px-4 pt-5">
            <SectionHeading style={style} accent={model.primary} font={titleFont}>{t(labelKeyFor(id))}</SectionHeading>
            <div className={clsx("mt-3 grid gap-2", mobile ? "grid-cols-2" : "grid-cols-4")}>
              {realOffers ? offerCards() : Array.from({ length: mobile ? 2 : 4 }, (_, i) => productCard(i))}
            </div>
          </section>
        );
      }

      // A model can carry a section id this build no longer renders, or one
      // that belongs to a different host entirely. Skip it rather than
      // throwing.
      default:
        return null;
    }
  }

  /* ----------------------------------------------------- menu composition */

  const stripEntries: { label: string; index: number; placeholder: boolean }[] = (() => {
    const labels = model.categoryLabels ?? model.categories.map((key) => t(key));
    if (labels.length > 0) return labels.map((label, index) => ({ label, index, placeholder: false }));
    return Array.from({ length: 4 }, (_, index) => ({
      label: t("menuTheme.previewSectionPlaceholder"),
      index,
      placeholder: true,
    }));
  })();

  function categoryStrip() {
    const kind = model.categoryStyle ?? "text-only";

    if (kind === "text-only") {
      return (
        <div className="flex gap-2 overflow-x-auto">
          {stripEntries.map(({ label, index, placeholder }) => (
            <span
              key={`${label}-${index}`}
              className={clsx(
                "shrink-0 rounded-full border px-3 py-1 text-[10px] font-semibold",
                index === 0 && !placeholder ? "" : "text-[var(--octo-text-secondary)]",
                placeholder && "border-dashed"
              )}
              style={
                index === 0 && !placeholder
                  ? { backgroundColor: model.primary, borderColor: model.primary, color: onPrimary }
                  : { borderColor: model.categoryColors?.[index] ?? "var(--octo-border-card)" }
              }
            >
              {label}
            </span>
          ))}
        </div>
      );
    }

    if (kind === "image-text") {
      return (
        <div className="flex gap-2 overflow-x-auto">
          {stripEntries.map(({ label, index, placeholder }) => (
            <span
              key={`${label}-${index}`}
              className={clsx(
                "relative flex h-[58px] w-[92px] shrink-0 items-end overflow-hidden border-b-[3px]",
                placeholder && "border border-dashed border-[var(--octo-border-input)]"
              )}
              style={{
                borderRadius: style.radius,
                backgroundColor: softTile,
                borderBottomColor: index === 0 ? model.primary : (model.categoryColors?.[index] ?? "transparent"),
              }}
            >
              {!placeholder && <img src={categoryImage(index)} alt="" className="absolute inset-0 h-full w-full object-cover" />}
              <span className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" aria-hidden />
              <span className="relative w-full truncate px-1.5 pb-1 text-start text-[9px] font-semibold text-white">{label}</span>
            </span>
          ))}
        </div>
      );
    }

    // icon-text and icons-only: the frame's round photo chips in one soft
    // rounded container, the active one ringed in the brand colour.
    const withText = kind === "icon-text";
    return (
      <div className="flex gap-3 overflow-x-auto rounded-[12px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-2">
        {stripEntries.map(({ label, index, placeholder }) => {
          const active = index === 0 && !placeholder;
          return (
            <span key={`${label}-${index}`} className="flex w-[50px] shrink-0 flex-col items-center gap-1" title={label}>
              <span
                className={clsx(
                  "grid h-[40px] w-[40px] place-items-center overflow-hidden rounded-full border-2",
                  placeholder && "border-dashed"
                )}
                style={{
                  backgroundColor: softTile,
                  borderColor: active
                    ? model.primary
                    : (model.categoryColors?.[index] ?? "var(--octo-border-card)"),
                }}
              >
                {!placeholder && <img src={categoryImage(index)} alt="" className="h-full w-full object-cover" />}
              </span>
              {withText && (
                <span
                  className="w-full truncate text-center text-[8.5px] font-medium"
                  style={{ color: active ? model.primary : "var(--octo-text-secondary)" }}
                >
                  {label}
                </span>
              )}
            </span>
          );
        })}
      </div>
    );
  }

  function groupCards(layout: "list" | "carousel" | "grid", indexes: readonly number[]) {
    const horizontal = cardStyle === "image-left" || cardStyle === "clean-minimal";
    if (indexes.length === 0) {
      return (
        <div
          className="mt-2 grid h-[54px] place-items-center border border-dashed border-[var(--octo-border-input)] text-[9px] text-[var(--octo-text-faint)]"
          style={{ borderRadius: style.radius }}
        >
          {t("menuTheme.previewItemPlaceholder")}
        </div>
      );
    }
    if (layout === "carousel") {
      return (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {indexes.map((i) => (
            <div key={i} className={clsx("shrink-0", horizontal || mobile ? "w-[62%]" : "w-[38%]")}>
              {productCard(i)}
            </div>
          ))}
        </div>
      );
    }
    const cols =
      layout === "list"
        ? horizontal || mobile
          ? "grid-cols-1"
          : "grid-cols-2"
        : horizontal
          ? mobile
            ? "grid-cols-1"
            : "grid-cols-2"
          : mobile
            ? "grid-cols-2"
            : "grid-cols-4";
    return <div className={clsx("mt-2 grid gap-2", cols)}>{indexes.map((i) => productCard(i))}</div>;
  }

  function menuBody() {
    return (
      <div className="min-w-0 flex-1 pb-5">
        <div className="px-4 pt-4">{categoryStrip()}</div>
        {model.menuGroups ? (
          model.menuGroups.map((group, g) => (
            <section key={`${group.label}-${g}`} className="px-4 pt-4">
              <SectionHeading style={style} accent={group.color ?? model.primary} font={titleFont}>
                {group.label}
              </SectionHeading>
              {groupCards(group.layout, group.products)}
            </section>
          ))
        ) : (
          <div className={clsx("mt-3 grid gap-2 px-4", mobile ? "grid-cols-2" : "grid-cols-4")}>
            {Array.from({ length: mobile ? 6 : 12 }, (_, i) => productCard(i))}
          </div>
        )}
        {model.menuGroups && model.menuGroups.length === 0 && (
          <div className="px-4 pt-4">{groupCards("grid", [])}</div>
        )}
        {model.offers && model.offers.length > 0 && (
          <section className="px-4 pt-4">
            <SectionHeading style={style} accent={model.primary} font={titleFont}>{t(labelKeyFor("offers"))}</SectionHeading>
            <div className={clsx("mt-2 grid gap-2", mobile ? "grid-cols-2" : "grid-cols-4")}>{offerCards()}</div>
          </section>
        )}
      </div>
    );
  }

  const stickyCart = model.stickyAddToCart ? (
    <div className="px-3 pb-2">
      <div
        className="flex items-center justify-between gap-2 rounded-[10px] px-3 py-2 text-[10px] font-semibold shadow-[0_4px_12px_rgba(15,23,42,0.18)]"
        style={{ backgroundColor: model.primary, color: onPrimary }}
        aria-hidden
      >
        <span className="inline-flex items-center gap-1.5">
          <ShoppingBag size={12} />
          {t("menuTheme.previewViewCart")}
        </span>
        <span className="whitespace-nowrap">{model.products?.[0]?.price ?? model.samplePrices[0]}</span>
      </div>
    </div>
  ) : null;

  const bottomBar =
    navStyle === "bottom-bar" ? (
      <div
        className="grid grid-cols-4 border-t border-[var(--octo-border-card)] bg-[var(--octo-card)] py-1.5"
        aria-hidden
      >
        {[House, LayoutGrid, ShoppingBag, User].map((Icon, i) => (
          <span key={i} className="grid place-items-center">
            <span className="grid h-6 w-6 place-items-center rounded-full" style={i === 1 ? { color: model.primary } : undefined}>
              <Icon size={13} className={i === 1 ? undefined : "text-[var(--octo-text-muted)]"} />
            </span>
            <span
              className="mt-0.5 h-[3px] w-3 rounded-full"
              style={{ backgroundColor: i === 1 ? model.primary : "transparent" }}
            />
          </span>
        ))}
      </div>
    ) : null;

  const pillBar =
    navStyle === "pill-scroll" ? (
      <div
        className="sticky top-0 z-20 flex gap-1.5 overflow-x-auto border-b border-[var(--octo-border-card)] bg-[var(--octo-card)] px-4 py-2"
        aria-hidden
      >
        {stripEntries.map(({ label, index }) => (
          <span
            key={`${label}-${index}`}
            className="shrink-0 rounded-full px-2.5 py-[3px] text-[9px] font-semibold"
            style={
              index === 0
                ? { backgroundColor: model.primary, color: onPrimary }
                : { backgroundColor: softTile, color: "var(--octo-text-secondary)" }
            }
          >
            {label}
          </span>
        ))}
      </div>
    ) : null;

  const drawer =
    navStyle === "side-drawer" && !mobile ? (
      <aside
        className="w-[26%] shrink-0 border-e border-[var(--octo-border-card)] bg-[var(--octo-card)] py-4"
        aria-hidden
      >
        {stripEntries.map(({ label, index }) => (
          <span
            key={`${label}-${index}`}
            className="flex items-center gap-1.5 truncate px-3 py-1.5 text-[9.5px]"
            style={
              index === 0
                ? { color: model.primary, fontWeight: 600, backgroundColor: softTile }
                : { color: "var(--octo-text-secondary)" }
            }
          >
            <span
              className="h-3 w-[2px] shrink-0 rounded-full"
              style={{ backgroundColor: index === 0 ? model.primary : "transparent" }}
            />
            {label}
          </span>
        ))}
      </aside>
    ) : null;

  return (
    <div
      className={clsx(
        // `overflow-clip`, not `overflow-hidden`: hidden would make this box a
        // scroll container and stop the sticky cart and nav bars sticking to
        // the host's scroll area.
        "mx-auto overflow-clip rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-page-bg)]",
        mobile && "max-w-[320px]"
      )}
      // The merchant's typeface applies to the depicted page only — the wizard
      // chrome around it stays in the app's own face.
      style={{ fontFamily: bodyFont }}
    >
      <header
        className={clsx(
          "flex items-center justify-between gap-4 border-b border-[var(--octo-border-card)] bg-[var(--octo-card)] px-4 py-2.5",
          model.stickyHeader && "sticky top-0 z-30"
        )}
      >
        <span className="flex shrink-0 items-center gap-2">
          {navStyle === "side-drawer" && (
            <MenuIcon size={14} className="text-[var(--octo-text-primary)]" aria-hidden />
          )}
          {model.logoDataUrl ? (
            <img src={model.logoDataUrl} alt="" className="h-[22px] max-w-[80px] shrink-0 object-contain" />
          ) : (
            <span
              className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-lg text-[10px] font-bold"
              style={{ backgroundColor: model.primary, color: onPrimary }}
            >
              {businessName.trim().charAt(0).toUpperCase() || "O"}
            </span>
          )}
        </span>

        {/* The nav is entirely host-supplied — reorder the sections below (or
            the pages, in the builder) and this menu follows. `navFurniture`
            covers entries with no page of their own (onboarding's Home,
            About, Contact). The active/underline treatment is named by the
            host via `activeNavLabelKey`, matched by label key rather than
            position; no match means no underline. */}
        {!mobile && (model.showHeaderNav ?? true) && (
          <nav className="flex min-w-0 items-center gap-3.5 overflow-x-auto text-[9px] text-[var(--octo-text-primary)]">
            {[...(model.navFurniture?.leading ?? []), ...model.navItems, ...(model.navFurniture?.trailing ?? [])]
              .filter((item) => item.visible)
              .map((item, i) => {
                const external = model.navOpensNewTab ? (
                  <ExternalLink size={7} className="ms-0.5 inline-block opacity-60" aria-hidden />
                ) : null;
                return item.labelKey === model.activeNavLabelKey && (model.activeIndicator ?? true) ? (
                  <span key={i} className="relative whitespace-nowrap font-semibold" style={{ color: model.primary }}>
                    {t(item.labelKey)}
                    {external}
                    <span
                      className="absolute inset-x-0 -bottom-[11px] h-[2px]"
                      style={{ backgroundColor: model.primary }}
                      aria-hidden
                    />
                  </span>
                ) : (
                  <span key={i} className="whitespace-nowrap">
                    {t(item.labelKey)}
                    {external}
                  </span>
                );
              })}
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
        <>
          {pillBar}
          <div className={clsx(drawer && "flex")}>
            {drawer}
            {menuBody()}
          </div>
          {(stickyCart || bottomBar) && (
            <div className="sticky bottom-0 z-20">
              {stickyCart}
              {bottomBar}
            </div>
          )}
        </>
      ) : (
        // Each drawn block is tagged `data-preview-slide` so a host that pages
        // through the preview (the builder's dots and arrows) can find them.
        <div className="pb-5">
          {model.sections.map((id) => {
            const node = section(id);
            return node ? (
              <div key={id} data-preview-slide>
                {node}
              </div>
            ) : null;
          })}
        </div>
      )}

      {/* Only what the model already knows: the name, the sections, the city,
          the hours and the link being shown on this very screen. No invented
          phone numbers or social accounts. */}
      <footer data-preview-slide className="px-4 py-4" style={{ backgroundColor: footerBg }}>
        <div className={clsx("grid gap-4", mobile ? "grid-cols-2" : "grid-cols-4")}>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              {model.logoDataUrl ? (
                <img src={model.logoDataUrl} alt="" className="h-4 max-w-[48px] shrink-0 object-contain" />
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

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-w-0 text-start">
      <p className="text-[9px] font-bold text-[var(--octo-text-primary)]">{title}</p>
      <div className="mt-1.5 flex flex-col gap-1 text-[8px] text-[var(--octo-text-muted)]">{children}</div>
    </div>
  );
}

// The storefront SectionHeading: a rounded bar in the brand (or section)
// colour on the reading-start side, then the label.
function SectionHeading({
  style,
  accent,
  font,
  children,
}: {
  style: StyleTokens;
  accent: string;
  font?: string;
  children: ReactNode;
}) {
  const text: CSSProperties = {
    fontWeight: style.headingWeight,
    letterSpacing: style.headingTracking,
    textTransform: style.headingTransform,
    fontFamily: font,
  };
  return (
    <h3 className="flex items-center gap-2">
      <span className="h-[14px] w-[3px] shrink-0 rounded-full" style={{ backgroundColor: accent }} aria-hidden />
      <span className="text-[13px] text-[var(--octo-text-primary)]" style={text}>
        {children}
      </span>
    </h3>
  );
}
