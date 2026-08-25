// Step 10 — the plan, the methods, and a checkout that is honestly a demo.
// `simulatePayment` is a timer, not a gateway, and the page says so.
import { useState } from "react";
import { CheckCircle2, CreditCard, Info, Link2, Loader2 } from "lucide-react";
import clsx from "clsx";
import { Button, Modal } from "@ui/primitives";
import { computePrice, formatSar } from "@/shared/catalog";
import { useI18n } from "@/app/providers/i18n-provider";
import { INTEGRATIONS, integrationsTotal } from "../_shared/extras-catalog";
import { PAYMENT_METHODS, simulatePayment } from "../_shared/payment-catalog";
import { paymentLogo } from "../_shared/assets";
import { CreateAccountModal } from "./create-account-modal";
import type { StepProps } from "../_shared/steps";

const INCLUDES = [
  "onboarding.payment.includesDashboard",
  "onboarding.payment.includesModules",
  "onboarding.payment.includesPublicLink",
];

export function PaymentStep({ draft, dispatch, onFinish }: StepProps) {
  const { t, locale } = useI18n();
  const [accountOpen, setAccountOpen] = useState(!draft.accountCreated);
  const [processing, setProcessing] = useState(false);

  const price = computePrice(draft.enabled, draft.brand.branchCount);
  const connectors = integrationsTotal(draft.integrations);
  const total = price.total + connectors;
  const selectedIntegrations = INTEGRATIONS.filter((i) => draft.integrations.includes(i.id));

  async function handlePay() {
    if (!draft.paymentMethod) return;
    setProcessing(true);
    await simulatePayment();
    setProcessing(false);
    dispatch({ type: "paid" });
  }

  return (
    <div className="flex flex-col gap-3">
      <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[14px] font-bold text-[var(--octo-text-primary)]">{t("onboarding.payment.plan")}</p>
            <p className="mt-2 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
              {t("onboarding.payment.includes")}
            </p>
            <ul className="mt-1.5 flex flex-col gap-1">
              {INCLUDES.map((key) => (
                <li key={key} className="flex items-center gap-1.5 text-[11.5px] text-[var(--octo-text-secondary)]">
                  <CheckCircle2 size={12} className="text-[#0D6EFD]" />
                  {t(key)}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-[17px] font-bold text-[#0D6EFD]">
            {formatSar(price.total, locale)} <span className="text-[11px] font-normal text-[var(--octo-text-muted)]">{t("pricing.perMonth")}</span>
          </p>
        </div>
      </section>

      {selectedIntegrations.length > 0 && (
        <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
          <p className="text-[12px] font-bold text-[var(--octo-text-primary)]">{t("onboarding.review.integrations")}</p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {selectedIntegrations.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 text-[11.5px]">
                <span className="text-[var(--octo-text-secondary)]">{item.name}</span>
                <span className="font-medium text-[var(--octo-text-primary)]">{formatSar(item.priceSar, locale)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-hover)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[12px] font-bold text-[var(--octo-text-primary)]">{t("onboarding.review.total")}</p>
          <p className="text-[19px] font-bold text-[#0D6EFD]">{formatSar(total, locale)}</p>
        </div>
        <p className="mt-1.5 flex items-center gap-1.5 text-[10.5px] text-[var(--octo-text-muted)]">
          <Info size={11} />
          {t("onboarding.payment.renewNote")}
        </p>
      </section>

      <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
        <p className="text-[12.5px] font-bold text-[var(--octo-text-primary)]">{t("onboarding.payment.methods")}</p>
        <fieldset className="mt-3 flex flex-col gap-2">
          <legend className="sr-only">{t("onboarding.payment.methods")}</legend>
          {PAYMENT_METHODS.map((method) => {
            const active = draft.paymentMethod === method.id;
            return (
              <label
                key={method.id}
                className={clsx(
                  "flex cursor-pointer items-center gap-3 rounded-[10px] border px-3 py-2.5 text-start transition-colors",
                  "has-[:checked]:border-[#0D6EFD] has-[:checked]:bg-[var(--octo-selected)]",
                  "border-[var(--octo-border-input)] hover:bg-[var(--octo-hover)]"
                )}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={method.id}
                  checked={active}
                  onChange={() => dispatch({ type: "setPaymentMethod", id: method.id })}
                  className="peer sr-only"
                />
                {method.logo ? (
                  <img src={paymentLogo(method.logo)} alt="" className="h-5 w-10 shrink-0 object-contain" />
                ) : (
                  <CreditCard size={18} className="shrink-0 text-[var(--octo-text-muted)]" />
                )}
                <span className="flex-1 text-[12.5px] font-medium text-[var(--octo-text-primary)]">{t(method.labelKey)}</span>
                <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full border border-[var(--octo-border-input)] peer-checked:border-[#0D6EFD]">
                  {active && <span className="h-2 w-2 rounded-full bg-[#0D6EFD]" />}
                </span>
              </label>
            );
          })}
        </fieldset>

        <Button
          variant="primary"
          disabled={!draft.paymentMethod || processing}
          className="mt-4 w-full justify-center !py-3 !text-[13.5px]"
          onClick={handlePay}
        >
          {t("onboarding.payment.pay").replace("{amount}", formatSar(total, locale))}
        </Button>

        <p className="mt-2 flex items-center justify-center gap-1.5 text-[10.5px] text-[var(--octo-text-faint)]">
          <Info size={11} />
          {t("onboarding.payment.demoNote")}
        </p>
      </section>

      <CreateAccountModal
        open={accountOpen}
        account={draft.account}
        created={draft.accountCreated}
        onPatch={(patch) => dispatch({ type: "patchAccount", patch })}
        onCreate={() => dispatch({ type: "accountCreated" })}
        onContinue={() => setAccountOpen(false)}
      />

      <Modal open={processing} onClose={() => undefined}>
        <div className="flex flex-col items-center gap-3 px-2 py-6 text-center">
          <Loader2 size={34} className="animate-spin text-[#0D6EFD]" />
          <p className="text-[15px] font-bold text-[var(--octo-text-primary)]">{t("onboarding.payment.processing")}</p>
          <p className="text-[11.5px] text-[var(--octo-text-muted)]">{t("onboarding.payment.processingNote")}</p>
        </div>
      </Modal>

      <Modal open={draft.paid} onClose={() => undefined}>
        <div className="flex flex-col items-center gap-3 px-2 py-4 text-center">
          <CheckCircle2 size={40} className="text-[#22C55E]" />
          <p className="text-[17px] font-bold text-[var(--octo-text-primary)]">{t("onboarding.payment.success")}</p>
          <p className="max-w-[380px] text-[12px] leading-relaxed text-[var(--octo-text-muted)]">
            {t("onboarding.payment.successNote")}
          </p>
          <p className="inline-flex items-center gap-1.5 text-[11.5px] text-[#0D6EFD]">
            <Link2 size={12} />
            {`https://${draft.publicLink.tag || "restaurant"}.octopus.app`}
          </p>
          <Button variant="primary" className="mt-2 w-full justify-center !py-2.5" onClick={() => onFinish?.()}>
            {t("onboarding.payment.goToDashboard")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
