"use client";

import { useId, useState } from "react";
import { useI18n } from "@/app/providers";
import { formatAmountPadded, TIP_PRESETS_SAR } from "@/shared/lib/pricing";
import { RadioDot, SelectableCard } from "@/shared/ui";

export interface TipSelectorProps {
  value: number;
  onChange: (tipSar: number) => void;
}

const CHIP = "flex h-12 cursor-pointer items-center gap-8 rounded-[24px] border p-3 text-[18px] leading-none";

/** The gratuity panel: three preset amounts and a free entry, inside the same
 *  dashed frame the rest of the fulfillment flow uses. */
export function TipSelector({ value, onChange }: TipSelectorProps) {
  const { t } = useI18n();
  const name = useId();
  const currency = t("store.currency");
  const [customOpen, setCustomOpen] = useState(false);

  function handleCustom(raw: string) {
    const parsed = Number.parseFloat(raw);
    onChange(Number.isFinite(parsed) && parsed >= 0 ? parsed : 0);
  }

  return (
    <SelectableCard className="px-4 py-3">
      <div className="flex w-full items-start gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/storefront/icon-money.svg" alt="" className="size-6 shrink-0" />

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <p className="text-[14px] font-medium leading-none text-[var(--octo-store-select-label)]">
            {t("store.fulfillment.tipLabel")}{" "}
            <span className="text-[12px] font-normal">{t("store.fulfillment.tipOptional")}</span>
          </p>

          <div className="flex flex-wrap items-start gap-2">
            {TIP_PRESETS_SAR.map((amount) => {
              const selected = !customOpen && value === amount;
              return (
                <label
                  key={amount}
                  className={`${CHIP} ${
                    selected
                      ? "border-[var(--color-ocean-blue)] bg-[var(--octo-store-select-soft)] text-[var(--octo-store-select-text)]"
                      : "border-[var(--color-gray-300)] text-[var(--color-gray-900)]"
                  }`}
                >
                  <input
                    type="radio"
                    name={name}
                    className="sr-only"
                    checked={selected}
                    onChange={() => {
                      setCustomOpen(false);
                      onChange(amount);
                    }}
                  />
                  <span>
                    {formatAmountPadded(amount)} {currency}
                  </span>
                  <RadioDot checked={selected} />
                </label>
              );
            })}

            {customOpen ? (
              <input
                type="number"
                min={0}
                step="0.5"
                autoFocus
                aria-label={t("store.fulfillment.tipCustom")}
                placeholder={t("store.fulfillment.tipCustomPlaceholder")}
                onChange={(event) => handleCustom(event.target.value)}
                className="h-12 w-[145px] rounded-[24px] border border-[var(--color-gray-300)] px-4 text-[18px] text-[var(--color-gray-900)] outline-none focus:border-[var(--color-ocean-blue)]"
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setCustomOpen(true);
                  onChange(0);
                }}
                className="flex h-12 items-center rounded-[24px] border border-[var(--color-gray-300)] px-4 py-3 text-[18px] leading-none text-[var(--color-gray-900)]"
              >
                {t("store.fulfillment.tipCustom")}
              </button>
            )}
          </div>
        </div>
      </div>
    </SelectableCard>
  );
}
