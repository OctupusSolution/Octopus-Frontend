// Rows 2 and 3 of the Order Details page: the items table, the payment
// split, the order metadata and the audit log.
import { useState } from "react";
import type { OrderResponse } from "@octopus/api-client";
import { formatMoney, humanizeCode, useOrderText, type OrderWorkspace } from "@/entities/order";
import { useI18n } from "@/app/providers/i18n-provider";
import { activityActionLabel, activitySummaryText, lineDiscount, lineTax, paymentMethodLabel, paymentSplit } from "./derive";
import { CardTitle, formatDateTime, formatTime, HighlightRow, InfoRow, LINE_COLOR, LineStatusChip, useReadableActivity } from "./parts";

const ITEM_HEAD = "px-1 py-2 text-start text-[12px] font-medium leading-[12px] text-[var(--octo-text-primary)] first:ps-3 last:pe-3";
const ITEM_CELL = "px-1 py-1.5 text-start text-[12px] font-medium leading-[12px] text-[var(--octo-text-primary)] first:ps-0 last:pe-0";

export function ItemsCard({ order }: { order: OrderResponse }) {
  const { t } = useI18n();
  const sar = (amount: number) => `${order.currency} ${amount.toFixed(2)}`;

  return (
    <section className={`flex min-w-0 flex-col gap-4 rounded-[12px] border p-3 ${LINE_COLOR}`}>
      <CardTitle>{t("orders.detailPage.items.title")}</CardTitle>
      {order.lines.length === 0 ? (
        <p className="text-[12px] font-medium text-[var(--octo-text-muted)]">{t("orders.detailPage.items.empty")}</p>
      ) : (
        <div className="octo-scroll overflow-x-auto">
          <table className="w-full min-w-[440px] border-separate border-spacing-0">
            <thead>
              <tr className="bg-[#f1f5f9] [[data-theme=dark]_&]:bg-[var(--octo-soft-bg)]">
                <th className={ITEM_HEAD}>{t("orders.detailPage.items.item")}</th>
                <th className={ITEM_HEAD}>{t("orders.detailPage.items.qty")}</th>
                <th className={ITEM_HEAD}>{t("orders.detailPage.items.unitPrice")}</th>
                <th className={ITEM_HEAD}>{t("orders.detailPage.items.discount")}</th>
                <th className={ITEM_HEAD}>{t("orders.detailPage.items.tax")}</th>
                <th className={ITEM_HEAD}>{t("orders.detailPage.items.total")}</th>
                <th className={ITEM_HEAD}>{t("orders.detailPage.items.status")}</th>
              </tr>
            </thead>
            <tbody>
              {/* The frame sets 16px between the header and the first row. */}
              <tr aria-hidden>
                <td colSpan={7} className="h-[10px] p-0" />
              </tr>
              {order.lines.map((line) => {
                const discount = lineDiscount(line);
                return (
                  <tr key={line.id}>
                    <td className={ITEM_CELL}>
                      {line.displayName}
                      {line.options.length > 0 && (
                        <span className="mt-1 block text-[10px] leading-[10px] text-[var(--octo-text-secondary)]">
                          {line.options.map((option) => option.optionName).join(", ")}
                        </span>
                      )}
                    </td>
                    <td className={ITEM_CELL}>{line.quantity}</td>
                    <td className={ITEM_CELL} dir="ltr">
                      {formatMoney(line.unitPrice)}
                    </td>
                    <td className={ITEM_CELL} dir="ltr">
                      {discount > 0 ? `-${sar(discount)}` : "-"}
                    </td>
                    <td className={ITEM_CELL} dir="ltr">
                      {sar(lineTax(line, order.taxRatePercent))}
                    </td>
                    <td className={ITEM_CELL} dir="ltr">
                      {formatMoney(line.lineTotal)}
                    </td>
                    <td className={ITEM_CELL}>
                      <LineStatusChip status={line.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-auto">
        <HighlightRow tone="blue" rounded="rounded-[12px]" label={t("orders.detailPage.items.itemsTotal")} value={formatMoney(order.totals.linesSubtotal)} />
      </div>
    </section>
  );
}

const SPLIT_TYPE_KEY = {
  none: "orders.detailPage.split.type.none",
  equal: "orders.detailPage.split.type.equal",
  custom: "orders.detailPage.split.type.custom",
} as const;

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

export function SplitCard({ ws, order }: { ws: OrderWorkspace; order: OrderResponse }) {
  const { t } = useI18n();
  const split = paymentSplit(ws.payments);

  return (
    <section className={`flex flex-col gap-6 rounded-[16px] border p-3 ${LINE_COLOR}`}>
      <CardTitle>{t("orders.detailPage.split.title")}</CardTitle>
      {split.payments.length === 0 ? (
        <p className="text-[12px] font-medium text-[var(--octo-text-muted)]">{t("orders.detailPage.payment.none")}</p>
      ) : (
        <dl className="flex flex-col gap-3">
          <InfoRow label={t("orders.detailPage.split.splitType")} value={t(SPLIT_TYPE_KEY[split.type])} />
          <InfoRow label={t("orders.detailPage.split.paidBy")} value={unique(split.payments.map(paymentMethodLabel)).join(", ")} />
          <InfoRow
            label={t("orders.detailPage.split.paidFor")}
            value={order.balanceDue.amount <= 0 ? t("orders.detailPage.split.entireOrder") : t("orders.detailPage.split.partOfOrder")}
          />
          <InfoRow label={t("orders.detailPage.split.payments")} value={String(split.payments.length)} />
          <InfoRow
            label={t("orders.detailPage.split.eachPaid")}
            value={<span dir="ltr">{unique(split.payments.map((payment) => formatMoney(payment.amount))).join(" / ")}</span>}
          />
        </dl>
      )}
    </section>
  );
}

export function MetadataCard({ order }: { order: OrderResponse }) {
  const { t, locale } = useI18n();
  return (
    <section className={`flex flex-col gap-6 rounded-[16px] border p-3 ${LINE_COLOR}`}>
      <CardTitle>{t("orders.detailPage.meta.title")}</CardTitle>
      <dl className="flex flex-col gap-3">
        <InfoRow label={t("orders.detailPage.meta.orderId")} value={<span dir="ltr">#{order.code}</span>} />
        <InfoRow label={t("orders.detailPage.meta.fulfilment")} value={humanizeCode(order.fulfilmentCode)} />
        {order.visit && <InfoRow label={t("orders.detailPage.meta.reservation")} value={<span dir="ltr">{order.visit.code}</span>} />}
        {order.attendeeCount != null && <InfoRow label={t("orders.detailPage.meta.guests")} value={String(order.attendeeCount)} />}
        {order.customer.name && <InfoRow label={t("orders.detailPage.meta.customer")} value={order.customer.name} />}
        {order.customer.phone && <InfoRow label={t("orders.detailPage.meta.phone")} value={<span dir="ltr">{order.customer.phone}</span>} />}
        {order.deliveryAddress && <InfoRow label={t("orders.detailPage.meta.deliveryAddress")} value={order.deliveryAddress} />}
        <InfoRow label={t("orders.detailPage.meta.created")} value={formatDateTime(order.createdAtUtc, locale)} />
      </dl>
    </section>
  );
}

const AUDIT_HEAD = "h-9 border-b-[0.8px] border-[#e2e8f0] bg-[#f8fafc] px-3 text-center text-[12px] font-medium capitalize leading-[12px] text-[var(--octo-text-primary)] [[data-theme=dark]_&]:border-[var(--octo-border-card)] [[data-theme=dark]_&]:bg-[var(--octo-soft-bg)]";
const AUDIT_CELL = "h-10 border-b-[0.8px] border-[#f1f5f9] px-1 text-center text-[12px] leading-[12px] text-[var(--octo-text-primary)] [[data-theme=dark]_&]:border-[var(--octo-divider)]";
const CHECKBOX = "block h-[13px] w-[13px] cursor-pointer accent-[#0d6efd]";

export function AuditTable({ ws }: { ws: OrderWorkspace }) {
  const { t, locale } = useI18n();
  const { tx } = useOrderText();
  const [selected, setSelected] = useState<readonly string[]>([]);
  const entries = useReadableActivity(ws.activity);
  const allSelected = entries.length > 0 && entries.every((entry) => selected.includes(entry.id));

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));
  }

  return (
    <section className="octo-scroll overflow-x-auto rounded-[14.5px] border-[0.8px] border-[#e2e8f0] bg-[var(--octo-card)] [[data-theme=dark]_&]:border-[var(--octo-border-card)]">
      <table className="w-full min-w-[640px] table-fixed border-separate border-spacing-0">
        <colgroup>
          <col className="w-[41px]" />
          <col className="w-[16%]" />
          <col className="w-[24%]" />
          <col className="w-[20%]" />
          <col />
        </colgroup>
        <thead>
          <tr>
            <th className={`${AUDIT_HEAD} !px-0 !ps-[14px]`}>
              <input
                type="checkbox"
                className={CHECKBOX}
                aria-label={t("orders.detailPage.audit.selectAll")}
                checked={allSelected}
                onChange={() => setSelected(allSelected ? [] : entries.map((entry) => entry.id))}
              />
            </th>
            <th className={AUDIT_HEAD}>{t("orders.detailPage.audit.time")}</th>
            <th className={AUDIT_HEAD}>{t("orders.detailPage.audit.action")}</th>
            <th className={AUDIT_HEAD}>{t("orders.detailPage.audit.by")}</th>
            <th className={AUDIT_HEAD}>{t("orders.detailPage.audit.details")}</th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 ? (
            <tr>
              <td colSpan={5} className="h-10 text-center text-[12px] text-[var(--octo-text-muted)]">
                {tx("activity.empty")}
              </td>
            </tr>
          ) : (
            entries.map((entry) => {
              const details = activitySummaryText(entry.changeSummary);
              return (
                <tr key={entry.id}>
                  <td className={`${AUDIT_CELL} !px-0 !ps-[14px]`}>
                    <input
                      type="checkbox"
                      className={CHECKBOX}
                      aria-label={t("orders.detailPage.audit.selectRow")}
                      checked={selected.includes(entry.id)}
                      onChange={() => toggle(entry.id)}
                    />
                  </td>
                  <td className={AUDIT_CELL} title={formatDateTime(entry.occurredAtUtc, locale)}>
                    {formatTime(entry.occurredAtUtc, locale)}
                  </td>
                  <td className={AUDIT_CELL}>{activityActionLabel(entry.action)}</td>
                  <td className={AUDIT_CELL}>{entry.actorDisplay ?? tx("activity.system")}</td>
                  <td className={`${AUDIT_CELL} truncate`} title={details}>
                    {details || "—"}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </section>
  );
}
