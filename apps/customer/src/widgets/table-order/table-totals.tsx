"use client";

import { TableMoney } from "@/shared/ui/table";

export interface TableTotalsRow {
  label: string;
  amountSar: number;
  /** A promo discount: drawn in green with a leading minus. */
  discount?: boolean;
}

export interface TableTotalsProps {
  rows: TableTotalsRow[];
  totalLabel: string;
  totalSar: number;
  /** The cart sets its two rows smaller and tighter than the payment screens do. */
  size?: "md" | "sm";
}

/** The bill: its rows, a rule, and the total in the brand colour. */
export function TableTotals({ rows, totalLabel, totalSar, size = "md" }: TableTotalsProps) {
  const small = size === "sm";

  return (
    <div className={`flex w-full flex-col ${small ? "gap-2" : "gap-4"}`}>
      <div className={`flex flex-col ${small ? "gap-2" : "gap-4"}`}>
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <span className={`leading-[14px] text-gray-900 ${small ? "text-[12px]" : "text-[14px]"}`}>
              {row.label}
            </span>
            <TableMoney
              amount={row.amountSar}
              padded
              negative={row.discount}
              className={`font-medium ${small ? "text-[12px]" : "text-[14px]"} ${
                row.discount ? "text-[var(--octo-store-success)]" : "text-gray-900"
              }`}
              currencyClassName="text-[12px] font-normal"
            />
          </div>
        ))}
      </div>

      <div className={`h-px bg-gray-300 ${small ? "" : "-mx-[4.5px]"}`} aria-hidden="true" />

      <div className="flex items-center justify-between">
        <span className="text-[16px] font-medium leading-none text-gray-900">{totalLabel}</span>
        <TableMoney
          amount={totalSar}
          className={`font-bold text-ocean-blue ${small ? "text-[18px]" : "text-[20px]"}`}
          currencyClassName={small ? "text-[11.61px]" : "text-[12.9px]"}
        />
      </div>
    </div>
  );
}
