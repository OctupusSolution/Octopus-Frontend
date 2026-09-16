// apps/merchant/src/pages/orders-list/_shared/wastage-order-flow.tsx
import { Modal } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { WastageForm, type WastagePayload } from "./wastage-form";
import { PinConfirmModal } from "./pin-confirm-modal";
import { ResultModal } from "./result-modal";
import { useActionFlow } from "./action-flow";
import { ACTION_THEME } from "./theme";
import type { OrderRecord } from "./types";

export function WastageOrderFlow({ order, onClose }: { order: OrderRecord | null; onClose: () => void }) {
  const { t } = useI18n();
  const flow = useActionFlow<WastagePayload>(["form", "pin", "result"], order !== null);
  const accent = ACTION_THEME.wastage.accent;

  if (!order) return null;

  if (flow.step === "form") {
    return (
      <Modal open onClose={onClose} className="max-w-lg">
        <WastageForm
          title={t("orders.wastage.title")}
          selectLabel={t("orders.wastage.selectLabel")}
          items={order.items}
          reasonPlaceholder={t("orders.wastage.reasonPlaceholder")}
          reasonOptions={[
            { value: "overcooked", label: t("orders.wastage.reason.overcooked") },
            { value: "dropped", label: t("orders.wastage.reason.dropped") },
            { value: "expired", label: t("orders.wastage.reason.expired") },
            { value: "other", label: t("orders.wastage.reason.other") },
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
        promptKey="orders.managerAuth.prompt.wastage"
        confirmLabelKey="orders.managerAuth.confirm.wastage"
      />
    );
  }

  const now = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <ResultModal
      open
      onClose={onClose}
      title={t("orders.result.wastageTitle")}
      subtitle={t("orders.result.wastageSubtitle").replace("{id}", order.id).replace("{date}", now)}
      noteLines={[t("orders.result.wastageLine1"), t("orders.result.wastageLine2")]}
      noteClassName="bg-[#F5F3FF] text-[#5B21B6]"
      primaryLabel={t("orders.result.done")}
      onPrimary={onClose}
    />
  );
}
