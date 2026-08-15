import clsx from "clsx";
import { Check } from "lucide-react";
import type { Order, OrderChannel, OrderStatus } from "@octopus/api-client";
import { STATUS_FLOW } from "@/entities/order";

// This widget is the only place canonical statuses get customer-facing
// Arabic labels.
const BASE_LABELS: Partial<Record<OrderStatus, string>> = {
  new: "تم استلام الطلب",
  preparing: "قيد التحضير",
  out_for_delivery: "في الطريق إليك",
  completed: "مكتمل",
};

function statusLabel(status: OrderStatus, channel: OrderChannel): string {
  if (status === "ready") return channel === "dine_in" ? "تم التقديم" : "جاهز للاستلام";
  return BASE_LABELS[status] ?? status;
}

export interface OrderTrackerProps {
  order: Order;
}

export function OrderTracker({ order }: OrderTrackerProps) {
  if (order.status === "cancelled") {
    return <p className="text-[13px] font-semibold text-[#EF4444]">تم إلغاء الطلب</p>;
  }

  const flow = STATUS_FLOW[order.channel];
  const currentIndex = flow.indexOf(order.status);

  return (
    <div className="flex flex-col gap-3">
      {flow.map((status, index) => {
        const done = index <= currentIndex;
        return (
          <div key={status} className="flex items-center gap-3">
            <span
              className={clsx(
                "grid h-6 w-6 shrink-0 place-items-center rounded-full",
                done ? "bg-[#22C55E] text-white" : "bg-[var(--octo-track)] text-[var(--octo-text-faint)]",
              )}
            >
              {done ? <Check size={13} /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
            </span>
            <span
              className={clsx(
                "text-[12.5px]",
                done ? "font-semibold text-[var(--octo-text-primary)]" : "text-[var(--octo-text-muted)]",
              )}
            >
              {statusLabel(status, order.channel)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
