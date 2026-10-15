"use client";

import type { OrderLine } from "@octopus/api-client";
import { computeLinePricing, groupedModifiers } from "@/shared/lib/storefront";
import { TableMoney } from "@/shared/ui/table";

export interface TableLineSummaryProps {
  line: OrderLine;
  /** The product photograph. The cart persists ids, so the caller looks it up. */
  imageUrl: string | null;
}

/** One ordered item as the cart and every payment screen recap it: the photo at
 *  the inline start, then its name, its choices and what it comes to. */
export function TableLineSummary({ line, imageUrl }: TableLineSummaryProps) {
  return (
    <div className="flex w-full items-start gap-3">
      <div className="flex h-20 w-[81px] shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-[var(--octo-store-tile)]">
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-[54px] w-[65px] object-contain" />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="text-[14px] font-semibold leading-none text-gray-900">
          {line.name}
          {line.quantity > 1 && <span dir="ltr"> ×{line.quantity}</span>}
        </p>
        {groupedModifiers(line).map((group) => (
          <p
            key={group.label}
            className="text-[12px] font-medium leading-none text-[var(--octo-store-body)]"
          >
            {group.label && `${group.label} : `}
            <span className="text-gray-900">{group.values}</span>
          </p>
        ))}
        <TableMoney
          amount={computeLinePricing(line).totalSar}
          className="text-[18px] font-bold text-[var(--octo-store-price)]"
          currencyClassName="text-[12px] font-light"
        />
      </div>
    </div>
  );
}
