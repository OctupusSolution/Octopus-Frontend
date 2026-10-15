"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/app/providers";
import { usePlaceScan } from "@/features/place/place-scan-context";
import type { ScanOrderConfirmation } from "@/shared/lib/place-order";
import { readSentOrders, safeLocalStorage } from "@/shared/lib/place-storage";
import { PLACE_ROUTES } from "@/shared/lib/table-flow";
import { TableBackTitle, TableButton, TableMoney } from "@/shared/ui/table";

// What this phone sent for this code. A guest cannot read an order back from the server
// (backend SD-3), so these screens show the confirmations kept when each order was sent.

function useSentOrders(key: string): ScanOrderConfirmation[] | null {
  const [orders, setOrders] = useState<ScanOrderConfirmation[] | null>(null);
  useEffect(() => setOrders(readSentOrders(safeLocalStorage(), key)), [key]);
  return orders;
}

function Row({ label, amount, strong }: { label: string; amount: number; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${strong ? "text-[16px] font-bold" : "text-[14px]"} text-gray-900`}>
      <span>{label}</span>
      <TableMoney amount={amount} />
    </div>
  );
}

/** The server's confirmation of one order: its reference, lines and totals. */
export function PlaceOrderView() {
  const { t } = useI18n();
  const { key } = usePlaceScan();
  const routes = PLACE_ROUTES(key);
  const ref = useSearchParams().get("ref");
  const orders = useSentOrders(key);
  if (orders === null) return null;
  const order = orders.find((o) => o.reference === ref) ?? null;

  return (
    <div className="flex min-h-dvh flex-col gap-4 px-4 pb-8 pt-[max(16px,env(safe-area-inset-top))]">
      <TableBackTitle title={t("store.place.myOrders")} backHref={routes.orders} backLabel={t("store.table.back")} />
      {order ? (
        <>
          <div className="flex flex-col items-center gap-2 rounded-[16px] bg-white p-5 text-center">
            <span aria-hidden className="flex size-12 items-center justify-center rounded-full bg-green-100 text-[24px] text-green-700">✓</span>
            <h1 className="text-[20px] font-bold text-gray-900">{t("store.place.orderReference", { ref: order.reference })}</h1>
            <p className="text-[14px] font-medium text-gray-600">{t("store.place.payAtTable")}</p>
          </div>
          <ul className="flex flex-col divide-y divide-gray-100 rounded-[16px] bg-white px-4">
            {order.lines.map((l, i) => (
              <li key={`${l.name}-${i}`} className="flex items-center justify-between gap-3 py-3 text-[14px] text-gray-900">
                <span className="min-w-0 flex-1">
                  {l.name} × {l.quantity}
                </span>
                <TableMoney amount={l.lineTotal} />
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-2 rounded-[16px] bg-white p-4">
            <Row label={t("store.place.subtotal")} amount={order.netTotal} />
            <Row label={t("store.place.tax")} amount={order.taxTotal} />
            <Row label={t("store.place.total")} amount={order.grandTotal} strong />
          </div>
        </>
      ) : (
        <p className="text-[14px] text-gray-600">{t("store.place.noOrders")}</p>
      )}
      <div className="mt-auto flex flex-col gap-3">
        <TableButton href={routes.menu}>{t("store.place.orderMore")}</TableButton>
        <TableButton href={routes.orders} variant="outline">
          {t("store.place.myOrders")}
        </TableButton>
      </div>
    </div>
  );
}

/** Every order sent from this phone for this code, newest first. */
export function PlaceOrdersView() {
  const { t } = useI18n();
  const { key } = usePlaceScan();
  const routes = PLACE_ROUTES(key);
  const orders = useSentOrders(key);
  if (orders === null) return null;

  return (
    <div className="flex min-h-dvh flex-col gap-4 px-4 pb-8 pt-[max(16px,env(safe-area-inset-top))]">
      <TableBackTitle title={t("store.place.myOrders")} backHref={routes.menu} backLabel={t("store.table.back")} />
      <p className="text-[12px] text-gray-500">{t("store.place.ordersLocalHint")}</p>
      {orders.length === 0 ? (
        <p className="rounded-[16px] bg-white p-5 text-center text-[14px] text-gray-600">{t("store.place.noOrders")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((o) => (
            <li key={o.reference}>
              <Link
                href={`${routes.order}?ref=${encodeURIComponent(o.reference)}`}
                className="flex items-center justify-between gap-3 rounded-[16px] bg-white p-4 text-gray-900"
              >
                <span className="flex flex-col gap-1">
                  <span className="text-[15px] font-bold">{t("store.place.orderReference", { ref: o.reference })}</span>
                  <span className="text-[12px] text-gray-500">{o.lines.reduce((s, l) => s + l.quantity, 0)} ×</span>
                </span>
                <TableMoney amount={o.grandTotal} className="font-bold" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-auto">
        <TableButton href={routes.menu}>{t("store.place.orderMore")}</TableButton>
      </div>
    </div>
  );
}
