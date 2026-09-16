"use client";

import { useI18n } from "@/app/providers";
import { formatAmountPadded, type OrderTotals } from "@/shared/lib/pricing";

export interface OrderTotalsPanelProps {
  totals: OrderTotals;
  onContinue: () => void;
  className?: string;
}

export function OrderTotalsPanel({ totals, onContinue, className = "" }: OrderTotalsPanelProps) {
  const { t } = useI18n();
  const currency = t("store.currency");

  const rows: { key: string; label: string; amount: number }[] = [
    { key: "base", label: t("store.cart.basePrice"), amount: totals.baseSar },
    { key: "addons", label: t("store.cart.addons"), amount: totals.addonsSar },
    { key: "service", label: t("store.fulfillment.serviceFee"), amount: totals.serviceFeeSar },
    { key: "tip", label: t("store.fulfillment.tip"), amount: totals.tipSar },
    { key: "vat", label: t("store.fulfillment.vat"), amount: totals.vatSar },
  ];

  return (
    <aside
      className={`flex h-fit flex-col gap-4 rounded-[24px] bg-[var(--color-gray-100)] p-6 ${className}`}
    >
      <dl className="flex flex-col gap-4">
        {rows.map((row) => (
          <div key={row.key} className="flex items-center justify-between gap-3">
            <dt className="text-[14px] leading-none text-[var(--color-gray-900)]">{row.label}</dt>
            <dd className="text-[14px] font-medium leading-none text-[var(--color-gray-900)]">
              {formatAmountPadded(row.amount)}
              <span className="text-[12px] font-normal"> {currency}</span>
            </dd>
          </div>
        ))}
      </dl>

      {/* The design insets the rule 4px from the panel's text column. */}
      <div className="mx-1 h-px bg-[var(--color-gray-300)]" aria-hidden="true" />

      <div className="flex items-center justify-between gap-3">
        <span className="text-[20px] font-medium leading-none text-[var(--color-gray-900)]">
          {t("store.cart.total")}
        </span>
        <span className="text-[24px] font-bold leading-none text-[var(--color-ocean-blue)]">
          {formatAmountPadded(totals.totalSar)}
          <span className="text-[15.5px]"> {currency}</span>
        </span>
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="flex h-12 w-full items-center justify-center rounded-[24px] bg-[var(--color-ocean-blue)] text-[16px] font-bold text-white transition-opacity hover:opacity-90"
      >
        {t("store.fulfillment.continueToPay")}
      </button>
    </aside>
  );
}
