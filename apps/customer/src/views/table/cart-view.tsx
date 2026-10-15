"use client";

import Link from "next/link";
import type { MenuItem, OrderLine } from "@octopus/api-client";
import { useI18n } from "@/app/providers";
import { useOrderingSession } from "@/entities/order";
import { bestSellers, computeCartPricing, relatedItems } from "@/shared/lib/storefront";
import { useMobileFlow } from "@/shared/lib/flow-context";
import { flowItemHref } from "@/shared/lib/table-flow";
import { TableBackTitle, TableButton, TableSectionTitle, TableStepper } from "@/shared/ui/table";
import { TableItemGrid } from "@/widgets/table-item-card";
import { TableLineSummary, TableTotals } from "@/widgets/table-order";
import { TableFooter, TableTopCard } from "@/widgets/table-shell";

export interface TableCartViewProps {
  items: MenuItem[];
}

export function TableCartView({ items }: TableCartViewProps) {
  const { t } = useI18n();
  const { state, updateQuantity, removeLine } = useOrderingSession();
  const flow = useMobileFlow();

  const itemFor = (line: OrderLine): MenuItem | null =>
    items.find((item) => item.id === line.menuItemId) ?? null;

  const pricing = computeCartPricing(state.lines);
  const lastLine = state.lines[state.lines.length - 1] ?? null;
  const lastItem = lastLine ? itemFor(lastLine) : null;
  const inCart = new Set(state.lines.map((line) => line.menuItemId));
  const suggestions = (lastItem ? relatedItems(items, lastItem, 8) : bestSellers(items, 8))
    .filter((item) => !inCart.has(item.id))
    .slice(0, 4);

  return (
    <div className="flex flex-col gap-4">
      <TableTopCard />

      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-4 px-4">
          <TableBackTitle
            title={t("store.cart.title")}
            count={state.lines.length}
            backHref={flow.menu}
            backLabel={t("store.table.back")}
          />

          <div className="flex flex-col gap-6">
            {state.lines.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-12 text-center">
                <p className="text-[16px] font-medium leading-none text-[var(--octo-store-select-label)]">
                  {t("store.cart.empty")}
                </p>
                <TableButton href={flow.menu}>{t("store.cart.browse")}</TableButton>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {state.lines.map((line) => (
                  <div
                    key={line.lineId}
                    className="flex flex-col items-start gap-2 rounded-[24px] border border-gray-300 p-3"
                  >
                    <div className="flex w-full flex-col gap-2">
                      <TableLineSummary line={line} imageUrl={itemFor(line)?.imageUrl ?? null} />
                      <div className="flex flex-col gap-2 pb-3">
                        <p className="px-2 text-[14px] font-medium leading-none text-gray-900">
                          {t("store.cart.quantity")}
                        </p>
                        <TableStepper
                          value={line.quantity}
                          onChange={(next) => updateQuantity(line.lineId, next)}
                          className="rounded-[12px]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Link
                        href={`${flowItemHref(flow, line.menuItemId)}?line=${line.lineId}`}
                        className="flex h-10 items-center justify-center rounded-[24px] bg-gray-100 px-3 text-[16px] font-medium leading-none text-gray-900"
                      >
                        {t("store.cart.edit")}
                      </Link>
                      <button
                        type="button"
                        onClick={() => removeLine(line.lineId)}
                        className="text-[12px] font-medium leading-none text-[var(--octo-store-danger)]"
                      >
                        {t("store.cart.remove")}
                      </button>
                    </div>
                  </div>
                ))}

                <div className="flex flex-col gap-4 rounded-[12px] bg-gray-100 p-3">
                  <TableTotals
                    size="sm"
                    rows={[
                      { label: t("store.cart.basePrice"), amountSar: pricing.baseSar },
                      { label: t("store.cart.addons"), amountSar: pricing.addonsSar },
                    ]}
                    totalLabel={t("store.cart.total")}
                    totalSar={pricing.totalSar}
                  />
                  <TableButton href={flow.checkout}>{t(flow.checkoutLabelKey ?? "store.fulfillment.continueToPay")}</TableButton>
                </div>
              </div>
            )}

            {suggestions.length > 0 && (
              <section className="flex flex-col gap-8">
                <TableSectionTitle title={t("store.cart.alsoBuy")} />
                <TableItemGrid items={suggestions} favorite />
              </section>
            )}
          </div>
        </div>

        <TableFooter />
      </div>
    </div>
  );
}
