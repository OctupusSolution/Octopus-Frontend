"use client";

import { Minus, Plus } from "lucide-react";

export interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
}

export function QuantityStepper({ value, onChange, min = 1 }: QuantityStepperProps) {
  return (
    <div className="inline-flex items-center gap-2 rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-1 py-1">
      <button
        type="button"
        aria-label="decrease quantity"
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        className="grid h-6 w-6 place-items-center rounded-[7px] text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Minus size={13} />
      </button>
      <span className="min-w-[1.25rem] text-center text-[12.5px] font-medium text-[var(--octo-text-primary)]">
        {value}
      </span>
      <button
        type="button"
        aria-label="increase quantity"
        onClick={() => onChange(value + 1)}
        className="grid h-6 w-6 place-items-center rounded-[7px] text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)]"
      >
        <Plus size={13} />
      </button>
    </div>
  );
}
