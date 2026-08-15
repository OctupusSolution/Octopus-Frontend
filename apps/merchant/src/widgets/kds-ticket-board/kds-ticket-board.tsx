import { useEffect, useState } from "react";
import clsx from "clsx";
import { nextStatus, type Order, type OrderStatus } from "@octopus/api-client";

export interface KdsTicketBoardProps {
  orders: Order[];
  onAdvance: (order: Order) => void;
}

interface ColumnDef {
  key: string;
  title: string;
  statuses: OrderStatus[];
}

const COLUMNS: ColumnDef[] = [
  { key: "new", title: "New", statuses: ["new"] },
  // out_for_delivery shares this column so a dispatched delivery order
  // doesn't vanish mid-shift.
  { key: "preparing", title: "Preparing", statuses: ["preparing"] },
  { key: "ready", title: "Ready", statuses: ["ready", "out_for_delivery"] },
];

const STATUS_LABELS: Record<OrderStatus, string> = {
  new: "New",
  preparing: "Preparing",
  ready: "Ready",
  out_for_delivery: "Out for delivery",
  completed: "Completed",
  cancelled: "Cancelled",
};

function ageBorderClass(minutes: number): string {
  if (minutes < 5) return "border-s-[#22C55E]";
  if (minutes < 10) return "border-s-[#F59E0B]";
  return "border-s-[#EF4444]";
}

const CHANNEL_LABELS: Record<Order["channel"], string> = {
  dine_in: "Dine-in",
  takeaway: "Takeaway",
  delivery: "Delivery",
  kiosk: "Kiosk",
  aggregator: "Aggregator",
};

function ticketLabel(order: Order): string {
  if (order.tableNumber) return `Table ${order.tableNumber}`;
  return `${CHANNEL_LABELS[order.channel]} · ${order.customerName}`;
}

function elapsedLabel(createdAt: string, now: number): string {
  const elapsedMs = Math.max(0, now - new Date(createdAt).getTime());
  const minutes = Math.floor(elapsedMs / 60000);
  const seconds = Math.floor((elapsedMs % 60000) / 1000);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function KdsTicketBoard({ orders, onAdvance }: KdsTicketBoardProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-3">
      {COLUMNS.map((column) => {
        const columnOrders = orders.filter((order) => column.statuses.includes(order.status));

        return (
          <div key={column.key} className="flex min-h-0 flex-col gap-3">
            <div className="flex items-center gap-2 px-1">
              <h2 className="text-[12.5px] font-semibold uppercase tracking-[0.06em] text-white/90">
                {column.title}
              </h2>
              <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-white/10 px-1.5 text-[11px] font-semibold text-white">
                {columnOrders.length}
              </span>
            </div>

            {columnOrders.length === 0 ? (
              <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-white/15 py-10 text-[12px] text-white/30">
                No tickets
              </div>
            ) : (
              <div className="octo-scroll flex flex-col gap-3 overflow-y-auto">
                {columnOrders.map((order) => {
                  const minutes = Math.floor((now - new Date(order.createdAt).getTime()) / 60000);
                  const next = nextStatus(order.channel, order.status);

                  return (
                    <div
                      key={order.id}
                      className={clsx(
                        "flex flex-col gap-2 rounded-xl border-s-4 bg-white/[0.05] p-3.5",
                        ageBorderClass(minutes),
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-bold text-white">#{order.id}</span>
                        <span className="text-[11.5px] font-medium tabular-nums text-white/60">
                          {elapsedLabel(order.createdAt, now)}
                        </span>
                      </div>
                      <p className="text-[12px] font-semibold text-white/85">{ticketLabel(order)}</p>

                      <div className="flex flex-col gap-1.5 border-t border-white/10 pt-2">
                        {order.lines.map((line) => (
                          <div key={line.lineId} className="text-[11.5px] text-white/70">
                            <span className="font-semibold text-white">{line.quantity}×</span> {line.name}
                            {line.modifiers.length > 0 && (
                              <p className="ms-4 text-[10.5px] text-white/45">
                                {line.modifiers.map((modifier) => modifier.label).join("، ")}
                              </p>
                            )}
                            {line.notes && (
                              <p className="ms-4 text-[10.5px] font-medium text-[#F59E0B]">{line.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => onAdvance(order)}
                        className="mt-1 w-full rounded-[9px] bg-[#0D6EFD] px-3 py-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
                      >
                        Move to {STATUS_LABELS[next]}
                      </button>
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
