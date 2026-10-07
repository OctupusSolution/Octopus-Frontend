"use client";

import { useEffect, useState } from "react";
import type { Branch, MenuItem } from "@octopus/api-client";
import { useI18n } from "@/app/providers";
import { useOrderingSession } from "@/entities/order";
import { usePickupCheckout, type PickupOrder } from "@/features/pickup/checkout";
import { newOrderNumber } from "@/features/table/checkout";
import { computeTableBill, PICKUP_ROUTES } from "@/shared/lib/table-flow";
import { TableBackTitle, TableButton, TableIcon, TableModal, TableMoney, TableRadio } from "@/shared/ui/table";
import { TableTotals } from "@/widgets/table-order";
import { TableFooter, TableTopCard } from "@/widgets/table-shell";
import { formatOrderDate, orderReadyAt } from "../table/order-shared";
import { DetailRow, ModalHead } from "../table/pay-options-view";
import { billRows, PayEmpty, PayLineCards } from "../table/pay-shared";
import {
  cardErrors, cardLast4, EMPTY_CARD, formatClockTime, PaymentMethods, PICKUP_METHODS, PROCESSING_MS,
  ProcessingModal, ReceiptCard, type CardErrors, type CardForm, type PickupMethodId,
} from "./pay-parts";

export interface PickupPayOptionsViewProps {
  items: MenuItem[];
  branches: Branch[];
}

type Stage = "processing" | "paid" | null;

function BranchCard({ branch, selected, onSelect }: { branch: Branch; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex w-full items-center gap-2 rounded-[20px] border p-2 text-start ${
        selected
          ? "border-[var(--octo-store-select-border)] bg-[var(--octo-store-select-soft)]"
          : "border-gray-300"
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={branch.imageUrl} alt="" className="size-[58px] shrink-0 rounded-[12px] object-cover" />
      <span className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="text-[14px] font-bold leading-none text-black">{branch.displayName}</span>
        <span className="flex items-center gap-2 text-[10px] font-medium leading-none text-[var(--octo-store-select-label)]">
          <TableIcon name="location-16" size={16} />
          {branch.district}
        </span>
      </span>
      <TableRadio checked={selected} />
    </button>
  );
}

/** Where the order is collected and how it is paid — then the wait while the
 *  payment is processed, and its confirmation. */
export function PickupPayOptionsView({ items, branches }: PickupPayOptionsViewProps) {
  const { t, locale } = useI18n();
  const { state, setBranch, clearCart } = useOrderingSession();
  const { order, placeOrder } = usePickupCheckout();
  const [method, setMethod] = useState<PickupMethodId>("card");
  const [card, setCard] = useState<CardForm>(EMPTY_CARD);
  const [errors, setErrors] = useState<CardErrors>({});
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<Stage>(null);

  // Once the payment lands the cart is emptied; the page behind the
  // confirmation keeps showing the order that was just paid.
  const settled = state.lines.length === 0 && stage !== null && order !== null;
  const lines = settled ? order.lines : state.lines;
  const bill = settled ? order.bill : computeTableBill(state.lines, 0, state.promoCode);

  const branch =
    branches.find((candidate) => candidate.id === state.branchId) ??
    branches.find((candidate) => candidate.isOpen) ??
    branches[0];
  const needle = query.trim().toLowerCase();
  const visibleBranches = branches.filter(
    (candidate) =>
      !needle ||
      [candidate.displayName, candidate.district, candidate.city, candidate.name].some((field) =>
        field.toLowerCase().includes(needle),
      ),
  );
  const chosen = PICKUP_METHODS.find((option) => option.id === method) ?? PICKUP_METHODS[0];

  function complete() {
    const paidAt = new Date().toISOString();
    const paid: PickupOrder = {
      orderNumber: newOrderNumber(),
      placedAt: paidAt,
      table: null,
      lines: state.lines,
      bill,
      payment: { methodNameKey: chosen.nameKey, paidAt },
      branchName: branch?.displayName ?? "",
      cardLast4: method === "card" ? cardLast4(card) : null,
    };
    placeOrder(paid);
    clearCart();
    setStage("paid");
  }

  useEffect(() => {
    if (stage !== "processing") return;
    const timer = window.setTimeout(complete, PROCESSING_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  function handlePay() {
    if (method === "card") {
      const found = cardErrors(card);
      setErrors(found);
      if (Object.keys(found).length > 0) return;
    }
    setStage("processing");
  }

  return (
    <div className="flex flex-col gap-4">
      <TableTopCard />

      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-6 px-4">
          <div className="flex flex-col gap-4">
            <TableBackTitle
              title={t("store.table.paymentOptions")}
              backHref={PICKUP_ROUTES.pay}
              backLabel={t("store.table.back")}
            />

            {lines.length === 0 ? (
              <PayEmpty />
            ) : (
              <div className="flex flex-col gap-6">
                <section className="flex flex-col gap-4">
                  <div className="flex flex-col gap-3 leading-none">
                    <h2 className="text-[16px] font-bold text-gray-900">
                      {t("store.fulfillment.branchSectionTitle")}
                    </h2>
                    <p className="tbl-wrap-safe text-[12px] text-[var(--octo-store-body)]">
                      {t("store.fulfillment.branchSectionSubtitle")}
                    </p>
                  </div>

                  <div className="flex flex-col gap-4">
                    <label className="flex h-12 items-center gap-2 rounded-[20px] border border-gray-300 p-2 focus-within:border-ocean-blue">
                      <TableIcon name="search" />
                      <input
                        type="text"
                        inputMode="search"
                        enterKeyHint="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={t("store.fulfillment.branchSearch")}
                        aria-label={t("store.fulfillment.branchSearch")}
                        className="min-w-0 flex-1 bg-transparent text-[14px] leading-none text-gray-900 outline-none placeholder:text-[var(--octo-store-select-label)]"
                      />
                    </label>

                    {visibleBranches.length === 0 ? (
                      <p className="py-4 text-center text-[12px] text-[var(--octo-store-select-label)]">
                        {t("store.fulfillment.branchEmpty")}
                      </p>
                    ) : (
                      <div
                        role="radiogroup"
                        aria-label={t("store.fulfillment.branchSectionTitle")}
                        className="flex flex-col gap-4"
                      >
                        {visibleBranches.map((candidate) => (
                          <BranchCard
                            key={candidate.id}
                            branch={candidate}
                            selected={candidate.id === branch?.id}
                            onSelect={() => setBranch(candidate.id)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </section>

                <section className="flex flex-col gap-6">
                  <h2 className="text-[16px] font-bold leading-none text-gray-900">
                    {t("store.table.paymentOptions")}
                  </h2>
                  <PaymentMethods
                    method={method}
                    onMethod={(next) => {
                      setMethod(next);
                      setErrors({});
                    }}
                    card={card}
                    onCard={(next) => {
                      setCard(next);
                      setErrors({});
                    }}
                    errors={errors}
                  />
                </section>

                <div className="flex flex-col gap-3">
                  <PayLineCards lines={lines} items={items} />
                  <div className="rounded-[24px] bg-gray-100 px-3 py-4">
                    <TableTotals
                      rows={billRows(t, bill, false)}
                      totalLabel={t("store.cart.total")}
                      totalSar={bill.payableSar}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {lines.length > 0 && (
            <TableButton onClick={handlePay} disabled={bill.payableSar <= 0 || !branch || stage !== null}>
              {t("store.pickup.completePayment")}
            </TableButton>
          )}
        </div>

        <TableFooter />
      </div>

      <ProcessingModal
        open={stage === "processing"}
        amountSar={bill.payableSar}
        methodNameKey={chosen.nameKey}
      />

      <TableModal open={stage === "paid"} dim label={t("store.table.paidTitle")}>
        {order?.payment && (
          <div className="flex flex-col items-center gap-4">
            <ModalHead
              image="stamp"
              title={t("store.table.paidTitle")}
              body={t("store.table.paidOnlineBody")}
              bodyClassName="tbl-wrap-safe text-[12px]"
            />

            <div className="flex w-full flex-col gap-3">
              <dl className="flex w-full flex-col gap-4 rounded-[24px] bg-gray-100 p-4">
                <DetailRow label={t("store.table.detailOrder")}>
                  <span dir="ltr">{order.orderNumber}</span>
                </DetailRow>
                <DetailRow label={t("store.table.detailTotal")}>
                  <TableMoney amount={order.bill.payableSar} currencyClassName="text-[9.03px]" />
                </DetailRow>
                <DetailRow label={t("store.table.detailMethod")}>{t(order.payment.methodNameKey)}</DetailRow>
                <DetailRow label={t("store.table.detailTime")}>
                  {formatOrderDate(order.payment.paidAt, locale)}
                </DetailRow>
              </dl>

              <ReceiptCard icon="location-gray-24" label={t("store.pickup.branch")}>
                {order.branchName}
              </ReceiptCard>
              <ReceiptCard icon="clock-gray-24" label={t("store.pickup.expectedPickup")}>
                {formatClockTime(orderReadyAt(order), t("store.pickup.am"), t("store.pickup.pm"))}
              </ReceiptCard>

              <p className="flex w-full items-center gap-2 rounded-[24px] bg-[var(--octo-store-pending)] px-4 py-2 text-[12px] font-medium leading-[1.5] text-[var(--octo-store-note-text)]">
                <TableIcon name="note-warning" />
                <span className="min-w-0 flex-1">{t("store.pickup.pickupTimeNote")}</span>
              </p>
            </div>

            <div className="flex w-full flex-col gap-3">
              <TableButton href={PICKUP_ROUTES.order}>{t("store.table.trackOrder")}</TableButton>
              <TableButton variant="outlineBrand" href={PICKUP_ROUTES.invoice}>
                {t("store.table.viewInvoice")}
              </TableButton>
            </div>
          </div>
        )}
      </TableModal>
    </div>
  );
}
