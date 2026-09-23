// Payments (incl. payment links), refunds (with retry) and wastage records
// for one real order.
import { useMemo, useState } from "react";
import { ExternalLink, Link2, RefreshCw, RotateCcw, XCircle } from "lucide-react";
import {
  cancelPaymentLink,
  createPaymentLink,
  refreshPaymentLink,
  retryRefund,
  type OrderResponse,
  type PaymentResponse,
  type RefundResponse,
} from "@octopus/api-client";
import {
  ApprovalPinField,
  approvalFrom,
  formatMoney,
  humanizeCode,
  isOrderOpen,
  OrderButton,
  OrderEmptyNote,
  OrderField,
  orderInputClass,
  OrderSection,
  useOrderText,
  type OrderWorkspace,
} from "@/entities/order";

const STATE_TONE: Record<string, string> = {
  Captured: "#16A34A",
  Succeeded: "#16A34A",
  Pending: "#D97706",
  Failed: "#DC2626",
  Expired: "#6B7280",
  Cancelled: "#6B7280",
};

function StatePill({ state }: { state: string }) {
  const color = STATE_TONE[state] ?? "#6B7280";
  return (
    <span className="rounded-full px-2 py-[2px] text-[11px] font-semibold" style={{ color, backgroundColor: `${color}1A` }}>
      {humanizeCode(state)}
    </span>
  );
}

function when(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
}

function isWaitingLink(payment: PaymentResponse): boolean {
  return payment.kind === "OnlineLink" && payment.state === "Pending";
}

export function PaymentsSection({ ws, order }: { ws: OrderWorkspace; order: OrderResponse }) {
  const { tx } = useOrderText();
  const [creating, setCreating] = useState(false);
  const [amount, setAmount] = useState("");
  const [gratuity, setGratuity] = useState("");
  const busy = ws.busy !== null;
  const canLink = isOrderOpen(order.status) && order.balanceDue.amount > 0;
  const linkBody = JSON.stringify({ amount, gratuity, version: order.version });
  const linkKey = useMemo(() => crypto.randomUUID(), [linkBody]);

  return (
    <OrderSection
      title={tx("payments.title")}
      aside={
        <span className="text-[12.5px] text-[var(--octo-text-secondary)]">
          {tx("payments.balance").replace("{amount}", formatMoney(order.balanceDue))}
        </span>
      }
    >
      {ws.payments.length === 0 ? (
        <OrderEmptyNote>{tx("payments.empty")}</OrderEmptyNote>
      ) : (
        <ul className="flex flex-col divide-y divide-[var(--octo-divider)]">
          {ws.payments.map((payment) => (
            <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{humanizeCode(payment.kind)}</span>
                  <StatePill state={payment.state} />
                </div>
                <p className="text-[11.5px] text-[var(--octo-text-muted)]">
                  {when(payment.capturedAtUtc ?? payment.createdAtUtc)}
                  {payment.reference ? ` · ${payment.reference}` : ""}
                  {payment.failureCode ? ` · ${humanizeCode(payment.failureCode)}` : ""}
                  {payment.linkExpiresAtUtc && isWaitingLink(payment)
                    ? ` · ${tx("payments.expires").replace("{when}", when(payment.linkExpiresAtUtc))}`
                    : ""}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{formatMoney(payment.amount)}</span>
                {payment.linkUrl && isWaitingLink(payment) && (
                  <a
                    href={payment.linkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-[9px] border border-[var(--octo-border-input)] px-2.5 py-[6px] text-[12px] text-[#0D6EFD]"
                  >
                    <ExternalLink size={12} />
                    {tx("payments.openLink")}
                  </a>
                )}
                {payment.kind === "OnlineLink" && payment.state === "Pending" && (
                  <>
                    <OrderButton
                      disabled={busy}
                      icon={<RefreshCw size={12} />}
                      onClick={() => void ws.run("refreshLink", (ctx) => refreshPaymentLink(ctx.businessId, ctx.orderId, payment.id))}
                    >
                      {tx("payments.refresh")}
                    </OrderButton>
                    <OrderButton
                      tone="danger"
                      disabled={busy}
                      icon={<XCircle size={12} />}
                      onClick={() => void ws.run("cancelLink", (ctx) => cancelPaymentLink(ctx.businessId, ctx.orderId, payment.id))}
                    >
                      {tx("payments.cancelLink")}
                    </OrderButton>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canLink && !creating && (
        <OrderButton className="mt-2" icon={<Link2 size={13} />} onClick={() => setCreating(true)}>
          {tx("payments.createLink")}
        </OrderButton>
      )}
      {creating && (
        <div className="mt-2 flex flex-wrap items-end gap-2 rounded-[10px] bg-[var(--octo-hover)] p-3">
          <OrderField label={tx("payments.linkAmount").replace("{amount}", formatMoney(order.balanceDue))} className="min-w-[160px] flex-1">
            <input
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className={orderInputClass}
            />
          </OrderField>
          <OrderField label={tx("payments.gratuity")} className="w-[130px]">
            <input
              type="number"
              min={0}
              step="0.01"
              value={gratuity}
              onChange={(event) => setGratuity(event.target.value)}
              className={orderInputClass}
            />
          </OrderField>
          <OrderButton onClick={() => setCreating(false)}>{tx("common.cancel")}</OrderButton>
          <OrderButton
            tone="primary"
            disabled={busy}
            onClick={() =>
              void ws
                .run("createLink", (ctx) =>
                  createPaymentLink(
                    ctx.businessId,
                    ctx.orderId,
                    {
                      businessId: ctx.businessId,
                      orderId: ctx.orderId,
                      amount: amount ? Number(amount) : null,
                      gratuity: gratuity ? Number(gratuity) : 0,
                      expectedVersion: ctx.version,
                    },
                    linkKey
                  )
                )
                .then((ok) => {
                  if (!ok) return;
                  setCreating(false);
                  setAmount("");
                  setGratuity("");
                })
            }
          >
            {tx("payments.issueLink")}
          </OrderButton>
        </div>
      )}
    </OrderSection>
  );
}

/** Only the latest attempt of a failed refund can be retried: one no other
 *  refund names as the attempt it replaced. */
function retryable(refund: RefundResponse, all: readonly RefundResponse[]): boolean {
  return refund.state === "Failed" && !all.some((other) => other.retryOfRefundId === refund.id);
}

export function RefundsSection({ ws }: { ws: OrderWorkspace }) {
  const { tx } = useOrderText();
  const [retrying, setRetrying] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const busy = ws.busy !== null;

  return (
    <OrderSection title={tx("refunds.title")}>
      {ws.refunds.length === 0 ? (
        <OrderEmptyNote>{tx("refunds.empty")}</OrderEmptyNote>
      ) : (
        <ul className="flex flex-col divide-y divide-[var(--octo-divider)]">
          {ws.refunds.map((refund) => (
            <li key={refund.id} className="py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{humanizeCode(refund.trigger)}</span>
                    <StatePill state={refund.state} />
                  </div>
                  <p className="text-[11.5px] text-[var(--octo-text-muted)]">
                    {humanizeCode(refund.paymentKind)} · {humanizeCode(refund.reasonCode)} · {when(refund.settledAtUtc ?? refund.createdAtUtc)}
                    {refund.failureCode ? ` · ${humanizeCode(refund.failureCode)}` : ""}
                    {refund.retryOfRefundId ? ` · ${tx("refunds.isRetry")}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{formatMoney(refund.amount)}</span>
                  {retryable(refund, ws.refunds) && (
                    <OrderButton
                      tone="warning"
                      icon={<RotateCcw size={12} />}
                      onClick={() => {
                        setRetrying(retrying === refund.id ? null : refund.id);
                        setPin("");
                      }}
                    >
                      {tx("refunds.retry")}
                    </OrderButton>
                  )}
                </div>
              </div>
              {retrying === refund.id && (
                <div className="mt-2 flex flex-wrap items-end gap-2 rounded-[10px] bg-[var(--octo-hover)] p-3">
                  <div className="min-w-[180px] flex-1">
                    <ApprovalPinField value={pin} onChange={setPin} required={ws.actionError?.approvalNeeded ?? false} />
                  </div>
                  <OrderButton onClick={() => setRetrying(null)}>{tx("common.cancel")}</OrderButton>
                  <OrderButton
                    tone="primary"
                    disabled={busy}
                    onClick={() =>
                      void ws
                        .run("retryRefund", (ctx) =>
                          retryRefund(ctx.businessId, ctx.orderId, refund.id, {
                            approval: approvalFrom(pin, ctx.accountId),
                            expectedVersion: ctx.version,
                          })
                        )
                        .then((ok) => ok && setRetrying(null))
                    }
                  >
                    {tx("refunds.retryNow")}
                  </OrderButton>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </OrderSection>
  );
}

export function WastageSection({ ws, order }: { ws: OrderWorkspace; order: OrderResponse }) {
  const { tx } = useOrderText();
  const lineName = (lineId: string) => order.lines.find((line) => line.id === lineId)?.displayName ?? lineId.slice(0, 8);

  return (
    <OrderSection title={tx("wastage.title")}>
      {ws.wastage.length === 0 ? (
        <OrderEmptyNote>{tx("wastage.empty")}</OrderEmptyNote>
      ) : (
        <ul className="flex flex-col divide-y divide-[var(--octo-divider)]">
          {ws.wastage.map((record) => (
            <li key={record.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-[var(--octo-text-primary)]">
                  {record.quantity}× {lineName(record.orderLineId)}
                </p>
                <p className="text-[11.5px] text-[var(--octo-text-muted)]">
                  {humanizeCode(record.reasonCode)} · {when(record.recordedAtUtc)} ·{" "}
                  {record.reducesCharge ? tx("wastage.offBill") : tx("wastage.absorbed")}
                  {record.cost ? ` · ${tx("wastage.cost").replace("{amount}", formatMoney(record.cost))}` : ""}
                </p>
              </div>
              <span className="text-[13px] font-semibold text-[#7C3AED]">{formatMoney(record.saleValue)}</span>
            </li>
          ))}
        </ul>
      )}
    </OrderSection>
  );
}
