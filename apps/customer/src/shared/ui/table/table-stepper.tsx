"use client";

import { useI18n } from "@/app/providers";
import { TableIcon } from "./table-icon";

export interface TableStepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  /** The frame's corner: 24px on the product screen, 12px inside a cart line. */
  className?: string;
}

export function TableStepper({ value, onChange, min = 1, className }: TableStepperProps) {
  const { t } = useI18n();

  return (
    <div
      className={`flex h-12 w-full items-center justify-center border border-gray-300 p-3 ${className ?? "rounded-[24px]"}`}
    >
      <div className="flex items-center gap-6">
        <button
          type="button"
          aria-label={t("store.product.increase")}
          onClick={() => onChange(value + 1)}
          className="flex size-8 items-center justify-center rounded-full bg-ocean-blue"
        >
          <TableIcon name="plus" />
        </button>
        <span className="min-w-[9px] text-center text-[14px] leading-none text-gray-900">{value}</span>
        <button
          type="button"
          aria-label={t("store.product.decrease")}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
          className="flex size-8 items-center justify-center rounded-full bg-gray-100"
        >
          <TableIcon name="minus" />
        </button>
      </div>
    </div>
  );
}
