// apps/merchant/src/pages/orders-list/_shared/record-payment-flow.tsx
//
// BACKEND_GAPS.md 6b.18: `recordCashTender` has been wired to the real Order
// API since 2026-09-21, but no screen ever called it — every design frame
// this page was built from covers Cancel/Void/Wastage/Refund only, none of
// them "take a payment". This is a new, undesigned flow: a minimal amount
// form + result, built to this page's own shared pieces (FieldLabel,
// PrimaryButton, ResultModal) rather than a bespoke look.
import { useEffect, useState } from "react";
import { Banknote, Check } from "lucide-react";
import { Input, Modal } from "@ui/primitives";
import { formatSar } from "@octopus/api-client";
import { useAuth } from "@/app/providers/auth-provider";
import { useI18n } from "@/app/providers/i18n-provider";
import { recordCashTender } from "@/entities/order";
import { FieldLabel, PrimaryButton } from "./form-bits";
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
    <Modal open onClose={onClose} className="max-w-[520px]">
      <h2 className="text-[22px] font-bold text-[var(--octo-text-primary)]">{t("orders.payment.title")}</h2>
      <p className="mt-1.5 text-[13.5px] text-[var(--octo-text-secondary)]">{t("orders.payment.subtitle")}</p>

      <div className="mt-5">
        <FieldLabel>{t("orders.payment.amountLabel")}</FieldLabel>
        <Input
          type="number"
          min={0}
          max={max}
          step="0.01"
          value={amountInput}
          onChange={(e) => setAmountInput(e.target.value)}
          placeholder={t("orders.payment.amountPlaceholder")}
        />
        <p className="mt-1.5 text-[12px] text-[var(--octo-text-muted)]">
          {t("orders.payment.maxAmount").replace("{amount}", formatSar(max))}
        </p>
      </div>

      {errorText && <p className="mt-3 text-[13px] text-[#DC2626]">{errorText}</p>}

      <PrimaryButton
        label={submitting ? t("orders.payment.recording") : t("orders.payment.confirm")}
        disabled={!canSubmit}
        onClick={submit}
        className="mt-6"
      />
    </Modal>
  );
}
