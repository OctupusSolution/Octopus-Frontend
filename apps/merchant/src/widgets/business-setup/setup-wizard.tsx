// The "create a business" wizard, driven by the backend's own catalog and its
// BusinessSetup resource (see use-business-setup.ts) — not by the local
// twelve-type / fourteen-module catalog in shared/catalog, which is a different
// taxonomy from what the platform can actually provision (FRONTEND_INTEGRATION_
// GAPS.md 2.2). Six steps:
//
//   type -> variant -> name -> modules -> add-ons -> review & pay
//
// Each step's Continue saves that step to the server (PUT .../business-type,
// etc.), so what the merchant sees on the review step — quote included — is
// what the backend will actually charge. Paying starts checkout, settles it
// (dev: the Fake gateway) and then waits for the Worker to provision the
// tenant, which is asynchronous: the setup only becomes `Completed`, and gains
// its businessId, once the provisioning saga has run.
//
// Also: entry resumes an unfinished setup (GET /v1/business-setups?status=open)
// with a "welcome back" banner; the merchant can cancel the setup and start
// over (POST .../cancel, after a confirm); the modules and add-ons steps show a
// live, debounced price (POST /v1/onboarding/quote-previews) for the unsaved
// selection; and stepping back from a checkout in progress returns the setup to
// Draft (POST .../checkout/cancel) so it can be edited again.
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import clsx from "clsx";
import { CircleCheck, CreditCard, History, Loader2, Lock, Puzzle, Scissors, Store, TriangleAlert, UtensilsCrossed, X } from "lucide-react";
import {
  ApiError,
  type AddOnSelection,
  type BusinessSetupResponse,
  type LocalizedText,
  type QuoteResponse,
  type SetupIssueResponse,
  type VariantOfferingsResponse,
} from "@octopus/api-client";
import { Button, Input, Modal } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { StepRail } from "@/pages/onboarding/_shared/step-rail";
import { PAYMENT_SPINNER_URL, PAYMENT_STAMP_URL } from "@/pages/onboarding/_shared/assets";
import {
  describeError,
  useBusinessSetup,
  useBusinessTypes,
  useBusinessVariants,
  useQuotePreview,
  useVariantOfferings,
  type BusinessSetupApi,
  type Loadable,
  type QuotePreviewState,
} from "./use-business-setup";
import { issueCopyKey, useSetupCopy } from "./copy";

const STEPS = [
  { id: "type", labelKey: "setup.rail.type", titleKey: "setup.type.title", subtitleKey: "setup.type.subtitle" },
  { id: "variant", labelKey: "setup.rail.variant", titleKey: "setup.variant.title", subtitleKey: "setup.variant.subtitle" },
  { id: "name", labelKey: "setup.rail.name", titleKey: "setup.name.title", subtitleKey: "setup.name.subtitle" },
  { id: "modules", labelKey: "setup.rail.modules", titleKey: "setup.modules.title", subtitleKey: "setup.modules.subtitle" },
  { id: "addons", labelKey: "setup.rail.addons", titleKey: "setup.addons.title", subtitleKey: "setup.addons.subtitle" },
  { id: "payment", labelKey: "setup.rail.payment", titleKey: "setup.payment.title", subtitleKey: "setup.payment.subtitle" },
] as const;

const LAST = STEPS.length - 1;
const NAME_MAX = 100;
const PROVISIONING_TIMEOUT_MS = 120_000;
const POLL_MS = 2_000;

// ---- small helpers ------------------------------------------------------------

function pick(text: LocalizedText | null | undefined, locale: string): string {
  if (!text) return "";
  return (locale === "ar" ? text.ar || text.en : text.en || text.ar) ?? "";
}

/** Money on the wire is an integer in the currency's minor unit (halalas). */
function formatMinor(amountMinor: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", {
    style: "currency",
    currency,
    numberingSystem: "latn",
  }).format(amountMinor / 100);
}

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

function TypeIcon({ code, size = 22 }: { code: string; size?: number }) {
  if (code === "restaurant") return <UtensilsCrossed size={size} />;
  if (code === "salon") return <Scissors size={size} />;
  return <Store size={size} />;
}

/** Loading / error frame shared by every step that reads the catalog. */
function CatalogGate<T>({ source, children }: { source: Loadable<T>; children: (data: T) => ReactNode }) {
  const { t } = useI18n();
  if (source.error) {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/5 px-4 py-3 text-[13.5px] text-[#DC2626]">
        <span>{t("setup.error.load")}</span>
        <button type="button" onClick={source.reload} className="font-semibold underline underline-offset-2">
          {t("setup.retry")}
        </button>
      </div>
    );
  }
  if (source.loading || !source.data) {
    return (
      <p className="flex items-center gap-2 text-[14px] text-[var(--octo-text-muted)]">
        <Loader2 size={16} className="animate-spin" />
        {t("setup.loading")}
      </p>
    );
  }
  return <>{children(source.data)}</>;
}

/** Issues carry a code, not a message — render the known ones in words. */
function IssueText({ issue }: { issue: SetupIssueResponse }) {
  const copy = useSetupCopy();
  const key = issueCopyKey(issue.code);
  const item = issue.providerCode ?? issue.itemCode;
  if (!key) return <>{item ? `${issue.code} (${item})` : issue.code}</>;
  return <>{copy(key).replace("{item}", item ? ` (${item})` : "")}</>;
}

const CARD_BASE = "flex flex-col items-start rounded-[14px] border p-5 text-start transition-all duration-200";
const cardState = (active: boolean) =>
  active
    ? "border-[#0D6EFD] bg-[var(--octo-selected)]"
    : "border-[var(--octo-border-input)] bg-[var(--octo-card)] hover:border-[#c7d9f8] hover:shadow-[0_4px_14px_rgba(15,23,42,0.06)]";

// ---- steps ------------------------------------------------------------------------

function TypeStep({ selected, onSelect }: { selected: string | null; onSelect: (code: string) => void }) {
  const { locale } = useI18n();
  const types = useBusinessTypes();
  return (
    <CatalogGate source={types}>
      {(items) => (
        <div className="grid grid-cols-1 gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
          {items.map((type) => (
            <button
              key={type.code}
              type="button"
              onClick={() => onSelect(type.code)}
              aria-pressed={selected === type.code}
              className={clsx(CARD_BASE, cardState(selected === type.code))}
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#0D6EFD]/10 text-[#0D6EFD]">
                <TypeIcon code={type.code} />
              </span>
              <h3 className="mt-4 text-[17px] font-bold leading-tight tracking-tight text-[var(--octo-text-primary)]">
                {pick(type.name, locale)}
              </h3>
              {type.description && (
                <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--octo-text-muted)]">{pick(type.description, locale)}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </CatalogGate>
  );
}

function VariantStep({
  typeCode,
  selected,
  onSelect,
}: {
  typeCode: string;
  selected: string | null;
  onSelect: (code: string) => void;
}) {
  const { locale } = useI18n();
  const variants = useBusinessVariants(typeCode);
  return (
    <CatalogGate source={variants}>
      {(items) => (
        <div className="grid grid-cols-1 gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
          {items.map((variant) => (
            <button
              key={variant.code}
              type="button"
              onClick={() => onSelect(variant.code)}
              aria-pressed={selected === variant.code}
              className={clsx(CARD_BASE, cardState(selected === variant.code))}
            >
              <h3 className="text-[17px] font-bold leading-tight tracking-tight text-[var(--octo-text-primary)]">
                {pick(variant.name, locale)}
              </h3>
              {variant.description && (
                <p className="mb-4 mt-2 text-[12.5px] leading-relaxed text-[var(--octo-text-muted)]">
                  {pick(variant.description, locale)}
                </p>
              )}
              {variant.fitHint && (
                <p className="mt-auto flex w-full items-start gap-2 rounded-[10px] bg-[var(--octo-selected)] px-3 py-2.5 text-[12.5px] font-semibold leading-snug text-[#0D6EFD]">
                  <CircleCheck size={16} strokeWidth={2} className="mt-px shrink-0" />
                  <span>{pick(variant.fitHint, locale)}</span>
                </p>
              )}
            </button>
          ))}
        </div>
      )}
    </CatalogGate>
  );
}

function NameStep({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { t } = useI18n();
  return (
    <div className="max-w-[520px]">
      <Input
        label={t("setup.name.label")}
        placeholder={t("setup.name.placeholder")}
        value={value}
        maxLength={NAME_MAX}
        autoFocus
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="mt-2 text-[12px] text-[var(--octo-text-muted)]">{t("setup.name.hint")}</p>
    </div>
  );
}

/** Enabling a module pulls in what it requires; disabling one drops whatever
 *  required it — same rule the old wizard applied to its local catalog, now
 *  driven by the offering's own `requiredModuleCodes`. */
function toggleModule(offerings: VariantOfferingsResponse, selected: string[], code: string, on: boolean): string[] {
  const byCode = new Map(offerings.modules.map((m) => [m.moduleCode, m]));
  const next = new Set(selected);
  if (on) {
    const add = (c: string) => {
      const m = byCode.get(c);
      if (!m || m.inclusion === "Mandatory" || next.has(c)) return;
      next.add(c);
      m.requiredModuleCodes.forEach(add);
    };
    add(code);
  } else {
    const drop = (c: string) => {
      if (!next.delete(c)) return;
      offerings.modules.filter((m) => m.requiredModuleCodes.includes(c)).forEach((m) => drop(m.moduleCode));
    };
    drop(code);
  }
  return [...next];
}

function ModulesStep({
  variantCode,
  selected,
  onChange,
}: {
  variantCode: string;
  selected: string[];
  onChange: (codes: string[]) => void;
}) {
  const { t, locale } = useI18n();
  const offerings = useVariantOfferings(variantCode);
  return (
    <CatalogGate source={offerings}>
      {(data) => (
        <div className="flex flex-col gap-3">
          {[...data.modules].sort((a, b) => a.sortOrder - b.sortOrder).map((module) => {
            const mandatory = module.inclusion === "Mandatory";
            const on = mandatory || selected.includes(module.moduleCode);
            const priced = module.pricingMode === "Priced" && module.amountMinor !== null;
            return (
              <label
                key={module.moduleCode}
                className={clsx(
                  "flex items-center gap-4 rounded-[14px] border px-5 py-4 transition-colors",
                  mandatory ? "cursor-default" : "cursor-pointer",
                  on ? "border-[#0D6EFD] bg-[var(--octo-selected)]" : "border-[var(--octo-border-input)] bg-[var(--octo-card)]"
                )}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0D6EFD]/10 text-[#0D6EFD]">
                  <Puzzle size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-bold text-[var(--octo-text-primary)]">{pick(module.name, locale)}</span>
                  {module.description && (
                    <span className="mt-0.5 block text-[12.5px] text-[var(--octo-text-muted)]">{pick(module.description, locale)}</span>
                  )}
                  {module.requiredModuleCodes.length > 0 && (
                    <span className="mt-1 block text-[11.5px] text-[var(--octo-text-muted)]">
                      {t("setup.modules.requires").replace(
                        "{names}",
                        module.requiredModuleCodes
                          .map((c) => pick(data.modules.find((m) => m.moduleCode === c)?.name, locale) || c)
                          .join(", ")
                      )}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-end text-[13px] font-semibold text-[var(--octo-text-secondary)]">
                  {mandatory ? (
                    <span className="inline-flex items-center gap-1.5 text-[var(--octo-text-muted)]">
                      <Lock size={13} /> {t("setup.modules.included")}
                    </span>
                  ) : priced ? (
                    <>
                      {formatMinor(module.amountMinor as number, data.currency, locale)}
                      <span className="ms-1 text-[11px] font-medium text-[var(--octo-text-muted)]">{t("pricing.perMonth")}</span>
                    </>
                  ) : (
                    t("setup.modules.included")
                  )}
                </span>
                <input
                  type="checkbox"
                  checked={on}
                  disabled={mandatory}
                  onChange={(e) => onChange(toggleModule(data, selected, module.moduleCode, e.target.checked))}
                  className="h-[18px] w-[18px] shrink-0 accent-[#0D6EFD]"
                  aria-label={pick(module.name, locale)}
                />
              </label>
            );
          })}
        </div>
      )}
    </CatalogGate>
  );
}

const addOnKey = (a: AddOnSelection) => `${a.categoryCode}:${a.providerCode}`;

function AddOnsStep({
  variantCode,
  effectiveModules,
  selected,
  onChange,
}: {
  variantCode: string;
  effectiveModules: Set<string>;
  selected: AddOnSelection[];
  onChange: (next: AddOnSelection[]) => void;
}) {
  const { t, locale } = useI18n();
  const offerings = useVariantOfferings(variantCode);
  return (
    <CatalogGate source={offerings}>
      {(data) => {
        const categories = data.integrationCategories.filter((c) => c.addOns.length > 0);
        if (categories.length === 0) {
          return <p className="rounded-xl bg-[var(--octo-shell)] px-4 py-3 text-[13.5px] text-[var(--octo-text-muted)]">{t("setup.addons.none")}</p>;
        }
        return (
          <div className="flex flex-col gap-6">
            {[...categories].sort((a, b) => a.sortOrder - b.sortOrder).map((category) => (
              <section key={category.categoryCode}>
                <h3 className="text-[15px] font-bold text-[var(--octo-text-primary)]">{pick(category.name, locale)}</h3>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {[...category.addOns].sort((a, b) => a.sortOrder - b.sortOrder).map((addOn) => {
                    const selection = { categoryCode: category.categoryCode, providerCode: addOn.providerCode };
                    const on = selected.some((s) => addOnKey(s) === addOnKey(selection));
                    const blocked = addOn.requiredModuleCode !== null && !effectiveModules.has(addOn.requiredModuleCode);
                    return (
                      <label
                        key={addOn.providerCode}
                        className={clsx(
                          "flex items-center gap-3 rounded-[12px] border px-4 py-3 transition-colors",
                          blocked ? "cursor-not-allowed opacity-55" : "cursor-pointer",
                          on ? "border-[#0D6EFD] bg-[var(--octo-selected)]" : "border-[var(--octo-border-input)] bg-[var(--octo-card)]"
                        )}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-[14px] font-bold text-[var(--octo-text-primary)]">{pick(addOn.name, locale)}</span>
                          {blocked && (
                            <span className="block text-[11.5px] text-[var(--octo-text-muted)]">
                              {t("setup.addons.requiresModule").replace("{code}", addOn.requiredModuleCode as string)}
                            </span>
                          )}
                        </span>
                        {addOn.pricingMode === "Priced" && addOn.amountMinor !== null && (
                          <span className="shrink-0 text-[13px] font-semibold text-[var(--octo-text-secondary)]">
                            {formatMinor(addOn.amountMinor, data.currency, locale)}
                          </span>
                        )}
                        <input
                          type="checkbox"
                          checked={on}
                          disabled={blocked}
                          onChange={(e) =>
                            onChange(
                              e.target.checked
                                ? [...selected, selection]
                                : selected.filter((s) => addOnKey(s) !== addOnKey(selection))
                            )
                          }
                          className="h-[18px] w-[18px] shrink-0 accent-[#0D6EFD]"
                          aria-label={pick(addOn.name, locale)}
                        />
                      </label>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        );
      }}
    </CatalogGate>
  );
}

type PaymentPhase = "idle" | "paying" | "provisioning" | "done";

function QuoteCard({
  quote,
  names,
  locale,
}: {
  quote: QuoteResponse;
  names: Map<string, LocalizedText>;
  locale: string;
}) {
  const { t } = useI18n();
  const money = (n: number) => formatMinor(n, quote.currency, locale);
  const panel = "rounded-[16px] border border-[#0D6EFD]/50 bg-[#f2f7ff] p-6";
  return (
    <section className={panel}>
      <ul className="flex flex-col gap-3">
        {quote.lines.map((line) => (
          <li key={`${line.kind}:${line.categoryCode ?? ""}:${line.itemCode}`} className="flex items-center justify-between gap-4">
            <span className="min-w-0 truncate text-[14px] text-[var(--octo-text-secondary)]">
              {pick(names.get(line.itemCode), locale) || line.itemCode}
              {line.group === "Plan" && <span className="ms-2 text-[11.5px] text-[var(--octo-text-muted)]">{t("setup.payment.plan")}</span>}
            </span>
            <span className="whitespace-nowrap text-[15px] font-bold text-[var(--octo-text-primary)]">{money(line.amountMinor)}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-5 flex flex-col gap-2 border-t border-[#0D6EFD]/20 pt-4 text-[14px]">
        <div className="flex justify-between text-[var(--octo-text-secondary)]">
          <dt>{t("setup.payment.subtotal")}</dt>
          <dd>{money(quote.subtotalMinor)}</dd>
        </div>
        <div className="flex justify-between text-[var(--octo-text-secondary)]">
          <dt>{t("setup.payment.tax").replace("{rate}", String(quote.taxRateBasisPoints / 100))}</dt>
          <dd>{money(quote.taxMinor)}</dd>
        </div>
        <div className="flex items-end justify-between pt-2">
          <dt className="text-[18px] font-bold text-[var(--octo-text-primary)]">{t("setup.payment.total")}</dt>
          <dd className="whitespace-nowrap text-[26px] font-bold leading-none text-[#0D6EFD]">
            {money(quote.totalMinor)}
            <span className="ms-1 text-[12px] font-medium text-[var(--octo-text-muted)]">{t("pricing.perMonth")}</span>
          </dd>
        </div>
      </dl>
    </section>
  );
}

function PaymentStep({
  api,
  variantCode,
  onBack,
  onFinish,
  finishLabelKey,
}: {
  api: BusinessSetupApi;
  variantCode: string;
  onBack: () => void;
  onFinish: (businessId: string) => void;
  finishLabelKey: string;
}) {
  const { t, locale } = useI18n();
  const copy = useSetupCopy();
  const setup = api.setup as BusinessSetupResponse;
  const offerings = useVariantOfferings(variantCode);
  const [steppingBack, setSteppingBack] = useState(false);
  const variants = useBusinessVariants(setup.businessTypeCode);
  const [phase, setPhase] = useState<PaymentPhase>(setup.status === "Completed" ? "done" : "idle");
  const [error, setError] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(setup.provisioning?.businessId ?? null);

  // Display names for the quote's item codes: the plan is the variant, the
  // rest are modules and add-on providers from the offering.
  const names = useMemo(() => {
    const map = new Map<string, LocalizedText>();
    variants.data?.forEach((v) => map.set(v.code, v.name));
    offerings.data?.modules.forEach((m) => map.set(m.moduleCode, m.name));
    offerings.data?.integrationCategories.forEach((c) => c.addOns.forEach((a) => map.set(a.providerCode, a.name)));
    return map;
  }, [variants.data, offerings.data]);

  async function pay() {
    setError(null);
    setPhase("paying");
    try {
      // Both calls are safe to repeat (checkout is idempotent while awaiting
      // payment), so a merchant who reloads mid-way simply re-enters here.
      let current = api.setup as BusinessSetupResponse;
      if (current.status === "Draft") current = await api.startCheckout();
      if (current.status === "AwaitingPayment" && !current.allowedActions.includes("Checkout")) {
        // Verified at the provider but not applied yet: confirm applies it.
        if (current.allowedActions.includes("ConfirmPayment")) current = await api.confirmPayment();
      } else if (current.status === "AwaitingPayment") {
        const payment = current.payment;
        if (payment?.redirectUrl) {
          window.location.assign(payment.redirectUrl);
          return;
        }
        // Only the dev Fake gateway can be settled from here; a real provider's
        // client SDK / return route is not built yet (Moyasar is untested
        // backend-side), so say so instead of pretending to pay.
        if (payment?.clientParameters?.provider !== "fake") throw new Error("payment.provider-unsupported");
        current = await api.confirmPayment();
      }
      setPhase("provisioning");
      const deadline = Date.now() + PROVISIONING_TIMEOUT_MS;
      while (current.status !== "Completed") {
        if (Date.now() > deadline) throw new Error("setup.provisioning-timeout");
        await sleep(POLL_MS);
        current = await api.refresh();
      }
      setBusinessId(current.provisioning?.businessId ?? null);
      setPhase("done");
    } catch (err) {
      setPhase("idle");
      setError(
        err instanceof Error && err.message === "setup.provisioning-timeout"
          ? t("setup.error.timeout")
          : err instanceof Error && err.message === "payment.provider-unsupported"
            ? t("setup.error.provider")
            : describeError(err, t("setup.error.payment"))
      );
    }
  }

  // A checkout in progress freezes the setup: to edit again it must first be
  // stepped back to Draft. Paid/Completed setups have nowhere to go back to.
  const awaiting = setup.status === "AwaitingPayment";
  const canGoBack = setup.status === "Draft" || (awaiting && setup.allowedActions.includes("CancelCheckout"));

  async function back() {
    if (!awaiting) {
      onBack();
      return;
    }
    setError(null);
    setSteppingBack(true);
    try {
      await api.cancelCheckout();
      onBack();
    } catch (err) {
      if (err instanceof ApiError && err.problem?.errorCode === "onboarding.checkout.already-paid") {
        // The provider settled it first: the setup is now Paid. Reload so Pay
        // continues into provisioning instead of retrying the payment.
        await api.refresh().catch(() => undefined);
        setError(copy("checkout.alreadyPaid"));
      } else {
        setError(describeError(err, copy("checkout.cancelFailed")));
      }
    } finally {
      setSteppingBack(false);
    }
  }

  const quote = setup.quote;
  const dialog = "!max-w-[750px] !rounded-[20px] !p-6";
  const busy = phase === "paying" || phase === "provisioning";
  // Drive Pay from allowedActions rather than canCheckout, which is only ever
  // true for a Draft — a resumed AwaitingPayment / Paid setup must still be
  // able to carry on.
  const canPay =
    setup.status === "Paid" ||
    setup.allowedActions.includes("Checkout") ||
    setup.allowedActions.includes("ConfirmPayment");

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-[16px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-5">
        <dl className="grid gap-3 text-[14px] sm:grid-cols-2">
          <div>
            <dt className="text-[12px] text-[var(--octo-text-muted)]">{t("setup.name.label")}</dt>
            <dd className="font-semibold text-[var(--octo-text-primary)]">{setup.businessName}</dd>
          </div>
          <div>
            <dt className="text-[12px] text-[var(--octo-text-muted)]">{t("setup.rail.variant")}</dt>
            <dd className="font-semibold text-[var(--octo-text-primary)]">
              {pick(variants.data?.find((v) => v.code === setup.businessVariantCode)?.name, locale) || setup.businessVariantCode}
            </dd>
          </div>
        </dl>
      </section>

      {setup.issues.length > 0 && (
        <ul role="alert" className="flex flex-col gap-1.5 rounded-xl border border-[#F59E0B]/40 bg-[#F59E0B]/10 px-4 py-3 text-[13.5px] text-[#B45309]">
          {setup.issues.map((issue) => (
            <li key={issue.code} className="flex items-start gap-2">
              <TriangleAlert size={16} className="mt-0.5 shrink-0" />
              <span>
                <IssueText issue={issue} />
              </span>
            </li>
          ))}
        </ul>
      )}

      {awaiting && setup.allowedActions.includes("CancelCheckout") && (
        <p className="rounded-xl border border-[#0D6EFD]/30 bg-[#f2f7ff] px-4 py-3 text-[13.5px] text-[var(--octo-text-secondary)]">
          {copy("checkout.awaiting")}
        </p>
      )}

      {quote ? (
        <QuoteCard quote={quote} names={names} locale={locale} />
      ) : (
        <p className="text-[13.5px] text-[var(--octo-text-muted)]">{t("setup.payment.noQuote")}</p>
      )}

      {error && (
        <p role="alert" className="rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/5 px-4 py-3 text-[13.5px] text-[#DC2626]">
          {error}
        </p>
      )}

      <div className="mt-2 grid gap-3" style={{ gridTemplateColumns: "minmax(0,2fr) minmax(0,3fr)" }}>
        <Button
          variant="secondary"
          onClick={() => void back()}
          disabled={busy || steppingBack || !canGoBack}
          className="justify-center !py-3 !text-[13.5px] !font-semibold"
        >
          {steppingBack && <Loader2 size={15} className="me-2 animate-spin" />}
          {awaiting ? copy("checkout.backToEdit") : t("onboarding.back")}
        </Button>
        <Button
          variant="primary"
          disabled={!canPay || busy || steppingBack}
          onClick={() => void pay()}
          className="justify-center !py-3 !text-[13.5px] !font-semibold"
        >
          <CreditCard size={16} className="me-2" />
          {quote ? t("setup.payment.pay").replace("{amount}", formatMinor(quote.totalMinor, quote.currency, locale)) : t("setup.payment.payNoAmount")}
        </Button>
      </div>

      {/* Neither dialog can be dismissed: there is nothing sensible to return
          to mid-payment, and after it the only way on is into the business. */}
      <Modal open={busy} onClose={() => undefined} className={dialog}>
        <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
          <img src={PAYMENT_SPINNER_URL} alt="" className="h-[150px] w-[150px] animate-spin object-contain [animation-duration:1.4s]" />
          <p className="mt-2 text-[28px] font-bold tracking-tight text-[var(--octo-text-primary)]">
            {t(phase === "provisioning" ? "setup.provisioning.title" : "onboarding.payment.processing")}
          </p>
          <p className="text-[16px] text-[var(--octo-text-muted)]">
            {t(phase === "provisioning" ? "setup.provisioning.note" : "onboarding.payment.processingNote")}
          </p>
        </div>
      </Modal>

      <Modal open={phase === "done"} onClose={() => undefined} className={dialog}>
        <div className="flex flex-col items-center gap-3 px-4 py-6 text-center">
          <img src={PAYMENT_STAMP_URL} alt="" className="h-[150px] w-[150px] object-contain" />
          <p className="mt-2 text-[28px] font-bold tracking-tight text-[var(--octo-text-primary)]">{t("onboarding.payment.success")}</p>
          <p className="max-w-[640px] text-[16px] leading-relaxed text-[var(--octo-text-muted)]">{t("setup.success.note")}</p>
          <Button
            variant="primary"
            disabled={!businessId}
            className="mt-3 w-full justify-center !py-3.5 !text-[15px] !font-semibold"
            onClick={() => businessId && onFinish(businessId)}
          >
            {t(finishLabelKey)}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

// ---- resume / cancel / live price ------------------------------------------------

function ResumeBanner({
  businessName,
  updatedAtUtc,
  canStartOver,
  onStartOver,
  onDismiss,
}: {
  businessName: string | null;
  updatedAtUtc: string;
  canStartOver: boolean;
  onStartOver: () => void;
  onDismiss: () => void;
}) {
  const { locale } = useI18n();
  const copy = useSetupCopy();
  const when = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    numberingSystem: "latn",
  }).format(new Date(updatedAtUtc));
  return (
    <div className="mb-6 flex flex-wrap items-start gap-3 rounded-xl border border-[#0D6EFD]/30 bg-[#f2f7ff] px-4 py-3">
      <History size={16} className="mt-0.5 shrink-0 text-[#0D6EFD]" />
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-semibold text-[var(--octo-text-primary)]">{copy("resume.title")}</p>
        <p className="mt-0.5 text-[12.5px] text-[var(--octo-text-muted)]">
          {copy("resume.note")
            .replace("{name}", businessName ? ` — “${businessName}”` : "")
            .replace("{when}", when)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {canStartOver && (
          <Button variant="ghost" onClick={onStartOver} className="!text-[12.5px] !font-semibold text-[#0D6EFD]">
            {copy("resume.startOver")}
          </Button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          aria-label={copy("resume.dismiss")}
          className="grid h-7 w-7 place-items-center rounded-lg text-[var(--octo-text-muted)] hover:bg-[var(--octo-hover)]"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}

function LivePriceBar({ preview, locale }: { preview: QuotePreviewState; locale: string }) {
  const { t } = useI18n();
  const copy = useSetupCopy();
  const { quote, loading, issues, error } = preview;
  let note: ReactNode;
  if (loading) note = copy("live.updating");
  else if (issues.length > 0)
    note = (
      <span className="text-[#B45309]">
        {copy("live.invalid")}: <IssueText issue={issues[0]} />
      </span>
    );
  else if (error) note = <span className="text-[#DC2626]">{copy("live.failed")}</span>;
  else if (quote) note = copy("live.vat").replace("{rate}", String(quote.taxRateBasisPoints / 100));
  else note = copy("live.updating");

  return (
    <div
      aria-live="polite"
      className="mb-3 flex items-center justify-between gap-4 rounded-[12px] border border-[#0D6EFD]/40 bg-[#f2f7ff] px-4 py-2.5"
    >
      <div className="min-w-0">
        <span className="block text-[12.5px] font-semibold text-[var(--octo-text-secondary)]">{copy("live.label")}</span>
        <span className="block truncate text-[11.5px] text-[var(--octo-text-muted)]">{note}</span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {loading && <Loader2 size={14} className="animate-spin text-[#0D6EFD]" />}
        {quote && !error ? (
          <span className={clsx("whitespace-nowrap text-[20px] font-bold leading-none text-[#0D6EFD] transition-opacity", loading && "opacity-60")}>
            {formatMinor(quote.totalMinor, quote.currency, locale)}
            <span className="ms-1 text-[11px] font-medium text-[var(--octo-text-muted)]">{t("pricing.perMonth")}</span>
          </span>
        ) : (
          <span className="text-[20px] font-bold leading-none text-[var(--octo-text-muted)]">—</span>
        )}
      </div>
    </div>
  );
}

// ---- the wizard --------------------------------------------------------------------

export interface SetupWizardProps {
  /** Header above the rail (logo, language, avatar). */
  chrome?: ReactNode;
  containerClassName?: string;
  /** Called with the new business's id once it is Active and the merchant
   *  chose to enter it. The host decides where that goes. */
  onFinish: (businessId: string) => void | Promise<void>;
  finishLabelKey?: string;
}

/** The step to resume at, from how far the server-side setup already got. */
function resumeStep(setup: BusinessSetupResponse): number {
  if (setup.status !== "Draft") return LAST;
  if (!setup.businessTypeCode) return 0;
  if (!setup.businessVariantCode) return 1;
  if (!setup.businessName) return 2;
  return 3;
}

export function SetupWizard({
  chrome,
  containerClassName,
  onFinish,
  finishLabelKey = "onboarding.payment.goToDashboard",
}: SetupWizardProps) {
  const { t, locale } = useI18n();
  const copy = useSetupCopy();
  const api = useBusinessSetup();
  const { setup } = api;

  const [step, setStep] = useState(0);
  const [typeCode, setTypeCode] = useState<string | null>(null);
  const [variantCode, setVariantCode] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [modules, setModules] = useState<string[]>([]);
  const [addOns, setAddOns] = useState<AddOnSelection[]>([]);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Hydrate the local selections from the server copy once per setup: when the
  // (possibly resumed) setup first arrives, and again after "start over"
  // swaps in a fresh one.
  const hydratedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!setup || hydratedFor.current === setup.setupId) return;
    hydratedFor.current = setup.setupId;
    setTypeCode(setup.businessTypeCode);
    setVariantCode(setup.businessVariantCode);
    setName(setup.businessName ?? "");
    setModules(setup.selectedModuleCodes);
    setAddOns(setup.selectedAddOns);
    setStep(resumeStep(setup));
  }, [setup]);

  const current = STEPS[step];

  function canContinue(): boolean {
    switch (current.id) {
      case "type":
        return typeCode !== null;
      case "variant":
        return variantCode !== null;
      case "name":
        // Backend rule (BusinessName): trimmed, 2-100 characters.
        return name.trim().length >= 2;
      default:
        return true;
    }
  }

  async function goNext() {
    if (!setup || saving) return;
    setSaving(true);
    setActionError(null);
    try {
      // Only write what changed: PUT-ing an identical value would bump the
      // setup's version for nothing.
      if (current.id === "type" && typeCode && typeCode !== setup.businessTypeCode) await api.saveType(typeCode);
      if (current.id === "variant" && variantCode && variantCode !== setup.businessVariantCode) await api.saveVariant(variantCode);
      if (current.id === "name" && name.trim() !== (setup.businessName ?? "")) await api.saveName(name.trim());
      if (current.id === "modules") await api.saveModules(modules);
      if (current.id === "addons") await api.saveAddOns(addOns);
      setStep((s) => Math.min(LAST, s + 1));
    } catch (err) {
      setActionError(describeError(err, t("setup.error.save")));
    } finally {
      setSaving(false);
    }
  }

  function onSelectType(code: string) {
    if (code === typeCode) return;
    setTypeCode(code);
    // A different type invalidates everything chosen beneath it.
    setVariantCode(null);
    setModules([]);
    setAddOns([]);
  }

  function onSelectVariant(code: string) {
    if (code === variantCode) return;
    setVariantCode(code);
    setModules([]);
    setAddOns([]);
  }

  const offerings = useVariantOfferings(step >= 3 ? variantCode : null);
  const effectiveModules = useMemo(() => {
    const set = new Set(modules);
    offerings.data?.modules.filter((m) => m.inclusion === "Mandatory").forEach((m) => set.add(m.moduleCode));
    return set;
  }, [modules, offerings.data]);

  // Live price for the unsaved selection, on the two steps that change it.
  // Add-ons the current modules can't carry are left out, so unticking a
  // module shows the price of what would actually be saved rather than a 422.
  const livePricing = (current.id === "modules" || current.id === "addons") && offerings.data !== null;
  const previewAddOns = useMemo(() => {
    const data = offerings.data;
    if (!data) return [];
    return addOns.filter((a) => {
      const offer = data.integrationCategories
        .find((c) => c.categoryCode === a.categoryCode)
        ?.addOns.find((p) => p.providerCode === a.providerCode);
      return offer !== undefined && (offer.requiredModuleCode === null || effectiveModules.has(offer.requiredModuleCode));
    });
  }, [addOns, offerings.data, effectiveModules]);
  const preview = useQuotePreview(livePricing ? variantCode : null, modules, previewAddOns);

  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  async function cancelAndRestart() {
    setCancelling(true);
    setCancelError(null);
    try {
      await api.cancelAndRestart();
      // The hydration effect resets every selection from the fresh setup.
      setActionError(null);
      setConfirmCancel(false);
    } catch (err) {
      setCancelError(describeError(err, copy("cancel.failed")));
    } finally {
      setCancelling(false);
    }
  }

  const labelKeys = STEPS.map((s) => s.labelKey);

  let body: ReactNode = null;
  if (api.state === "loading") {
    body = (
      <p className="flex items-center gap-2 text-[14px] text-[var(--octo-text-muted)]">
        <Loader2 size={16} className="animate-spin" />
        {t("setup.loading")}
      </p>
    );
  } else if (api.state === "error" || !setup) {
    body = (
      <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/5 px-4 py-3 text-[13.5px] text-[#DC2626]">
        <span>{t("setup.error.start")}</span>
        <button type="button" onClick={api.retry} className="font-semibold underline underline-offset-2">
          {t("setup.retry")}
        </button>
      </div>
    );
  } else {
    switch (current.id) {
      case "type":
        body = <TypeStep selected={typeCode} onSelect={onSelectType} />;
        break;
      case "variant":
        body = typeCode ? <VariantStep typeCode={typeCode} selected={variantCode} onSelect={onSelectVariant} /> : null;
        break;
      case "name":
        body = <NameStep value={name} onChange={setName} />;
        break;
      case "modules":
        body = variantCode ? <ModulesStep variantCode={variantCode} selected={modules} onChange={setModules} /> : null;
        break;
      case "addons":
        body = variantCode ? (
          <AddOnsStep variantCode={variantCode} effectiveModules={effectiveModules} selected={addOns} onChange={setAddOns} />
        ) : null;
        break;
      case "payment":
        body = variantCode ? (
          <PaymentStep
            api={api}
            variantCode={variantCode}
            onBack={() => setStep(LAST - 1)}
            onFinish={(id) => void onFinish(id)}
            finishLabelKey={finishLabelKey}
          />
        ) : null;
        break;
    }
  }

  const ready = api.state === "ready" && Boolean(setup);
  const canCancelSetup = ready && Boolean(setup?.allowedActions.includes("CancelSetup")) && !saving;
  const hasProgress = Boolean(setup?.businessTypeCode || setup?.businessName || typeCode);

  return (
    // Light-only, like every Setup frame: re-declaring the light palette here
    // beats the dark one on <html> for this subtree alone.
    <div
      data-theme="light"
      style={{ "--octo-page-bg": "#f7f8fa" } as CSSProperties}
      className={clsx("flex flex-col", containerClassName)}
    >
      {chrome}

      <main className="mx-auto w-full max-w-[1248px] flex-1 px-6 py-8">
        <div className="mb-10">
          <StepRail step={step + 1} labelKeys={labelKeys} />
        </div>

        {ready && setup && api.resumed && (
          <ResumeBanner
            businessName={api.resumed.businessName}
            updatedAtUtc={api.resumed.updatedAtUtc}
            canStartOver={canCancelSetup}
            onStartOver={() => setConfirmCancel(true)}
            onDismiss={api.dismissResumed}
          />
        )}

        <div className="flex items-center justify-between gap-3">
          <span className="block text-[12px] font-medium text-[var(--octo-text-muted)]">
            {t("onboarding.step").replace("{n}", String(step + 1)).replace("{total}", String(STEPS.length))}
          </span>
          {canCancelSetup && hasProgress && (
            <button
              type="button"
              onClick={() => setConfirmCancel(true)}
              className="text-[12px] font-medium text-[var(--octo-text-muted)] underline-offset-2 hover:text-[#DC2626] hover:underline"
            >
              {copy("cancel.link")}
            </button>
          )}
        </div>
        <h1 className="mt-2 text-[30px] font-bold leading-[1.1] tracking-tight text-[var(--octo-text-primary)] sm:text-[38px]">
          {t(current.titleKey)}
        </h1>
        <p className="mt-3 max-w-[640px] text-[14px] leading-relaxed text-[var(--octo-text-muted)]">{t(current.subtitleKey)}</p>

        <div className="mt-8">{body}</div>

        {actionError && (
          <p role="alert" className="mt-6 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/5 px-4 py-3 text-[13.5px] text-[#DC2626]">
            {actionError}
          </p>
        )}
      </main>

      {ready && current.id !== "payment" && (
        <div className="sticky bottom-0 bg-[var(--octo-page-bg)]/95 backdrop-blur">
          <div className="mx-auto max-w-[1248px] px-6 py-4">
            {livePricing && <LivePriceBar preview={preview} locale={locale} />}
            <div className="grid w-full gap-3" style={{ gridTemplateColumns: step > 0 ? "minmax(0,2fr) minmax(0,3fr)" : "minmax(0,1fr)" }}>
              {step > 0 && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setActionError(null);
                    setStep((s) => Math.max(0, s - 1));
                  }}
                  disabled={saving}
                  className="justify-center !py-3 !text-[13.5px] !font-semibold"
                >
                  {t("onboarding.back")}
                </Button>
              )}
              <Button
                variant="primary"
                disabled={!canContinue() || saving}
                onClick={() => void goNext()}
                className="justify-center !py-3 !text-[13.5px] !font-semibold"
              >
                {saving && <Loader2 size={15} className="me-2 animate-spin" />}
                {t("onboarding.next")}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Modal
        open={confirmCancel}
        onClose={() => !cancelling && setConfirmCancel(false)}
        title={copy("cancel.title")}
        className="!max-w-[460px]"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmCancel(false)} disabled={cancelling}>
              {copy("cancel.keep")}
            </Button>
            <Button variant="danger" onClick={() => void cancelAndRestart()} disabled={cancelling}>
              {cancelling && <Loader2 size={14} className="me-2 animate-spin" />}
              {copy("cancel.confirm")}
            </Button>
          </>
        }
      >
        <p className="text-[12.5px] leading-relaxed text-[var(--octo-text-secondary)]">{copy("cancel.body")}</p>
        {cancelError && (
          <p role="alert" className="mt-3 rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/5 px-3 py-2 text-[12.5px] text-[#DC2626]">
            {cancelError}
          </p>
        )}
      </Modal>
    </div>
  );
}
