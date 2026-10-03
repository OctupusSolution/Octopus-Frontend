"use client";

import type { Branch } from "@/entities/tenant";
import { useI18n } from "@/app/providers";
import { RadioDot } from "@/shared/ui";

export interface BranchCardProps {
  branch: Branch;
  selected: boolean;
  onSelect: () => void;
  /** Radio group the card belongs to. */
  name: string;
}

export function BranchCard({ branch, selected, onSelect, name }: BranchCardProps) {
  const { t } = useI18n();

  return (
    <label className="flex h-[110px] cursor-pointer items-center gap-2 rounded-[32px] border-4 border-dashed border-[var(--octo-store-select-border)] bg-[var(--octo-store-select)] p-3">
      <input
        type="radio"
        name={name}
        className="sr-only"
        checked={selected}
        onChange={onSelect}
      />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={branch.imageUrl}
        alt=""
        loading="lazy"
        className="h-full w-[85px] shrink-0 rounded-[20px] object-cover"
      />

      <span className="flex min-w-0 flex-1 flex-col items-start gap-3">
        <span className="flex items-center gap-1 rounded-lg bg-white px-2 py-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={
              branch.isOpen
                ? "/images/storefront/icon-branch-open.svg"
                : "/images/storefront/icon-branch-closed.svg"
            }
            alt=""
            className="size-4"
          />
          <span
            className={`text-[12px] font-medium leading-none ${
              branch.isOpen ? "text-[var(--color-ocean-blue)]" : "text-[var(--color-error)]"
            }`}
          >
            {t(branch.isOpen ? "store.fulfillment.branchOpen" : "store.fulfillment.branchClosed")}
          </span>
        </span>

        <span className="flex min-w-0 flex-col items-start gap-2">
          <span className="truncate text-[18px] font-bold leading-none text-black">
            {branch.displayName}
          </span>
          <span className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/storefront/icon-location.svg" alt="" className="size-6" />
            <span className="text-[14px] font-medium leading-none text-[var(--octo-store-select-label)]">
              {branch.district}
            </span>
          </span>
        </span>
      </span>

      <RadioDot checked={selected} />
    </label>
  );
}
