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

export function Stepper({ order, className }: { order: OrderRecord; className?: string }) {
  const { t } = useI18n();
  const stages = stageStatuses(order);
  const pill = STATE_STYLE[order.state];

  return (
    <div className={className}>
      <div className="flex items-start">
        {stages.map((stage, index) => (
          <div key={stage.stage} className="flex flex-1 flex-col items-center last:flex-none last:items-end">
            <div className="flex w-full items-center">
              <span
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${
                  stage.done ? "bg-[#16A34A] text-white" : "bg-[var(--octo-track)] text-[var(--octo-text-faint)]"
                }`}
              >
                <Check size={11} strokeWidth={3} />
              </span>
              {index < stages.length - 1 && (
                <span className={`h-px flex-1 ${stage.done ? "bg-[#16A34A]" : "bg-[var(--octo-divider)]"}`} />
              )}
            </div>
            <span className="mt-1 whitespace-nowrap text-[10.5px] text-[var(--octo-text-faint)]">
              {t(STAGE_LABEL_KEY[stage.stage])}
            </span>
          </div>
        ))}
      </div>
      <span className="mt-1 inline-block text-[11px] font-semibold" style={{ color: pill.text }}>
        {t(STATE_LABEL_KEY[order.state])}
      </span>
    </div>
  );
}
