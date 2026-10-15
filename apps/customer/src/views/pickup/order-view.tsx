"use client";

import { useI18n } from "@/app/providers";
import { usePickupCheckout, type PickupOrder } from "@/features/pickup/checkout";
import { useMobileFlow } from "@/shared/lib/flow-context";
import { TableBackTitle, TableBadge, TableButton, TableIcon } from "@/shared/ui/table";
import { TableFooter, TableTopCard } from "@/widgets/table-shell";
import { formatOrderTime, NoOrder, OrderFacts, orderReadyAt, useNow } from "../table/order-shared";

const CARD = "rounded-[20px] border border-gray-300 bg-white p-3 drop-shadow-[0_0_4px_rgba(0,0,0,0.08)]";
/** The step icons sit 36px apart; the rail runs between the first and the last. */
const STEP_PITCH = 36;
/** How long an order reads "received" before the kitchen is taken to have started on it. */
const RECEIVED_MINUTES = 2;

type Stage = "received" | "preparing" | "ready";

const plusMinutes = (iso: string, minutes: number): string =>
  new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();

/** An order placed ahead is done once it is ready: it is collected, not served. */
const STEPS = [
  { key: "store.table.stepReceived", at: (order: PickupOrder) => order.placedAt },
  { key: "store.table.stepPreparing", at: (order: PickupOrder) => plusMinutes(order.placedAt, RECEIVED_MINUTES) },
  { key: "store.table.stepReady", at: orderReadyAt },
] as const;

/** The kitchen does not report progress to the storefront yet, so this follows
 *  the clock against the expected times — a stand-in for the real status. */
function orderStage(order: PickupOrder, now: number): Stage {
  if (now >= new Date(orderReadyAt(order)).getTime()) return "ready";
  return now >= new Date(order.placedAt).getTime() + RECEIVED_MINUTES * 60_000 ? "preparing" : "received";
}

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

function StageBadge({ stage }: { stage: Stage }) {
  const { t } = useI18n();

  if (stage === "preparing") {
    return (
      <TableBadge tone="pending" compact>
        {t("store.table.statusPreparing")}
      </TableBadge>
    );
  }

  return (
    <span
      className={`shrink-0 whitespace-nowrap rounded-full px-2 py-1 text-[12px] leading-none ${
        stage === "received"
          ? "bg-[var(--octo-store-step-done)] text-[var(--octo-store-success)]"
          : "bg-[var(--octo-store-ready-soft)] text-[var(--octo-store-select-text)]"
      }`}
    >
      {t(stage === "received" ? "store.pickup.statusReceived" : "store.table.stepReady")}
    </span>
  );
}

/** Where the order is: received, being prepared, ready to collect. */
export function PickupOrderView() {
  const { t, locale } = useI18n();
  const flow = useMobileFlow();
  const { order } = usePickupCheckout();
  const now = useNow();

  const stage = order ? orderStage(order, now) : "received";
  // Steps behind the order, and the one in progress — none while it is only received.
  const done = stage === "ready" ? STEPS.length : 1;
  const current = stage === "preparing" ? 1 : -1;
  // The green stretch of the rail reaches the next step, or the end once ready.
  const reached = stage === "ready" ? (STEPS.length - 1) * STEP_PITCH - 4 : STEP_PITCH - 6;

  return (
    <div className="flex flex-col gap-4">
      <TableTopCard />

      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-[2px]">
            <div className="px-4">
              <TableBackTitle
                title={t("store.table.trackTitle")}
                backHref={flow.home}
                backLabel={t("store.table.back")}
              />
            </div>
            {order && (
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
                  badge={<StageBadge stage={stage} />}
                />
              </div>

              <ol className={`relative flex flex-col gap-4 ${CARD}`}>
                <li className="absolute bottom-[26px] start-[21.5px] top-[26px] w-px bg-gray-300" aria-hidden="true" />
                <li
                  className="absolute start-[21.5px] top-[26px] w-px bg-[var(--octo-store-success)]"
                  style={{ height: reached }}
                  aria-hidden="true"
                />
                {STEPS.map((step, index) => {
                  const state = index < done ? "done" : index === current ? "current" : "pending";
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
                        {state === "pending" ? "-" : formatOrderTime(step.at(order), locale)}
                      </span>
                    </li>
                  );
                })}
              </ol>

              {stage !== "ready" && (
                <TableButton variant="outlineBrand" href={flow.menuIndex}>
                  {t("store.table.addMoreToOrder")}
                </TableButton>
              )}
            </div>
          )}
        </div>

        <TableFooter />
      </div>
    </div>
  );
}
