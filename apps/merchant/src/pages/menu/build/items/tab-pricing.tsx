// The Pricing tab. Three figures, all arithmetic: the frame's 130 / 19.5 /
// 149.5 fall out of the price and the VAT rate rather than being typed.
//
// Both fields carry the frame's red asterisk. They are text inputs, not
// number inputs, so "abc" or "-5" can be shown and refused; the item only ever
// receives a value that passed (an invalid price is stored as 0, an invalid
// VAT leaves the stored rate alone).
import clsx from "clsx";
import { parseAmount, type Item } from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";
import { Field } from "../../_shared/controls";
import { FIELD_INVALID, LINE, TEXT, TEXT_GRAY } from "../../_shared/theme";
import { ACCENT_TEXT, BARE_INPUT, FIELD_4_BOX } from "./ui";
import type { ItemForm } from "./use-item-form";

/** Money to two places at most, without trailing zeros — 19.5 rather than
 *  19.50, matching the frame. */
function money(value: number): string {
  return `SAR ${Number(value.toFixed(2))}`;
}

export function TabPricing({
  item,
  onPatch,
  form,
}: {
  item: Item;
  onPatch: (patch: Partial<Item>) => void;
  form: ItemForm;
}) {
  const { t } = useI18n();
  const { price, vatRate } = item.pricing;
  const vat = price * vatRate;
  const percent = Number((vatRate * 100).toFixed(2));

  const priceText = form.text("price");
  const vatText = form.text("vat");
  const priceKey = form.error("price");
  const vatKey = form.error("vat");

  function changePrice(value: string) {
    form.setText("price", value);
    const amount = parseAmount(value);
    onPatch({ pricing: { ...item.pricing, price: amount !== null && amount > 0 ? amount : 0 } });
  }

  function changeVat(value: string) {
    form.setText("vat", value);
    const amount = parseAmount(value);
    if (amount !== null && amount >= 0 && amount <= 100) {
      onPatch({ pricing: { ...item.pricing, vatRate: amount / 100 } });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Field label={t("menuWiz.item.price")} required error={priceKey ? t(priceKey) : null}>
        <label className={clsx(FIELD_4_BOX, priceKey && FIELD_INVALID)}>
          <span className="shrink-0 leading-[14px]">SAR</span>
          <input
            dir="ltr"
            inputMode="decimal"
            value={priceText}
            placeholder={t("menuWiz.item.pricePlaceholder")}
            aria-label={t("menuWiz.item.price")}
            aria-invalid={priceKey ? true : undefined}
            onChange={(e) => changePrice(e.target.value)}
            onBlur={() => form.touch("price")}
            className={clsx(BARE_INPUT, "text-start")}
          />
        </label>
      </Field>

      <Field
        label={t("menuWiz.item.vat")}
        hint={`(${t("menuWiz.item.vatHint")})`}
        required
        error={vatKey ? t(vatKey) : null}
      >
        <label dir="ltr" className={clsx(FIELD_4_BOX, "!gap-0 rtl:justify-end", vatKey && FIELD_INVALID)}>
          {/* Sized to its text (the hidden twin sets the width) so the %
              sits right after the number. */}
          <span className="relative inline-block max-w-[calc(100%-1.5ch)]">
            <span aria-hidden className="invisible whitespace-pre px-px">{vatText || "0"}</span>
            <input
              inputMode="decimal"
              size={1}
              value={vatText}
              aria-label={t("menuWiz.item.vat")}
              aria-invalid={vatKey ? true : undefined}
              onChange={(e) => changeVat(e.target.value)}
              onBlur={() => form.touch("vat")}
              className={clsx("absolute inset-0 size-full min-w-0 bg-transparent px-px text-[14px] outline-none", TEXT)}
            />
          </span>
          <span className="leading-[14px]">%</span>
        </label>
      </Field>

      <section className={clsx("flex flex-col gap-4 rounded-[4px] border p-2", LINE)}>
        <h3 className={clsx("text-[14px] font-bold leading-[14px]", TEXT)}>{t("menuWiz.item.summary")}</h3>
        <dl className="flex flex-col gap-2 text-[14px] leading-[14px]">
          <div className={clsx("flex flex-col gap-2 border-b pb-2", LINE)}>
            <div className="flex items-center justify-between gap-3">
              <dt className={clsx("font-medium", TEXT_GRAY)}>{t("menuWiz.item.subTotal")}</dt>
              <dd className={clsx("font-semibold", TEXT)}>{money(price)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className={clsx("font-medium", TEXT_GRAY)}>{t("menuWiz.item.vatLine").replace("{p}", String(percent))}</dt>
              <dd className={clsx("font-semibold", TEXT)}>{money(vat)}</dd>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className={clsx("font-medium", TEXT)}>{t("menuWiz.item.total")}</dt>
            <dd className={clsx("font-bold", ACCENT_TEXT)}>{money(price + vat)}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
