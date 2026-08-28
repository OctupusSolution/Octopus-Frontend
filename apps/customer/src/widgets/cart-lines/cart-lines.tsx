"use client";

import Link from "next/link";
import type { OrderLine } from "@octopus/api-client";
import { useI18n } from "@/app/providers";
import { formatAmount } from "@/shared/lib/pricing";
import { computeLinePricing } from "@/shared/lib/storefront";
import { QuantityStepper } from "@/shared/ui";

export interface CartLinesProps {
  lines: OrderLine[];
  imageFor: (line: OrderLine) => string | null;
  hrefFor: (line: OrderLine) => string;
  onQuantityChange: (lineId: string, quantity: number) => void;
  onRemove: (lineId: string) => void;
}

/** One row per modifier group — "الحجم : متوسط", "الإضافات : شموع - رسالة".
 *  A line saved before groupLabel existed has no group name; its options still
 *  show, on a row of their own. */
function groupedModifiers(line: OrderLine): { label: string; values: string }[] {
  const order: string[] = [];
  const byGroup = new Map<string, string[]>();

  for (const modifier of line.modifiers) {
    const key = modifier.groupLabel ?? "";
    if (!byGroup.has(key)) {
      byGroup.set(key, []);
      order.push(key);
    }
    byGroup.get(key)?.push(modifier.label);
  }

  return order.map((label) => ({ label, values: (byGroup.get(label) ?? []).join(" - ") }));
}

export function CartLines({ lines, imageFor, hrefFor, onQuantityChange, onRemove }: CartLinesProps) {
  const { t } = useI18n();
  const currency = t("store.currency");

  return (
    <ul className="flex flex-col gap-4">
      {lines.map((line) => {
        const pricing = computeLinePricing(line);
        const image = imageFor(line);

        return (
          <li
            key={line.lineId}
            className="flex flex-col gap-4 rounded-2xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4"
          >
            <div className="flex items-start gap-4">
              {image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image}
                  alt=""
                  loading="lazy"
                  className="h-[86px] w-[86px] shrink-0 rounded-xl bg-[var(--octo-store-soft)] object-contain p-2"
                />
              )}

              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="text-[14px] font-bold text-[var(--octo-text-primary)]">{line.name}</p>

                {groupedModifiers(line).map((group) => (
                  <p key={group.label} className="text-[11.5px] text-[var(--octo-text-muted)]">
                    {group.label ? `${group.label} : ` : ""}
                    {group.values}
                  </p>
                ))}

                {line.customerImageName && (
                  <p className="truncate text-[11.5px] text-[var(--octo-text-muted)]">
                    {t("store.cart.attachedImage", { name: line.customerImageName })}
                  </p>
                )}

                <p className="mt-1 text-[18px] font-bold text-[#0D6EFD]">
                  {formatAmount(pricing.totalSar)} <span className="text-[11px]">{currency}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">
                {t("store.cart.quantity")}
              </p>
              <div className="rounded-[10px] border border-[var(--octo-border-input)] px-3 py-2">
                <QuantityStepper
                  value={line.quantity}
                  onChange={(quantity) => onQuantityChange(line.lineId, quantity)}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href={hrefFor(line)}
                className="rounded-[10px] border border-[var(--octo-border-input)] px-4 py-2 text-[12px] text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)]"
              >
                {t("store.cart.edit")}
              </Link>
              <button
                type="button"
                onClick={() => onRemove(line.lineId)}
                className="text-[12px] font-medium text-[#EF4444] hover:underline"
              >
                {t("store.cart.remove")}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
