// The Order Details page's content, given a loaded order workspace. Kept
// apart from index.tsx (routing, flows, dialogs) so it only takes props.
import type { ReactNode } from "react";
import type { DuplicateOrderTemplateResponse, OrderResponse, OrderSettingsResponse } from "@octopus/api-client";
import { OrderErrorNote, useOrderText, type OrderWorkspace } from "@/entities/order";
import {
  DetailsSection,
  LifecycleBar,
  LinesPanel,
  PaymentsSection,
  RefundsSection,
  WastageSection,
} from "@/features/order/manage-order";
import { useI18n } from "@/app/providers/i18n-provider";
import { AuditTable, ItemsCard, MetadataCard, SplitCard } from "./bottom-cards";
import { CardTitle, LINE_COLOR } from "./parts";
import { PaymentCard, RefundCard, SummaryCard, TimelineCard, TotalsCard, type SummaryActions } from "./top-cards";

export function OrderDetailsView({
  ws,
  order,
  settings,
  actions,
  manageActions,
  onReorder,
}: {
  ws: OrderWorkspace;
  order: OrderResponse;
  settings: OrderSettingsResponse | null;
  actions: SummaryActions;
  /** The list's own action row (record payment, wastage, cancel…). */
  manageActions: ReactNode;
  onReorder: (template: DuplicateOrderTemplateResponse) => void;
}) {
  const { t } = useI18n();
  const { tx } = useOrderText();

  return (
    <div className="mt-6 flex flex-col gap-6">
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-[269px_minmax(0,1fr)_269px]">
        <SummaryCard ws={ws} order={order} actions={actions} />
        <TimelineCard ws={ws} order={order} />
        <div className="flex flex-col gap-3 lg:col-span-2 xl:col-span-1">
          <PaymentCard ws={ws} order={order} />
          <RefundCard ws={ws} order={order} onIssueRefund={actions.onRefund} />
          <TotalsCard order={order} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-[498fr_288fr_330fr]">
        <div className="grid lg:col-span-2 xl:col-span-1">
          <ItemsCard order={order} />
        </div>
        <SplitCard ws={ws} order={order} />
        <MetadataCard order={order} />
      </div>

      <AuditTable ws={ws} />

      {/* Not in the frame: everything the old details modal could do to an
          order (lifecycle, lines, discounts, contact, payment links, refund
          retries, wastage) stays reachable here. */}
      <section className={`rounded-[16px] border p-3 ${LINE_COLOR}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>{t("orders.detailPage.manage.title")}</CardTitle>
          {ws.busy && <span className="text-[12px] font-medium text-[#0D6EFD]">{tx("common.saving")}</span>}
        </div>
        <div className="mt-3">{manageActions}</div>
        <LifecycleBar ws={ws} order={order} settings={settings} onReorder={onReorder} />
        <LinesPanel ws={ws} order={order} settings={settings} />
        <DetailsSection ws={ws} order={order} />
        <PaymentsSection ws={ws} order={order} />
        <RefundsSection ws={ws} />
        <WastageSection ws={ws} order={order} />
      </section>
    </div>
  );
}
