"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/app/providers";
import { usePickupCheckout } from "@/features/pickup/checkout";
import { newOrderNumber } from "@/features/table/checkout";
import { useMobileFlow } from "@/shared/lib/flow-context";
import { PICKUP_ROUTES } from "@/shared/lib/table-flow";
import { TableBackTitle, TableButton, TableModal, TableMoney } from "@/shared/ui/table";
import { TableFooter, TableTopCard } from "@/widgets/table-shell";
import { formatOrderDate } from "../table/order-shared";
import { DetailRow, ModalHead } from "../table/pay-options-view";
import {
  cardErrors, EMPTY_CARD, PaymentMethods, PICKUP_METHODS, PROCESSING_MS, ProcessingModal, ReceiptCard,
  type CardErrors, type CardForm, type PickupMethodId,
} from "./pay-parts";

type Stage = "processing" | "paid" | null;

/** Paying the deposit that confirms a reservation, and its confirmation. */
export function PickupBookingPayView() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const flow = useMobileFlow();
  const { reservation, setReservation } = usePickupCheckout();
  const [method, setMethod] = useState<PickupMethodId>("card");
  const [card, setCard] = useState<CardForm>(EMPTY_CARD);
  const [errors, setErrors] = useState<CardErrors>({});
  const [stage, setStage] = useState<Stage>(null);

  const chosen = PICKUP_METHODS.find((option) => option.id === method) ?? PICKUP_METHODS[0];
  // A reservation whose deposit is already in has nothing left to collect here.
  const due = reservation !== null && (reservation.payment === null || stage !== null);

  useEffect(() => {
    if (stage !== "processing" || !reservation) return;
    const timer = window.setTimeout(() => {
      setReservation({
        ...reservation,
        number: newOrderNumber(),
        payment: { methodNameKey: chosen.nameKey, paidAt: new Date().toISOString() },
      });
      setStage("paid");
    }, PROCESSING_MS);
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
              backHref={PICKUP_ROUTES.booking}
              backLabel={t("store.table.back")}
            />

            {!due || !reservation ? (
              <div className="flex flex-col items-center gap-4 px-4 py-12 text-center">
                <p className="text-[16px] font-medium leading-none text-[var(--octo-store-select-label)]">
                  {t("store.booking.noReservation")}
                </p>
                <TableButton href={PICKUP_ROUTES.booking}>{t("store.nav.booking")}</TableButton>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
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

                <div className="flex items-center justify-between rounded-[24px] bg-gray-100 p-3">
                  <span className="text-[16px] font-medium leading-none text-gray-900">
                    {t("store.booking.depositValue")}
                  </span>
                  <TableMoney
                    amount={reservation.depositSar}
                    className="text-[20px] font-bold text-ocean-blue"
                    currencyClassName="text-[12.9px]"
                  />
                </div>
              </div>
            )}
          </div>

          {due && (
            <TableButton onClick={handlePay} disabled={stage !== null}>
              {t("store.pickup.completePayment")}
            </TableButton>
          )}
        </div>

        <TableFooter />
      </div>

      <ProcessingModal
        open={stage === "processing"}
        amountSar={reservation?.depositSar ?? 0}
        methodNameKey={chosen.nameKey}
      />

      <TableModal open={stage === "paid"} onClose={() => router.push(flow.home)} dim label={t("store.table.paidTitle")}>
        {reservation?.payment && (
          <div className="flex flex-col items-center gap-4">
            <ModalHead
              image="stamp"
              title={t("store.table.paidTitle")}
              body={t("store.booking.paidBody")}
              bodyClassName="tbl-wrap-safe text-[12px]"
            />

            <div className="flex w-full flex-col gap-3">
              <dl className="flex w-full flex-col gap-4 rounded-[24px] bg-gray-100 p-4">
                <DetailRow label={t("store.booking.detailNumber")}>
                  <span dir="ltr">{reservation.number}</span>
                </DetailRow>
                <DetailRow label={t("store.booking.detailTable")}>
                  <span dir="ltr">{reservation.tableLabel}</span>
                </DetailRow>
                <DetailRow label={t("store.booking.detailDeposit")}>
                  <TableMoney amount={reservation.depositSar} currencyClassName="text-[9.03px]" />
                </DetailRow>
                <DetailRow label={t("store.table.detailMethod")}>{t(reservation.payment.methodNameKey)}</DetailRow>
                <DetailRow label={t("store.table.detailTime")}>
                  {formatOrderDate(reservation.payment.paidAt, locale)}
                </DetailRow>
              </dl>

              <ReceiptCard icon="location-gray-24" label={t("store.pickup.branch")}>
                {reservation.branchName}
              </ReceiptCard>
            </div>
          </div>
        )}
      </TableModal>
    </div>
  );
}
