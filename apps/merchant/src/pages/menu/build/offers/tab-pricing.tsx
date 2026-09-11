// Pricing & Saving — two ledgers side by side, and what the customer saves.
//
// Every figure comes from entities/menu/pricing.ts. Nothing on this tab is
// typed except the offer price under the Fixed role, or the discount under the
// Set a Discount role — which then derives the price.
import clsx from "clsx";
import { Checkbox } from "@ui/primitives";
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

const ROLES: { id: Offer["pricing"]["role"]; titleKey: string; hintKey: string }[] = [
  { id: "fixed", titleKey: "menuOffer.role.fixed", hintKey: "menuOffer.role.fixedHint" },
  { id: "discount", titleKey: "menuOffer.role.discount", hintKey: "menuOffer.role.discountHint" },
  { id: "dynamic", titleKey: "menuOffer.role.dynamic", hintKey: "menuOffer.role.dynamicHint" },
];

export function TabPricing({
  menu,
  offer,
  onPatch,
}: {
  menu: Menu;
  offer: Offer;
  onPatch: (patch: Partial<Offer>) => void;
}) {
  const { t } = useI18n();
  const lines = offerLines(menu, offer);
  const individual = individualTotals(menu, offer);
  const totals = offerTotals(offer);
  const savings = offerSavings(menu, offer);
  const percent = Number((offer.pricing.vatRate * 100).toFixed(2));
  const { pricing } = offer;
  const isDiscount = pricing.role === "discount";
  const discount = pricing.discount ?? { type: "percent" as const, value: 0 };

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

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-[10px] border border-[var(--octo-border-card)] p-4">
          <h3 className="text-[16px] font-semibold text-[var(--octo-text-primary)]">
            {t("menuOffer.individualTotal")}
          </h3>
          <dl className="mt-2.5 space-y-2 text-[15px]">
            {lines.map((line) => (
              <div key={line.name} className="flex items-center justify-between">
                <dt className="text-[var(--octo-text-secondary)]">
                  {line.name}
                  {line.qty > 1 ? ` ×${line.qty}` : ""}:
                </dt>
                <dd className="text-[var(--octo-text-primary)]">SAR {line.price * line.qty}</dd>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-[var(--octo-border-card)] pt-2">
              <dt className="text-[var(--octo-text-secondary)]">{t("menuOffer.subTotal")}</dt>
              <dd className="text-[var(--octo-text-primary)]">SAR {individual.subTotal}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-[var(--octo-text-secondary)]">
                {t("menuOffer.vatLine").replace("{p}", String(percent))}
              </dt>
              <dd className="text-[var(--octo-text-primary)]">SAR {individual.vat}</dd>
            </div>
            <div className="flex items-center justify-between border-t border-[var(--octo-border-card)] pt-2">
              <dt className="text-[var(--octo-text-primary)]">{t("menuOffer.total")}</dt>
              <dd className="font-semibold text-[var(--octo-accent)]">SAR {individual.total}</dd>
            </div>
          </dl>
        </section>

        <div className="space-y-4">
          <section className="rounded-[10px] border border-[var(--octo-border-card)] p-4">
            <h3 className="text-[16px] font-semibold text-[var(--octo-text-primary)]">
              {t("menuOffer.offerPrice")}
            </h3>
            {/* The frame's big centred figure. Under Fixed it is the field the
                merchant types into; under Discount it is derived, so it is
                shown rather than offered for editing. */}
            <div className="mt-2 flex items-center justify-center gap-1.5 rounded-[6px] bg-[var(--octo-selected)] px-3 py-1.5 text-[28px] font-semibold text-[var(--octo-accent)]">
              <span>SAR</span>
              {isDiscount ? (
                <span>{pricing.offerPrice}</span>
              ) : (
                <input
                  type="number"
                  min={0}
                  aria-label={t("menuOffer.offerPrice")}
                  value={pricing.offerPrice === 0 ? "" : pricing.offerPrice}
                  placeholder="0"
                  onChange={(e) =>
                    onPatch({
                      pricing: { ...pricing, offerPrice: Math.max(0, Number(e.target.value) || 0) },
                    })
                  }
                  style={{ width: `${Math.max(1, String(pricing.offerPrice || "").length) + 0.6}ch` }}
                  className="min-w-[2ch] bg-transparent text-start outline-none [appearance:textfield] placeholder:text-[var(--octo-accent)]/40 [&::-webkit-inner-spin-button]:appearance-none"
                />
              )}
            </div>
            <dl className="mt-2.5 space-y-2 text-[15px]">
              <div className="flex items-center justify-between">
                <dt className="text-[var(--octo-text-secondary)]">
                  {t("menuOffer.vatLine").replace("{p}", String(percent))}
                </dt>
                <dd className="text-[var(--octo-text-primary)]">SAR {totals.vat}</dd>
              </div>
              <div className="flex items-center justify-between border-t border-[var(--octo-border-card)] pt-2">
                <dt className="text-[var(--octo-text-primary)]">{t("menuOffer.total")}</dt>
                <dd className="font-semibold text-[var(--octo-accent)]">SAR {totals.total}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-[10px] border border-[var(--octo-border-card)] p-4">
            <h3 className="text-[16px] font-semibold text-[var(--octo-text-primary)]">
              {t("menuOffer.customerSaves")}
            </h3>
            <p className="mt-2 rounded-[6px] bg-[var(--octo-tone-success-bg)] py-1.5 text-center text-[28px] font-semibold text-[var(--octo-tone-success-text)]">
              SAR {savings.amount}
            </p>
            <div className="mt-2.5 flex items-center justify-between text-[15px]">
              <span className="text-[var(--octo-text-secondary)]">
                {t("menuOffer.totalInclVat")}
              </span>
              <span className="font-semibold text-[var(--octo-tone-success-text)]">
                {t("menuOffer.off").replace("{p}", String(savings.percent))}
              </span>
            </div>
          </section>
        </div>
      </div>

      <section>
        <h3 className="text-[16px] font-semibold text-[var(--octo-text-primary)]">
          {t("menuOffer.pricingRoles")}
        </h3>
        <div className="mt-2 grid gap-2.5 sm:grid-cols-3">
          {ROLES.map(({ id, titleKey, hintKey }) => (
            <button
              key={id}
              type="button"
              aria-pressed={pricing.role === id}
              onClick={() => chooseRole(id)}
              className={clsx(
                "rounded-[10px] border p-3 text-start",
                pricing.role === id
                  ? "border-[var(--octo-accent)] bg-[var(--octo-selected)]"
                  : "border-[var(--octo-border-card)]"
              )}
            >
              <span className="flex items-start gap-2">
                <span
                  aria-hidden
                  className={clsx(
                    "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border",
                    pricing.role === id
                      ? "border-[var(--octo-accent)] bg-[var(--octo-accent)]"
                      : "border-[var(--octo-border-input)]"
                  )}
                >
                  {pricing.role === id && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                </span>
                <span className="min-w-0">
                  <span
                    className={clsx(
                      "block text-[14px] font-medium",
                      pricing.role === id
                        ? "text-[var(--octo-accent)]"
                        : "text-[var(--octo-text-primary)]"
                    )}
                  >
                    {t(titleKey)}
                  </span>
                  <span className="block text-[13px] text-[var(--octo-text-secondary)]">
                    {t(hintKey)}
                  </span>
                </span>
              </span>
            </button>
          ))}
        </div>

        {isDiscount && (
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div>
              <p className="text-[13.5px] text-[var(--octo-text-primary)]">
                {t("menuOffer.discountType")}
              </p>
              <div
                role="radiogroup"
                aria-label={t("menuOffer.discountType")}
                className="mt-1.5 inline-flex rounded-[9px] border border-[var(--octo-border-input)] p-1"
              >
                {(["percent", "amount"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    role="radio"
                    aria-checked={discount.type === type}
                    onClick={() => setDiscount({ ...discount, type })}
                    className={clsx(
                      "min-w-[52px] rounded-[7px] px-3 py-1.5 text-[14px] font-medium",
                      discount.type === type
                        ? "bg-[var(--octo-accent)] text-white"
                        : "text-[var(--octo-text-secondary)] hover:bg-[var(--octo-hover)]"
                    )}
                  >
                    {type === "percent" ? "%" : "SAR"}
                  </button>
                ))}
              </div>
            </div>
            <label className="block min-w-[200px] flex-1">
              <span className="text-[13.5px] text-[var(--octo-text-primary)]">
                {t("menuOffer.discountValue")}
              </span>
              <span className="mt-1.5 flex items-center gap-2 rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3">
                <input
                  type="number"
                  min={0}
                  max={discount.type === "percent" ? 100 : undefined}
                  step="0.01"
                  value={discount.value === 0 ? "" : discount.value}
                  placeholder={t("menuOffer.discountPlaceholder")}
                  onChange={(e) =>
                    setDiscount({ ...discount, value: Math.max(0, Number(e.target.value) || 0) })
                  }
                  className="w-full bg-transparent py-2.5 text-[15px] text-[var(--octo-text-primary)] outline-none"
                />
                <span className="text-[14px] text-[var(--octo-text-secondary)]">
                  {discount.type === "percent" ? "%" : "SAR"}
                </span>
              </span>
            </label>
          </div>
        )}

        {/* Dynamic Price has no frame showing what it does (spec open question
            1), so it is selectable and honest about itself rather than absent —
            the same posture /menu/import takes. */}
        {pricing.role === "dynamic" && (
          <p className="mt-2.5 rounded-[9px] bg-[var(--octo-track)] px-3.5 py-2.5 text-[13.5px] text-[var(--octo-text-secondary)]">
            {t("menuOffer.role.dynamicSoon")}
          </p>
        )}

        <label className="mt-3 flex items-start gap-2.5 text-[14px]">
          <Checkbox
            checked={pricing.excludeFromPromotions}
            onChange={() =>
              onPatch({
                pricing: { ...pricing, excludeFromPromotions: !pricing.excludeFromPromotions },
              })
            }
          />
          <span className="text-[var(--octo-text-secondary)]">{t("menuOffer.excludePromos")}</span>
        </label>
      </section>
    </div>
  );
}
