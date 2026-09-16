// apps/merchant/src/pages/orders-list/_shared/order-details-modal.tsx
import type { ReactNode } from "react";
import { ChefHat, QrCode, Users } from "lucide-react";
import { Modal } from "@ui/primitives";
import { formatSar } from "@octopus/api-client";
import { useI18n } from "@/app/providers/i18n-provider";
import { OrderActionButtons, TableGlyph } from "./order-row";
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

function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-3 rounded-xl border border-[var(--octo-border-card)] p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[14px] font-bold text-[var(--octo-text-primary)]">{title}</h3>
        {aside}
      </div>
      <div className="mt-3 border-t border-[var(--octo-divider)] pt-3">{children}</div>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-[3px] text-[13px]">
      <span className="text-[var(--octo-text-muted)]">{label}</span>
      <span className="font-medium text-[var(--octo-text-primary)]">{value}</span>
    </div>
  );
}

function MetaItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[12.5px]">
      <span className="text-[var(--octo-text-muted)]">{icon}</span>
      <span className="text-[var(--octo-text-muted)]">{label}</span>
      <span className="font-semibold text-[var(--octo-text-primary)]">{value}</span>
    </span>
  );
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
  const placedAt = order.timeline.New;
  const placedTime = placedAt
    ? new Date(placedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <Modal open onClose={onClose} className="max-h-[88vh] max-w-[720px] overflow-y-auto">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-[22px] font-bold text-[var(--octo-text-primary)]">{order.id}</h2>
        <span className="text-[13px] font-semibold" style={{ color: statePill.text }}>
          {t(STATE_LABEL_KEY[order.state])}
        </span>
      </div>
      <p className="mt-1 text-[13px] text-[var(--octo-text-muted)]">
        {order.date}
        {placedTime ? ` - ${placedTime}` : ""} - {t(SOURCE_LABEL_KEY[order.source])}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl bg-[#0D6EFD]/[0.05] px-4 py-3">
        {order.table && (
          <MetaItem icon={<TableGlyph size={14} />} label={t("orders.details.tableNo")} value={order.table} />
        )}
        {order.guests != null && (
          <MetaItem
            icon={<Users size={14} />}
            label={t("orders.details.guestNo")}
            value={t("orders.row.guests").replace("{n}", String(order.guests))}
          />
        )}
        {order.waiter && <MetaItem icon={<ChefHat size={14} />} label={t("orders.details.waiter")} value={order.waiter} />}
        <MetaItem
          icon={<QrCode size={14} />}
          label={t("orders.details.source")}
          value={t(SOURCE_LABEL_KEY[order.source])}
        />
      </div>

      <Section title={t("orders.details.summary")}>
        <DetailRow
          label={t("orders.details.items")}
          value={t("orders.details.itemsValue").replace("{n}", String(itemCount))}
        />
        <DetailRow
          label={t("orders.details.courses")}
          value={t("orders.details.coursesValue").replace("{n}", String(order.courses))}
        />
      </Section>

      <div className="mt-3 rounded-xl border border-[#0D6EFD] bg-[#0D6EFD]/[0.04] p-4">
        <div className="flex items-center justify-between gap-3 py-[3px] text-[13px]">
          <span className="text-[var(--octo-text-muted)]">{t("orders.details.subtotal")}</span>
          <span className="font-medium text-[var(--octo-text-primary)]">{formatSar(order.subtotalSar)}</span>
        </div>
        <div className="flex items-center justify-between gap-3 py-[3px] text-[13px]">
          <span className="text-[var(--octo-text-muted)]">{t("orders.details.tax")}</span>
          <span className="font-medium text-[var(--octo-text-primary)]">{formatSar(order.taxSar)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 border-t border-[#0D6EFD]/25 pt-2.5 text-[14px] font-bold text-[#0D6EFD]">
          <span>{t("orders.details.total")}</span>
          <span>{formatSar(order.totalSar)}</span>
        </div>
      </div>

      <Section
        title={t("orders.details.payment")}
        aside={
          <span
            className="rounded-full px-2.5 py-[3px] text-[12px] font-semibold"
            style={{ backgroundColor: `${order.payment === "Unpaid" ? "#6B7280" : "#16A34A"}14`, color: paymentTone(order.payment) }}
          >
            {t(PAYMENT_LABEL_KEY[order.payment])}
          </span>
        }
      >
        {order.paymentMethod && <DetailRow label={t("orders.details.method")} value={order.paymentMethod} />}
        {order.paymentMethod && placedAt && (
          <DetailRow
            label={t("orders.details.paidAt")}
            value={new Date(placedAt).toLocaleString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          />
        )}
        {order.transactionId && <DetailRow label={t("orders.details.transactionId")} value={order.transactionId} />}
      </Section>

      <Section title={t("orders.details.timeline")}>
        <Stepper order={order} variant="detail" className="pt-1" />
      </Section>

      <OrderActionButtons order={order} onAction={onAction} variant="large" className="mt-4" />
    </Modal>
  );
}
