"use client";

import Link from "next/link";
import type { OrderLine } from "@octopus/api-client";
import { useI18n } from "@/app/providers";
import { formatAmount } from "@/shared/lib/pricing";
import { computeLinePricing, groupedModifiers } from "@/shared/lib/storefront";

export interface OrderSummaryCardProps {
  line: OrderLine;
  /** The product photograph. The cart persists ids, so the caller looks it up. */
  imageUrl: string | null;
  /** Back to the product page, carrying the line id so it edits in place. */
  editHref: string;
}

/** The recap the customer keeps in view while choosing how to receive the
 *  order: photograph, chosen options, line total, and a way back to the
 *  product page. */
export function OrderSummaryCard({ line, imageUrl, editHref }: OrderSummaryCardProps) {
  const { t } = useI18n();
  const pricing = computeLinePricing(line);

  return (
    <article className="flex items-center gap-4 rounded-[36px] border border-[var(--color-gray-300)] p-4">
      <div className="flex h-[150px] w-[151px] shrink-0 items-center justify-center overflow-hidden rounded-[20px] bg-[var(--octo-store-tile)]">
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" loading="lazy" className="h-[100px] w-[126px] object-cover" />
        )}
      </div>

      <div className="flex min-w-0 flex-1 items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-4">
          <p className="text-[24px] font-medium leading-none text-[var(--color-gray-900)]">
            {line.name}
          </p>

          {groupedModifiers(line).map((group) => (
            <p
              key={group.label}
              className="text-[16px] font-medium leading-none text-[var(--octo-store-body)]"
            >
              {group.label ? `${group.label} : ` : ""}
              <span className="text-[var(--color-gray-900)]">{group.values}</span>
            </p>
          ))}

          <p className="text-[32px] font-bold leading-none text-[var(--octo-store-price)]">
            {formatAmount(pricing.totalSar)}
            <span className="text-[16px] font-medium"> {t("store.currency")}</span>
          </p>
        </div>

        <Link
          href={editHref}
          className="flex h-12 shrink-0 items-center justify-center rounded-[24px] bg-[var(--color-gray-100)] px-6 text-[16px] font-medium text-[var(--color-gray-900)] transition-colors hover:bg-[var(--octo-hover)]"
        >
          {t("store.fulfillment.editOrder")}
        </Link>
      </div>
    </article>
  );
}
