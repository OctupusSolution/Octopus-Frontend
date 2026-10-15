"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/app/providers";
import { useTableCheckout } from "@/features/table/checkout";
import { TABLE_ROUTES } from "@/shared/lib/table-flow";
import { TableButton, TableIcon, TableModal } from "@/shared/ui/table";
import { TableFooter, TableTopCard } from "@/widgets/table-shell";

const RATING_DELAY_MS = 1500;
const THANKS_MS = 2500;
const STARS = [1, 2, 3, 4, 5] as const;

const ACTION_CARD = "flex w-full items-start gap-2 rounded-[24px] bg-[var(--octo-store-select)] p-3 text-start";

function ActionText({ title, body }: { title: string; body: string }) {
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-2">
      <span className="text-[16px] font-semibold leading-none text-gray-900">{title}</span>
      <span className="text-[12px] font-medium leading-[1.3] text-[var(--octo-store-select-label)]">{body}</span>
    </span>
  );
}

/** Back at the table after ordering: order more, call the waiter — and, once the
 *  order is paid, one prompt to rate the visit. */
export function TableThanksView() {
  const { t } = useI18n();
  const { order, ratedOrder, markRated } = useTableCheckout();
  const [waiterCalled, setWaiterCalled] = useState(false);
  const [stage, setStage] = useState<"rate" | "thanks" | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const promptFor = order?.payment && ratedOrder !== order.orderNumber ? order.orderNumber : null;

  useEffect(() => {
    if (!promptFor) return;
    const timer = window.setTimeout(() => setStage("rate"), RATING_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [promptFor]);

  useEffect(() => {
    if (stage !== "thanks") return;
    const timer = window.setTimeout(() => setStage(null), THANKS_MS);
    return () => window.clearTimeout(timer);
  }, [stage]);

  function closeRating(submitted: boolean) {
    // There is no ratings endpoint yet, so the rating is acknowledged, not stored.
    if (order) markRated(order.orderNumber);
    setStage(submitted ? "thanks" : null);
  }

  return (
    <div className="flex flex-col gap-4">
      <TableTopCard />

      <div className="flex flex-col gap-10">
        <div className="flex flex-col px-4">
          <Link
            href={TABLE_ROUTES.home}
            aria-label={t("store.table.back")}
            className="flex size-10 items-center rounded-[12px] p-2"
          >
            <TableIcon name="back-square" className="ltr:-scale-x-100" />
          </Link>

          <div className="flex flex-col items-center gap-6">
            <div className="flex w-full flex-col items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/table/loading.gif" alt="" className="size-[136px]" />
              <div className="flex w-full flex-col gap-2 text-center leading-none">
                <h1 className="text-[20px] font-bold text-gray-900">{t("store.table.thanksTitle")}</h1>
                <p className="tbl-wrap-safe text-[14px] font-medium text-[var(--octo-store-select-label)]">
                  {t("store.table.thanksBody")}
                </p>
              </div>
            </div>

            <div className="flex w-full flex-col gap-4">
              <Link href={TABLE_ROUTES.menu} className={ACTION_CARD}>
                <TableIcon name="order-more" />
                <ActionText title={t("store.table.orderMore")} body={t("store.table.orderMoreBody")} />
              </Link>
              <button type="button" onClick={() => setWaiterCalled(true)} className={ACTION_CARD}>
                <TableIcon name="call-waiter" />
                <ActionText
                  title={t("store.table.callWaiter")}
                  body={t(waiterCalled ? "store.table.waiterCalled" : "store.table.callWaiterBody")}
                />
              </button>
            </div>
          </div>
        </div>

        <TableFooter />
      </div>

      <TableModal open={stage === "rate"} onClose={() => closeRating(false)} label={t("store.table.rateTitle")}>
        <div className="flex flex-col gap-3 py-1">
          <div className="flex flex-col items-center gap-4">
            <div className="flex w-full flex-col gap-2 text-center">
              <h2 className="text-[18px] font-bold leading-none text-gray-900">{t("store.table.rateTitle")}</h2>
              <p className="text-[14px] font-medium leading-[1.4] text-[var(--octo-store-select-label)]">
                {t("store.table.rateBody")}
              </p>
            </div>

            <div className="flex w-full flex-col items-center gap-3">
              <div role="radiogroup" aria-label={t("store.table.rateTitle")} className="flex items-center justify-center gap-3">
                {STARS.map((star) => (
                  <button
                    key={star}
                    type="button"
                    role="radio"
                    aria-checked={rating === star}
                    aria-label={t("store.table.rateStar", { n: star })}
                    onClick={() => setRating(star)}
                  >
                    <TableIcon name={star <= rating ? "rate-star-on" : "rate-star-off"} size={40} />
                  </button>
                ))}
              </div>

              <label className="flex w-full flex-col gap-3">
                <span className="px-2 text-[14px] font-medium leading-none text-black">
                  {t("store.table.rateComment")}
                </span>
                <textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder={t("store.table.rateCommentPlaceholder")}
                  className="h-[87px] w-full resize-none rounded-[24px] border border-gray-300 bg-transparent p-3 text-[12px] leading-[1.4] text-gray-900 outline-none placeholder:text-[var(--octo-store-select-label)] focus:border-ocean-blue"
                />
              </label>
            </div>
          </div>

          <div className="flex flex-col">
            <TableButton disabled={rating === 0} onClick={() => closeRating(true)}>
              {t("store.table.rateSubmit")}
            </TableButton>
            <button
              type="button"
              onClick={() => closeRating(false)}
              className="h-12 text-[12px] font-medium leading-none text-[var(--octo-store-select-label)]"
            >
              {t("store.table.rateLater")}
            </button>
          </div>
        </div>
      </TableModal>

      <TableModal open={stage === "thanks"} onClose={() => setStage(null)} label={t("store.table.rateThanksTitle")}>
        <div className="flex flex-col items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/table/rating-thanks.gif" alt="" className="size-[136px]" />
          <div className="flex w-full flex-col gap-3 text-center leading-none">
            <h2 className="text-[18px] font-bold text-gray-900">{t("store.table.rateThanksTitle")}</h2>
            <p className="tbl-wrap-safe text-[12px] font-medium text-[var(--octo-store-select-label)]">
              {t("store.table.rateThanksBody")}
            </p>
          </div>
        </div>
      </TableModal>
    </div>
  );
}
