"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MenuCategory, MenuItem, OrderLine } from "@octopus/api-client";
import { useI18n } from "@/app/providers";
import { useOrderingSession } from "@/entities/order";
import { TipSelector } from "@/features/order/add-tip";
import { computeOrderTotals } from "@/shared/lib/pricing";
import { computeCartPricing } from "@/shared/lib/storefront";
import { PageHeading, SelectableCard } from "@/shared/ui";
import { OrderSummaryCard } from "@/widgets/order-summary-card";
import { OrderTotalsPanel } from "@/widgets/order-totals-panel";

export interface DineInViewProps {
  categories: MenuCategory[];
  items: MenuItem[];
}

export function DineInView({ categories, items }: DineInViewProps) {
  const { t } = useI18n();
  const router = useRouter();
  const { state, setTable, setTip } = useOrderingSession();

  function itemFor(line: OrderLine): MenuItem | null {
    return items.find((i) => i.id === line.menuItemId) ?? null;
  }

  function editHrefFor(line: OrderLine): string {
    const item = itemFor(line);
    if (!item) return "/menu";
    const category = categories.find((c) => c.id === item.categoryId);
    if (!category) return "/menu";
    return `/menu/${category.slug}/${item.id}?line=${line.lineId}`;
  }

  if (state.lines.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-16 text-center">
        <p className="text-[16px] text-[var(--octo-store-body)]">{t("store.cart.empty")}</p>
        <Link
          href="/menu"
          className="text-[16px] font-medium text-[var(--color-ocean-blue)] hover:underline"
        >
          {t("store.cart.browse")}
        </Link>
      </div>
    );
  }

  const totals = computeOrderTotals(computeCartPricing(state.lines), state.tipSar);

  return (
    <div className="mx-auto flex w-full max-w-[1248px] flex-col gap-12 px-4 pb-1 pt-[58px] sm:px-6">
      <PageHeading
        title={t("store.fulfillment.dineInHeading")}
        subtitle={t("store.fulfillment.dineInSubtitle")}
      />

      {/* The recap column leads in reading order; the totals panel closes it. */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-8">
          {state.lines.map((line) => (
            <OrderSummaryCard
              key={line.lineId}
              line={line}
              imageUrl={itemFor(line)?.imageUrl ?? null}
              editHref={editHrefFor(line)}
            />
          ))}

          <SelectableCard className="px-4 py-3">
            <div className="flex w-full items-start gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/storefront/icon-location.svg" alt="" className="size-6 shrink-0" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <p className="text-[14px] font-medium leading-none text-[var(--octo-store-select-label)]">
                  {t("store.fulfillment.currentLocation")}
                </p>
                {state.tableNumber ? (
                  <p className="text-[18px] font-bold leading-none text-[var(--color-gray-900)]">
                    {t("store.fulfillment.tableLine", {
                      number: state.tableNumber,
                      hall: t("store.fulfillment.tableHall"),
                    })}
                  </p>
                ) : (
                  // Reached without a QR scan, so the table is asked for here.
                  <input
                    type="text"
                    inputMode="numeric"
                    aria-label={t("store.fulfillment.tablePrompt")}
                    placeholder={t("store.fulfillment.tablePrompt")}
                    onChange={(event) => setTable(event.target.value)}
                    className="h-9 w-[220px] rounded-[18px] border border-[var(--color-gray-300)] bg-white px-3 text-[16px] text-[var(--color-gray-900)] outline-none focus:border-[var(--color-ocean-blue)]"
                  />
                )}
              </div>
            </div>
          </SelectableCard>

          <TipSelector value={state.tipSar} onChange={setTip} />
        </div>

        <OrderTotalsPanel
          totals={totals}
          onContinue={() => router.push("/checkout")}
          className="lg:w-[384px] lg:shrink-0"
        />
      </div>
    </div>
  );
}
