// Kitchen ticket board over real Order-module orders. Three columns by order
// status; each ticket bumps as a whole (accept, or POST …/lines/status to the
// next stage) and each line can be bumped on its own (…/lines/{id}/status).
// Same look as widgets/kds-ticket-board, which stays on the old canonical
// Order type and is no longer used here.
import { useEffect, useState } from "react";
import clsx from "clsx";
import type { OrderAdminStatus, OrderLineTargetStatus, OrderResponse } from "@octopus/api-client";
import {
  canAccept,
  isLineLive,
  nextLineStatus,
  nextOrderStage,
  placeLabel,
  useOrderText,
  type OrderTextKey,
} from "@/entities/order";

interface ColumnDef {
  key: "new" | "preparing" | "ready";
  titleKey: OrderTextKey;
  statuses: readonly OrderAdminStatus[];
}

const COLUMNS: readonly ColumnDef[] = [
  { key: "new", titleKey: "kds.col.new", statuses: ["New", "Accepted"] },
  { key: "preparing", titleKey: "kds.col.preparing", statuses: ["Preparing"] },
  { key: "ready", titleKey: "kds.col.ready", statuses: ["Ready"] },
];

function ageBorderClass(minutes: number): string {
  if (minutes < 5) return "border-s-[#22C55E]";
  if (minutes < 10) return "border-s-[#F59E0B]";
  return "border-s-[#EF4444]";
}

function elapsedLabel(since: string, now: number): string {
  const elapsedMs = Math.max(0, now - new Date(since).getTime());
  const minutes = Math.floor(elapsedMs / 60000);
  const seconds = Math.floor((elapsedMs % 60000) / 1000);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export interface KdsBoardProps {
  orders: readonly OrderResponse[];
  pendingId: string | null;
  onAccept: (order: OrderResponse) => void;
  onBumpOrder: (order: OrderResponse, status: OrderLineTargetStatus) => void;
  onBumpLine: (order: OrderResponse, lineId: string, status: OrderLineTargetStatus) => void;
}

export function KdsBoard({ orders, pendingId, onAccept, onBumpOrder, onBumpLine }: KdsBoardProps) {
  const { tx } = useOrderText();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-3">
      {COLUMNS.map((column) => {
        const columnOrders = orders
          .filter((order) => column.statuses.includes(order.status))
          .sort((a, b) => a.placedAtUtc.localeCompare(b.placedAtUtc));

        return (
          <div key={column.key} className="flex min-h-0 flex-col gap-3">
            <div className="flex items-center gap-2 px-1">
              <h2 className="text-[12.5px] font-semibold uppercase tracking-[0.06em] text-white/90">{tx(column.titleKey)}</h2>
              <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-white/10 px-1.5 text-[11px] font-semibold text-white">
                {columnOrders.length}
              </span>
            </div>

            {columnOrders.length === 0 ? (
              <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-white/15 py-10 text-[12px] text-white/30">
                {tx("kds.noTickets")}
              </div>
            ) : (
              <div className="octo-scroll flex flex-col gap-3 overflow-y-auto">
                {columnOrders.map((order) => {
                  const since = order.acceptedAtUtc ?? order.placedAtUtc;
                  const minutes = Math.floor((now - new Date(since).getTime()) / 60000);
                  const stage = nextOrderStage(order);
                  const busy = pendingId === order.id;
                  const place = placeLabel(order);

                  return (
                    <div
                      key={order.id}
                      className={clsx("flex flex-col gap-2 rounded-xl border-s-4 bg-white/[0.05] p-3.5", ageBorderClass(minutes))}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-bold text-white">{order.code}</span>
                        <span className="text-[11.5px] font-medium tabular-nums text-white/60">{elapsedLabel(since, now)}</span>
                      </div>
                      <p className="text-[12px] font-semibold text-white/85">
                        {place ?? tx("kds.takeaway")}
                        {order.customer.name ? ` · ${order.customer.name}` : ""}
                        {` · ${order.fulfilmentCode}`}
                      </p>

                      <div className="flex flex-col gap-1.5 border-t border-white/10 pt-2">
                        {order.lines
                          .filter((line) => isLineLive(line.status))
                          .map((line) => {
                            const next = order.status === "New" ? null : nextLineStatus(line.status);
                            return (
                              <div key={line.id} className="flex items-start justify-between gap-2 text-[11.5px] text-white/70">
                                <div className={clsx(line.status === "Served" && "line-through opacity-50")}>
                                  <span className="font-semibold text-white">{line.quantity}×</span> {line.displayName}
                                  {line.options.length > 0 && (
                                    <p className="ms-4 text-[10.5px] text-white/45">
                                      {line.options.map((option) => option.optionName).join("، ")}
                                    </p>
                                  )}
                                  {line.note && <p className="ms-4 text-[10.5px] font-medium text-[#F59E0B]">{line.note}</p>}
                                </div>
                                {next && (
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => onBumpLine(order, line.id, next)}
                                    className="shrink-0 rounded-[7px] bg-white/10 px-2 py-[3px] text-[10.5px] font-semibold text-white transition-colors hover:bg-white/20 disabled:opacity-40"
                                  >
                                    {tx(`kds.bump.${next}` as OrderTextKey)}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                      </div>

                      {canAccept(order) ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => onAccept(order)}
                          className="mt-1 rounded-[9px] bg-[#0D6EFD] py-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                          {tx("kds.accept")}
                        </button>
                      ) : (
                        stage && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => onBumpOrder(order, stage)}
                            className="mt-1 rounded-[9px] bg-[#0D6EFD] py-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                          >
                            {tx(`kds.bump.${stage}` as OrderTextKey)}
                          </button>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
