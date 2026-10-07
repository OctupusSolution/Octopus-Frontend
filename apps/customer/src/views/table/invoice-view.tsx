"use client";

import type { ReactNode } from "react";
import { useI18n } from "@/app/providers";
import { useTableCheckout } from "@/features/table/checkout";
import { computeLinePricing } from "@/shared/lib/storefront";
import { shareLink } from "@/shared/lib/share-link";
import { TABLE_ROUTES } from "@/shared/lib/table-flow";
import { TableBackTitle, TableBadge, TableIcon, TableMoney } from "@/shared/ui/table";
import { TABLE_BRAND_FALLBACK_LOGO, TableFooter, TableTopCard, useTableBrand } from "@/widgets/table-shell";
import { formatOrderDate, NoOrder } from "./order-shared";

const ACTION = "flex h-10 min-w-0 flex-1 items-center justify-center gap-1 rounded-[24px] px-2 text-center text-[14px] font-semibold leading-[1.1]";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[12px] font-medium leading-[12px] text-[var(--octo-store-select-label)]">{label}</dt>
      <dd className="text-[14px] font-medium leading-none text-gray-900">{children}</dd>
    </div>
  );
}

function Amount({ amountSar, negative }: { amountSar: number; negative?: boolean }) {
  return <TableMoney amount={amountSar} negative={negative} currencyClassName="text-[9.03px]" />;
}

/** The order's invoice, as the restaurant issued it. */
export function TableInvoiceView() {
  const { t, locale } = useI18n();
  const brand = useTableBrand();
  const { order } = useTableCheckout();

  async function share() {
    await shareLink(window.location.href, t("store.table.invoiceTitle"));
  }

  return (
    <div className="flex flex-col gap-4">
      <TableTopCard />

      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-3 px-4">
          <div className="flex items-center justify-between">
            <TableBackTitle
              title={t("store.table.invoiceTitle")}
              backHref={TABLE_ROUTES.thanks}
              backLabel={t("store.table.back")}
            />
            {order && (
              <TableBadge tone={order.payment ? "paid" : "pending"}>
                {t(order.payment ? "store.table.paidBadge" : "store.table.invoiceUnpaid")}
              </TableBadge>
            )}
          </div>

          {!order ? (
            <NoOrder />
          ) : (
            <div className="flex flex-col gap-2">
              <article className="flex flex-col gap-4 rounded-[24px] border border-gray-300 bg-white p-4">
                <header className="flex items-start gap-2 border-b border-gray-200 pb-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={brand.logoUrl ?? TABLE_BRAND_FALLBACK_LOGO}
                    alt=""
                    className="size-10 shrink-0 rounded-[12px] object-contain"
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-2 leading-none">
                    <p className="text-[14px] font-semibold text-gray-900">{brand.name}</p>
                    {brand.branchName && (
                      <p className="text-[12px] font-medium text-[var(--octo-store-select-label)]">{brand.branchName}</p>
                    )}
                  </div>
                </header>

                <dl className="flex flex-col gap-4 border-b border-dashed border-gray-200 pb-3">
                  <Row label={t("store.table.detailOrder")}>
                    <span dir="ltr">{order.orderNumber}</span>
                  </Row>
                  <Row label={t("store.table.detailTable")}>
                    <span dir="ltr">{order.table ? `T${order.table}` : "—"}</span>
                  </Row>
                  <Row label={t("store.table.invoiceDate")}>
                    {formatOrderDate(order.payment?.paidAt ?? order.placedAt, locale)}
                  </Row>
                  <Row label={t("store.table.invoiceCashier")}>{t("store.table.invoiceCashierSystem")}</Row>
                  {order.payment && (
                    <Row label={t("store.table.detailMethod")}>{t(order.payment.methodNameKey)}</Row>
                  )}
                </dl>

                <dl className="flex flex-col gap-4 border-b border-dashed border-gray-200 pb-3">
                  {order.lines.map((line) => (
                    <Row key={line.lineId} label={line.quantity > 1 ? `${line.quantity} × ${line.name}` : line.name}>
                      <Amount amountSar={computeLinePricing(line).totalSar} />
                    </Row>
                  ))}
                </dl>

                <div className="flex flex-col gap-2 border-b border-gray-200 pb-3">
                  <dl className="flex flex-col gap-4 border-b border-gray-200 pb-3">
                    <Row label={t("store.table.invoiceSubtotal")}>
                      <Amount amountSar={order.bill.baseSar + order.bill.addonsSar} />
                    </Row>
                    <Row label={t("store.fulfillment.serviceFee")}>
                      <Amount amountSar={order.bill.serviceFeeSar} />
                    </Row>
                    <Row label={t("store.table.invoiceVat")}>
                      <Amount amountSar={order.bill.vatSar} />
                    </Row>
                    {order.bill.discountSar > 0 && (
                      <Row label={t("store.table.discountValue")}>
                        <Amount amountSar={order.bill.discountSar} negative />
                      </Row>
                    )}
                    {order.bill.tipSar > 0 && (
                      <Row label={t("store.fulfillment.tip")}>
                        <Amount amountSar={order.bill.tipSar} />
                      </Row>
                    )}
                  </dl>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold leading-[12px] text-gray-900">
                      {t(order.payment ? "store.table.invoiceTotalPaid" : "store.table.total")}
                    </span>
                    <TableMoney
                      amount={order.bill.payableSar}
                      className="text-[16px] font-semibold text-[var(--octo-store-select-text)]"
                      currencyClassName="text-[10.32px]"
                    />
                  </div>
                </div>

                <footer className="flex flex-col gap-3 text-[12px]">
                  <p className="tbl-wrap-safe text-center font-medium text-[var(--octo-store-select-label)]">
                    {t("store.table.invoiceThanks")}
                  </p>
                  <p className="flex items-center justify-center gap-1 font-bold leading-[12px] text-gray-900">
                    {t("store.table.poweredBy")}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={TABLE_BRAND_FALLBACK_LOGO} alt="" className="size-[13px]" />
                    <span dir="ltr">PlamOS</span>
                  </p>
                </footer>
              </article>

              <div className="flex gap-3 print:hidden">
                <button type="button" onClick={() => window.print()} className={`${ACTION} bg-ocean-blue text-white`}>
                  <TableIcon name="download" />
                  {t("store.table.downloadInvoice")}
                </button>
                <button
                  type="button"
                  onClick={share}
                  className={`${ACTION} bg-[var(--octo-store-chip)] text-[var(--octo-store-select-text)]`}
                >
                  <TableIcon name="share" />
                  {t("store.table.shareInvoice")}
                </button>
              </div>
            </div>
          )}
        </div>

        <TableFooter />
      </div>
    </div>
  );
}
