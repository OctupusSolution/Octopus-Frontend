// apps/merchant/src/pages/orders-list/details/index.tsx
// One real order as a full page (/orders/:orderId) — the same workspace the
// orders-list detail modal runs on, laid out as the "Order Details" frame.
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { duplicateOrderTemplate, type DuplicateOrderTemplateResponse } from "@octopus/api-client";
import {
  mapRealOrderToRecord,
  OrderErrorNote,
  orderErrorMessage,
  useOrderSettings,
  useOrderText,
  useOrderWorkspace,
} from "@/entities/order";
import { NewOrderModal } from "@/features/order/take-order";
import { useAuth } from "@/app/providers/auth-provider";
import { useI18n } from "@/app/providers/i18n-provider";
import { ShellIcon } from "@/shared/ui/shell-icon";
import { CancelOrderFlow } from "../_shared/cancel-order-flow";
import { OrderActionButtons } from "../_shared/order-row";
import { RecordPaymentFlow } from "../_shared/record-payment-flow";
import { RefundOrderFlow } from "../_shared/refund-order-flow";
import type { OrderAction } from "../_shared/theme";
import { VoidOrderFlow } from "../_shared/void-order-flow";
import { WastageOrderFlow } from "../_shared/wastage-order-flow";
import { OrderDetailsView } from "./details-view";
import { NoteDialog, ReceiptDialog } from "./dialogs";

const PAGE_CLASS = "px-4 pb-10 pt-6 sm:px-6 lg:ps-12 lg:pt-8";

export function OrderDetailsPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const { tx } = useOrderText();
  const { activeBusinessId } = useAuth();
  const ws = useOrderWorkspace(orderId ?? null);
  const { settings } = useOrderSettings();
  const order = ws.order;
  const [pendingAction, setPendingAction] = useState<OrderAction | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [template, setTemplate] = useState<DuplicateOrderTemplateResponse | null>(null);
  const [duplicating, setDuplicating] = useState(false);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  // The action flows were built for the list and take its row shape.
  const record = useMemo(() => (order ? mapRealOrderToRecord(order) : null), [order]);

  async function duplicate() {
    if (!activeBusinessId || !order) return;
    setDuplicating(true);
    setDuplicateError(null);
    try {
      setTemplate(await duplicateOrderTemplate(activeBusinessId, order.id));
    } catch (err) {
      setDuplicateError(orderErrorMessage(err));
    } finally {
      setDuplicating(false);
    }
  }

  const flowOrder = (action: OrderAction) => (pendingAction === action ? record : null);
  const closeFlow = () => setPendingAction(null);

  return (
    <div className={PAGE_CLASS}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          {/* Not in the frame — a page reached from the list needs a way back. */}
          <button
            type="button"
            onClick={() => navigate("/orders")}
            aria-label={t("orders.detailPage.back")}
            title={t("orders.detailPage.back")}
            className="-my-1 grid h-8 w-8 shrink-0 place-items-center rounded-[8px] text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)]"
          >
            <ArrowLeft size={20} className="rtl:rotate-180" />
          </button>
          <div className="flex min-w-0 flex-col gap-3">
            <h1 className="text-[24px] font-bold leading-[24px] text-[var(--octo-text-primary)]">
              {order ? t("orders.detailPage.title").replace("{code}", `#${order.code}`) : t("orders.detailPage.titleLoading")}
            </h1>
            <p className="text-[14px] font-medium leading-[14px] text-[var(--octo-text-secondary)]">{t("orders.subtitle")}</p>
          </div>
        </div>
        <span className="flex items-center gap-2 rounded-[4px] bg-[#f1f5f9] p-2 text-[14px] font-medium leading-[14px] text-[var(--octo-text-primary)] [[data-theme=dark]_&]:bg-[var(--octo-soft-bg)]">
          <ShellIcon name="ord-detail-calendar.svg" size={24} />
          {new Date().toLocaleDateString(locale === "ar" ? "ar-SA-u-ca-gregory" : "en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      </header>

      <OrderErrorNote message={duplicateError} onDismiss={() => setDuplicateError(null)} />

      {!order || !record ? (
        ws.loadError ? (
          <OrderErrorNote message={ws.loadError} />
        ) : (
          <p className="py-16 text-center text-[13px] text-[var(--octo-text-muted)]">{tx("common.loading")}</p>
        )
      ) : (
        <>
          <OrderDetailsView
            ws={ws}
            order={order}
            settings={settings}
            actions={{
              onRefund: () => setPendingAction("refund"),
              onVoid: () => setPendingAction("void"),
              onDuplicate: () => void duplicate(),
              onSendReceipt: () => setReceiptOpen(true),
              onWriteNote: () => setNoteOpen(true),
              duplicating,
            }}
            manageActions={<OrderActionButtons order={record} onAction={(action) => setPendingAction(action)} />}
            onReorder={setTemplate}
          />
          <NoteDialog open={noteOpen} ws={ws} order={order} onClose={() => setNoteOpen(false)} />
          <ReceiptDialog open={receiptOpen} ws={ws} order={order} onClose={() => setReceiptOpen(false)} />
        </>
      )}

      <NewOrderModal
        open={template !== null}
        template={template}
        onClose={() => setTemplate(null)}
        onCreated={(created) => {
          setTemplate(null);
          navigate(`/orders/${created.id}`);
        }}
      />

      {/* The flows write through their own calls, so the page re-reads after each. */}
      <CancelOrderFlow order={flowOrder("cancel")} onClose={closeFlow} onSuccess={ws.reload} />
      <VoidOrderFlow order={flowOrder("void")} onClose={closeFlow} onSuccess={ws.reload} />
      <WastageOrderFlow order={flowOrder("wastage")} onClose={closeFlow} onSuccess={ws.reload} />
      <RefundOrderFlow order={flowOrder("refund")} onClose={closeFlow} onSuccess={ws.reload} />
      <RecordPaymentFlow order={flowOrder("payment")} onClose={closeFlow} onSuccess={ws.reload} />
    </div>
  );
}
