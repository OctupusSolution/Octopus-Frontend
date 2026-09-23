// apps/merchant/src/pages/orders-list/_shared/wastage-order-flow.tsx
import { Modal } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { recordWastageForOrder, toWastageReasonCode } from "@/entities/order";
import { WastageForm, type WastagePayload } from "./wastage-form";
import { PinConfirmModal } from "./pin-confirm-modal";
import { ResultModal } from "./result-modal";
import { useActionFlow } from "./action-flow";
import { useOrderActionConfirm } from "./use-order-action-confirm";
import { ACTION_THEME } from "./theme";
import type { OrderRecord } from "./types";

export function WastageOrderFlow({
  order,
  onClose,
  onSuccess,
}: {
  order: OrderRecord | null;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const { t } = useI18n();
  const flow = useActionFlow<WastagePayload>(["form", "pin", "result"], order !== null);
  const accent = ACTION_THEME.wastage.accent;
  const { confirm, submitting, errorText } = useOrderActionConfirm(
    order,
    (businessId, orderId, version, approval) => {
      // Matched by name against the same order's own items — real items
      // always carry a lineId (order-record-bridge.ts), so this only
      // fails to find one if the form somehow named an item the order
      // doesn't have, which the picker itself prevents.
      const items = (flow.payload?.items ?? []).flatMap((picked) => {
        const lineId = order?.items.find((item) => item.name === picked.name)?.lineId;
        return lineId ? [{ lineId, quantity: picked.qty }] : [];
      });
      return recordWastageForOrder(businessId, orderId, items, toWastageReasonCode(flow.payload?.reason ?? "other"), approval);
    },
    flow.advance,
    onSuccess
  );

  if (!order) return null;

  if (flow.step === "form") {
    return (
      <Modal open onClose={onClose} className="max-h-[88vh] max-w-[720px] overflow-y-auto">
        <WastageForm
          title={t("orders.wastage.title")}
          selectLabel={t("orders.wastage.selectLabel")}
          itemsPlaceholder={t("orders.wastage.itemsPlaceholder")}
          decrementLabel={t("orders.wastage.decrement")}
          incrementLabel={t("orders.wastage.increment")}
          items={order.items}
          reasonLabel={t("orders.wastage.reasonLabel")}
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
        accent={accent}
        promptKey="orders.managerAuth.prompt.wastage"
        confirmLabelKey="orders.managerAuth.confirm.wastage"
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
      title={t("orders.result.wastageTitle")}
      subtitle={t("orders.result.wastageSubtitle").replace("{id}", order.id).replace("{date}", now)}
      noteLines={[t("orders.result.wastageLine1"), t("orders.result.wastageLine2")]}
      noteClassName="bg-[#F5F3FF] text-[#5B21B6]"
      primaryLabel={t("orders.result.done")}
      onPrimary={onClose}
    />
  );
}
