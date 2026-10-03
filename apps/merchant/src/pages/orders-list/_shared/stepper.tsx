import { Check } from "lucide-react";
import { useI18n } from "@/app/providers/i18n-provider";
import { STATE_STYLE, TINT_CLASS, tintVars } from "./theme";
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

// The two-colour step dots are the frame's own artwork, so they are plain
// images rather than a text-coloured mask.
const STEP_DONE_URL = new URL("../../../../../assets/Dashboard/icons/ord-step-done.svg", import.meta.url).href;
const STEP_PENDING_URL = new URL("../../../../../assets/Dashboard/icons/ord-step-pending.svg", import.meta.url).href;

const DONE_LINE = "bg-[#d1efdc] [[data-theme=dark]_&]:bg-[#009a39]/40";
const PENDING_LINE = "bg-[#e2e8f0] [[data-theme=dark]_&]:bg-[var(--octo-border-card)]";

/** The state chip the row shows under its timeline, and the details modal
 *  shows beside the order id. */
export function OrderStateBadge({ state, className }: { state: OrderState; className?: string }) {
  const { t } = useI18n();

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-1 text-[12px] font-medium leading-[12px] ${TINT_CLASS} ${className ?? ""}`}
      style={tintVars(STATE_STYLE[state])}
    >
      {t(STATE_LABEL_KEY[state])}
    </span>
  );
}

/** The list row's timeline: six 24px dots spread across the cell, each joined to the next
 *  by a 2px line. Every stop draws its own two half-lines, so the track follows
 *  the labels' real (localised) widths instead of a fixed 274px rule. */
function RowTimeline({ order }: { order: OrderRecord }) {
  const { t } = useI18n();
  const stages = stageStatuses(order);

  return (
    <div className="flex w-full items-start">
      {stages.map((stage, index) => {
        const next = stages[index + 1];
        return (
          <div key={stage.stage} className="relative flex min-w-[62px] flex-1 flex-col items-center gap-1.5">
            {index > 0 && <span className={`absolute end-1/2 start-0 top-[11px] h-0.5 ${stage.done ? DONE_LINE : PENDING_LINE}`} />}
            {next && <span className={`absolute end-0 start-1/2 top-[11px] h-0.5 ${next.done ? DONE_LINE : PENDING_LINE}`} />}
            <img
              src={stage.done ? STEP_DONE_URL : STEP_PENDING_URL}
              alt=""
              width={24}
              height={24}
              className={`relative block h-6 w-6 ${stage.done ? "" : "[[data-theme=dark]_&]:opacity-40"}`}
            />
            <span
              className={`whitespace-nowrap text-[12px] font-medium leading-[12px] ${
                stage.done ? "text-[var(--octo-text-primary)]" : "text-[var(--octo-text-secondary)]"
              }`}
            >
              {t(STAGE_LABEL_KEY[stage.stage])}
            </span>
          </div>
        );
      })}
    </div>
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

  if (variant === "row") {
    return (
      <div className={`flex w-full flex-col items-center gap-2 ${className ?? ""}`}>
        <RowTimeline order={order} />
        <OrderStateBadge state={order.state} />
      </div>
    );
  }

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
            <span className="mt-0.5 whitespace-nowrap text-[10px] text-[var(--octo-text-faint)]">
              {stage.timestamp ? stageTime(stage.timestamp) : t("orders.details.pending")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
