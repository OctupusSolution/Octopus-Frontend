"use client";

import { useI18n } from "@/app/providers";
import { useTableCheckout } from "@/features/table/checkout";
import { TABLE_ROUTES } from "@/shared/lib/table-flow";
import { TableBackTitle, TableBadge, TableButton, TableIcon } from "@/shared/ui/table";
import { TableFooter, TableTopCard } from "@/widgets/table-shell";
import { formatOrderTime, NoOrder, OrderFacts, orderProgress, ORDER_STEPS, useNow } from "./order-shared";

const CARD = "rounded-[20px] border border-gray-300 bg-white p-3 drop-shadow-[0_0_4px_rgba(0,0,0,0.08)]";
/** The step icons sit 36px apart; the rail runs between the first and the last. */
const STEP_PITCH = 36;

function StepIcon({ state }: { state: "done" | "current" | "pending" }) {
  if (state === "current") return <TableIcon name="step-current" size={20} className="relative" />;

  return (
    <span
      className={`relative flex size-5 shrink-0 items-center justify-center rounded-[16px] ${
        state === "done" ? "bg-[var(--octo-store-step-done)]" : "bg-[var(--octo-store-step-idle)]"
      }`}
    >
      <TableIcon name={state === "done" ? "step-done" : "step-pending"} size={14} />
    </span>
  );
}

/** Where the order is: received, being prepared, ready, served. */
export function TableOrderView() {
  const { t, locale } = useI18n();
  const { order } = useTableCheckout();
  const now = useNow();

  const progress = order ? orderProgress(order, now) : 0;
  const served = progress >= ORDER_STEPS.length;
  // The green stretch of the rail reaches the step in progress, or the end once served.
  const reached = served ? (ORDER_STEPS.length - 1) * STEP_PITCH - 4 : progress * STEP_PITCH - 6;

  return (
    <div className="flex flex-col gap-4">
      <TableTopCard />

      <div className="flex flex-col gap-10">
        <div className={`flex flex-col ${order?.payment ? "gap-6" : "gap-2"}`}>
          <div className="flex flex-col gap-[2px]">
            <div className="px-4">
              <TableBackTitle
                title={t("store.table.trackTitle")}
                backHref={order?.payment ? TABLE_ROUTES.thanks : TABLE_ROUTES.orders}
                backLabel={t("store.table.back")}
              />
            </div>
            {order?.payment && (
              <p className="flex items-center gap-1 bg-[var(--octo-store-success-soft)] px-4 py-2 text-[16px] font-bold leading-none text-[var(--octo-store-success)]">
                <TableIcon name="paid-check" />
                {t("store.table.paidBanner")}
              </p>
            )}
          </div>

          {!order ? (
            <NoOrder />
          ) : (
            <div className="flex flex-col gap-2 px-4">
              <div className={`flex items-start gap-1 ${CARD}`}>
                <OrderFacts
                  order={order}
                  withSentAt={false}
                  className="gap-3 [&>div>p]:font-semibold"
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

              <ol className={`relative flex flex-col gap-4 ${CARD}`}>
                <li className="absolute bottom-[26px] start-[21.5px] top-[26px] w-px bg-gray-300" aria-hidden="true" />
                <li
                  className="absolute start-[21.5px] top-[26px] w-px bg-[var(--octo-store-success)]"
                  style={{ height: reached }}
                  aria-hidden="true"
                />
                {ORDER_STEPS.map((step, index) => {
                  const state = index < progress ? "done" : index === progress ? "current" : "pending";
                  return (
                    <li key={step.key} className="flex items-center gap-2">
                      <StepIcon state={state} />
                      <span
                        className={`min-w-0 flex-1 text-[14px] font-bold leading-none ${
                          state === "pending" ? "text-[var(--octo-store-select-label)]" : "text-gray-900"
                        }`}
                      >
                        {t(step.key)}
                      </span>
                      <span className="text-[12px] leading-none text-[var(--octo-store-select-label)]">
                        {formatOrderTime(step.at(order), locale)}
                      </span>
                    </li>
                  );
                })}
              </ol>

              {order.payment ? (
                served ? (
                  <TableButton href={TABLE_ROUTES.invoice}>{t("store.table.viewInvoice")}</TableButton>
                ) : (
                  <TableButton variant="outlineBrand" href={TABLE_ROUTES.menu}>
                    {t("store.table.addMoreToOrder")}
                  </TableButton>
                )
              ) : (
                <div className="flex flex-col gap-3">
                  <TableButton href={TABLE_ROUTES.paySummary}>{t("store.table.readyToPay")}</TableButton>
                  <TableButton variant="outlineBrand" href={TABLE_ROUTES.menu}>
                    {t("store.table.addMoreToOrder")}
                  </TableButton>
                </div>
              )}
            </div>
          )}
        </div>

        <TableFooter />
      </div>
    </div>
  );
}
