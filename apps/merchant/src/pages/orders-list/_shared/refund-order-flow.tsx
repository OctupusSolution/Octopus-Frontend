// apps/merchant/src/pages/orders-list/_shared/refund-order-flow.tsx
import { useMemo } from "react";
import { Banknote, Check, FileClock, Info, Loader2, Stamp, X } from "lucide-react";
import { Modal } from "@ui/primitives";
import { formatSar } from "@octopus/api-client";
import { useI18n } from "@/app/providers/i18n-provider";
import { RefundForm, type RefundPayload } from "./refund-form";
import { PinConfirmModal } from "./pin-confirm-modal";
import { ResultModal } from "./result-modal";
import { useActionFlow } from "./action-flow";
import { ACTION_THEME } from "./theme";
import { maxRefundableSar } from "./refund-amount";
import type { FlowStepKind } from "./action-flow-state";
import type { OrderRecord } from "./types";

const CASH_STEPS: readonly FlowStepKind[] = ["form", "pin", "result"];
const ONLINE_STEPS: readonly FlowStepKind[] = ["form", "pin", "processing", "pending", "result"];

function StampBadgeIcon({ tone }: { tone: "success" | "failed" }) {
  const Icon = tone === "success" ? Stamp : Banknote;
  const BadgeIcon = tone === "success" ? Check : X;
  const badgeColor = tone === "success" ? "#16A34A" : "#DC2626";
  return (
    <span className="relative inline-flex h-14 w-14 items-center justify-center">
      <Icon size={48} className="text-[var(--octo-text-primary)]" strokeWidth={1.75} />
      <span
        className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full text-white"
        style={{ backgroundColor: badgeColor }}
      >
        <BadgeIcon size={13} strokeWidth={3} />
      </span>
    </span>
  );
}

function ProcessingStep({ amountSar }: { amountSar: number }) {
  const { t } = useI18n();
  return (
    <Modal open onClose={() => {}} className="max-w-md text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center">
        <Loader2 size={40} className="animate-spin text-[var(--octo-text-secondary)]" />
      </div>
      <h2 className="mt-2 text-[19px] font-bold text-[var(--octo-text-primary)]">{t("orders.result.processingRefundTitle")}</h2>
      <p className="mt-2 text-[13px] text-[var(--octo-text-secondary)]">
        {t("orders.result.processingRefundSubtitle").replace("{amount}", formatSar(amountSar))}
      </p>
    </Modal>
  );
}

function PendingStep({ refundId }: { refundId: string }) {
  const { t } = useI18n();
  return (
    <Modal open onClose={() => {}} className="max-w-md text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center text-[#D97706]">
        <FileClock size={44} strokeWidth={1.75} />
      </div>
      <h2 className="mt-2 text-[19px] font-bold text-[var(--octo-text-primary)]">{t("orders.result.refundPendingTitle")}</h2>
      <p className="mt-2 text-[13px] text-[var(--octo-text-secondary)]">{t("orders.result.refundPendingSubtitle")}</p>
      <div className="mt-4 flex items-start gap-1.5 rounded-[10px] bg-[#FFFBEB] p-3 text-start text-[12.5px] text-[#92400E]">
        <Info size={14} className="mt-px shrink-0" />
        <span>{t("orders.result.refundPendingNote").replace("{refundId}", refundId)}</span>
      </div>
    </Modal>
  );
}

// Pixel match for Refund Failed.png, kept as an exported-but-unused view —
// see the Task 12 note in the plan for why nothing currently calls this.
export function RefundFailedPreview({ amountSar, onRetry }: { amountSar: number; onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <ResultModal
      open
      onClose={onRetry}
      icon={<StampBadgeIcon tone="failed" />}
      title={t("orders.result.refundFailedTitle")}
      subtitle={t("orders.result.refundFailedSubtitle").replace("{amount}", formatSar(amountSar))}
      noteLines={[t("orders.result.refundFailedReason")]}
      noteClassName="bg-[#FEF2F2] text-[#991B1B]"
      primaryLabel={t("orders.result.tryAgain")}
      onPrimary={onRetry}
    />
  );
}

export function RefundOrderFlow({ order, onClose }: { order: OrderRecord | null; onClose: () => void }) {
  const { t } = useI18n();
  const isCash = order?.payment === "Paid Cash";
  const isUnpaid = order?.payment === "Unpaid";
  const steps = isCash ? CASH_STEPS : ONLINE_STEPS;
  const flow = useActionFlow<RefundPayload>(steps, order !== null && !isUnpaid);
  const accent = ACTION_THEME.refund.accent;

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
      <Modal open onClose={onClose} className="max-w-lg">
        <h2 className="text-[17px] font-bold text-[var(--octo-text-primary)]">{t("orders.refund.title")}</h2>
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
        promptKey="orders.managerAuth.prompt.refund"
        confirmLabelKey="orders.managerAuth.confirm.refund"
      />
    );
  }

  const amountSar = flow.payload?.amountSar ?? maxRefundableSar(order);
  const typeLabel = flow.payload?.type === "partial" ? t("orders.refund.typePartial") : t("orders.refund.typeFull");
  const now = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  if (flow.step === "processing") return <ProcessingStep amountSar={amountSar} />;
  if (flow.step === "pending") return <PendingStep refundId={refundId} />;

  if (isCash) {
    return (
      <ResultModal
        open
        onClose={onClose}
        icon={<StampBadgeIcon tone="success" />}
        title={t("orders.result.cashRefundTitle")}
        subtitle={t("orders.result.cashRefundSubtitle").replace("{amount}", formatSar(amountSar))}
        noteLines={[
          t("orders.result.cashRefundNote").replace("{refundId}", refundId).replace("{time}", now).replace("{type}", typeLabel),
        ]}
        noteClassName="bg-[#F0FDF4] text-[#166534]"
        noteIcon={<Info size={14} />}
        primaryLabel={t("orders.result.done")}
        onPrimary={onClose}
      />
    );
  }

  return (
    <ResultModal
      open
      onClose={onClose}
      icon={<StampBadgeIcon tone="success" />}
      title={t("orders.result.refundSuccessTitle")}
      subtitle={t("orders.result.refundSuccessSubtitle")
        .replace("{amount}", formatSar(amountSar))
        .replace("{method}", order.paymentMethod ?? "")}
      noteLines={[
        t("orders.result.refundSuccessNote").replace("{refundId}", refundId).replace("{time}", now).replace("{type}", typeLabel),
      ]}
      noteClassName="bg-[#F0FDF4] text-[#166534]"
      noteIcon={<Info size={14} />}
      primaryLabel={t("orders.result.done")}
      onPrimary={onClose}
    />
  );
}
