import { useMemo } from "react";
import { nextStatus } from "@octopus/api-client";
import { useLiveOrders } from "@/shared/api/live-orders";
import { KdsTicketBoard } from "@/widgets/kds-ticket-board";

// Full-screen operational surface: a fixed overlay covering the whole
// viewport, since app.tsx (the shared shell with the sidebar) is a
// protected file this task does not own.
export function KdsPage() {
  const { orders, advance } = useLiveOrders();

  const activeOrders = useMemo(
    () => orders.filter((order) => order.status !== "completed" && order.status !== "cancelled"),
    [orders],
  );

  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-[#081026] p-4 sm:p-6">
      <header className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-[16px] font-bold text-white sm:text-[18px]">Kitchen Display</h1>
        <span className="rounded-full bg-white/10 px-3 py-1 text-[12px] font-semibold text-white">
          {activeOrders.length} active
        </span>
      </header>

      <KdsTicketBoard
        orders={activeOrders}
        onAdvance={(order) => advance(order.id, nextStatus(order.channel, order.status))}
      />
    </div>
  );
}
