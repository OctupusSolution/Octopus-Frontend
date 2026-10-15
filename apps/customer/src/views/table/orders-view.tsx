"use client";

import Link from "next/link";
import { useI18n } from "@/app/providers";
import { useTableCheckout } from "@/features/table/checkout";
import { TABLE_ROUTES } from "@/shared/lib/table-flow";
import { TableBackTitle, TableBadge } from "@/shared/ui/table";
import { TableFooter, TableTopCard } from "@/widgets/table-shell";
import { NoOrder, OrderFacts, orderProgress, OrderSentHead, ORDER_STEPS, useNow } from "./order-shared";

const ACTION = "flex h-10 w-full items-center justify-center rounded-[24px] px-3 text-[14px] font-semibold leading-none";

/** The table's order once it is with the kitchen: what was sent and when, and
 *  the two things to do next — pay for it, or follow it. */
export function TableOrdersView() {
  const { t } = useI18n();
  const { order } = useTableCheckout();
  const now = useNow();

  const progress = order ? orderProgress(order, now) : 0;
  const served = progress >= ORDER_STEPS.length;

  return (
    <div className="flex flex-col gap-4">
      <TableTopCard />

      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-4 px-4">
          <TableBackTitle
            title={t("store.table.ordersTitle")}
            backHref={TABLE_ROUTES.home}
            backLabel={t("store.table.back")}
          />

          {!order ? (
            <NoOrder />
          ) : (
            <div className="flex flex-col items-center gap-4 rounded-[24px] border border-gray-300 px-3 py-2">
              <OrderSentHead />

              <div className="flex w-full items-start gap-1 rounded-[20px] border border-gray-300 bg-white p-2 drop-shadow-[0_0_4px_rgba(0,0,0,0.08)]">
                <OrderFacts
                  order={order}
                  badge={
                    served ? (
                      <TableBadge tone="info" compact>
                        {t("store.table.stepServed")}
                      </TableBadge>
                    ) : (
                      <TableBadge tone="pending" compact>
                        {t(progress >= 2 ? "store.table.stepReady" : "store.table.statusPreparing")}
                      </TableBadge>
                    )
                  }
                />
              </div>

              <div className="flex w-full flex-col gap-3">
                {order.payment ? (
                  <Link href={TABLE_ROUTES.invoice} className={`${ACTION} bg-ocean-blue text-white`}>
                    {t("store.table.viewInvoice")}
                  </Link>
                ) : (
                  <Link href={TABLE_ROUTES.paySummary} className={`${ACTION} bg-ocean-blue text-white`}>
                    {t("store.table.readyToPay")}
                  </Link>
                )}
                <Link
                  href={TABLE_ROUTES.order}
                  className={`${ACTION} bg-[var(--octo-store-chip)] text-[var(--octo-store-select-text)]`}
                >
                  {t("store.table.trackStatus")}
                </Link>
              </div>
            </div>
          )}
        </div>

        <TableFooter />
      </div>
    </div>
  );
}
