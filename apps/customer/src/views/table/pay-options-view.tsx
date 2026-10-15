"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import type { MenuItem } from "@octopus/api-client";
import { useI18n } from "@/app/providers";
import { useOrderingSession } from "@/entities/order";
import { newOrderNumber, useTableCheckout } from "@/features/table/checkout";
import { computeTableBill, TABLE_ROUTES } from "@/shared/lib/table-flow";
import { personShares } from "@/shared/lib/table-split";
import { TableBackTitle, TableButton, TableIcon, TableModal, TableMoney, TableRadio } from "@/shared/ui/table";
import { TableTotals } from "@/widgets/table-order";
import { TableFooter, TableTopCard } from "@/widgets/table-shell";
import { formatOrderDate } from "./order-shared";
import { billRows, PayEmpty, PayLineCards } from "./pay-shared";

export interface TablePayOptionsViewProps {
  items: MenuItem[];
}

const METHODS = [
  { id: "cash", labelKey: "store.table.methodCash", nameKey: "store.table.nameCash" },
  { id: "qr", labelKey: "store.table.methodQr", nameKey: "store.table.nameQr" },
  { id: "mada", labelKey: "store.table.methodMada", nameKey: "store.table.nameMada" },
  { id: "apple_pay", labelKey: "store.table.methodApplePay", nameKey: "store.table.nameApplePay" },
  { id: "stc_pay", labelKey: "store.table.methodStcPay", nameKey: "store.table.nameStcPay" },
  { id: "card", labelKey: "store.table.methodCard", nameKey: "store.table.nameCard" },
  { id: "tamara", labelKey: "store.table.methodTamara", nameKey: "store.table.methodTamara" },
  { id: "tabby", labelKey: "store.table.methodTabby", nameKey: "store.table.methodTabby" },
] as const;
export type MethodId = (typeof METHODS)[number]["id"];

// Payment capture is local-only for this MVP — no gateway call happens here.
// The eventual backend step charges through Moyasar/Tap using the chosen method.
const PROCESSING_MS = 2500;

interface Receipt {
  orderNumber: string;
  methodNameKey: string;
  cash: boolean;
  totalSar: number;
  table: string | null;
  paidAt: string | null;
  /** A split with shares still to collect: the table goes back to its review. */
  partial: boolean;
}

type Stage = "cash" | "processing" | "paid" | null;

const LOGO_BOX = "relative size-6 shrink-0 overflow-hidden";

/** Each scheme's mark inside the same 24px slot, cropped the way the design crops it. */
export function MethodLogo({ id, selected }: { id: MethodId; selected: boolean }) {
  switch (id) {
    case "cash":
      return <TableIcon name={selected ? "money-blue" : "money-gray"} />;
    case "qr":
      return <TableIcon name="pay-qr" />;
    case "apple_pay":
      return (
        <span className={`${LOGO_BOX} flex items-center justify-center`}>
          <TableIcon name="pay-apple" size={[21.84, 9]} />
        </span>
      );
    case "mada":
      return (
        <span className={LOGO_BOX}>
          <span className="absolute left-0 top-[7px] h-[10px] w-6 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/table/pay-mada.png"
              alt=""
              className="absolute left-[-18.92%] top-[-112.99%] h-[332.47%] w-[138.38%] max-w-none"
            />
          </span>
        </span>
      );
    case "stc_pay":
      return (
        <span className={LOGO_BOX}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/table/pay-stc.png" alt="" className="absolute left-0 top-[9px] h-[7px] w-6 object-cover" />
        </span>
      );
    case "card":
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/images/table/pay-visa.png" alt="" className="size-6 shrink-0 object-cover" />
      );
    case "tamara":
      return (
        <span className={LOGO_BOX}>
          <span className="absolute left-0 top-[7.5px] h-[9px] w-6 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/table/pay-tamara.png"
              alt=""
              className="absolute left-[-8.52%] top-[-42.9%] h-[185.8%] w-[117.46%] max-w-none"
            />
          </span>
        </span>
      );
    case "tabby":
      return (
        <span className={LOGO_BOX}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/table/pay-tabby.png" alt="" className="absolute left-0 top-[7px] h-[10px] w-6 object-cover" />
        </span>
      );
  }
}

export function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-[12px] font-medium leading-[12px] text-[var(--octo-store-select-label)]">{label}</dt>
      <dd className="text-[14px] font-medium leading-none text-gray-900">{children}</dd>
    </div>
  );
}

function ReceiptDetails({ receipt, className }: { receipt: Receipt; className: string }) {
  const { t, locale } = useI18n();

  return (
    <dl className={`flex w-full flex-col gap-4 bg-gray-100 p-4 ${className}`}>
      <DetailRow label={t("store.table.detailTable")}>
        <span dir="ltr">{receipt.table ? `T${receipt.table}` : "—"}</span>
      </DetailRow>
      <DetailRow label={t("store.table.detailOrder")}>
        <span dir="ltr">{receipt.orderNumber}</span>
      </DetailRow>
      <DetailRow label={t("store.table.detailTotal")}>
        <TableMoney amount={receipt.totalSar} currencyClassName="text-[9.03px]" />
      </DetailRow>
      <DetailRow label={t("store.table.detailMethod")}>{t(receipt.methodNameKey)}</DetailRow>
      {receipt.paidAt && (
        <DetailRow label={t("store.table.detailTime")}>{formatOrderDate(receipt.paidAt, locale)}</DetailRow>
      )}
    </dl>
  );
}

export function ModalHead({
  image, title, body, bodyClassName,
}: { image: string; title: string; body: string; bodyClassName: string }) {
  return (
    <div className="flex w-full flex-col items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/images/table/${image}.gif`} alt="" className="size-[136px]" />
      <div className="flex w-full flex-col gap-3 text-center">
        <h2 className="text-[18px] font-bold leading-none text-gray-900">{title}</h2>
        <p className={`font-medium text-[var(--octo-store-select-label)] ${bodyClassName}`}>{body}</p>
      </div>
    </div>
  );
}

/** The payment options, and the three answers a payment can end in: go to the
 *  cashier, wait while it is processed, and paid. Collects the whole bill, or
 *  one person's share of a split. */
export function TablePayOptionsView({ items }: TablePayOptionsViewProps) {
  const { t } = useI18n();
  const router = useRouter();
  const { state, clearCart } = useOrderingSession();
  const { split, payingPersonId, order, markPaid, setPayingPerson, placeOrder } = useTableCheckout();
  const [method, setMethod] = useState<MethodId>("cash");
  const [stage, setStage] = useState<Stage>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  // Once the last payment lands the cart is emptied; the page behind the
  // confirmation keeps showing the order that was just paid.
  const settled = state.lines.length === 0 && stage !== null && order !== null;
  const lines = settled ? order.lines : state.lines;
  const bill = settled ? order.bill : computeTableBill(state.lines, state.tipSar, state.promoCode);

  const payer = split.people.find((person) => person.id === payingPersonId) ?? null;
  const dueSar = payer ? personShares(split, state.lines, bill.payableSar)[payer.id] ?? 0 : bill.payableSar;

  function complete(pending: Receipt) {
    const paidAt = new Date().toISOString();
    const others = split.people.filter((person) => person.id !== payer?.id);
    const partial = payer !== null && others.some((person) => person.status !== "paid");

    if (payer) markPaid(payer.id);
    if (!partial) {
      placeOrder({
        orderNumber: pending.orderNumber,
        placedAt: order && !order.payment ? order.placedAt : paidAt,
        table: state.tableNumber,
        lines: state.lines,
        bill,
        payment: { methodNameKey: pending.methodNameKey, paidAt },
      });
      clearCart();
    }
    setReceipt({ ...pending, paidAt, partial });
    setStage("paid");
  }

  useEffect(() => {
    if (stage !== "processing" || !receipt) return;
    const timer = window.setTimeout(() => complete(receipt), PROCESSING_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  function handlePay() {
    const chosen = METHODS.find((option) => option.id === method) ?? METHODS[0];
    setReceipt({
      // An order already sent to the kitchen ("pay later") keeps its number.
      orderNumber: order && !order.payment ? order.orderNumber : newOrderNumber(),
      methodNameKey: chosen.nameKey,
      cash: chosen.id === "cash",
      totalSar: dueSar,
      table: state.tableNumber,
      paidAt: null,
      partial: false,
    });
    setStage(chosen.id === "cash" ? "cash" : "processing");
  }

  function backToReview() {
    setPayingPerson(null);
    router.push(TABLE_ROUTES.splitReview);
  }

  return (
    <div className="flex flex-col gap-4">
      <TableTopCard />

      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-6 px-4">
          <div className="flex flex-col gap-4">
            <div className="px-4">
              <TableBackTitle
                title={t("store.table.paymentOptions")}
                backHref={payer ? TABLE_ROUTES.splitReview : TABLE_ROUTES.paySummary}
                backLabel={t("store.table.back")}
              />
            </div>

            {lines.length === 0 ? (
              <PayEmpty />
            ) : (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-6">
                  <h2 className="text-[16px] font-bold leading-none text-gray-900">
                    {t("store.table.paymentOptions")}
                  </h2>

                  <div role="radiogroup" aria-label={t("store.table.paymentOptions")} className="flex flex-col gap-3">
                    {METHODS.map((option) => {
                      const selected = method === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => setMethod(option.id)}
                          className={`flex w-full items-center justify-between rounded-[24px] border px-4 py-3 ${
                            selected
                              ? "border-ocean-blue bg-[var(--octo-store-select)]"
                              : "border-transparent bg-[var(--bg-soft-violet)]"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <MethodLogo id={option.id} selected={selected} />
                            <span
                              className={`text-[14px] font-semibold leading-none ${
                                selected ? "text-[var(--octo-store-select-text)]" : "text-gray-900"
                              }`}
                            >
                              {t(option.labelKey)}
                              {option.id === "cash" && (
                                <span className="text-[10px] font-normal"> {t("store.table.methodCashNote")}</span>
                              )}
                            </span>
                          </span>
                          <TableRadio checked={selected} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <PayLineCards lines={lines} items={items} />
                  <div className="rounded-[24px] bg-gray-100 px-3 py-4">
                    <TableTotals
                      rows={billRows(t, bill, bill.tipSar > 0)}
                      totalLabel={payer ? payer.name : t("store.cart.total")}
                      totalSar={dueSar}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {lines.length > 0 && (
            <TableButton onClick={handlePay} disabled={dueSar <= 0}>
              {t("store.table.payNowCta")}
            </TableButton>
          )}
        </div>

        <TableFooter />
      </div>

      <TableModal open={stage === "cash"} onClose={() => setStage(null)} label={t("store.table.cashChosenTitle")}>
        <div className="flex flex-col items-center gap-4">
          <ModalHead
            image="wallet"
            title={t("store.table.cashChosenTitle")}
            body={t("store.table.cashChosenBody")}
            bodyClassName="tbl-wrap-safe text-[12px]"
          />
          <TableButton onClick={() => receipt && complete(receipt)}>{t("store.table.goToCashier")}</TableButton>
        </div>
      </TableModal>

      <TableModal open={stage === "processing"} label={t("store.table.processingTitle")}>
        <div className="flex flex-col items-center gap-4">
          <ModalHead
            image="loading"
            title={t("store.table.processingTitle")}
            body={t("store.table.processingBody")}
            bodyClassName="text-[14px] leading-[1.4]"
          />
          {receipt && <ReceiptDetails receipt={receipt} className="rounded-[20px]" />}
        </div>
      </TableModal>

      <TableModal open={stage === "paid"} label={t("store.table.paidTitle")}>
        {receipt && (
          <div className="flex flex-col items-center gap-4">
            <ModalHead
              image="stamp"
              title={t("store.table.paidTitle")}
              body={t(
                receipt.partial
                  ? "store.table.paidShareBody"
                  : receipt.cash ? "store.table.paidCashBody" : "store.table.paidOnlineBody",
              )}
              bodyClassName={receipt.cash ? "text-[12px] leading-[1.4]" : "tbl-wrap-safe text-[12px]"}
            />
            <ReceiptDetails receipt={receipt} className={receipt.cash ? "rounded-[20px]" : "rounded-[24px]"} />
            {receipt.partial ? (
              <TableButton onClick={backToReview}>{t("store.table.reviewSplit")}</TableButton>
            ) : (
              <div className="flex w-full flex-col gap-3">
                <TableButton href={TABLE_ROUTES.order}>{t("store.table.trackOrder")}</TableButton>
                <TableButton variant="outlineBrand" href={TABLE_ROUTES.invoice}>
                  {t("store.table.viewInvoice")}
                </TableButton>
                <TableButton variant="ghost" href={TABLE_ROUTES.thanks}>
                  {t("store.table.backToTable")}
                </TableButton>
              </div>
            )}
          </div>
        )}
      </TableModal>
    </div>
  );
}
