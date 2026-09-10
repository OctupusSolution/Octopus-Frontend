// The Pricing tab. Three figures, all arithmetic: the frame's 130 / 19.5 /
// 149.5 fall out of the price and the VAT rate rather than being typed.
import type { Item } from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";

/** Money to two places at most, without trailing zeros — 19.5 rather than
 *  19.50, matching the frame. */
function money(value: number): string {
  return `SAR ${Number(value.toFixed(2))}`;
}

export function TabPricing({
  item,
  onPatch,
}: {
  item: Item;
  onPatch: (patch: Partial<Item>) => void;
}) {
  const { t } = useI18n();
  const { price, vatRate } = item.pricing;
  const vat = price * vatRate;
  const percent = Number((vatRate * 100).toFixed(2));

  return (
    <div className="max-w-[680px] space-y-4">
      <label className="block">
        <span className="text-[14px] font-medium text-[var(--octo-text-primary)]">
          {t("menuWiz.item.price")} <span className="text-error">*</span>
        </span>
        <div className="mt-1.5 flex items-center gap-2 rounded-[9px] border border-[var(--octo-border-input)] px-3">
          <span className="text-[14px] text-[var(--octo-text-secondary)]">SAR</span>
          <input
            type="number"
            min={0}
            value={price === 0 ? "" : price}
            placeholder={t("menuWiz.item.pricePlaceholder")}
            onChange={(e) =>
              onPatch({ pricing: { ...item.pricing, price: Number(e.target.value) || 0 } })
            }
            className="w-full bg-transparent py-2.5 text-[14px] text-[var(--octo-text-primary)] outline-none"
          />
        </div>
      </label>

      <label className="block">
        <span className="text-[14px] font-medium text-[var(--octo-text-primary)]">
          {t("menuWiz.item.vat")}{" "}
          <span className="font-normal text-[var(--octo-text-secondary)]">
            ({t("menuWiz.item.vatHint")})
          </span>
          <span className="text-error"> *</span>
        </span>
        <div className="mt-1.5 flex items-center gap-1 rounded-[9px] border border-[var(--octo-border-input)] px-3">
          <input
            type="number"
            min={0}
            value={percent}
            onChange={(e) =>
              onPatch({
                pricing: { ...item.pricing, vatRate: (Number(e.target.value) || 0) / 100 },
              })
            }
            className="w-full bg-transparent py-2.5 text-[14px] text-[var(--octo-text-primary)] outline-none"
          />
          <span className="text-[14px] text-[var(--octo-text-secondary)]">%</span>
        </div>
      </label>

      <section className="rounded-[10px] border border-[var(--octo-border-card)] p-4">
        <h3 className="text-[14px] font-semibold text-[var(--octo-text-primary)]">
          {t("menuWiz.item.summary")}
        </h3>
        <dl className="mt-2.5 space-y-2 text-[14px]">
          <div className="flex items-center justify-between">
            <dt className="text-[var(--octo-text-secondary)]">{t("menuWiz.item.subTotal")}</dt>
            <dd className="text-[var(--octo-text-primary)]">{money(price)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-[var(--octo-text-secondary)]">
              {t("menuWiz.item.vatLine").replace("{p}", String(percent))}
            </dt>
            <dd className="text-[var(--octo-text-primary)]">{money(vat)}</dd>
          </div>
          <div className="flex items-center justify-between border-t border-[var(--octo-border-card)] pt-2">
            <dt className="font-medium text-[var(--octo-text-primary)]">
              {t("menuWiz.item.total")}
            </dt>
            <dd className="font-semibold text-[var(--octo-accent)]">{money(price + vat)}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
