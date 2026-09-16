// apps/merchant/src/pages/orders-list/_shared/cancel-order-flow.tsx
import { Modal } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { ScopeReasonForm, type ScopeReasonPayload } from "./scope-reason-form";
import { PinConfirmModal } from "./pin-confirm-modal";
import { ResultModal } from "./result-modal";
import { useActionFlow } from "./action-flow";
import { ACTION_THEME } from "./theme";
import type { OrderRecord } from "./types";

export function CancelOrderFlow({ order, onClose }: { order: OrderRecord | null; onClose: () => void }) {
  const { t } = useI18n();
  const flow = useActionFlow<ScopeReasonPayload>(["form", "pin", "result"], order !== null);
  const accent = ACTION_THEME.cancel.accent;

  if (!order) return null;

  if (flow.step === "form") {
    return (
      <Modal open onClose={onClose} className="max-w-lg">
        <ScopeReasonForm
          title={t("orders.cancel.title")}
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
          accent={accent}
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
        onConfirm={flow.advance}
        accent={accent}
        promptKey="orders.managerAuth.prompt.cancel"
        confirmLabelKey="orders.managerAuth.confirm.cancel"
      />
    );
  }

  const now = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <ResultModal
      open
      onClose={onClose}
      title={t("orders.result.cancelTitle")}
      subtitle={t("orders.result.cancelSubtitle").replace("{id}", order.id).replace("{date}", now)}
      noteLines={[t("orders.result.cancelLine1"), t("orders.result.cancelLine2"), t("orders.result.cancelLine3")]}
      noteClassName="bg-[#FEF2F2] text-[#991B1B]"
      primaryLabel={t("orders.result.done")}
      onPrimary={onClose}
    />
  );
}
