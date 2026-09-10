// Pricing & Saving — two ledgers side by side, and what the customer saves.
//
// Every figure comes from entities/menu/pricing.ts. Nothing on this tab is
// typed except the offer price itself.
import clsx from "clsx";
import { Checkbox } from "@ui/primitives";
import {
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

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-[10px] border border-[var(--octo-border-card)] p-4">
          <h3 className="text-[14px] font-semibold text-[var(--octo-text-primary)]">
            {t("menuOffer.individualTotal")}
          </h3>
          <dl className="mt-2.5 space-y-2 text-[14px]">
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
              <dt className="font-medium text-[var(--octo-text-primary)]">
                {t("menuOffer.total")}
              </dt>
              <dd className="font-semibold text-[var(--octo-accent)]">SAR {individual.total}</dd>
            </div>
          </dl>
        </section>

        <div className="space-y-4">
          <section className="rounded-[10px] border border-[var(--octo-border-card)] p-4">
            <h3 className="text-[14px] font-semibold text-[var(--octo-text-primary)]">
              {t("menuOffer.offerPrice")}
            </h3>
            <div className="mt-2 flex items-center gap-2 rounded-[9px] bg-[var(--octo-selected)] px-3">
              <span className="text-[14px] text-[var(--octo-text-secondary)]">SAR</span>
              <input
                type="number"
                min={0}
                value={offer.pricing.offerPrice === 0 ? "" : offer.pricing.offerPrice}
                onChange={(e) =>
                  onPatch({
                    pricing: { ...offer.pricing, offerPrice: Number(e.target.value) || 0 },
                  })
                }
                className="w-full bg-transparent py-2.5 text-[20px] font-semibold text-[var(--octo-accent)] outline-none"
              />
            </div>
            <dl className="mt-2.5 space-y-2 text-[14px]">
              <div className="flex items-center justify-between">
                <dt className="text-[var(--octo-text-secondary)]">
                  {t("menuOffer.vatLine").replace("{p}", String(percent))}
                </dt>
                <dd className="text-[var(--octo-text-primary)]">SAR {totals.vat}</dd>
              </div>
              <div className="flex items-center justify-between border-t border-[var(--octo-border-card)] pt-2">
                <dt className="font-medium text-[var(--octo-text-primary)]">
                  {t("menuOffer.total")}
                </dt>
                <dd className="font-semibold text-[var(--octo-accent)]">SAR {totals.total}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-[10px] border border-[var(--octo-border-card)] p-4">
            <h3 className="text-[14px] font-semibold text-[var(--octo-text-primary)]">
              {t("menuOffer.customerSaves")}
            </h3>
            <p className="mt-2 rounded-[9px] bg-[var(--octo-tone-success-bg)] py-2.5 text-center text-[20px] font-semibold text-[var(--octo-tone-success-text)]">
              SAR {savings.amount}
            </p>
            <div className="mt-2.5 flex items-center justify-between text-[14px]">
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
        <h3 className="text-[14px] font-semibold text-[var(--octo-text-primary)]">
          {t("menuOffer.pricingRoles")}
        </h3>
        <div className="mt-2 grid gap-2.5 sm:grid-cols-3">
          {ROLES.map(({ id, titleKey, hintKey }) => (
            <button
              key={id}
              type="button"
              aria-pressed={offer.pricing.role === id}
              onClick={() => onPatch({ pricing: { ...offer.pricing, role: id } })}
              className={clsx(
                "rounded-[10px] border p-3 text-start",
                offer.pricing.role === id
                  ? "border-[var(--octo-accent)] bg-[var(--octo-selected)]"
                  : "border-[var(--octo-border-card)]"
              )}
            >
              <span className="flex items-start gap-2">
                <span
                  aria-hidden
                  className={clsx(
                    "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border",
                    offer.pricing.role === id
                      ? "border-[var(--octo-accent)] bg-[var(--octo-accent)]"
                      : "border-[var(--octo-border-input)]"
                  )}
                >
                  {offer.pricing.role === id && (
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-medium text-[var(--octo-text-primary)]">
                    {t(titleKey)}
                  </span>
                  <span className="block text-[12.5px] text-[var(--octo-text-secondary)]">
                    {t(hintKey)}
                  </span>
                </span>
              </span>
            </button>
          ))}
        </div>

        {/* Dynamic Price has no frame showing what it does (spec open question
            1), so it is selectable and honest about itself rather than absent —
            the same posture /menu/import takes. */}
        {offer.pricing.role === "dynamic" && (
          <p className="mt-2.5 rounded-[9px] bg-[var(--octo-track)] px-3.5 py-2.5 text-[13.5px] text-[var(--octo-text-secondary)]">
            {t("menuOffer.role.dynamicSoon")}
          </p>
        )}

        <label className="mt-3 flex items-start gap-2.5 text-[13.5px]">
          <Checkbox
            checked={offer.pricing.excludeFromPromotions}
            onChange={() =>
              onPatch({
                pricing: {
                  ...offer.pricing,
                  excludeFromPromotions: !offer.pricing.excludeFromPromotions,
                },
              })
            }
          />
          <span className="text-[var(--octo-text-secondary)]">
            {t("menuOffer.excludePromos")}
          </span>
        </label>
      </section>
    </div>
  );
}
