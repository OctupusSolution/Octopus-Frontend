// apps/merchant/src/pages/orders-list/_shared/void-order-flow.tsx
import { Modal } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { ScopeReasonForm, type ScopeReasonPayload } from "./scope-reason-form";
import { PinConfirmModal } from "./pin-confirm-modal";
import { ResultModal } from "./result-modal";
import { useActionFlow } from "./action-flow";
import { ACTION_THEME } from "./theme";
import type { OrderRecord } from "./types";

export function VoidOrderFlow({ order, onClose }: { order: OrderRecord | null; onClose: () => void }) {
  const { t } = useI18n();
  const flow = useActionFlow<ScopeReasonPayload>(["form", "pin", "result"], order !== null);
  const accent = ACTION_THEME.void.accent;

  if (!order) return null;

  if (flow.step === "form") {
    return (
      <Modal open onClose={onClose} className="max-w-lg">
        <ScopeReasonForm
          title={t("orders.void.title")}
          // No orders.void.scopeLabel key exists in i18n — this form
          // intentionally reuses cancel's scope-label wording since both
          // flows share the same "entire vs specific" radio choice.
          scopeLabel={t("orders.cancel.scopeLabel")}
          scopeOptions={[
            { value: "entire", label: t("orders.void.scopeEntire") },
            { value: "specific", label: t("orders.void.scopeSpecific") },
          ]}
          reasonLabel={t("orders.void.reasonLabel")}
          reasonPlaceholder={t("orders.void.reasonPlaceholder")}
          reasonOptions={[
            { value: "wrongInput", label: t("orders.void.reason.wrongInput") },
            { value: "duplicate", label: t("orders.void.reason.duplicate") },
            { value: "testOrder", label: t("orders.void.reason.testOrder") },
            { value: "other", label: t("orders.void.reason.other") },
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
        promptKey="orders.managerAuth.prompt.void"
        confirmLabelKey="orders.managerAuth.confirm.void"
      />
    );
  }

  const now = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <ResultModal
      open
      onClose={onClose}
      title={t("orders.result.voidTitle")}
      subtitle={t("orders.result.voidSubtitle").replace("{id}", order.id).replace("{date}", now)}
      noteLines={[t("orders.result.voidLine1"), t("orders.result.voidLine2")]}
      noteClassName="bg-[#FFFBEB] text-[#92400E]"
      primaryLabel={t("orders.result.done")}
      onPrimary={onClose}
    />
  );
}
