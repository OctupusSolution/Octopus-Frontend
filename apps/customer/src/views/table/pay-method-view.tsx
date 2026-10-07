"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import type { MenuItem } from "@octopus/api-client";
import { useI18n } from "@/app/providers";
import { useOrderingSession } from "@/entities/order";
import { newOrderNumber, useTableCheckout } from "@/features/table/checkout";
import { computeTableBill, TABLE_ROUTES, tableItemHref } from "@/shared/lib/table-flow";
import { TableBackTitle, TableButton, TableIcon, TableModal, TableRadio } from "@/shared/ui/table";
import { TableLineSummary } from "@/widgets/table-order";
import { TableFooter, TableTopCard } from "@/widgets/table-shell";
import { OrderFacts, OrderSentHead } from "./order-shared";
import { PayEmpty } from "./pay-shared";

export interface TablePayMethodViewProps {
  items: MenuItem[];
}

type Timing = "now" | "later";

const LINE_ACTION =
  "flex h-10 items-center justify-center rounded-[24px] px-3 py-2 text-[14px] font-semibold leading-none";

function TimingCard({
  selected, icon, title, body, onSelect,
}: { selected: boolean; icon: ReactNode; title: string; body: string; onSelect: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex w-full items-center gap-2 rounded-[24px] border px-3 py-2 text-start ${
        selected ? "border-ocean-blue bg-[var(--octo-store-select-soft)]" : "border-gray-300"
      }`}
    >
      <span className="flex min-w-0 flex-1 items-start gap-2">
        {icon}
        <span className="flex min-w-0 flex-col gap-2 leading-none">
          <span
            className={`text-[14px] font-semibold ${
              selected ? "text-[var(--octo-store-select-text)]" : "text-gray-900"
            }`}
          >
            {title}
          </span>
          <span className="tbl-wrap-safe text-[12px] text-[var(--octo-store-select-label)]">{body}</span>
        </span>
      </span>
      <TableRadio checked={selected} />
    </button>
  );
}

/** "How would you like to pay?" — settle now, or send the order and settle later. */
export function TablePayMethodView({ items }: TablePayMethodViewProps) {
  const { t } = useI18n();
  const { state } = useOrderingSession();
  const { order, placeOrder } = useTableCheckout();
  const [timing, setTiming] = useState<Timing>("now");
  const [sent, setSent] = useState(false);

  /** Pay later: the order goes to the kitchen now. The cart stays as the table's
   *  open tab, so it can be added to and is settled from the same screens. */
  function sendOrder() {
    placeOrder({
      orderNumber: order && !order.payment ? order.orderNumber : newOrderNumber(),
      placedAt: new Date().toISOString(),
      table: state.tableNumber,
      lines: state.lines,
      bill: computeTableBill(state.lines, 0, state.promoCode),
      payment: null,
    });
    setSent(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <TableTopCard />

      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-4 px-4">
          <TableBackTitle
            title={t("store.table.howToPay")}
            backHref={TABLE_ROUTES.cart}
            backLabel={t("store.table.back")}
          />

          {state.lines.length === 0 ? (
            <PayEmpty />
          ) : (
            <div className="flex flex-col gap-6">
              {state.lines.map((line) => (
                <div
                  key={line.lineId}
                  className="flex flex-col gap-3 rounded-[24px] border border-gray-300 px-3 py-2"
                >
                  <TableLineSummary
                    line={line}
                    imageUrl={items.find((item) => item.id === line.menuItemId)?.imageUrl ?? null}
                  />
                  <div className="flex gap-3">
                    <Link
                      href={TABLE_ROUTES.menu}
                      className={`${LINE_ACTION} w-[153px] shrink-0 bg-[var(--octo-store-chip)] text-[var(--octo-store-select-text)]`}
                    >
                      {t("store.table.addProducts")}
                    </Link>
                    <Link
                      href={`${tableItemHref(line.menuItemId)}?line=${line.lineId}`}
                      className={`${LINE_ACTION} min-w-0 flex-1 border border-gray-300 text-gray-900`}
                    >
                      {t("store.cart.edit")}
                    </Link>
                  </div>
                </div>
              ))}

              <div role="radiogroup" aria-label={t("store.table.howToPay")} className="flex flex-col gap-4">
                <TimingCard
                  selected={timing === "now"}
                  icon={<TableIcon name="wallet-now" />}
                  title={t("store.table.payNow")}
                  body={t("store.table.payNowBody")}
                  onSelect={() => setTiming("now")}
                />
                <TimingCard
                  selected={timing === "later"}
                  icon={
                    <span className="relative size-6 shrink-0">
                      <TableIcon name="wallet-later" />
                      <TableIcon name="wallet-later-clock" size={4} className="absolute left-[3px] top-[17px]" />
                    </span>
                  }
                  title={t("store.table.payLater")}
                  body={t("store.table.payLaterBody")}
                  onSelect={() => setTiming("later")}
                />
              </div>

              {timing === "now" ? (
                <TableButton href={TABLE_ROUTES.paySummary}>{t("store.table.continuePayment")}</TableButton>
              ) : (
                <TableButton onClick={sendOrder}>{t("store.table.sendOrder")}</TableButton>
              )}
            </div>
          )}
        </div>

        <TableFooter />
      </div>

      <TableModal open={sent && order !== null} label={t("store.table.orderSentTitle")}>
        {order && (
          <div className="flex flex-col items-center gap-4">
            <OrderSentHead />
            <div className="flex w-full rounded-[20px] bg-gray-100 p-2">
              <OrderFacts order={order} withTable className="gap-2" />
            </div>
            <Link
              href={TABLE_ROUTES.orders}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-[20px] bg-ocean-blue px-3 text-[16px] font-bold leading-none text-white"
            >
              {t("store.table.viewOrder")}
              <TableIcon name="arrow-left-white" className="ltr:-scale-x-100" />
            </Link>
          </div>
        )}
      </TableModal>
    </div>
  );
}
