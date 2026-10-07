"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useI18n } from "@/app/providers";
import type { TableOrder } from "@/features/table/checkout";
import { useMobileFlow } from "@/shared/lib/flow-context";
import { TableButton, TableIcon } from "@/shared/ui/table";

/** "31 مايو 2026 - 7:27 م" — Western digits in both languages, as the designs set them. */
export function formatOrderDate(iso: string, locale: string): string {
  const date = new Date(iso);
  const tag = locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB";
  const day = new Intl.DateTimeFormat(tag, { day: "numeric", month: "long", year: "numeric" }).format(date);
  return `${day} - ${formatOrderTime(iso, locale)}`;
}

/** "7:27 م" */
export function formatOrderTime(iso: string, locale: string): string {
  const tag = locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB";
  return new Intl.DateTimeFormat(tag, { hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso));
}

/** How long the kitchen is given before the order is expected ready. */
const PREP_MINUTES = 25;
/** How long after "ready" an order is taken to have reached the table. */
const SERVE_MINUTES = 5;

const plusMinutes = (iso: string, minutes: number): string =>
  new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();

export const orderReadyAt = (order: TableOrder): string => plusMinutes(order.placedAt, PREP_MINUTES);

/** The four steps of an order, and when each was (or is expected to be) reached. */
export const ORDER_STEPS = [
  { key: "store.table.stepReceived", at: (order: TableOrder) => order.placedAt },
  { key: "store.table.stepPreparing", at: (order: TableOrder) => order.placedAt },
  { key: "store.table.stepReady", at: orderReadyAt },
  { key: "store.table.stepServed", at: (order: TableOrder) => plusMinutes(orderReadyAt(order), SERVE_MINUTES) },
] as const;

/** How many steps are behind the order: 1 while it is being prepared, 4 once it
 *  is served. The kitchen does not report progress to the storefront yet, so
 *  this follows the clock against the expected times — a stand-in for the real
 *  status, to be replaced by it. */
export function orderProgress(order: TableOrder, now: number): number {
  const ready = new Date(orderReadyAt(order)).getTime();
  if (now < ready) return 1;
  return now < ready + SERVE_MINUTES * 60_000 ? 2 : ORDER_STEPS.length;
}

/** The current time, refreshed often enough for an order's status to move on its own. */
export function useNow(everyMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), everyMs);
    return () => window.clearInterval(timer);
  }, [everyMs]);
  return now;
}

export interface OrderFactsProps {
  order: TableOrder;
  /** The "order sent" dialog also names the table; the order card does not. */
  withTable?: boolean;
  /** Tracking shows only the number and the expected time. */
  withSentAt?: boolean;
  /** The order's status, set beside its number so it never narrows the lines below. */
  badge?: ReactNode;
  className?: string;
}

/** An order's facts, one per line, each led by its icon. */
export function OrderFacts({ order, withTable, withSentAt = true, badge, className }: OrderFactsProps) {
  const { t, locale } = useI18n();
  const row = "tbl-wrap-safe flex items-center text-[14px] font-medium text-gray-900";

  return (
    <div className={`flex min-w-0 flex-1 flex-col px-1 ${className ?? "gap-3"}`}>
      {withTable && (
        <p className={`${row} gap-[2px]`}>
          <span className="flex size-4 items-center justify-center">
            <TableIcon name="table-dark" size={[14.33, 12.33]} />
          </span>
          {t("store.table.tableNumberLine", { n: order.table ? `T${order.table}` : "—" })}
        </p>
      )}
      <div className="flex items-center justify-between gap-1">
        <p className={`${row} min-w-0 ${withTable ? "gap-[2px]" : "gap-1"}`}>
          <TableIcon name="clipboard-16" size={16} />
          {t("store.table.orderNumber", { n: order.orderNumber })}
        </p>
        {badge}
      </div>
      {withSentAt && (
        <p className={`${row} ${withTable ? "gap-[2px]" : "gap-1"}`}>
          <TableIcon name="clock-16" size={16} />
          {t("store.table.sentAt", { time: formatOrderTime(order.placedAt, locale) })}
        </p>
      )}
      <p className={`${row} ${withTable ? "gap-[2px]" : "gap-1"}`}>
        <TableIcon name="timer-16" size={16} />
        {t("store.table.expectedReady", { time: formatOrderTime(orderReadyAt(order), locale) })}
      </p>
    </div>
  );
}

/** The illustration, title and line every "your order went to the kitchen" surface opens with. */
export function OrderSentHead() {
  const { t } = useI18n();

  return (
    <div className="flex w-full flex-col items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/table/order-sent.gif" alt="" className="size-[136px]" />
      <div className="flex w-full flex-col gap-3 text-center leading-none">
        <h2 className="text-[18px] font-bold text-gray-900">{t("store.table.orderSentTitle")}</h2>
        <p className="tbl-wrap-safe text-[12px] font-medium text-[var(--octo-store-select-label)]">
          {t("store.table.orderSentBody")}
        </p>
      </div>
    </div>
  );
}

/** The tracking and invoice screens opened before any order was sent. */
export function NoOrder() {
  const { t } = useI18n();
  const flow = useMobileFlow();

  return (
    <div className="flex flex-col items-center gap-4 px-4 py-12 text-center">
      <p className="text-[16px] font-medium leading-none text-[var(--octo-store-select-label)]">
        {t("store.table.noOrder")}
      </p>
      <TableButton href={flow.menuIndex}>{t("store.cart.browse")}</TableButton>
    </div>
  );
}
