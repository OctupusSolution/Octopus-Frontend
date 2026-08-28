"use client";

import { ReceiptText } from "lucide-react";
import { useI18n } from "@/app/providers";
import { formatAmount } from "@/shared/lib/pricing";

export interface PriceBreakdownRow {
  label: string;
  amountSar: number;
}

export interface PriceBreakdownProps {
  rows: PriceBreakdownRow[];
  totalSar: number;
}

/** Shown for products whose price is assembled from choices rather than
 *  announced, so the customer can see what each choice added. */
export function PriceBreakdown({ rows, totalSar }: PriceBreakdownProps) {
  const { t } = useI18n();
  const currency = t("store.currency");

  return (
    <section className="rounded-xl border-2 border-dashed border-[#0D6EFD] bg-[var(--octo-selected)] p-5">
      <h2 className="flex items-center gap-2 text-[12.5px] font-semibold text-[var(--octo-text-secondary)]">
        <ReceiptText size={15} className="shrink-0 text-[#0D6EFD]" aria-hidden="true" />
        {t("store.product.totalTitle")}
      </h2>

      <dl className="mt-3 flex flex-col gap-1.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 text-[12.5px]">
            <dt className="text-[var(--octo-text-secondary)]">{row.label}</dt>
            <dd className="shrink-0 font-semibold text-[var(--octo-text-primary)]">
              {formatAmount(row.amountSar)} <span className="text-[10px]">{currency}</span>
            </dd>
          </div>
        ))}

        <div className="mt-2 flex items-center justify-between gap-3 border-t border-[#0D6EFD]/25 pt-2.5">
          <dt className="text-[13px] font-semibold text-[var(--octo-text-primary)]">
            {t("store.product.totalLine")}
          </dt>
          <dd className="shrink-0 text-[17px] font-bold text-[#0D6EFD]">
            {formatAmount(totalSar)} <span className="text-[11px]">{currency}</span>
          </dd>
        </div>
      </dl>
    </section>
  );
}
