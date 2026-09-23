// apps/merchant/src/pages/orders-list/_shared/refund-order-flow.tsx
import { useEffect, useMemo, useState } from "react";
import { Banknote, Check, Clock, FileText, Info, Stamp, X } from "lucide-react";
import { Modal } from "@ui/primitives";
import { formatSar } from "@octopus/api-client";
import { useAuth } from "@/app/providers/auth-provider";
import { useI18n } from "@/app/providers/i18n-provider";
import { fetchOrderPayments, issueRealRefund, toRefundReasonCode } from "@/entities/order";
import { RefundForm, type RefundPayload } from "./refund-form";
import { PinConfirmModal } from "./pin-confirm-modal";
import { ResultModal } from "./result-modal";
import { useActionFlow } from "./action-flow";
import { useOrderActionConfirm } from "./use-order-action-confirm";
import { ACTION_THEME } from "./theme";
import { maxRefundableSar } from "./refund-amount";
import type { FlowStepKind } from "./action-flow-state";
import type { OrderRecord } from "./types";

const CASH_STEPS: readonly FlowStepKind[] = ["form", "pin", "result"];
const ONLINE_STEPS: readonly FlowStepKind[] = ["form", "pin", "processing", "pending", "result"];

/** The frames draw each refund outcome as one black line-art glyph with a
 *  small status badge clipped to its lower-right corner. */
function BadgedIcon({
  glyph,
  badge,
  badgeTone,
  filledBadge = true,
}: {
  glyph: React.ReactNode;
  badge: React.ReactNode;
  badgeTone: string;
  filledBadge?: boolean;
}) {
  return (
    <span className="relative inline-flex h-20 w-20 items-center justify-center">
      {glyph}
      <span
        className="absolute bottom-0 end-0 grid h-9 w-9 place-items-center rounded-full"
        style={
          filledBadge
            ? { backgroundColor: badgeTone, color: "#FFFFFF" }
            : { backgroundColor: "var(--octo-card)", border: `3px solid ${badgeTone}`, color: badgeTone }
        }
      >
        {badge}
      </span>
    </span>
  );
}

function RefundSuccessIcon() {
  return (
    <BadgedIcon
      glyph={<Stamp size={56} className="text-[var(--octo-text-primary)]" strokeWidth={1.9} />}
      badge={<Check size={18} strokeWidth={3.5} />}
      badgeTone="#22C55E"
      filledBadge={false}
    />
  );
}

function RefundFailedIcon() {
  return (
    <BadgedIcon
      glyph={<Banknote size={58} className="text-[var(--octo-text-primary)]" strokeWidth={1.9} />}
      badge={<X size={18} strokeWidth={3.5} />}
      badgeTone="#DC2626"
    />
  );
}

function RefundPendingIcon() {
  return (
    <BadgedIcon
      glyph={<FileText size={56} className="text-[var(--octo-text-primary)]" strokeWidth={1.9} />}
      badge={<Clock size={20} strokeWidth={2.5} />}
      badgeTone="#F59E0B"
      filledBadge={false}
    />
  );
}

/** The gateway frame's spinner is a ring of shrinking dots rather than an arc,
 *  so it is drawn here instead of reaching for a lucide glyph. */
function DotRingSpinner() {
  const dots = Array.from({ length: 8 }, (_, index) => index);

  return (
    <span className="relative inline-flex h-20 w-20 animate-spin items-center justify-center [animation-duration:1.1s]">
      {dots.map((index) => {
        const angle = (index / dots.length) * 2 * Math.PI;
        const size = 14 - index * 1.2;
        return (
          <span
            key={index}
            className="absolute rounded-full border-[3px] border-[var(--octo-text-primary)]"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              opacity: 1 - index * 0.1,
              transform: `translate(${Math.sin(angle) * 30}px, ${-Math.cos(angle) * 30}px)`,
            }}
          />
        );
      })}
    </span>
  );
}

function ProcessingStep({ amountSar }: { amountSar: number }) {
  const { t } = useI18n();
  return (
    <Modal open onClose={() => {}} className="max-w-[720px] text-center">
      <div className="mx-auto flex h-24 w-24 items-center justify-center">
        <DotRingSpinner />
      </div>
      <h2 className="mt-4 text-[22px] font-bold text-[var(--octo-text-primary)]">
        {t("orders.result.processingRefundTitle")}
      </h2>
      <p className="mt-2 text-[14px] text-[var(--octo-text-secondary)]">
        {t("orders.result.processingRefundSubtitle").replace("{amount}", formatSar(amountSar))}
      </p>
    </Modal>
  );
}

function PendingStep({ refundId }: { refundId: string }) {
  const { t } = useI18n();
  return (
    <Modal open onClose={() => {}} className="max-w-[720px] text-center">
      <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center">
        <RefundPendingIcon />
      </div>
      <h2 className="text-[22px] font-bold text-[var(--octo-text-primary)]">{t("orders.result.refundPendingTitle")}</h2>
      <p className="mt-2 text-[14px] text-[var(--octo-text-secondary)]">{t("orders.result.refundPendingSubtitle")}</p>
      <div className="mt-5 flex items-center gap-2 rounded-[10px] bg-[#FFFBEB] p-3.5 text-start text-[13.5px] text-[#B45309]">
        <Info size={16} className="shrink-0" />
        <span>{t("orders.result.refundPendingNote").replace("{refundId}", refundId)}</span>
        <span className="rounded-full bg-[var(--octo-card)] px-2.5 py-0.5 text-[12.5px] font-medium">
          {t("orders.result.refundPendingChip")}
        </span>
      </div>
    </Modal>
  );
}

// Pixel match for Refund Failed.png, kept as an exported-but-unused view: the
// design spec has no trigger for a decline, since this mock has no real
// payment gateway that could refuse one.
export function RefundFailedPreview({ amountSar, onRetry }: { amountSar: number; onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <ResultModal
      open
      onClose={onRetry}
      icon={<RefundFailedIcon />}
      title={t("orders.result.refundFailedTitle")}
      subtitle={t("orders.result.refundFailedSubtitle").replace("{amount}", formatSar(amountSar))}
      noteLines={[t("orders.result.refundFailedReason")]}
      noteClassName="bg-[#FEF2F2] text-[#B91C1C]"
      noteIcon={<Info size={16} />}
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
      <Modal open onClose={onClose} className="max-h-[88vh] max-w-[720px] overflow-y-auto">
        <h2 className="text-[22px] font-bold text-[var(--octo-text-primary)]">{t("orders.refund.title")}</h2>
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
        accent={accent}
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

  // Success.png and Success (1).png both close on dismissal — neither frame
  // carries a button of its own.
  if (isCash) {
    return (
      <ResultModal
        open
        onClose={onClose}
        icon={<RefundSuccessIcon />}
        title={t("orders.result.cashRefundTitle")}
        subtitle={t("orders.result.cashRefundSubtitle").replace("{amount}", formatSar(amountSar))}
        noteLines={[
          t("orders.result.cashRefundNote").replace("{refundId}", refundId).replace("{time}", now).replace("{type}", typeLabel),
        ]}
        noteClassName="bg-[#F0FDF4] text-[#15803D]"
        noteIcon={<Info size={16} />}
      />
    );
  }

  return (
    <ResultModal
      open
      onClose={onClose}
      icon={<RefundSuccessIcon />}
      title={t("orders.result.refundSuccessTitle")}
      subtitle={t("orders.result.refundSuccessSubtitle")
        .replace("{amount}", formatSar(amountSar))
        .replace("{method}", order.paymentMethod ?? "")}
      noteLines={[
        t("orders.result.refundSuccessNote").replace("{refundId}", refundId).replace("{time}", now).replace("{type}", typeLabel),
      ]}
      noteClassName="bg-[#F0FDF4] text-[#15803D]"
      noteIcon={<Info size={16} />}
    />
  );
}
