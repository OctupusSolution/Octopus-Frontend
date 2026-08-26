"use client";

import { Minus, Plus } from "lucide-react";
import { useI18n } from "@/app/providers";

export interface QuantityStepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
}

/** Plus is a filled blue circle at the start edge, minus a bare glyph at the
 *  end — the arrangement the design draws, expressed logically so it mirrors. */
export function QuantityStepper({ value, onChange, min = 1 }: QuantityStepperProps) {
  const { t } = useI18n();

  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-2 py-1.5">
      <button
        type="button"
        aria-label={t("store.product.increase")}
        onClick={() => onChange(value + 1)}
        className="grid h-[30px] w-[30px] place-items-center rounded-full bg-[#0D6EFD] text-white transition-opacity hover:opacity-90"
      >
        <Plus size={16} />
      </button>

      <span className="min-w-[22px] text-center text-[13px] font-semibold">{value}</span>

      <button
        type="button"
        aria-label={t("store.product.decrease")}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        className="grid h-[30px] w-[30px] place-items-center rounded-full text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)] disabled:opacity-40"
      >
        <Minus size={16} />
      </button>
    </div>
  );
}
