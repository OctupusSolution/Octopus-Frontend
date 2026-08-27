"use client";

import type { MenuItem } from "@octopus/api-client";
import { useI18n } from "@/app/providers";
import { formatAmount } from "@/shared/lib/pricing";

export interface PriceBlockProps {
  item: MenuItem;
  size?: "card" | "hero";
}

export function PriceBlock({ item, size = "card" }: PriceBlockProps) {
  const { t } = useI18n();
  const currency = t("store.currency");
  const main = size === "hero" ? "text-[34px]" : "text-[14px]";
  const unit = size === "hero" ? "text-[15px]" : "text-[9.5px]";
  const showWas = item.compareAtPriceSar !== undefined && item.compareAtPriceSar > item.priceSar;

  return (
    <div className="flex min-w-0 flex-col items-end leading-tight">
      {item.priceFrom && (
        <span className="text-[9.5px] text-[var(--octo-text-muted)]">{t("store.card.priceFrom")}</span>
      )}

      <span className={`${main} font-bold text-[#0D6EFD]`}>
        {formatAmount(item.priceSar)}
        <span className={`${unit} ms-1 font-semibold`}>{currency}</span>
      </span>

      {showWas && (
        <span className="text-[10px] text-[var(--octo-text-faint)] line-through">
          {formatAmount(item.compareAtPriceSar as number)}
          <span className="ms-0.5 text-[8.5px]">{currency}</span>
        </span>
      )}
    </div>
  );
}
