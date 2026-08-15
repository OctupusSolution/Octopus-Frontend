import { useEffect, useRef, useState } from "react";
import { Building2, Check, Globe2, Palette, Save, X } from "lucide-react";
import { Button, Input, Select, Textarea } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import {
  businessProfile,
  calendarOptions,
  entityTypeOptions,
  numberFormatOptions,
  timezoneOptions,
  weekStartOptions,
  isValidCrNumber,
  isValidEmail,
  isValidSaudiPhone,
  isValidVatNumber,
  type BusinessProfile,
} from "@/shared/api/mock-settings-business";

const ENTITY_KEY: Record<BusinessProfile["entityType"], string> = {
  Company: "settings.business.entity.company",
  Partnership: "settings.business.entity.partnership",
  "Sole Proprietor": "settings.business.entity.soleProprietor",
};

const CALENDAR_KEY: Record<string, string> = {
  Gregorian: "settings.business.calendar.gregorian",
  Hijri: "settings.business.calendar.hijri",
};

const FORMAT_KEY: Record<string, string> = {
  "1,234.56": "settings.business.format.dot",
  "1.234,56": "settings.business.format.comma",
};

const WEEK_START_KEY: Record<string, string> = {
  Sunday: "settings.business.week.sunday",
  Saturday: "settings.business.week.saturday",
};

const LANG_KEY: Record<string, string> = {
  ar: "settings.business.lang.ar",
  en: "settings.business.lang.en",
};

function ColorField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useI18n();
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-2 rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-2 py-1.5">
      <button
        type="button"
        onClick={() => ref.current?.click()}
        aria-label={t("settings.business.pickColor")}
        className="h-7 w-7 shrink-0 rounded-[7px] border border-[var(--octo-border-card)] transition-transform hover:scale-105"
        style={{ backgroundColor: value }}
      />
      <input ref={ref} type="color" value={value} onChange={(e) => onChange(e.target.value)} className="sr-only" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className="w-full bg-transparent text-[12px] uppercase text-[var(--octo-text-secondary)] outline-none"
        aria-label={t("settings.business.hexColor")}
      />
    </div>
  );
}

export function BusinessSettingsPage() {
  const { t, setLocale } = useI18n();
  const initial = businessProfile;
  const [form, setForm] = useState<BusinessProfile>({ ...initial });
  const [errors, setErrors] = useState<Partial<Record<keyof BusinessProfile, string>>>({});
  const [dirty, setDirty] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(id);
  }, [toast]);

  function set<K extends keyof BusinessProfile>(key: K, value: BusinessProfile[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  function validate(): boolean {
    const next: Partial<Record<keyof BusinessProfile, string>> = {};
    if (!isValidCrNumber(form.crNumber)) next.crNumber = t("settings.business.err.cr");
    if (!isValidVatNumber(form.vatNumber)) next.vatNumber = t("settings.business.err.vat");
    if (!isValidEmail(form.email)) next.email = t("settings.business.err.email");
    if (!isValidSaudiPhone(form.phone)) next.phone = t("settings.business.err.phone");
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function onSave() {
    if (!validate()) return;
    setDirty(false);
    setToast(t("settings.business.saved"));
  }

  function onDiscard() {
    setForm({ ...initial });
    setErrors({});
    setDirty(false);
  }

  const brandColors = form.brandColors as string[];

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header>
        <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
          {t("settings.business.title")}
        </h1>
        <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">
          {t("settings.business.subtitle")}
        </p>
      </header>

      {/* Legal entity */}
      <section className="mt-4 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div className="flex items-center gap-2">
          <Building2 size={15} className="text-[var(--octo-text-muted)]" />
          <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("settings.business.legal")}</h2>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label={t("settings.business.legalNameEn")} value={form.legalNameEn} onChange={(e) => set("legalNameEn", e.target.value)} />
          <Input label={t("settings.business.legalNameAr")} value={form.legalNameAr} onChange={(e) => set("legalNameAr", e.target.value)} dir="rtl" />
          <Input label={t("settings.business.crNumber")} value={form.crNumber} onChange={(e) => set("crNumber", e.target.value)} error={errors.crNumber} inputMode="numeric" />
          <Input label={t("settings.business.vatNumber")} value={form.vatNumber} onChange={(e) => set("vatNumber", e.target.value)} error={errors.vatNumber} inputMode="numeric" />
          <div className="sm:col-span-2">
            <Textarea label={t("settings.business.nationalAddress")} rows={2} value={form.nationalAddress} onChange={(e) => set("nationalAddress", e.target.value)} />
          </div>
          <Select label={t("settings.business.entityType")} value={form.entityType} onChange={(e) => set("entityType", e.target.value as BusinessProfile["entityType"])}>
            {entityTypeOptions.map((o) => (
              <option key={o} value={o}>{t(ENTITY_KEY[o])}</option>
            ))}
          </Select>
          <Input label={t("settings.business.email")} value={form.email} onChange={(e) => set("email", e.target.value)} error={errors.email} type="email" />
          <Input label={t("settings.business.phone")} value={form.phone} onChange={(e) => set("phone", e.target.value)} error={errors.phone} dir="ltr" />
          <Input label={t("settings.business.website")} value={form.website} onChange={(e) => set("website", e.target.value)} dir="ltr" />
        </div>
      </section>

      {/* Locale & regional */}
      <section className="mt-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div className="flex items-center gap-2">
          <Globe2 size={15} className="text-[var(--octo-text-muted)]" />
          <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("settings.business.locale")}</h2>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label={t("settings.business.defaultLanguage")}
            value={form.defaultLanguage}
            onChange={(e) => {
              const lang = e.target.value as "ar" | "en";
              set("defaultLanguage", lang);
              setLocale(lang);
            }}
          >
            {(["ar", "en"] as const).map((l) => (
              <option key={l} value={l}>{t(LANG_KEY[l])}</option>
            ))}
          </Select>
          <Select label={t("settings.business.timezone")} value={form.timezone} onChange={(e) => set("timezone", e.target.value)}>
            {timezoneOptions.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </Select>
          <Select label={t("settings.business.calendar")} value={form.calendar} onChange={(e) => set("calendar", e.target.value as BusinessProfile["calendar"])}>
            {calendarOptions.map((o) => (
              <option key={o} value={o}>{t(CALENDAR_KEY[o])}</option>
            ))}
          </Select>
          <Select label={t("settings.business.numberFormat")} value={form.numberFormat} onChange={(e) => set("numberFormat", e.target.value as BusinessProfile["numberFormat"])}>
            {numberFormatOptions.map((o) => (
              <option key={o} value={o}>{t(FORMAT_KEY[o])}</option>
            ))}
          </Select>
          <Select label={t("settings.business.weekStart")} value={form.weekStart} onChange={(e) => set("weekStart", e.target.value as BusinessProfile["weekStart"])}>
            {weekStartOptions.map((o) => (
              <option key={o} value={o}>{t(WEEK_START_KEY[o])}</option>
            ))}
          </Select>
          <Input label={t("settings.business.currency")} value="SAR" readOnly disabled />
        </div>
      </section>

      {/* Brand identity */}
      <section className="mt-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div className="flex items-center gap-2">
          <Palette size={15} className="text-[var(--octo-text-muted)]" />
          <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("settings.business.brand")}</h2>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start">
          {brandColors.map((color, i) => (
            <div key={i} className="flex-1">
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
                {t("settings.business.brandColor")} {i + 1}
              </span>
              <div className="mt-1.5">
                <ColorField
                  value={color}
                  onChange={(v) => {
                    const colors = brandColors.map((c, j) => (j === i ? v : c));
                    set("brandColors", colors);
                  }}
                />
              </div>
            </div>
          ))}
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
          <Check size={14} className="text-[#22C55E]" />
          {toast}
        </div>
      )}
    </div>
  );
}
