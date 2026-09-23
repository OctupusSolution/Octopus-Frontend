import { useState } from "react";
import type { OrderResponse } from "@octopus/api-client";
import { useLiveOrders } from "@/shared/api/live-orders";
import { useAuth } from "@/app/providers/auth-provider";
import { KITCHEN_ORDER_STATUSES, useOrderText } from "@/entities/order";
import { KdsBoard } from "./kds-board";

const KDS_POLL_MS = 5000;

// Full-screen operational surface: a fixed overlay covering the whole
// viewport, since app.tsx (the shared shell with the sidebar) is a
// protected file this task does not own.
//
// Reads the real Order module (AdminApi) by polling — the module has no
// realtime push. A bump is a real write (accept / advance line status).
export function KdsPage() {
  const { tx } = useOrderText();
  const { activeBusinessId } = useAuth();
  const { orders, loading, error, unavailable, accept, advanceLine, advanceOrder } = useLiveOrders(activeBusinessId, {
    statuses: KITCHEN_ORDER_STATUSES,
    intervalMs: KDS_POLL_MS,
  });
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function act(order: OrderResponse, write: () => Promise<string | null>) {
    setPendingId(order.id);
    setActionError(await write());
    setPendingId(null);
  }

  const message = !activeBusinessId
    ? tx("kds.signedOut")
    : unavailable
      ? tx("page.unavailable")
      : (actionError ?? (error ? tx("page.loadFailed").replace("{message}", error) : null));

  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-[#081026] p-4 sm:p-6">
      <header className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-[16px] font-bold text-white sm:text-[18px]">{tx("kds.title")}</h1>
        <span className="rounded-full bg-white/10 px-3 py-1 text-[12px] font-semibold text-white">
          {tx("kds.active").replace("{n}", String(orders.length))}
        </span>
      </header>

      {message && (
        <div role="alert" className="mb-4 flex items-start justify-between gap-3 rounded-[10px] bg-[#EF4444]/15 px-3.5 py-2.5 text-[12.5px] text-[#FCA5A5]">
          <span>{message}</span>
          {actionError && (
            <button type="button" onClick={() => setActionError(null)} className="shrink-0 font-semibold hover:underline">
              {tx("common.dismiss")}
            </button>
          )}
        </div>
      )}

      {loading && orders.length === 0 ? (
        <p className="py-16 text-center text-[13px] text-white/50">{tx("kds.loading")}</p>
      ) : (
        <KdsBoard
          orders={orders}
          pendingId={pendingId}
          onAccept={(order) => void act(order, () => accept(order))}
          onBumpOrder={(order, status) => void act(order, () => advanceOrder(order, status))}
          onBumpLine={(order, lineId, status) => void act(order, () => advanceLine(order, lineId, status))}
        />
      )}
    </div>
  );
}
