"use client";

import { AlertCircle } from "lucide-react";
import { useI18n } from "@/app/providers";
import { ApplyPromo } from "@/features/cart/apply-promo";
import { formatAmount } from "@/shared/lib/pricing";
import type { LinePricing } from "@/shared/lib/storefront";

export interface CartTotalsProps {
  pricing: LinePricing;
  discountSar: number;
  onContinue: () => void;
}

export function CartTotals({ pricing, discountSar, onContinue }: CartTotalsProps) {
  const { t } = useI18n();
  const currency = t("store.currency");
  const money = (amount: number) => `${formatAmount(amount)} ${currency}`;

  return (
    <aside className="flex h-fit flex-col gap-4 rounded-2xl bg-[var(--octo-store-soft)] p-5">
      <ApplyPromo />

      <dl className="flex flex-col gap-2.5 text-[12.5px]">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-[var(--octo-text-secondary)]">{t("store.cart.basePrice")}</dt>
          <dd className="text-[var(--octo-text-primary)]">{money(pricing.baseSar)}</dd>
        </div>

        <div className="flex items-center justify-between gap-3">
          <dt className="text-[var(--octo-text-secondary)]">{t("store.cart.addons")}</dt>
          <dd className="text-[var(--octo-text-primary)]">{money(pricing.addonsSar)}</dd>
        </div>

        <div className="flex items-center justify-between gap-3">
          <dt className="text-[var(--octo-text-secondary)]">{t("store.cart.discount")}</dt>
          <dd className="text-[var(--octo-text-primary)]">
            {discountSar > 0 ? `-${money(discountSar)}` : "—"}
          </dd>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[var(--octo-border-card)] pt-3">
          <dt className="text-[15px] font-bold text-[var(--octo-text-primary)]">
            {t("store.cart.total")}
          </dt>
          <dd className="text-[17px] font-bold text-[#0D6EFD]">
            {money(pricing.totalSar - discountSar)}
          </dd>
        </div>
      </dl>

      {/* Fees depend on how the order is collected, which is chosen later. */}
      <p className="flex items-start gap-2 rounded-[10px] bg-[var(--octo-store-notice)] p-3 text-[11.5px] leading-[1.7] text-[#B45309]">
        <AlertCircle size={15} className="mt-0.5 shrink-0 text-[#F59E0B]" aria-hidden="true" />
        {t("store.cart.feesNotice")}
      </p>

      <button
        type="button"
        onClick={onContinue}
        className="rounded-[10px] bg-[#0D6EFD] px-6 py-3 text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90"
      >
        {t("store.cart.continue")}
      </button>
    </aside>
  );
}
