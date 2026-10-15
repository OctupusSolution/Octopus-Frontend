"use client";

import { useI18n } from "@/app/providers";
import { formatAmount, formatAmountPadded } from "@/shared/lib/pricing";

export interface TableMoneyProps {
  amount: number;
  className?: string;
  /** The currency word is always drawn smaller, and often lighter, than the figure. */
  currencyClassName?: string;
  /** "05.00" — the bill's rows pad the figure so the column lines up. */
  padded?: boolean;
  /** "-25" for a discount row. */
  negative?: boolean;
}

export function TableMoney({ amount, className, currencyClassName, padded, negative }: TableMoneyProps) {
  const { t } = useI18n();

  return (
    <span className={`whitespace-nowrap leading-none ${className ?? ""}`}>
      <span dir="ltr">
        {negative ? "-" : ""}
        {padded ? formatAmountPadded(amount) : formatAmount(amount)}
      </span>{" "}
      <span className={currencyClassName}>{t("store.currency")}</span>
    </span>
  );
}
