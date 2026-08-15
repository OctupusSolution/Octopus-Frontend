"use client";

import { Plus } from "lucide-react";
import type { MenuItem } from "@octopus/api-client";
import { PriceTag } from "./price-tag";

export interface ProductCardProps {
  item: MenuItem;
  disabled?: boolean;
  disabledReason?: string;
  onSelect: (item: MenuItem) => void;
}

export function ProductCard({ item, disabled, disabledReason, onSelect }: ProductCardProps) {
  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={() => !disabled && onSelect(item)}
      onKeyDown={(event) => {
        if (disabled) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(item);
        }
      }}
      className={`relative flex flex-col overflow-hidden rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] transition-shadow ${
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:shadow-[0_4px_14px_rgba(15,23,42,0.08)]"
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.imageUrl} alt={item.name} className="h-32 w-full rounded-t-xl object-cover" loading="lazy" />

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{item.name}</h3>
        <p className="line-clamp-2 text-[11.5px] text-[var(--octo-text-secondary)]">{item.description}</p>

        {disabled && disabledReason ? (
          <p className="text-[11px] font-medium text-[#EF4444]">{disabledReason}</p>
        ) : null}

        <div className="mt-auto flex items-center justify-between pt-1.5">
          <PriceTag amountSar={item.priceSar} />
          {!disabled && (
            <button
              type="button"
              aria-label={`add ${item.name}`}
              onClick={(event) => {
                event.stopPropagation();
                onSelect(item);
              }}
              className="grid h-8 w-8 shrink-0 place-items-center self-end rounded-full bg-[#0D6EFD] text-white transition-opacity hover:opacity-90"
            >
              <Plus size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
