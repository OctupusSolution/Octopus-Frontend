// apps/merchant/src/pages/orders-list/_shared/record-payment-flow.tsx
//
// BACKEND_GAPS.md 6b.18: `recordCashTender` has been wired to the real Order
// API since 2026-09-21, but no screen ever called it — every design frame
// this page was built from covers Cancel/Void/Wastage/Refund only, none of
// them "take a payment". This is a new, undesigned flow: a minimal amount
// form + result, dressed in the Refund frames' controls (it is the cash
// refund form's mirror image) rather than a bespoke look.
import { useEffect, useState } from "react";
import { Banknote, Check } from "lucide-react";
import { Modal } from "@ui/primitives";
import { formatSar } from "@octopus/api-client";
import { useAuth } from "@/app/providers/auth-provider";
import { useI18n } from "@/app/providers/i18n-provider";
import { recordCashTender } from "@/entities/order";
import {
  REFUND_BACKDROP_CLASS,
  REFUND_INPUT_CLASS,
  REFUND_MODAL_CLASS,
  REFUND_SUBMIT_CLASS,
  RefundFieldLabel,
  RefundSummaryBar,
} from "./refund-controls";
import { clampAmountSar, maxRefundableSar } from "./refund-amount";
import { ResultModal } from "./result-modal";
import type { OrderRecord } from "./types";

type Step = "form" | "result";

// `recordCashTender`'s failure message is either a backend-supplied detail
// (shown verbatim) or one of our own i18n keys — same convention
// use-order-action-confirm.ts uses for Cancel/Void/Wastage/Refund.
const KNOWN_KEYS = ["orders.error.notSignedIn", "orders.error.actionFailed"];

export function RecordPaymentFlow({
  order,
  onClose,
  onSuccess,
}: {
  order: OrderRecord | null;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const { t } = useI18n();
  const { activeBusinessId } = useAuth();
  const [step, setStep] = useState<Step>("form");
  const [amountInput, setAmountInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const max = order ? maxRefundableSar(order) : 0;
  const isFullyPaid = order?.payment === "Paid Online" || order?.payment === "Paid Cash";

  useEffect(() => {
    if (order) {
      setStep("form");
      setAmountInput(max ? String(max) : "");
      setErrorText(null);
    }
  }, [order?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!order) return null;

  if (isFullyPaid) {
    return (
      <ResultModal
        open
        onClose={onClose}
        title={t("orders.payment.title")}
        subtitle={t("orders.payment.alreadyPaid")}
        noteLines={[]}
        noteClassName=""
        primaryLabel={t("orders.result.done")}
        onPrimary={onClose}
      />
    );
  }

  const amountSar = clampAmountSar(amountInput, max);
  const canSubmit = amountSar > 0 && !submitting;

  async function submit() {
    if (!order) return;
    if (!order.real) {
      // A seeded/live row has no real payment to record against — same
      // walk-through-the-design behavior the other flows keep for those.
      setStep("result");
      onSuccess?.();
      return;
    }
    if (!activeBusinessId) {
      setErrorText(t("orders.error.notSignedIn"));
      return;
    }
    setSubmitting(true);
    setErrorText(null);
    const result = await recordCashTender(activeBusinessId, order.real.orderId, amountSar);
    setSubmitting(false);
    if (result.ok) {
      onSuccess?.();
      setStep("result");
    } else {
      setErrorText(KNOWN_KEYS.includes(result.message) ? t(result.message) : result.message);
    }
  }

  if (step === "result") {
    return (
      <ResultModal
        open
        onClose={onClose}
        icon={
          <span className="relative inline-flex h-20 w-20 items-center justify-center">
            <Banknote size={56} className="text-[var(--octo-text-primary)]" strokeWidth={1.9} />
            <span className="absolute bottom-0 end-0 grid h-9 w-9 place-items-center rounded-full bg-[#22C55E] text-white">
              <Check size={18} strokeWidth={3.5} />
            </span>
          </span>
        }
        title={t("orders.payment.recordedTitle")}
        subtitle={t("orders.payment.recordedSubtitle").replace("{amount}", formatSar(amountSar))}
        noteLines={[]}
        noteClassName=""
        primaryLabel={t("orders.result.done")}
        onPrimary={onClose}
      />
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t("orders.payment.title")}
      // The subtitle sits 12px under the title, closer than a form section.
      className={`${REFUND_MODAL_CLASS} [&>h2+div]:!mt-3`}
      backdropClassName={REFUND_BACKDROP_CLASS}
    >
      <div className="flex flex-col gap-6">
        <p className="text-[14px] font-medium leading-[1.3] text-[var(--octo-text-secondary)]">
          {t("orders.payment.subtitle")}
        </p>

        <div className="flex flex-col gap-3">
          <RefundSummaryBar
            label={t("orders.payment.maxAmount").replace("{amount}", "").trim()}
            value={formatSar(max)}
            strongLabel
          />
          <div className="flex flex-col gap-2">
            <RefundFieldLabel>{t("orders.payment.amountLabel")}</RefundFieldLabel>
            <input
              className={REFUND_INPUT_CLASS}
              type="number"
              min={0}
              max={max}
              step="0.01"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              placeholder={t("orders.payment.amountPlaceholder")}
              aria-label={t("orders.payment.amountLabel")}
            />
          </div>
        </div>

        {errorText && <p className="-mt-3 text-[14px] font-medium leading-[1.3] text-[#d30202]">{errorText}</p>}

        <button type="button" disabled={!canSubmit} onClick={submit} className={REFUND_SUBMIT_CLASS}>
          {submitting ? t("orders.payment.recording") : t("orders.payment.confirm")}
        </button>
      </div>
    </Modal>
  );
}
