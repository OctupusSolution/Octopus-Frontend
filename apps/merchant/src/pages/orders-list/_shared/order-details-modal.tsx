// apps/merchant/src/pages/orders-list/_shared/order-details-modal.tsx
import { Modal } from "@ui/primitives";
import { formatSar } from "@octopus/api-client";
import { useI18n } from "@/app/providers/i18n-provider";
import { OrderActionButtons } from "./order-row";
import { Stepper, STATE_LABEL_KEY } from "./stepper";
import { STATE_STYLE } from "./theme";
import type { OrderAction } from "./theme";
import type { OrderRecord } from "./types";

const PAYMENT_LABEL_KEY: Record<OrderRecord["payment"], string> = {
  "Paid Online": "orders.payment.online",
  "Paid Cash": "orders.payment.cash",
  Unpaid: "orders.payment.unpaid",
  "Partially Paid": "orders.payment.partial",
};

const SOURCE_LABEL_KEY: Record<OrderRecord["source"], string> = {
  "QR Code": "orders.source.qrCode",
  "POS Order": "orders.source.pos",
  "KIOSK Order": "orders.source.kiosk",
  "Phone Order": "orders.source.phone",
};

function paymentTone(payment: OrderRecord["payment"]): string {
  return payment === "Unpaid" ? "var(--octo-text-muted)" : "#16A34A";
}

export function OrderDetailsModal({
  order,
  onClose,
  onAction,
}: {
  order: OrderRecord | null;
  onClose: () => void;
  onAction: (action: OrderAction, order: OrderRecord) => void;
}) {
  const { t } = useI18n();
  if (!order) return null;
  const statePill = STATE_STYLE[order.state];
  const itemCount = order.items.reduce((sum, item) => sum + item.qty, 0);

  return (
    <Modal open onClose={onClose} className="max-w-2xl">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-[19px] font-bold text-[var(--octo-text-primary)]">{order.id}</h2>
        <span className="text-[12.5px] font-semibold" style={{ color: statePill.text }}>
          {t(STATE_LABEL_KEY[order.state])}
        </span>
      </div>
      <p className="mt-1 text-[12.5px] text-[var(--octo-text-muted)]">
        {order.date} — {t(SOURCE_LABEL_KEY[order.source])}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1.5 rounded-[10px] bg-[var(--octo-hover)] px-3.5 py-2.5 text-[12.5px] text-[var(--octo-text-secondary)]">
        {order.table && <span>{t("orders.details.tableNo")} {order.table}</span>}
        {order.guests != null && <span>{t("orders.details.guestNo")} {order.guests}</span>}
        {order.waiter && <span>{t("orders.details.waiter")} {order.waiter}</span>}
        <span>{t("orders.details.source")} {t(SOURCE_LABEL_KEY[order.source])}</span>
      </div>

      <div className="mt-4 rounded-[10px] border border-[var(--octo-border-card)] p-3.5">
        <h3 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("orders.details.summary")}</h3>
        <dl className="mt-2 flex flex-col gap-1 text-[12.5px]">
          <div className="flex items-center justify-between">
            <dt className="text-[var(--octo-text-muted)]">{t("orders.details.items")}</dt>
            <dd>{t("orders.details.itemsValue").replace("{n}", String(itemCount))}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-[var(--octo-text-muted)]">{t("orders.details.courses")}</dt>
            <dd>{t("orders.details.coursesValue").replace("{n}", String(order.courses))}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-3 rounded-[10px] border border-[#0D6EFD]/30 bg-[#0D6EFD]/5 p-3.5 text-[12.5px]">
        <div className="flex items-center justify-between">
          <span className="text-[var(--octo-text-muted)]">{t("orders.details.subtotal")}</span>
          <span>{formatSar(order.subtotalSar)}</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-[var(--octo-text-muted)]">{t("orders.details.tax")}</span>
          <span>{formatSar(order.taxSar)}</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between font-semibold text-[#0D6EFD]">
          <span>{t("orders.details.total")}</span>
          <span>{formatSar(order.totalSar)}</span>
        </div>
      </div>

      <div className="mt-3 rounded-[10px] border border-[var(--octo-border-card)] p-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("orders.details.payment")}</h3>
          <span className="text-[12px] font-medium" style={{ color: paymentTone(order.payment) }}>
            {t(PAYMENT_LABEL_KEY[order.payment])}
          </span>
        </div>
        {order.paymentMethod && (
          <div className="mt-2 flex items-center justify-between text-[12.5px]">
            <span className="text-[var(--octo-text-muted)]">{t("orders.details.method")}</span>
            <span>{order.paymentMethod}</span>
          </div>
        )}
        {order.paymentMethod && order.timeline.New && (
          <div className="mt-1.5 flex items-center justify-between text-[12.5px]">
            <span className="text-[var(--octo-text-muted)]">{t("orders.details.paidAt")}</span>
            <span>
              {new Date(order.timeline.New).toLocaleString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        )}
        {order.transactionId && (
          <div className="mt-1.5 flex items-center justify-between text-[12.5px]">
            <span className="text-[var(--octo-text-muted)]">{t("orders.details.transactionId")}</span>
            <span>{order.transactionId}</span>
          </div>
        )}
      </div>

      <div className="mt-3 rounded-[10px] border border-[var(--octo-border-card)] p-3.5">
        <h3 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("orders.details.timeline")}</h3>
        <Stepper order={order} className="mt-3" />
      </div>

      <OrderActionButtons order={order} onAction={onAction} variant="large" className="mt-4" />
    </Modal>
  );
}
