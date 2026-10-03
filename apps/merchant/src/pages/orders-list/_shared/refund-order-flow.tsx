// apps/merchant/src/pages/orders-list/_shared/refund-order-flow.tsx
import { useEffect, useMemo, useState } from "react";
import { Modal } from "@ui/primitives";
import { formatSar } from "@octopus/api-client";
import { useAuth } from "@/app/providers/auth-provider";
import { useI18n } from "@/app/providers/i18n-provider";
import { fetchOrderPayments, issueRealRefund, toRefundReasonCode } from "@/entities/order";
import { RefundForm, type RefundPayload } from "./refund-form";
import { PinConfirmModal } from "./pin-confirm-modal";
import { ResultModal } from "./result-modal";
import { RefundResultModal } from "./refund-result";
import { REFUND_BACKDROP_CLASS, REFUND_MODAL_CLASS } from "./refund-controls";
import { useActionFlow } from "./action-flow";
import { useOrderActionConfirm } from "./use-order-action-confirm";
import { ACTION_THEME } from "./theme";
import { maxRefundableSar } from "./refund-amount";
import type { FlowStepKind } from "./action-flow-state";
import type { OrderRecord } from "./types";

const CASH_STEPS: readonly FlowStepKind[] = ["form", "pin", "result"];
const ONLINE_STEPS: readonly FlowStepKind[] = ["form", "pin", "processing", "pending", "result"];

// The frames give the PIN step's confirm button two fills: the olive of the
// online-payment frame and plain primary blue in the cash frame.
const CASH_CONFIRM_ACCENT = "#0D6EFD";

function ProcessingStep({ amountSar }: { amountSar: number }) {
  const { t } = useI18n();
  return (
    <RefundResultModal
      onClose={() => {}}
      dismissible={false}
      art="loading"
      title={t("orders.result.processingRefundTitle")}
      subtitle={t("orders.result.processingRefundSubtitle").replace("{amount}", formatSar(amountSar))}
    />
  );
}

function PendingStep({ refundId }: { refundId: string }) {
  const { t } = useI18n();
  return (
    <RefundResultModal
      onClose={() => {}}
      dismissible={false}
      art="processing"
      title={t("orders.result.refundPendingTitle")}
      subtitle={t("orders.result.refundPendingSubtitle")}
      note={t("orders.result.refundPendingNote").replace("{refundId}", refundId)}
      noteTone="warning"
      noteChip={t("orders.result.refundPendingChip")}
    />
  );
}

// Pixel match for the "Refund Failed" frame, kept as an exported-but-unused
// view: nothing in the flow can reach it. A real refund that is refused comes
// back while the PIN step is still open and is reported there, and the mock
// path has no gateway that could decline.
export function RefundFailedPreview({ amountSar, onRetry }: { amountSar: number; onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <RefundResultModal
      onClose={onRetry}
      art="failed"
      title={t("orders.result.refundFailedTitle")}
      subtitle={t("orders.result.refundFailedSubtitle").replace("{amount}", formatSar(amountSar))}
      note={t("orders.result.refundFailedReason")}
      noteTone="error"
      primaryLabel={t("orders.result.tryAgain")}
      onPrimary={onRetry}
    />
  );
}

export function RefundOrderFlow({
  order,
  onClose,
  onSuccess,
}: {
  order: OrderRecord | null;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const { t } = useI18n();
  const isUnpaid = order?.payment === "Unpaid";
  // A real order's refund is one synchronous API call — always the 3-step
  // cash path, never the animated processing/pending steps that only make
  // sense for a mock online-gateway round trip.
  const isCash = order?.real ? true : order?.payment === "Paid Cash";
  const steps = isCash ? CASH_STEPS : ONLINE_STEPS;
  const flow = useActionFlow<RefundPayload>(steps, order !== null && !isUnpaid);
  const accent = ACTION_THEME.refund.accent;
  const { activeBusinessId } = useAuth();
  const [realPaymentId, setRealPaymentId] = useState<string | null>(null);

  // A real order's refund needs a paymentId, which only GET /{id}/payments
  // carries — fetched once the flow opens, not eagerly for every row.
  useEffect(() => {
    if (!order?.real || !activeBusinessId) {
      setRealPaymentId(null);
      return;
    }
    let cancelled = false;
    void fetchOrderPayments(activeBusinessId, order.real.orderId).then((payments) => {
      if (!cancelled) setRealPaymentId(payments.find((p) => p.state === "Captured")?.id ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [order?.real, activeBusinessId]);

  const { confirm, submitting, errorText } = useOrderActionConfirm(
    order,
    (businessId, orderId, _version, approval) =>
      realPaymentId
        ? issueRealRefund(businessId, orderId, realPaymentId, flow.payload?.amountSar ?? null, toRefundReasonCode(flow.payload?.reason ?? "other"), approval)
        : Promise.resolve({ ok: false as const, message: "orders.error.actionFailed" }),
    flow.advance,
    onSuccess
  );

  // Deterministic per order (from its numeric suffix), so reopening the
  // same order's refund always shows the same id instead of a new random
  // one each time.
  const refundId = useMemo(() => {
    if (!order) return "";
    const digits = Number(order.id.replace(/\D/g, "")) || 0;
    return `RF-${8800000 + digits}`;
  }, [order]);

  if (!order) return null;

  if (isUnpaid) {
    return (
      <ResultModal
        open
        onClose={onClose}
        title={t("orders.refund.title")}
        subtitle={t("orders.refund.unpaidNotice")}
        noteLines={[]}
        noteClassName=""
        primaryLabel={t("orders.result.done")}
        onPrimary={onClose}
      />
    );
  }

  if (flow.step === "form") {
    return (
      <Modal
        open
        onClose={onClose}
        title={t("orders.refund.title")}
        className={REFUND_MODAL_CLASS}
        backdropClassName={REFUND_BACKDROP_CLASS}
      >
        <RefundForm
          order={order}
          isCash={isCash}
          typeLabel={t("orders.refund.typeLabel")}
          typeFullLabel={t("orders.refund.typeFull")}
          typePartialLabel={t("orders.refund.typePartial")}
          methodLabel={t("orders.refund.methodLabel")}
          methodItemsLabel={t("orders.refund.methodItems")}
          methodAmountLabel={t("orders.refund.methodAmount")}
          amountPlaceholder={t("orders.refund.amountPlaceholder")}
          cashAmountPlaceholder={t("orders.refund.cashAmountPlaceholder")}
          maxAmountLabel={t("orders.refund.maxAmount")}
          amountFieldLabel={t("orders.refund.amountFieldLabel")}
          amountSummaryLabel={t("orders.refund.amountSummary")}
          selectedSummaryLabel={t("orders.refund.selectedSummary")}
          reasonLabel={t("orders.refund.reasonLabel")}
          reasonPlaceholder={t("orders.refund.reasonPlaceholder")}
          reasonOptions={[
            { value: "wrongInput", label: t("orders.refund.reason.wrongInput") },
            { value: "customerComplaint", label: t("orders.refund.reason.customerComplaint") },
            { value: "qualityIssue", label: t("orders.refund.reason.qualityIssue") },
            { value: "other", label: t("orders.refund.reason.other") },
          ]}
          noteLabel={t("orders.note")}
          notePlaceholder={t("orders.notePlaceholder")}
          submitLabel={t("orders.next")}
          onSubmit={flow.submit}
        />
      </Modal>
    );
  }

  if (flow.step === "pin") {
    return (
      <PinConfirmModal
        open
        onClose={onClose}
        onConfirm={confirm}
        accent={isCash ? CASH_CONFIRM_ACCENT : accent}
        promptKey="orders.managerAuth.prompt.refund"
        confirmLabelKey="orders.managerAuth.confirm.refund"
        errorText={errorText}
        submitting={submitting}
      />
    );
  }

  const amountSar = flow.payload?.amountSar ?? maxRefundableSar(order);
  const typeLabel = flow.payload?.type === "partial" ? t("orders.refund.typePartial") : t("orders.refund.typeFull");
  const now = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  if (flow.step === "processing") return <ProcessingStep amountSar={amountSar} />;
  if (flow.step === "pending") return <PendingStep refundId={refundId} />;

  // Neither success frame carries a button of its own — both close on
  // dismissal.
  if (isCash) {
    return (
      <RefundResultModal
        onClose={onClose}
        art="success"
        title={t("orders.result.cashRefundTitle")}
        subtitle={t("orders.result.cashRefundSubtitle").replace("{amount}", formatSar(amountSar))}
        note={t("orders.result.cashRefundNote").replace("{refundId}", refundId).replace("{time}", now).replace("{type}", typeLabel)}
      />
    );
  }

  return (
    <RefundResultModal
      onClose={onClose}
      art="success"
      title={t("orders.result.refundSuccessTitle")}
      subtitle={t("orders.result.refundSuccessSubtitle")
        .replace("{amount}", formatSar(amountSar))
        .replace("{method}", order.paymentMethod ?? "")}
      note={t("orders.result.refundSuccessNote").replace("{refundId}", refundId).replace("{time}", now).replace("{type}", typeLabel)}
    />
  );
}
