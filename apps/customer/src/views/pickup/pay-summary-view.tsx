"use client";

import type { MenuItem } from "@octopus/api-client";
import { useI18n } from "@/app/providers";
import { useOrderingSession } from "@/entities/order";
import { computeTableBill, PICKUP_ROUTES } from "@/shared/lib/table-flow";
import { TableBackTitle, TableButton } from "@/shared/ui/table";
import { TablePromoField, TableTotals } from "@/widgets/table-order";
import { TableFooter, TableTopCard } from "@/widgets/table-shell";
import { billRows, PayEmpty, PayLineCards } from "../table/pay-shared";

export interface PickupPaySummaryViewProps {
  items: MenuItem[];
}

/** The payment summary of an order placed ahead: the order, a discount code and
 *  the bill. There is no bill to share or tip to add before it is collected. */
export function PickupPaySummaryView({ items }: PickupPaySummaryViewProps) {
  const { t } = useI18n();
  const { state } = useOrderingSession();
  const bill = computeTableBill(state.lines, 0, state.promoCode);

  return (
    <div className="flex flex-col gap-4">
      <TableTopCard />

      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-6 px-4">
          <div className="flex flex-col gap-4">
            <div className="px-4">
              <TableBackTitle
                title={t("store.table.paymentSummary")}
                backHref={PICKUP_ROUTES.cart}
                backLabel={t("store.table.back")}
              />
            </div>

            {state.lines.length === 0 ? (
              <PayEmpty />
            ) : (
              <>
                <PayLineCards lines={state.lines} items={items} />

                <div className="flex flex-col gap-4 rounded-[28px] bg-gray-100 px-3 py-4">
                  <TablePromoField />
                  <TableTotals
                    rows={billRows(t, bill, false)}
                    totalLabel={t("store.cart.total")}
                    totalSar={bill.payableSar}
                  />
                </div>
              </>
            )}
          </div>

          {state.lines.length > 0 && (
            <TableButton href={PICKUP_ROUTES.payOptions}>{t("store.table.continuePayment")}</TableButton>
          )}
        </div>

        <TableFooter />
      </div>
    </div>
  );
}
