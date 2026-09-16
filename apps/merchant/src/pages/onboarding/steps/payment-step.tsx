// Step 6 — the plan, the methods, and a checkout that is honestly a demo.
// `simulatePayment` is a timer, not a gateway, and the page says so.
//
// No account gate: the merchant signed up before they ever reached the wizard
// (/signup creates the session, and the header shows it), so asking them to
// create an account again at checkout was asking twice for the same thing.
//
// This step renders its own Back/Pay row rather than using the wizard footer
// (`hideFooter` in steps.tsx): the frame's primary button is the payment
// itself, and both its amount and its disabled state come from state that
// lives here.
import { useState } from "react";
import { CircleCheck, CreditCard, TriangleAlert } from "lucide-react";
import clsx from "clsx";
import { Button, Modal } from "@ui/primitives";
import { formatSar } from "@/shared/catalog";
import { useI18n } from "@/app/providers/i18n-provider";
import { INTEGRATIONS } from "../_shared/extras-catalog";
import { priceFor } from "../_shared/pricing";
import { PAYMENT_METHODS, simulatePayment } from "../_shared/payment-catalog";
import {
  LOGO_URL, PAYMENT_SPINNER_URL, PAYMENT_STAMP_URL, integrationLogo, paymentLogo,
} from "../_shared/assets";
import type { StepProps } from "../_shared/steps";

const INCLUDES = [
  "onboarding.payment.includesDashboard",
  "onboarding.payment.includesModules",
  "onboarding.payment.includesPublicLink",
];

/** The blue rounded tile the plan and total cards are badged with. */
function CardBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="grid h-[54px] w-[54px] shrink-0 place-items-center rounded-[14px] bg-[#0D6EFD] text-white">
      {children}
    </span>
  );
}

function Price({ amount, locale, t }: { amount: number; locale: string; t: (key: string) => string }) {
  return (
    <p className="whitespace-nowrap text-[26px] font-bold leading-none text-[#0D6EFD]">
      {formatSar(amount, locale)}
      <span className="ms-1 text-[12px] font-medium text-[var(--octo-text-muted)]">{t("pricing.perMonth")}</span>
    </p>
  );
}

export function PaymentStep({ draft, dispatch, onFinish, finishLabelKey = "onboarding.payment.goToDashboard" }: StepProps) {
  const { t, locale } = useI18n();
  const [processing, setProcessing] = useState(false);

  // Same helper the price bar uses, so the two surfaces cannot drift apart.
  const price = priceFor(draft);
  const total = price.total;
  const selectedIntegrations = INTEGRATIONS.filter((i) => draft.integrations.includes(i.id));

  async function handlePay() {
    if (!draft.paymentMethod) return;
    setProcessing(true);
    await simulatePayment();
    setProcessing(false);
    dispatch({ type: "paid" });
  }

  const panel = "rounded-[16px] border border-[#0D6EFD]/50 bg-[#f2f7ff] p-6";
  const dialog = "!max-w-[750px] !rounded-[20px] !p-6";

  return (
    <div className="flex flex-col gap-4">
      <section className={panel}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <CardBadge>
              <img src={LOGO_URL} alt="" className="h-8 w-8 object-contain brightness-0 invert" />
            </CardBadge>
            <div>
              <h3 className="text-[21px] font-bold tracking-tight text-[var(--octo-text-primary)]">
                {t("onboarding.payment.plan")}
              </h3>
              <p className="mt-2 text-[13.5px] font-bold text-[var(--octo-text-primary)]">
                {t("onboarding.payment.includes")}
              </p>
              <ul className="mt-1.5 flex flex-col gap-1.5">
                {INCLUDES.map((key) => (
                  <li key={key} className="flex items-center gap-2 text-[13.5px] text-[var(--octo-text-secondary)]">
                    <CircleCheck size={16} strokeWidth={2} className="shrink-0 text-[#0D6EFD]" />
                    {t(key)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <Price amount={price.subscription} locale={locale} t={t} />
        </div>
      </section>

      {selectedIntegrations.length > 0 && (
        <section className={panel}>
          <h3 className="text-[15px] font-bold text-[var(--octo-text-primary)]">
            {t("onboarding.review.integrations")}
          </h3>
          <ul className="mt-4 flex flex-col gap-3.5">
            {selectedIntegrations.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-4">
                <span className="flex min-w-0 items-center gap-3">
                  {item.image && (
                    <img src={integrationLogo(item.image)} alt="" className="h-8 w-8 shrink-0 object-contain" />
                  )}
                  <span className="truncate text-[14px] text-[var(--octo-text-secondary)]">{item.name}</span>
                </span>
                <span className="whitespace-nowrap text-[15px] font-bold text-[var(--octo-text-primary)]">
                  {formatSar(item.priceSar, locale)}
                  <span className="ms-1 text-[11px] font-medium text-[var(--octo-text-muted)]">
                    {t("pricing.perMonth")}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={panel}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <CardBadge><CreditCard size={26} /></CardBadge>
            <h3 className="text-[21px] font-bold tracking-tight text-[var(--octo-text-primary)]">
              {t("onboarding.review.total")}
            </h3>
          </div>
          <Price amount={total} locale={locale} t={t} />
        </div>
        <p className="mt-4 flex items-center gap-2 rounded-[10px] bg-[var(--octo-warning-bg)] px-4 py-3 text-[14px] text-[#B45309]">
          <TriangleAlert size={17} className="shrink-0" />
          {t("onboarding.payment.renewNote")}
        </p>
      </section>

      <h2 className="mt-4 text-[26px] font-bold tracking-tight text-[var(--octo-text-primary)]">
        {t("onboarding.payment.methods")}
      </h2>

      <fieldset className="flex flex-col gap-3">
        <legend className="sr-only">{t("onboarding.payment.methods")}</legend>
        {PAYMENT_METHODS.map((method) => {
          const active = draft.paymentMethod === method.id;
          return (
            <label
              key={method.id}
              className={clsx(
                "flex cursor-pointer items-center gap-3.5 rounded-[12px] border px-5 py-4 text-start transition-colors",
                active
                  ? "border-[#0D6EFD] bg-[var(--octo-selected)]"
                  : "border-transparent bg-[#f4f4fb] hover:bg-[var(--octo-hover)]"
              )}
            >
              <input
                type="radio"
                name="paymentMethod"
                value={method.id}
                checked={active}
                onChange={() => dispatch({ type: "setPaymentMethod", id: method.id })}
                className="sr-only"
              />
              {method.logo ? (
                <img src={paymentLogo(method.logo)} alt="" className="h-5 w-9 shrink-0 object-contain" />
              ) : (
                <CreditCard size={20} className="shrink-0 text-[var(--octo-text-muted)]" />
              )}
              <span
                className={clsx(
                  "flex-1 text-[15px] font-bold",
                  active ? "text-[#0D6EFD]" : "text-[var(--octo-text-primary)]"
                )}
              >
                {t(method.labelKey)}
              </span>
              <span
                className={clsx(
                  "grid h-[19px] w-[19px] shrink-0 place-items-center rounded-full border-[1.5px]",
                  active ? "border-[#0D6EFD]" : "border-[var(--octo-crumb)]"
                )}
              >
                {active && <span className="h-[9px] w-[9px] rounded-full bg-[#0D6EFD]" />}
              </span>
            </label>
          );
        })}
      </fieldset>

      <div className="mt-2 grid gap-3" style={{ gridTemplateColumns: "minmax(0,2fr) minmax(0,3fr)" }}>
        <Button
          variant="secondary"
          onClick={() => dispatch({ type: "back" })}
          className="justify-center !py-3 !text-[13.5px] !font-semibold"
        >
          {t("onboarding.back")}
        </Button>
        <Button
          variant="primary"
          disabled={!draft.paymentMethod || processing}
          className="justify-center !py-3 !text-[13.5px] !font-semibold"
          onClick={handlePay}
        >
          {t("onboarding.payment.pay").replace("{amount}", formatSar(total, locale))}
        </Button>
      </div>

      {/* Neither dialog can be dismissed: the frames draw no close affordance,
          and there is nothing sensible to return to mid-payment or after it.
          Both are the frame's 750px-wide panel with the artwork drawn large. */}
      <Modal open={processing} onClose={() => undefined} className={dialog}>
        <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
          <img
            src={PAYMENT_SPINNER_URL}
            alt=""
            className="h-[150px] w-[150px] animate-spin object-contain [animation-duration:1.4s]"
          />
          <p className="mt-2 text-[28px] font-bold tracking-tight text-[var(--octo-text-primary)]">
            {t("onboarding.payment.processing")}
          </p>
          <p className="text-[16px] text-[var(--octo-text-muted)]">{t("onboarding.payment.processingNote")}</p>
        </div>
      </Modal>

      {/* The success dialog is the "Go Live" moment the frame draws: its one
          button provisions the business and opens the dashboard directly,
          rather than sending the merchant on to another screen first. */}
      <Modal open={draft.paid} onClose={() => undefined} className={dialog}>
        <div className="flex flex-col items-center gap-3 px-4 py-6 text-center">
          <img src={PAYMENT_STAMP_URL} alt="" className="h-[150px] w-[150px] object-contain" />
          <p className="mt-2 text-[28px] font-bold tracking-tight text-[var(--octo-text-primary)]">
            {t("onboarding.payment.success")}
          </p>
          <p className="max-w-[640px] text-[16px] leading-relaxed text-[var(--octo-text-muted)]">
            {t("onboarding.payment.successNote")}
          </p>
          <Button
            variant="primary"
            className="mt-3 w-full justify-center !py-3.5 !text-[15px] !font-semibold"
            onClick={onFinish}
          >
            {t(finishLabelKey)}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
