// apps/merchant/src/pages/orders-list/_shared/cancel-order-flow.tsx
import { Modal } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { cancelRealOrder, toCancelReasonCode } from "@/entities/order";
import { ScopeReasonForm, type ScopeReasonPayload } from "./scope-reason-form";
import { PinConfirmModal } from "./pin-confirm-modal";
import { ResultModal, StampArt } from "./result-modal";
import { useActionFlow } from "./action-flow";
import { useOrderActionConfirm } from "./use-order-action-confirm";
import { FLOW_BACKDROP_CLASS, FLOW_MODAL_CLASS } from "./form-bits";
import type { OrderRecord } from "./types";

// The fill of this flow's "Manager Authentication & Security" confirm button,
// as its frame draws it.
const CONFIRM_ACCENT = "#d30202";

export function CancelOrderFlow({
  order,
  onClose,
  onSuccess,
}: {
  order: OrderRecord | null;
  onClose: () => void;
  /** Called after a real order's cancel succeeds, so the caller can refresh
   *  its list — no-op for a mock order. */
  onSuccess?: () => void;
}) {
  const { t } = useI18n();
  const flow = useActionFlow<ScopeReasonPayload>(["form", "pin", "result"], order !== null);
  // Real cancel is always order-level: the scope form's "specific" option has
  // no line-selection UI behind it, so there is nothing to target lines with
  // yet — see BACKEND_GAPS.md 6b.
  const { confirm, submitting, errorText } = useOrderActionConfirm(
    order,
    (businessId, orderId, version, approval) =>
      cancelRealOrder(businessId, orderId, version, toCancelReasonCode(flow.payload?.reason ?? "other"), approval),
    flow.advance,
    onSuccess
  );

  if (!order) return null;

  if (flow.step === "form") {
    return (
      <Modal open onClose={onClose} title={t("orders.cancel.title")} className={FLOW_MODAL_CLASS} backdropClassName={FLOW_BACKDROP_CLASS}>
        <ScopeReasonForm
          scopeLabel={t("orders.cancel.scopeLabel")}
          scopeOptions={[
            { value: "entire", label: t("orders.cancel.scopeEntire") },
            { value: "specific", label: t("orders.cancel.scopeSpecific") },
          ]}
          reasonLabel={t("orders.cancel.reasonLabel")}
          reasonPlaceholder={t("orders.cancel.reasonPlaceholder")}
          reasonOptions={[
            { value: "wrongOrder", label: t("orders.cancel.reason.wrongOrder") },
            { value: "customerRequest", label: t("orders.cancel.reason.customerRequest") },
            { value: "outOfStock", label: t("orders.cancel.reason.outOfStock") },
            { value: "other", label: t("orders.cancel.reason.other") },
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
        accent={CONFIRM_ACCENT}
        promptKey="orders.managerAuth.prompt.cancel"
        confirmLabelKey="orders.managerAuth.confirm.cancel"
        errorText={errorText}
        submitting={submitting}
      />
    );
  }

  const now = new Date().toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <ResultModal
      open
      onClose={onClose}
      title={t("orders.result.cancelTitle")}
      subtitle={t("orders.result.cancelSubtitle").replace("{id}", order.id).replace("{date}", now)}
      artwork={<StampArt />}
      // The frame keeps its explanatory note box hidden, so no lines are passed.
      noteLines={[]}
      noteClassName=""
      primaryLabel={t("orders.result.done")}
      onPrimary={onClose}
    />
  );
}
