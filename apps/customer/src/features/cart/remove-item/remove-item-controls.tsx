"use client";

import { Trash2 } from "lucide-react";
import { QuantityStepper } from "@/shared/ui";

export interface RemoveItemControlsProps {
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
}

export function RemoveItemControls({ quantity, onQuantityChange, onRemove }: RemoveItemControlsProps) {
  return (
    <div className="flex items-center justify-between">
      <QuantityStepper value={quantity} onChange={onQuantityChange} min={0} />
      <button
        type="button"
        aria-label="remove item"
        onClick={onRemove}
        className="grid h-8 w-8 place-items-center rounded-[9px] text-[var(--octo-text-muted)] transition-colors hover:bg-[var(--octo-hover)] hover:text-[#EF4444]"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}
