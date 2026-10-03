import { Check } from "lucide-react";
import { useI18n } from "@/app/providers/i18n-provider";
import { STATE_STYLE } from "./theme";
import { stageStatuses } from "./stepper-stages";
import type { OrderRecord, OrderState, TimelineStage } from "./types";

const STAGE_LABEL_KEY: Record<TimelineStage, string> = {
  New: "orders.state.new",
  Accepted: "orders.state.accepted",
  Preparing: "orders.state.preparing",
  Ready: "orders.state.ready",
  Served: "orders.state.served",
  Completed: "orders.state.completed",
};

export const STATE_LABEL_KEY: Record<OrderState, string> = {
  ...STAGE_LABEL_KEY,
  Refunded: "orders.state.refunded",
  Voided: "orders.state.voided",
  Canceled: "orders.state.canceled",
};

function stageTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** The state chip the row shows under its timeline, and the details modal
 *  shows beside the order id. */
export function OrderStateBadge({ state, className }: { state: OrderState; className?: string }) {
  const { t } = useI18n();
  const style = STATE_STYLE[state];

  return (
    <span
      className={`inline-block rounded-full px-2 py-[3px] text-[11.5px] font-medium ${className ?? ""}`}
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {t(STATE_LABEL_KEY[state])}
    </span>
  );
}

export function Stepper({
  order,
  className,
  /** "row" caps the timeline with the order's state chip (the list rows).
   *  "detail" swaps that for a per-stage timestamp under each label, and
   *  marks stages the order never reached as Pending (the details modal). */
  variant = "row",
}: {
  order: OrderRecord;
  className?: string;
  variant?: "row" | "detail";
}) {
  const { t } = useI18n();
  const stages = stageStatuses(order);

  return (
    <div className={className}>
      <div className="flex items-start">
        {stages.map((stage, index) => (
          <div key={stage.stage} className="flex flex-1 flex-col items-center last:flex-none last:items-end">
            <div className="flex w-full items-center">
              <span
                className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full ${
                  stage.done ? "bg-[#16A34A] text-white" : "bg-[var(--octo-track)] text-[var(--octo-text-faint)]"
                }`}
              >
                <Check size={10} strokeWidth={3} />
              </span>
              {index < stages.length - 1 && (
                <span className={`h-px flex-1 ${stage.done ? "bg-[#16A34A]" : "bg-[var(--octo-divider)]"}`} />
              )}
            </div>
            <span
              className={`mt-1 whitespace-nowrap text-[10.5px] ${
                stage.done ? "text-[var(--octo-text-secondary)]" : "text-[var(--octo-text-faint)]"
              }`}
            >
              {t(STAGE_LABEL_KEY[stage.stage])}
            </span>
            {variant === "detail" && (
              <span className="mt-0.5 whitespace-nowrap text-[10px] text-[var(--octo-text-faint)]">
                {stage.timestamp ? stageTime(stage.timestamp) : t("orders.details.pending")}
              </span>
            )}
          </div>
        ))}
      </div>

      {variant === "row" && <OrderStateBadge state={order.state} className="mt-1.5" />}
    </div>
  );
}
