import { useState } from "react";
import { Badge, Button, Input, Select } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { CircleCheck, CircleDashed, FileCheck2, ReceiptText, RefreshCw, Save, X } from "lucide-react";
import clsx from "clsx";
import {
  vatProfile, taxRates, zatcaStatus, zatcaChecklist, invoiceSettings,
  type TaxRateType, type FilingFrequency,
} from "@/shared/api/mock-settings-tax";
import { isValidCrNumber, isValidVatNumber } from "@/shared/api/mock-settings-business";

const RATE_KEY: Record<TaxRateType, string> = {
  Standard: "settings.tax.rateType.standard",
  "Zero Rated": "settings.tax.rateType.zero",
  Exempt: "settings.tax.rateType.exempt",
  "Reverse Charge": "settings.tax.rateType.reverse",
};

const APPLIES_KEY: Record<string, string> = {
  "All goods and services": "settings.tax.applies.all",
  "Exports, international transport": "settings.tax.applies.exports",
  "Financial services, residential rent": "settings.tax.applies.financial",
  "Import and supply chain B2B": "settings.tax.applies.b2b",
};

const RATE_TONE: Record<TaxRateType, "info" | "success" | "neutral" | "warning"> = {
  Standard: "info",
  "Zero Rated": "success",
  Exempt: "neutral",
  "Reverse Charge": "warning",
};

const STEP_KEY: Record<string, string> = {
  "Register on Fatoora portal": "settings.tax.step.register",
  "Install e-invoicing solution": "settings.tax.step.install",
  "Issue compliant invoices": "settings.tax.step.issue",
  "Submit to ZATCA portal": "settings.tax.step.submit",
};

const STEP_DESC_KEY: Record<string, string> = {
  "Register on Fatoora portal": "settings.tax.stepDesc.register",
  "Install e-invoicing solution": "settings.tax.stepDesc.install",
  "Issue compliant invoices": "settings.tax.stepDesc.issue",
  "Submit to ZATCA portal": "settings.tax.stepDesc.submit",
};

const RATE_TEXT: Record<string, string> = {
  Exempt: "settings.tax.rateType.exempt",
};

const TYPE_KEY: Record<string, string> = {
  Standard: "settings.tax.type.standard",
  Simplified: "settings.tax.type.simplified",
  Both: "settings.tax.type.both",
};

const CLEARANCE_KEY: Record<string, string> = {
  Clearance: "settings.tax.clearance.mode",
  Reporting: "settings.tax.clearance.reporting",
};

function Switch({
  checked, onChange, label, disabled, dir,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
  dir: "ltr" | "rtl";
}) {
  return (
    <label className={clsx("inline-flex items-center gap-2.5", disabled && "cursor-not-allowed opacity-50")}>
      <span
        className={clsx(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
          checked ? "bg-[#0D6EFD]" : "bg-[var(--octo-switch-off)]"
        )}
      >
        <input type="checkbox" className="sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
        <span
          className={clsx(
            "inline-block h-4 w-4 transform rounded-full bg-[var(--octo-knob)] shadow transition-transform",
            checked
              ? dir === "rtl" ? "-translate-x-[18px]" : "translate-x-[18px]"
              : dir === "rtl" ? "-translate-x-[2px]" : "translate-x-[2px]"
          )}
        />
      </span>
      <span className="text-[12.5px] text-[var(--octo-text-primary)]">{label}</span>
    </label>
  );
}

export function TaxSettingsPage() {
  const { t, dir } = useI18n();
  const [vat, setVat] = useState(vatProfile.vatNumber);
  const [cr, setCr] = useState(vatProfile.crNumber);
  const [defaultRate, setDefaultRate] = useState(vatProfile.defaultVatRate);
  const [simplified, setSimplified] = useState(vatProfile.simplifiedEnabled);
  const [standard, setStandard] = useState(vatProfile.standardEnabled);
  const [zeroRated, setZeroRated] = useState(vatProfile.zeroRatedEnabled);
  const [exempt, setExempt] = useState(vatProfile.exemptEnabled);
  const [digitalOnly, setDigitalOnly] = useState(vatProfile.vatOnDigitalOnly);
  const [prefix, setPrefix] = useState(invoiceSettings.prefix);
  const [startNumber, setStartNumber] = useState(String(invoiceSettings.startNumber));
  const [termsDays, setTermsDays] = useState(String(invoiceSettings.termsDays));
  const [filingFrequency, setFilingFrequency] = useState<FilingFrequency>(invoiceSettings.filingFrequency);
  const [errors, setErrors] = useState<{ vat?: string; cr?: string; start?: string }>({});
  const [toast, setToast] = useState<string | null>(null);

  const expiryDate = new Date(`${zatcaStatus.csidExpiry}T00:00:00`);
  const daysLeft = Math.max(0, Math.ceil((expiryDate.getTime() - Date.now()) / 86_400_000));
  const expiryLabel = new Intl.DateTimeFormat(dir === "rtl" ? "ar" : "en-GB", {
    day: "numeric", month: "short", year: "numeric", calendar: "gregory",
  }).format(expiryDate);

  const dirty =
    vat !== vatProfile.vatNumber ||
    cr !== vatProfile.crNumber ||
    defaultRate !== vatProfile.defaultVatRate ||
    simplified !== vatProfile.simplifiedEnabled ||
    standard !== vatProfile.standardEnabled ||
    zeroRated !== vatProfile.zeroRatedEnabled ||
    exempt !== vatProfile.exemptEnabled ||
    digitalOnly !== vatProfile.vatOnDigitalOnly ||
    prefix !== invoiceSettings.prefix ||
    startNumber !== String(invoiceSettings.startNumber) ||
    termsDays !== String(invoiceSettings.termsDays) ||
    filingFrequency !== invoiceSettings.filingFrequency;

  function onSave() {
    const next: { vat?: string; cr?: string; start?: string } = {};
    if (!isValidVatNumber(vat)) next.vat = t("settings.business.err.vat");
    if (!isValidCrNumber(cr)) next.cr = t("settings.business.err.cr");
    const start = Number(startNumber);
    if (!Number.isInteger(start) || start <= 0) next.start = t("settings.tax.startInvalid");
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setToast(t("settings.tax.saved"));
    window.setTimeout(() => setToast(null), 2200);
  }

  function onDiscard() {
    setVat(vatProfile.vatNumber);
    setCr(vatProfile.crNumber);
    setDefaultRate(vatProfile.defaultVatRate);
    setSimplified(vatProfile.simplifiedEnabled);
    setStandard(vatProfile.standardEnabled);
    setZeroRated(vatProfile.zeroRatedEnabled);
    setExempt(vatProfile.exemptEnabled);
    setDigitalOnly(vatProfile.vatOnDigitalOnly);
    setPrefix(invoiceSettings.prefix);
    setStartNumber(String(invoiceSettings.startNumber));
    setTermsDays(String(invoiceSettings.termsDays));
    setFilingFrequency(invoiceSettings.filingFrequency);
    setErrors({});
  }

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("settings.tax.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">
            {t("settings.tax.subtitle")}
          </p>
        </div>
        <Badge tone="success"><CircleCheck size={11} /> {t("settings.tax.status.verified")}</Badge>
      </header>

      {/* VAT profile */}
      <section className="mt-4 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div className="flex items-center gap-2">
          <FileCheck2 size={15} className="text-[var(--octo-text-muted)]" />
          <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("settings.tax.vatProfile")}</h2>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label={t("settings.tax.vatNumber")} value={vat} onChange={(e) => setVat(e.target.value)} error={errors.vat} inputMode="numeric" />
          <Input label={t("settings.tax.crNumber")} value={cr} onChange={(e) => setCr(e.target.value)} error={errors.cr} inputMode="numeric" />
          <Select label={t("settings.tax.defaultRate")} value={defaultRate} onChange={(e) => setDefaultRate(e.target.value)}>
            <option value="standard">{t("settings.tax.defaultRate.standard")} · 15%</option>
            <option value="zero">{t("settings.tax.defaultRate.zero")} · 0%</option>
            <option value="exempt">{t("settings.tax.defaultRate.exempt")}</option>
          </Select>
        </div>

        <div className="mt-5">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
            {t("settings.tax.invoiceTypes")}
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Switch checked={simplified} onChange={setSimplified} label={t("settings.tax.simplified")} dir={dir} />
            <Switch checked={standard} onChange={setStandard} label={t("settings.tax.standard")} dir={dir} />
            <Switch checked={zeroRated} onChange={setZeroRated} label={t("settings.tax.zeroRated")} dir={dir} />
            <Switch checked={exempt} onChange={setExempt} label={t("settings.tax.exempt")} dir={dir} />
            <div className="sm:col-span-2">
              <Switch checked={digitalOnly} onChange={setDigitalOnly} label={t("settings.tax.digitalOnly")} dir={dir} />
            </div>
          </div>
        </div>
      </section>

      {/* Invoice settings */}
      <section className="mt-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div className="flex items-center gap-2">
          <ReceiptText size={15} className="text-[var(--octo-text-muted)]" />
          <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("settings.tax.invoiceSettings")}</h2>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label={t("settings.tax.invoicePrefix")}
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            placeholder="INV"
            dir="ltr"
            className="text-start"
          />
          <Input
            label={t("settings.tax.invoiceStart")}
            value={startNumber}
            onChange={(e) => setStartNumber(e.target.value)}
            error={errors.start}
            inputMode="numeric"
          />
          <Select label={t("settings.tax.paymentTerms")} value={termsDays} onChange={(e) => setTermsDays(e.target.value)}>
            {["7", "14", "30", "60"].map((d) => (
              <option key={d} value={d}>{t("settings.tax.terms.days").replace("{n}", d)}</option>
            ))}
          </Select>
          <Select
            label={t("settings.tax.filingFrequency")}
            value={filingFrequency}
            onChange={(e) => setFilingFrequency(e.target.value as FilingFrequency)}
          >
            <option value="Monthly">{t("settings.tax.frequency.monthly")}</option>
            <option value="Quarterly">{t("settings.tax.frequency.quarterly")}</option>
          </Select>
        </div>

        <p className="mt-4 text-[11.5px] text-[var(--octo-text-muted)]">
          {t("settings.tax.nextInvoice").replace("{prefix}", prefix.trim() || "INV").replace("{n}", String(Math.max(1, Number(startNumber) || 1)))}
        </p>
      </section>

      {/* VAT rates */}
      <section className="mt-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("settings.tax.rates")}</h2>
        <div className="octo-scroll mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-[var(--octo-divider)]">
                {["settings.tax.col.type", "settings.tax.col.rate", "settings.tax.col.appliesTo", "settings.tax.col.status"].map((h) => (
                  <th key={h} className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                    {t(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {taxRates.map((row) => (
                <tr key={row.id} className="border-b border-[var(--octo-row-border)] last:border-0 hover:bg-[var(--octo-row-hover)]">
                  <td className="whitespace-nowrap px-2 py-2.5 font-medium text-[var(--octo-text-primary)]">{t(RATE_KEY[row.type])}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{t(RATE_TEXT[row.rate] ?? row.rate)}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{t(APPLIES_KEY[row.appliesTo] ?? row.appliesTo)}</td>
                  <td className="whitespace-nowrap px-2 py-2.5">
                    <Badge tone={row.active ? RATE_TONE[row.type] : "neutral"}>
                      {row.active ? t("settings.tax.status.active") : t("settings.tax.status.inactive")}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ZATCA Phase 2 */}
      <section className="mt-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("settings.tax.zatca")}</h2>
            <Badge tone="success">{t("settings.tax.status.verified")}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" icon={<RefreshCw size={13} />} onClick={() => {
              setToast(t("settings.tax.csidRenewed"));
              window.setTimeout(() => setToast(null), 2200);
            }}>
              {t("settings.tax.renewCsid")}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => {
              setToast(t("settings.tax.csidRequested"));
              window.setTimeout(() => setToast(null), 2200);
            }}>
              {t("settings.tax.requestCsid")}
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{t("settings.tax.environment")}</p>
            <div className="mt-1.5">
              <Badge tone="neutral">{t("settings.tax.env." + (zatcaStatus.environment === "Production" ? "production" : "simulation"))}</Badge>
            </div>
          </div>
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{t("settings.tax.csid")}</p>
            <p className="mt-1.5 font-mono text-[12px] text-[var(--octo-text-primary)]" dir="ltr">{zatcaStatus.csid}</p>
          </div>
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{t("settings.tax.invoiceType")}</p>
            <p className="mt-1.5 text-[12px] font-medium text-[var(--octo-text-primary)]">{t(TYPE_KEY[zatcaStatus.invoiceType])}</p>
          </div>
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{t("settings.tax.clearance")}</p>
            <p className="mt-1.5 text-[12px] font-medium text-[var(--octo-text-primary)]">{t(CLEARANCE_KEY[zatcaStatus.clearanceMode])}</p>
          </div>
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{t("settings.tax.csidExpiry")}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <p className="text-[12px] font-medium text-[var(--octo-text-primary)]" dir="ltr">{expiryLabel}</p>
              <Badge tone={daysLeft < 60 ? "warning" : "info"}>
                {t("settings.tax.expiresIn").replace("{n}", String(daysLeft))}
              </Badge>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
            {t("settings.tax.checklist")}
          </p>
          <div className="mt-2 flex flex-col">
            {zatcaChecklist.map((step, i) => (
              <div key={step.id} className="flex items-start gap-3 border-b border-[var(--octo-row-border)] py-2.5 last:border-0">
                <span className="mt-0.5">
                  {step.done ? (
                    <CircleCheck size={16} className="text-[#22C55E]" />
                  ) : (
                    <CircleDashed size={16} className="text-[var(--octo-text-faint)]" />
                  )}
                </span>
                <div>
                  <p className="text-[12.5px] font-medium text-[var(--octo-text-primary)]">
                    <span className="text-[var(--octo-text-faint)]">{i + 1}.</span> {t(STEP_KEY[step.label] ?? step.label)}
                  </p>
                  <p className="text-[11.5px] text-[var(--octo-text-muted)]">{t(STEP_DESC_KEY[step.label] ?? step.description)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {dirty && (
        <div className="sticky bottom-0 z-10 -mx-4 -mb-6 mt-5 flex flex-col gap-3 border-t border-[var(--octo-border-card)] bg-[var(--octo-card)] px-4 py-3 backdrop-blur sm:-mx-[26px] sm:flex-row sm:items-center sm:justify-between sm:px-[26px]">
          <p className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--octo-text-secondary)]">
            <span className="h-2 w-2 rounded-full bg-[#F59E0B]" />
            {t("settings.business.unsaved")}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" icon={<X size={13} />} onClick={onDiscard}>
              {t("settings.business.discard")}
            </Button>
            <Button variant="primary" size="sm" icon={<Save size={13} />} onClick={onSave}>
              {t("settings.business.save")}
            </Button>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-5 end-5 z-50 flex items-center gap-2 rounded-[9px] border border-[#22C55E]/20 bg-[#22C55E]/10 px-4 py-2.5 text-[12.5px] font-medium text-[#16a34a] shadow-lg">
          <CircleCheck size={14} className="text-[#22C55E]" />
          {toast}
        </div>
      )}
    </div>
  );
}
