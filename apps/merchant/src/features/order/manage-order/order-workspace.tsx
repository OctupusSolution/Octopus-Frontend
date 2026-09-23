// Everything that can be done to one real order, stacked as sections under
// the orders-list detail modal. Loads the order itself (the list row is a
// thin, possibly stale snapshot) and reports every successful write upward
// so the list can refresh.
import type { DuplicateOrderTemplateResponse, OrderResponse } from "@octopus/api-client";
import {
  formatMoney,
  humanizeCode,
  OrderErrorNote,
  useOrderSettings,
  useOrderText,
  useOrderWorkspace,
  type OrderTextKey,
} from "@/entities/order";
import { ActivitySection } from "./activity-section";
import { DetailsSection } from "./details-section";
import { LifecycleBar } from "./lifecycle-bar";
import { LinesPanel } from "./lines-panel";
import { PaymentsSection, RefundsSection, WastageSection } from "./money-sections";

export function OrderWorkspacePanel({
  orderId,
  onChanged,
  onReorder,
}: {
  orderId: string;
  onChanged?: (order: OrderResponse) => void;
  onReorder?: (template: DuplicateOrderTemplateResponse) => void;
}) {
  const { tx } = useOrderText();
  const ws = useOrderWorkspace(orderId, onChanged);
  const { settings } = useOrderSettings();
  const order = ws.order;

  if (!order) {
    return ws.loadError ? (
      <OrderErrorNote message={ws.loadError} />
    ) : (
      <p className="mt-4 py-6 text-center text-[13px] text-[var(--octo-text-muted)]">{tx("common.loading")}</p>
    );
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-xl bg-[var(--octo-hover)] px-4 py-2.5 text-[12.5px]">
        <span className="text-[var(--octo-text-muted)]">
          {tx("workspace.status")}{" "}
          <b className="text-[var(--octo-text-primary)]">{tx(`status.${order.status}` as OrderTextKey)}</b>
        </span>
        <span className="text-[var(--octo-text-muted)]">
          {tx("workspace.payment")} <b className="text-[var(--octo-text-primary)]">{humanizeCode(order.paymentState)}</b>
        </span>
        <span className="text-[var(--octo-text-muted)]">
          {tx("workspace.captured")} <b className="text-[var(--octo-text-primary)]">{formatMoney(order.capturedTotal)}</b>
        </span>
        {order.refundedTotal.amount > 0 && (
          <span className="text-[var(--octo-text-muted)]">
            {tx("workspace.refunded")} <b className="text-[var(--octo-text-primary)]">{formatMoney(order.refundedTotal)}</b>
          </span>
        )}
        {ws.busy && <span className="ms-auto text-[#0D6EFD]">{tx("common.saving")}</span>}
      </div>

      <OrderErrorNote
        message={
          ws.actionError
            ? ws.actionError.approvalNeeded
              ? `${ws.actionError.message} — ${tx("approval.neededHint")}`
              : ws.actionError.message
            : null
        }
        onDismiss={ws.clearError}
      />

      <LifecycleBar ws={ws} order={order} settings={settings} onReorder={onReorder} />
      <LinesPanel ws={ws} order={order} settings={settings} />
      <DetailsSection ws={ws} order={order} />
      <PaymentsSection ws={ws} order={order} />
      <RefundsSection ws={ws} />
      <WastageSection ws={ws} order={order} />
      <ActivitySection ws={ws} />
    </div>
  );
}
