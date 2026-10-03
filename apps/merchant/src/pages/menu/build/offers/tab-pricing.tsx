// Pricing & Saving — two ledgers side by side, and what the customer saves.
//
// Every figure comes from entities/menu/pricing.ts. Nothing on this tab is
// typed except the offer price under the Fixed role, or the discount under the
// Set a Discount role — which then derives the price.
import { useState, type ReactNode } from "react";
import clsx from "clsx";
import {
  discountedPrice,
  individualTotals,
  offerLines,
  offerSavings,
  offerTotals,
  type Menu,
  type Offer,
} from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";
import { CheckBox } from "../../_shared/controls";
import { MenuIcon } from "../../_shared/menu-icon";
import { FIELD_INVALID, FOCUS_WITHIN, LINE, SURFACE_BLUE, SURFACE_SUBTLE, TEXT, TEXT_GRAY, TEXT_SECONDARY } from "../../_shared/theme";
import { OfferPriceQuote } from "./price-quote";
import type { OfferTabValidation } from "./index";

/** The platform's own quote ("Server price check") is not in the frame; flip
 *  this to draw it under the roles again. */
const SHOW_SERVER_QUOTE: boolean = false;

const ROLES: { id: Offer["pricing"]["role"]; titleKey: string; hintKey: string }[] = [
  { id: "fixed", titleKey: "menuOffer.role.fixed", hintKey: "menuOffer.role.fixedHint" },
  { id: "discount", titleKey: "menuOffer.role.discount", hintKey: "menuOffer.role.discountHint" },
  { id: "dynamic", titleKey: "menuOffer.role.dynamic", hintKey: "menuOffer.role.dynamicHint" },
];

const CARD = `rounded-[4px] border p-2 ${LINE}`;
const CARD_TITLE = `text-[14px] font-bold leading-[14px] ${TEXT}`;
const ACCENT_TEXT = "text-[#0058da] [[data-theme=dark]_&]:text-[#8ab8ff]";
const ERROR_TEXT = "text-[12px] leading-[14px] text-[#d30202]";

function Row({ label, value, total }: { label: ReactNode; value: ReactNode; total?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 text-[14px] leading-[14px]">
      <dt className={clsx("min-w-0 truncate font-medium", total ? TEXT : TEXT_GRAY)}>{label}</dt>
      <dd className={clsx("shrink-0 whitespace-nowrap text-end", total ? `font-bold ${ACCENT_TEXT}` : `font-semibold ${TEXT}`)}>{value}</dd>
    </div>
  );
}

export function TabPricing({
  menu,
  offer,
  onPatch,
  validation,
}: {
  menu: Menu;
  offer: Offer;
  onPatch: (patch: Partial<Offer>) => void;
  validation: OfferTabValidation;
}) {
  const { t } = useI18n();
  const { errors, onTouch } = validation;
  const lines = offerLines(menu, offer);
  const individual = individualTotals(menu, offer);
  const totals = offerTotals(offer);
  const savings = offerSavings(menu, offer);
  const percent = Number((offer.pricing.vatRate * 100).toFixed(2));
  const vatLabel = t("menuOffer.vatLine").replace("{p}", String(percent));
  const { pricing } = offer;
  const isDiscount = pricing.role === "discount";
  const discount = pricing.discount ?? { type: "percent" as const, value: 0 };
  // While the price field has focus it shows what is being typed; otherwise
  // the frame's two-decimal figure.
  const [priceDraft, setPriceDraft] = useState<string | null>(null);

  function setDiscount(next: NonNullable<Offer["pricing"]["discount"]>) {
    onPatch({
      pricing: {
        ...pricing,
        discount: next,
        offerPrice: discountedPrice(individual.subTotal, next),
      },
    });
  }

  function chooseRole(role: Offer["pricing"]["role"]) {
    if (role === "discount") {
      onPatch({
        pricing: {
          ...pricing,
          role,
          discount,
          offerPrice: discountedPrice(individual.subTotal, discount),
        },
      });
      return;
    }
    onPatch({ pricing: { ...pricing, role } });
  }

  const priceError = errors.offerPrice ? t(errors.offerPrice).replace("{total}", `SAR ${individual.subTotal}`) : null;
  const discountError = errors.discount ? t(errors.discount).replace("{total}", `SAR ${individual.subTotal}`) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <section className={clsx("flex flex-col gap-4", CARD)}>
          <h3 className={CARD_TITLE}>{t("menuOffer.individualTotal")}</h3>
          <div className="flex flex-col gap-4">
            <dl className={clsx("flex flex-col gap-2 border-b pb-2", LINE)}>
              {lines.map((line, index) => (
                <Row
                  key={`${line.name}-${index}`}
                  label={`${line.name}${line.qty > 1 ? ` ×${line.qty}` : ""}:`}
                  value={`SAR ${line.price * line.qty}`}
                />
              ))}
              {lines.length === 0 && <p className={clsx("text-[14px] leading-[14px]", TEXT_GRAY)}>{t("menuOffer.noLines")}</p>}
            </dl>
            <dl className="flex flex-col gap-2">
              <div className={clsx("flex flex-col gap-2 border-b pb-2", LINE)}>
                <Row label={t("menuOffer.subTotal")} value={`SAR ${individual.subTotal}`} />
                <Row label={vatLabel} value={`SAR ${individual.vat}`} />
              </div>
              <Row total label={t("menuOffer.total")} value={`SAR ${individual.total}`} />
            </dl>
          </div>
        </section>

        <div className="flex flex-col gap-3">
          <section className={clsx("flex flex-col gap-3", CARD)}>
            <h3 className={CARD_TITLE}>{t("menuOffer.offerPrice")}</h3>
            {/* The frame's big centred figure. Under Fixed it is the field the
                merchant types into; under Discount it is derived, so it is
                shown rather than offered for editing. */}
            <label
              className={clsx(
                "flex items-center justify-center gap-1 rounded-[4px] border border-transparent p-2 text-[20px] font-semibold leading-5 text-[#0D6EFD]",
                SURFACE_BLUE,
                !isDiscount && FOCUS_WITHIN,
                priceError && FIELD_INVALID
              )}
            >
              <span>SAR</span>
              {isDiscount ? (
                <span>{pricing.offerPrice.toFixed(2)}</span>
              ) : (
                <input
                  type="text"
                  inputMode="decimal"
                  dir="ltr"
                  aria-label={t("menuOffer.offerPrice")}
                  aria-invalid={priceError ? true : undefined}
                  value={priceDraft ?? pricing.offerPrice.toFixed(2)}
                  onFocus={() => setPriceDraft(pricing.offerPrice === 0 ? "" : String(pricing.offerPrice))}
                  onBlur={() => {
                    setPriceDraft(null);
                    onTouch("offerPrice");
                  }}
                  onChange={(e) => {
                    // Digits and one decimal point; anything else is not a price.
                    const text = e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
                    setPriceDraft(text);
                    onPatch({ pricing: { ...pricing, offerPrice: Math.max(0, Number(text) || 0) } });
                  }}
                  style={{ width: `${Math.max(4, (priceDraft ?? pricing.offerPrice.toFixed(2)).length) + 0.5}ch` }}
                  className="min-w-0 bg-transparent text-start font-semibold outline-none"
                />
              )}
            </label>
            {priceError && (
              <p role="alert" className={clsx("-mt-1", ERROR_TEXT)}>
                {priceError}
              </p>
            )}
            <dl className="flex flex-col gap-2">
              <div className={clsx("border-b pb-2", LINE)}>
                <Row label={vatLabel} value={`SAR ${totals.vat}`} />
              </div>
              <Row total label={t("menuOffer.total")} value={`SAR ${totals.total}`} />
            </dl>
          </section>

          <section className={clsx("flex flex-col gap-3", CARD)}>
            <h3 className={CARD_TITLE}>{t("menuOffer.customerSaves")}</h3>
            <p className="rounded-[4px] bg-[#dcffef] p-2 text-center text-[18px] font-bold leading-[18px] text-[#009a39] [[data-theme=dark]_&]:bg-[#009a39]/15">
              SAR {savings.amount}
            </p>
            <div className="flex items-center justify-between gap-2 text-[14px] font-medium leading-[14px]">
              <span className={TEXT_GRAY}>{t("menuOffer.totalInclVat")}</span>
              <span className="whitespace-nowrap text-end text-[#009a39]">{t("menuOffer.off").replace("{p}", String(savings.percent))}</span>
            </div>
          </section>
        </div>
      </div>

      <section className="flex flex-col gap-2">
        <h3 className={clsx("text-[16px] font-medium leading-4", TEXT)}>{t("menuOffer.pricingRoles")}</h3>
        <div role="radiogroup" aria-label={t("menuOffer.pricingRoles")} className="grid gap-3 sm:grid-cols-3">
          {ROLES.map(({ id, titleKey, hintKey }) => {
            const active = pricing.role === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => chooseRole(id)}
                className={clsx(
                  "flex items-start gap-2 rounded-[12px] border p-2 text-start text-[12px]",
                  active ? `border-[#0D6EFD] ${SURFACE_BLUE}` : LINE
                )}
              >
                <MenuIcon
                  name={active ? "menu-radio-on.svg" : "menu-radio-off.svg"}
                  size={24}
                  className={active ? "text-[#0D6EFD]" : "text-[#64748b]"}
                />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className={clsx("font-semibold leading-3", active ? ACCENT_TEXT : TEXT)}>{t(titleKey)}</span>
                  <span className={clsx("leading-[1.2]", TEXT_GRAY)}>{t(hintKey)}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* The frame shows the Fixed role selected; the discount's own two
            fields appear with its role, in the module's field style. */}
        {isDiscount && (
          <div className="mt-2 flex flex-col gap-2">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-2">
                <p className={clsx("text-[12px] font-medium leading-3", TEXT)}>{t("menuOffer.discountType")}</p>
                <div role="radiogroup" aria-label={t("menuOffer.discountType")} className={clsx("flex h-10 items-center gap-1 rounded-[12px] border p-1", LINE)}>
                  {(["percent", "amount"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      role="radio"
                      aria-checked={discount.type === type}
                      onClick={() => {
                        setDiscount({ ...discount, type });
                        onTouch("discount");
                      }}
                      className={clsx(
                        "h-full min-w-[52px] rounded-[8px] px-3 text-[14px] font-medium leading-[14px]",
                        discount.type === type ? "bg-[#0D6EFD] text-white" : `${TEXT_GRAY} hover:bg-[var(--octo-hover)]`
                      )}
                    >
                      {type === "percent" ? "%" : "SAR"}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex min-w-[160px] flex-1 flex-col gap-2">
                <span className={clsx("text-[12px] font-medium leading-3", TEXT)}>{t("menuOffer.discountValue")}</span>
                <span
                  className={clsx(
                    "flex h-10 items-center gap-2 rounded-[12px] border bg-[var(--octo-card)] px-2",
                    LINE,
                    FOCUS_WITHIN,
                    discountError && FIELD_INVALID
                  )}
                >
                  <input
                    type="number"
                    min={0}
                    max={discount.type === "percent" ? 100 : undefined}
                    step="0.01"
                    aria-invalid={discountError ? true : undefined}
                    value={discount.value === 0 ? "" : discount.value}
                    placeholder={t("menuOffer.discountPlaceholder")}
                    onBlur={() => onTouch("discount", "offerPrice")}
                    onChange={(e) => setDiscount({ ...discount, value: Number(e.target.value) || 0 })}
                    className={clsx("w-full min-w-0 bg-transparent text-[14px] outline-none placeholder:text-[#687280]", TEXT)}
                  />
                  <span className={clsx("text-[14px]", TEXT_SECONDARY)}>{discount.type === "percent" ? "%" : "SAR"}</span>
                </span>
              </label>
            </div>
            {discountError && (
              <p role="alert" className={ERROR_TEXT}>
                {discountError}
              </p>
            )}
          </div>
        )}

        {/* Dynamic Price has no frame showing what it does (spec open question
            1), so it is selectable and honest about itself rather than absent —
            the same posture /menu/import takes. */}
        {pricing.role === "dynamic" && (
          <p className={clsx("mt-2 rounded-[8px] px-3 py-2 text-[12px] font-medium leading-[1.4]", SURFACE_SUBTLE, TEXT_GRAY)}>
            {t("menuOffer.role.dynamicSoon")}
          </p>
        )}
      </section>

      <CheckBox
        checked={pricing.excludeFromPromotions}
        onChange={(next) => onPatch({ pricing: { ...pricing, excludeFromPromotions: next } })}
        label={<span className={clsx("leading-[1.3]", pricing.excludeFromPromotions ? TEXT : TEXT_SECONDARY)}>{t("menuOffer.excludePromos")}</span>}
      />

      {SHOW_SERVER_QUOTE && <OfferPriceQuote offer={offer} />}
    </div>
  );
}
