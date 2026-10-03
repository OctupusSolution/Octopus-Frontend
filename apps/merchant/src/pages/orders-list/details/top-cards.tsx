// Row 1 of the Order Details page: the order summary with its action grid,
// the lifecycle timeline, and the payment / refunds / totals column.
import type { OrderResponse, RefundResponse } from "@octopus/api-client";
import { formatMoney, humanizeCode, isOrderOpen, type OrderWorkspace } from "@/entities/order";
import { useI18n } from "@/app/providers/i18n-provider";
import { ShellIcon } from "@/shared/ui/shell-icon";
import { useReadableActivity } from "./parts";
import { actorOf, buildTimeline, latestCapture, paymentMethodLabel, type TimelineDetail, type TimelineStepId } from "./derive";
import {
  CARD_CLASS,
  CardTitle,
  formatDateTime,
  GREEN_TEXT,
  HighlightRow,
  InfoRow,
  LINE_COLOR,
  OrderStatusChip,
  PlaceLine,
  SmallButton,
} from "./parts";

// Two-tone (ring + dot), so it is drawn as an image rather than a ShellIcon mask.
const TIMELINE_DOT = new URL("../../../../../assets/Dashboard/icons/ord-detail-timeline-dot.svg", import.meta.url).href;

const SOURCE_LABEL_KEY: Record<string, string> = {
  pos: "orders.source.pos",
  phone: "orders.source.phone",
  qr: "orders.source.qrCode",
  kiosk: "orders.source.kiosk",
};

export interface SummaryActions {
  onRefund: () => void;
  onVoid: () => void;
  onDuplicate: () => void;
  onSendReceipt: () => void;
  onWriteNote: () => void;
  duplicating: boolean;
}

export function canRefund(order: OrderResponse): boolean {
  return order.capturedTotal.amount - order.refundedTotal.amount - order.pendingRefundTotal.amount > 0;
}

function useGuestsLabel(order: OrderResponse): string | null {
  const { t } = useI18n();
  return order.attendeeCount != null ? t("orders.detailPage.tableFor").replace("{n}", String(order.attendeeCount)) : null;
}

export function SummaryCard({ ws, order, actions }: { ws: OrderWorkspace; order: OrderResponse; actions: SummaryActions }) {
  const { t, locale } = useI18n();
  const guestsLabel = useGuestsLabel(order);
  const open = isOrderOpen(order.status);
  const terminated = order.status === "Cancelled" || order.status === "Voided";
  const receiptReady = order.status === "Completed" || order.paymentState === "Paid" || order.paymentState === "Overpaid";
  const activity = useReadableActivity(ws.activity);
  const servedBy = actorOf(activity, "order.placed");
  const cashier = actorOf(activity, "payment.recorded", "payment.captured");
  const closedAt = order.completedAtUtc ?? order.termination?.atUtc ?? null;
  const unavailable = t("orders.detailPage.action.unavailable");
  const note = [order.internalNote, order.customerNote].filter((value): value is string => !!value);

  return (
    <section className={CARD_CLASS}>
      <div className={`flex flex-col gap-2 border-b pb-2 ${LINE_COLOR}`}>
        <div className="flex items-start justify-between gap-2">
          <CardTitle>{t("orders.details.summary")}</CardTitle>
          <span className="-my-1">
            <OrderStatusChip status={order.status} />
          </span>
        </div>
        <PlaceLine order={order} guestsLabel={guestsLabel} />
      </div>

      <dl className="flex flex-col gap-3">
        <InfoRow label={t("orders.detailPage.orderDate")} value={formatDateTime(order.placedAtUtc, locale)} />
        {closedAt && <InfoRow label={t("orders.detailPage.closedAt")} value={formatDateTime(closedAt, locale)} />}
        {servedBy && <InfoRow label={t("orders.detailPage.servedBy")} value={servedBy} />}
        {cashier && <InfoRow label={t("orders.detailPage.cashier")} value={cashier} />}
        <InfoRow
          label={t("orders.detailPage.source")}
          value={SOURCE_LABEL_KEY[order.sourceCode] ? t(SOURCE_LABEL_KEY[order.sourceCode]) : humanizeCode(order.sourceCode)}
        />
        <InfoRow label={t("orders.detailPage.paymentStatus")} value={humanizeCode(order.paymentState)} />
      </dl>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {/* No endpoint re-opens a finished order, and nothing prints yet. */}
        <SmallButton tone="blue" disabled title={unavailable}>
          {t("orders.detailPage.action.reopen")}
        </SmallButton>
        <SmallButton tone="neutral" disabled title={unavailable}>
          {t("orders.detailPage.action.printBill")}
        </SmallButton>
        <SmallButton tone="refund" disabled={!canRefund(order)} title={canRefund(order) ? undefined : t("orders.detailPage.action.nothingToRefund")} onClick={actions.onRefund}>
          {t("orders.action.refund")}
        </SmallButton>
        <SmallButton tone="danger" disabled={terminated} onClick={actions.onVoid}>
          {t("orders.action.void")}
        </SmallButton>
        <SmallButton tone="purple" disabled={actions.duplicating} onClick={actions.onDuplicate}>
          {t("orders.detailPage.action.duplicate")}
        </SmallButton>
        <SmallButton
          tone="blueSubtle"
          disabled={!receiptReady}
          title={receiptReady ? undefined : t("orders.detailPage.action.receiptNotReady")}
          onClick={actions.onSendReceipt}
        >
          {t("orders.detailPage.action.sendReceipt")}
        </SmallButton>
        {/* PATCH /{id} is refused once the order is finished. */}
        <SmallButton
          tone="soft"
          className="col-span-2"
          disabled={!open}
          title={open ? undefined : t("orders.detailPage.action.noteClosed")}
          onClick={actions.onWriteNote}
        >
          {t("orders.detailPage.action.writeNote")}
        </SmallButton>
      </div>

      <div className="flex flex-col gap-2">
        <CardTitle>{t("orders.detailPage.tagsNote")}</CardTitle>
        {order.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {order.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-[#f1f5f9] px-2 py-1 text-[12px] font-medium leading-[12px] text-[var(--octo-text-secondary)] [[data-theme=dark]_&]:bg-[var(--octo-soft-bg)]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className={`flex items-start gap-2 rounded-[12px] border p-2 ${LINE_COLOR}`}>
          <ShellIcon name="ord-detail-message.svg" size={24} className="text-[var(--octo-text-primary)]" />
          {note.length > 0 ? (
            <p dir="auto" className="min-w-0 flex-1 whitespace-pre-line break-words text-[12px] font-medium leading-[1.4] text-[var(--octo-text-primary)]">
              {note.join("\n")}
            </p>
          ) : (
            <p className="min-w-0 flex-1 self-center text-[12px] font-medium leading-[1.4] text-[var(--octo-text-muted)]">
              {t("orders.detailPage.noNote")}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

const STEP_TITLE_KEY: Record<TimelineStepId, string> = {
  created: "orders.detailPage.timeline.created",
  accepted: "orders.detailPage.timeline.accepted",
  preparing: "orders.detailPage.timeline.preparing",
  ready: "orders.detailPage.timeline.ready",
  served: "orders.detailPage.timeline.served",
  payment: "orders.detailPage.timeline.payment",
  completed: "orders.detailPage.timeline.completed",
  cancelled: "orders.detailPage.timeline.cancelled",
  voided: "orders.detailPage.timeline.voided",
};

function detailText(detail: TimelineDetail, t: (key: string) => string): string {
  switch (detail.kind) {
    case "by":
      return t("orders.detailPage.timeline.by").replace("{name}", detail.name);
    case "closedBy":
      return t("orders.detailPage.timeline.closedBy").replace("{name}", detail.name);
    case "readyCount":
      return t("orders.detailPage.timeline.readyCount").replace("{n}", String(detail.done)).replace("{m}", String(detail.total));
    case "servedCount":
      return t("orders.detailPage.timeline.servedCount").replace("{n}", String(detail.done)).replace("{m}", String(detail.total));
    case "servedAll":
      return t("orders.detailPage.timeline.servedAll");
    case "reason":
      return t("orders.detailPage.timeline.reason").replace("{reason}", detail.reason);
    case "text":
      return detail.text;
  }
}

export function TimelineCard({ ws, order }: { ws: OrderWorkspace; order: OrderResponse }) {
  const { t, locale } = useI18n();
  const guestsLabel = useGuestsLabel(order);
  const activity = useReadableActivity(ws.activity);
  const steps = buildTimeline(order, ws.payments, activity);

  return (
    <section className={CARD_CLASS}>
      <div className={`flex flex-col gap-2 border-b pb-2 ${LINE_COLOR}`}>
        <CardTitle>{t("orders.detailPage.timeline.title")}</CardTitle>
        <PlaceLine order={order} guestsLabel={guestsLabel} />
      </div>
      <ol className="relative flex flex-col gap-8">
        {/* Runs through the dot centres, from the first to the last. */}
        <span aria-hidden className="absolute bottom-[18px] start-3 top-3 w-px bg-[#bef2da] [[data-theme=dark]_&]:bg-[#22c55e]/30" />
        {steps.map((step) => {
          const pending = step.at === null;
          const stopped = step.id === "cancelled" || step.id === "voided";
          return (
            <li key={step.id} className="relative flex min-h-[30px] items-center justify-between gap-3">
              <div className="flex min-w-0 items-start gap-2">
                {pending || stopped ? (
                  <span
                    aria-hidden
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${
                      stopped ? "bg-[#fef0f0] [[data-theme=dark]_&]:bg-[#3a1d1d]" : "bg-[#f1f5f9] [[data-theme=dark]_&]:bg-[var(--octo-soft-bg)]"
                    }`}
                  >
                    <span className={`h-4 w-4 rounded-full ${stopped ? "bg-[#d30202]" : "bg-[#cbd5e1] [[data-theme=dark]_&]:bg-[var(--octo-border-input)]"}`} />
                  </span>
                ) : (
                  <img src={TIMELINE_DOT} alt="" width={24} height={24} className="h-6 w-6 shrink-0" />
                )}
                <div className="flex min-w-0 flex-col gap-2 font-medium">
                  <span className={`text-[12px] leading-[12px] ${pending ? "text-[var(--octo-text-muted)]" : "text-[var(--octo-text-primary)]"}`}>
                    {t(STEP_TITLE_KEY[step.id])}
                  </span>
                  {/* Keeps every row the frame's 30px even when a step has no second line. */}
                  <span className="min-h-[10px] text-[10px] leading-[10px] text-[var(--octo-text-secondary)]">
                    {step.detail ? detailText(step.detail, t) : pending ? t("orders.details.pending") : ""}
                  </span>
                </div>
              </div>
              <span className={`shrink-0 text-[12px] font-medium leading-[12px] ${pending ? "text-[var(--octo-text-muted)]" : "text-[var(--octo-text-primary)]"}`}>
                {step.at ? formatDateTime(step.at, locale) : "—"}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function PaymentCard({ ws, order }: { ws: OrderWorkspace; order: OrderResponse }) {
  const { t, locale } = useI18n();
  const capture = latestCapture(ws.payments);
  const activity = useReadableActivity(ws.activity);
  const capturedBy = actorOf(activity, "payment.recorded", "payment.captured");

  return (
    <section className={CARD_CLASS}>
      <CardTitle>{t("orders.detailPage.payment.title")}</CardTitle>
      <HighlightRow tone="blue" label={t("orders.detailPage.payment.capture")} value={formatMoney(order.capturedTotal)} />
      {capture ? (
        <dl className="flex flex-col gap-3">
          <InfoRow label={t("orders.detailPage.payment.method")} value={paymentMethodLabel(capture)} />
          {capture.reference && <InfoRow label={t("orders.detailPage.payment.transactionId")} value={<span dir="ltr">{capture.reference}</span>} />}
          <InfoRow label={t("orders.detailPage.payment.captureAt")} value={formatDateTime(capture.capturedAtUtc ?? capture.createdAtUtc, locale)} />
          {capturedBy && <InfoRow label={t("orders.detailPage.payment.capturedBy")} value={capturedBy} />}
          {capture.gratuity.amount > 0 && <InfoRow label={t("orders.detailPage.payment.tip")} value={<span dir="ltr">{formatMoney(capture.gratuity)}</span>} />}
        </dl>
      ) : (
        <p className="text-[12px] font-medium leading-[1.4] text-[var(--octo-text-muted)]">{t("orders.detailPage.payment.none")}</p>
      )}
    </section>
  );
}

function refundTone(refund: RefundResponse): string {
  if (refund.state === "Succeeded") return GREEN_TEXT;
  if (refund.state === "Failed") return "text-[#d30202] [[data-theme=dark]_&]:text-[#f87171]";
  return "text-[#b45309] [[data-theme=dark]_&]:text-[#fbbf24]";
}

export function RefundCard({ ws, order, onIssueRefund }: { ws: OrderWorkspace; order: OrderResponse; onIssueRefund: () => void }) {
  const { t } = useI18n();
  return (
    <section className={CARD_CLASS}>
      <CardTitle>{ws.refunds.length === 0 ? t("orders.detailPage.refund.none") : t("orders.detailPage.refund.title")}</CardTitle>
      {ws.refunds.length > 0 && (
        <dl className="flex flex-col gap-3">
          {ws.refunds.map((refund) => (
            <InfoRow
              key={refund.id}
              label={`${humanizeCode(refund.reasonCode)} · ${humanizeCode(refund.state)}`}
              value={<span dir="ltr">-{formatMoney(refund.amount)}</span>}
              valueClassName={refundTone(refund)}
            />
          ))}
        </dl>
      )}
      <SmallButton
        tone="neutral"
        className="w-full"
        disabled={!canRefund(order)}
        title={canRefund(order) ? undefined : t("orders.detailPage.action.nothingToRefund")}
        onClick={onIssueRefund}
      >
        {t("orders.detailPage.refund.issue")}
      </SmallButton>
    </section>
  );
}

export function TotalsCard({ order }: { order: OrderResponse }) {
  const { t } = useI18n();
  const totals = order.totals;
  const money = (value: string) => <span dir="ltr">{value}</span>;
  const settled = order.balanceDue.amount <= 0;

  return (
    <section className={CARD_CLASS}>
      <CardTitle>{t("orders.details.summary")}</CardTitle>
      <dl className="flex flex-col gap-3">
        <div className={`flex flex-col gap-3 border-b pb-1 ${LINE_COLOR}`}>
          <InfoRow label={t("orders.detailPage.totals.itemsTotal")} value={money(formatMoney(totals.linesSubtotal))} />
          <InfoRow
            label={t("orders.detailPage.totals.discounts")}
            value={money(totals.orderDiscountAmount.amount > 0 ? `-${formatMoney(totals.orderDiscountAmount)}` : formatMoney(totals.orderDiscountAmount))}
            valueClassName={GREEN_TEXT}
          />
          <InfoRow label={t("orders.detailPage.totals.subtotal")} value={money(formatMoney(totals.discountedSubtotal))} />
          {totals.serviceChargeAmount.amount > 0 && (
            <InfoRow
              label={t("orders.detailPage.totals.serviceCharge").replace("{rate}", String(order.serviceChargePercent))}
              value={money(formatMoney(totals.serviceChargeAmount))}
            />
          )}
          <InfoRow
            label={t("orders.detailPage.totals.vat").replace("{rate}", String(order.taxRatePercent))}
            value={money(formatMoney(totals.taxTotal))}
          />
        </div>
        <InfoRow label={t("orders.detailPage.totals.total")} value={money(formatMoney(totals.grandTotal))} />
        <InfoRow label={t("orders.detailPage.totals.amountPaid")} value={money(formatMoney(order.capturedTotal))} />
        {order.refundedTotal.amount > 0 && (
          <InfoRow label={t("orders.detailPage.totals.refunded")} value={money(`-${formatMoney(order.refundedTotal)}`)} />
        )}
      </dl>
      <HighlightRow tone={settled ? "green" : "red"} label={t("orders.detailPage.totals.balanceDue")} value={formatMoney(order.balanceDue)} />
    </section>
  );
}
