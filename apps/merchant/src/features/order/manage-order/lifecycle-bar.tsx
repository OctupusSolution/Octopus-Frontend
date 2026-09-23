// Order-level moves: accept, advance every line one stage, complete,
// transfer to another place, the order discount, email the receipt and
// "re-order" (GET /duplicate → the new-order flow, pre-filled).
import { useMemo, useState } from "react";
import { ArrowLeftRight, Check, ChevronRight, Copy, Mail, Percent } from "lucide-react";
import {
  acceptOrder,
  applyOrderDiscount,
  bulkAdvanceLineStatus,
  completeOrder,
  duplicateOrderTemplate,
  removeOrderDiscount,
  sendOrderReceipt,
  transferOrder,
  type DuplicateOrderTemplateResponse,
  type OrderResponse,
  type OrderSettingsResponse,
} from "@octopus/api-client";
import { useAuth } from "@/app/providers/auth-provider";
import {
  canAccept,
  canComplete,
  canDiscount,
  formatMoney,
  isOrderOpen,
  nextOrderStage,
  OrderButton,
  orderErrorMessage,
  orderInputClass,
  placeLabel,
  reasonCodesFor,
  ResourcePicker,
  useOrderText,
  type OrderTextKey,
  type OrderWorkspace,
  type PlaceChoice,
} from "@/entities/order";
import { DiscountForm } from "./action-forms";

type Panel = "transfer" | "discount" | "receipt" | null;

export function LifecycleBar({
  ws,
  order,
  settings,
  onReorder,
}: {
  ws: OrderWorkspace;
  order: OrderResponse;
  settings: OrderSettingsResponse | null;
  onReorder?: (template: DuplicateOrderTemplateResponse) => void;
}) {
  const { tx } = useOrderText();
  const { activeBusinessId } = useAuth();
  const [panel, setPanel] = useState<Panel>(null);
  const [place, setPlace] = useState<PlaceChoice | null>(null);
  const [email, setEmail] = useState(order.customer.email ?? "");
  const [receiptSent, setReceiptSent] = useState(false);
  const [reorderError, setReorderError] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const busy = ws.busy !== null;
  const open = isOrderOpen(order.status);
  const stage = nextOrderStage(order);
  const completable = canComplete(order);
  const receiptReady = order.status === "Completed" || order.paymentState === "Paid" || order.paymentState === "Overpaid";
  // The receipt write is idempotent: one key per (order version, address).
  const receiptKey = useMemo(() => crypto.randomUUID(), [order.version, email]);

  function toggle(next: Panel) {
    setPanel((current) => (current === next ? null : next));
  }

  async function reorder() {
    if (!activeBusinessId || !onReorder) return;
    setReordering(true);
    setReorderError(null);
    try {
      onReorder(await duplicateOrderTemplate(activeBusinessId, order.id));
    } catch (err) {
      setReorderError(orderErrorMessage(err));
    } finally {
      setReordering(false);
    }
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        {canAccept(order) && (
          <OrderButton
            tone="primary"
            disabled={busy}
            icon={<Check size={13} />}
            onClick={() => void ws.run("accept", (ctx) => acceptOrder(ctx.businessId, ctx.orderId, { expectedVersion: ctx.version }))}
          >
            {tx("lifecycle.accept")}
          </OrderButton>
        )}
        {stage && (
          <OrderButton
            tone="primary"
            disabled={busy}
            icon={<ChevronRight size={13} />}
            onClick={() =>
              void ws.run("advanceAll", (ctx) =>
                bulkAdvanceLineStatus(ctx.businessId, ctx.orderId, { status: stage, expectedVersion: ctx.version })
              )
            }
          >
            {tx(`lifecycle.all.${stage}` as OrderTextKey)}
          </OrderButton>
        )}
        {order.status === "Served" && (
          <OrderButton
            tone="success"
            disabled={busy || !completable}
            icon={<Check size={13} />}
            onClick={() =>
              void ws.run("complete", (ctx) => completeOrder(ctx.businessId, ctx.orderId, { expectedVersion: ctx.version }))
            }
          >
            {tx("lifecycle.complete")}
          </OrderButton>
        )}
        {open && (
          <OrderButton icon={<ArrowLeftRight size={13} />} onClick={() => toggle("transfer")}>
            {tx("lifecycle.transfer")}
          </OrderButton>
        )}
        {canDiscount(order) && !order.discount && (
          <OrderButton tone="success" icon={<Percent size={13} />} onClick={() => toggle("discount")}>
            {tx("discount.orderAdd")}
          </OrderButton>
        )}
        {canDiscount(order) && order.discount && (
          <OrderButton
            disabled={busy}
            onClick={() =>
              void ws.run("removeDiscount", (ctx) =>
                removeOrderDiscount(ctx.businessId, ctx.orderId, { expectedVersion: ctx.version })
              )
            }
          >
            {tx("discount.orderRemove")}
          </OrderButton>
        )}
        <OrderButton icon={<Mail size={13} />} disabled={!receiptReady} onClick={() => toggle("receipt")}>
          {tx("receipt.send")}
        </OrderButton>
        {onReorder && (
          <OrderButton icon={<Copy size={13} />} disabled={reordering} onClick={() => void reorder()}>
            {tx("lifecycle.reorder")}
          </OrderButton>
        )}
      </div>

      {order.status === "Served" && !completable && (
        <p className="mt-2 text-[12px] text-[#D97706]">
          {tx("lifecycle.completeBlocked").replace("{amount}", formatMoney(order.balanceDue))}
        </p>
      )}
      {order.discount && (
        <p className="mt-2 text-[12px] text-[#16A34A]">
          {tx("discount.orderApplied")
            .replace("{value}", order.discount.kind === "Percent" ? `${order.discount.value}%` : formatMoney(order.discount.amount))
            .replace("{amount}", formatMoney(order.discount.amount))}
        </p>
      )}
      {reorderError && <p className="mt-2 text-[12px] text-[#DC2626]">{reorderError}</p>}

      {panel === "transfer" && (
        <div className="mt-3 rounded-[10px] bg-[var(--octo-hover)] p-3">
          <p className="mb-2 text-[12.5px] text-[var(--octo-text-secondary)]">
            {tx("lifecycle.currentPlace").replace("{place}", placeLabel(order) ?? tx("lifecycle.noPlace"))}
          </p>
          <ResourcePicker value={place} onChange={setPlace} />
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            {order.resource && (
              <OrderButton
                disabled={busy}
                onClick={() =>
                  void ws
                    .run("detach", (ctx) =>
                      transferOrder(ctx.businessId, ctx.orderId, { containerId: null, resourceId: null, expectedVersion: ctx.version })
                    )
                    .then((ok) => ok && setPanel(null))
                }
              >
                {tx("lifecycle.detach")}
              </OrderButton>
            )}
            <OrderButton
              tone="primary"
              disabled={busy || !place}
              onClick={() =>
                place &&
                void ws
                  .run("transfer", (ctx) =>
                    transferOrder(ctx.businessId, ctx.orderId, {
                      containerId: place.containerId,
                      resourceId: place.resourceId,
                      expectedVersion: ctx.version,
                    })
                  )
                  .then((ok) => ok && setPanel(null))
              }
            >
              {tx("lifecycle.moveHere")}
            </OrderButton>
          </div>
        </div>
      )}

      {panel === "discount" && (
        <DiscountForm
          reasonCodes={reasonCodesFor(settings, "discount")}
          accountId={ws.accountId}
          currency={order.currency}
          busy={busy}
          approvalNeeded={ws.actionError?.approvalNeeded ?? false}
          onCancel={() => setPanel(null)}
          onSubmit={(input) =>
            void ws
              .run("orderDiscount", (ctx) =>
                applyOrderDiscount(ctx.businessId, ctx.orderId, { ...input, expectedVersion: ctx.version })
              )
              .then((ok) => ok && setPanel(null))
          }
        />
      )}

      {panel === "receipt" && (
        <div className="mt-3 flex flex-wrap items-end gap-2 rounded-[10px] bg-[var(--octo-hover)] p-3">
          <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-[12px] text-[var(--octo-text-secondary)]">
            {tx("receipt.email")}
            <input
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setReceiptSent(false);
              }}
              placeholder={tx("receipt.emailPlaceholder")}
              className={orderInputClass}
            />
          </label>
          <OrderButton
            tone="primary"
            disabled={busy}
            onClick={() =>
              void ws
                .run("receipt", (ctx) =>
                  sendOrderReceipt(
                    ctx.businessId,
                    ctx.orderId,
                    {
                      businessId: ctx.businessId,
                      orderId: ctx.orderId,
                      email: email.trim() || null,
                      expectedVersion: ctx.version,
                    },
                    receiptKey
                  )
                )
                .then((ok) => ok && setReceiptSent(true))
            }
          >
            {tx("receipt.submit")}
          </OrderButton>
          {receiptSent && <p className="w-full text-[12px] text-[#16A34A]">{tx("receipt.queued")}</p>}
        </div>
      )}
    </div>
  );
}
