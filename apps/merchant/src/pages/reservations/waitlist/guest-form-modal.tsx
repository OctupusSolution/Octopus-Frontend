import { useEffect, useMemo, useState, type ReactNode } from "react";
import clsx from "clsx";
import { ChevronDown, CircleCheck, MessageCircleMore, Minus, Phone, Plus } from "lucide-react";
import { Modal } from "@ui/primitives";
import { zoneForTable, type FloorPlanDoc } from "@/entities/floor-plan";
import {
  CONTACT_CHANNELS,
  WAITLIST_SOURCES,
  activeQueue,
  estimateWaitMinutes,
  localMobileDigits,
  normalizeSaudiMobile,
  queuePosition,
  validateGuest,
  type ContactChannel,
  type GuestInput,
  type WaitlistEntry,
  type WaitlistSource,
} from "@/entities/waitlist-entry";
import { useI18n } from "@/app/providers/i18n-provider";
import { SaudiFlag, WhatsAppGlyph } from "./_shared/glyphs";
import { CHANNEL_KEY, SOURCE_KEY, fill } from "./_shared/labels";

interface FormState {
  firstName: string;
  lastName: string;
  phone: string;
  source: WaitlistSource | "";
  partySize: number;
  channel: ContactChannel;
  areaPreference: string;
  tablePreference: string;
  note: string;
}

const EMPTY: FormState = {
  firstName: "",
  lastName: "",
  phone: "",
  source: "",
  partySize: 1,
  channel: "whatsapp",
  areaPreference: "",
  tablePreference: "",
  note: "",
};

function fromEntry(entry: WaitlistEntry): FormState {
  return {
    firstName: entry.firstName,
    lastName: entry.lastName,
    phone: localMobileDigits(entry.phone),
    source: entry.source,
    partySize: entry.partySize,
    channel: entry.channel,
    areaPreference: entry.areaPreference,
    tablePreference: entry.tablePreference,
    note: entry.note,
  };
}

const FIELD =
  "h-10 w-full rounded-[10px] border bg-[var(--octo-card)] px-3 text-[14.5px] text-[var(--octo-text-primary)] placeholder:text-[var(--octo-text-muted)] focus:border-[#0D6EFD] focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/25";
const border = (error?: string) => (error ? "border-[#EF4444]" : "border-[var(--octo-border-input)]");

function Field({ label, required, hint, error, htmlFor, children }: { label: string; required?: boolean; hint?: string; error?: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="px-1 text-[15.5px] font-medium text-[var(--octo-text-primary)]">
        {label}
        {hint && <span className="ms-1.5 text-[14px] font-normal text-[var(--octo-text-secondary)]">{hint}</span>}
        {required && <span className="ms-1 text-[#E00000]">*</span>}
      </label>
      {children}
      {error && (
        <p role="alert" className="px-1 text-[12px] text-[var(--octo-tone-danger-text)]">
          {error}
        </p>
      )}
    </div>
  );
}

function SelectField({ id, value, onChange, placeholder, error, children }: { id: string; value: string; onChange: (v: string) => void; placeholder: string; error?: string; children: ReactNode }) {
  return (
    <span className="relative flex items-center">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        className={clsx(FIELD, border(error), "appearance-none pe-10", !value && "text-[var(--octo-text-muted)]")}
      >
        <option value="">{placeholder}</option>
        {children}
      </select>
      <ChevronDown size={20} strokeWidth={1.5} className="pointer-events-none absolute end-3 text-[var(--octo-text-secondary)]" />
    </span>
  );
}

export function GuestFormModal({
  open,
  editing,
  entries,
  floor,
  onClose,
  onSubmit,
}: {
  open: boolean;
  editing: WaitlistEntry | null;
  entries: readonly WaitlistEntry[];
  floor: FloorPlanDoc;
  onClose: () => void;
  onSubmit: (input: GuestInput) => void;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(editing ? fromEntry(editing) : EMPTY);
    setSubmitted(false);
  }, [open, editing]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const errors = validateGuest(form, entries, editing?.id ?? null);
  const shown = submitted ? errors : {};
  const errorText = {
    firstName: shown.firstName && t("waitlist.form.error.firstName"),
    lastName: shown.lastName && t("waitlist.form.error.lastName"),
    phone:
      shown.phone === "required" ? t("waitlist.form.error.phoneRequired") : shown.phone === "invalid" ? t("waitlist.form.error.phoneInvalid") : shown.phone === "duplicate" ? t("waitlist.form.error.phoneDuplicate") : undefined,
    source: shown.source && t("waitlist.form.error.source"),
  };

  const tables = useMemo(
    () =>
      floor.tables
        .filter((table) => table.visible && !table.blocked && table.seats >= form.partySize)
        .filter((table) => !form.areaPreference || zoneForTable(floor, table)?.name === form.areaPreference)
        .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true })),
    [floor, form.partySize, form.areaPreference]
  );

  // A table picked for a smaller party, or in another area, no longer applies.
  useEffect(() => {
    if (form.tablePreference && !tables.some((table) => table.number === form.tablePreference)) set("tablePreference", "");
  }, [tables, form.tablePreference]);

  const position = editing ? queuePosition(entries, editing.id) ?? activeQueue(entries).length + 1 : activeQueue(entries).length + 1;
  const estimate = estimateWaitMinutes(position - 1, form.partySize);

  function submit() {
    setSubmitted(true);
    if (Object.keys(errors).length > 0 || !form.source) return;
    onSubmit({
      firstName: form.firstName,
      lastName: form.lastName,
      phone: normalizeSaudiMobile(form.phone) ?? form.phone,
      partySize: form.partySize,
      source: form.source,
      channel: form.channel,
      areaPreference: form.areaPreference,
      tablePreference: form.tablePreference,
      note: form.note,
    });
  }

  const CHANNEL_ICON: Record<ContactChannel, ReactNode> = {
    whatsapp: <WhatsAppGlyph size={20} />,
    call: <Phone size={17} strokeWidth={1.6} />,
    sms: <MessageCircleMore size={18} strokeWidth={1.6} />,
  };

  return (
    <Modal open={open} onClose={onClose} className="octo-scroll max-h-[calc(100vh-32px)] !max-w-[740px] overflow-y-auto !rounded-2xl !p-6 sm:!p-8">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <h2 className="text-[24px] font-bold text-[var(--octo-text-primary)]">{t(editing ? "waitlist.form.editTitle" : "waitlist.form.title")}</h2>

        <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
          <Field label={t("waitlist.form.firstName")} required htmlFor="wl-first" error={errorText.firstName}>
            <input id="wl-first" autoFocus value={form.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder={t("waitlist.form.firstNamePlaceholder")} className={clsx(FIELD, border(errorText.firstName))} />
          </Field>
          <Field label={t("waitlist.form.lastName")} required htmlFor="wl-last" error={errorText.lastName}>
            <input id="wl-last" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder={t("waitlist.form.lastNamePlaceholder")} className={clsx(FIELD, border(errorText.lastName))} />
          </Field>

          <Field label={t("waitlist.form.phone")} required htmlFor="wl-phone" error={errorText.phone}>
            <span dir="ltr" className={clsx("flex h-10 items-center rounded-[10px] border bg-[var(--octo-card)] focus-within:border-[#0D6EFD] focus-within:ring-2 focus-within:ring-[#0D6EFD]/25", border(errorText.phone))}>
              <span className="flex h-full items-center gap-2 ps-3 pe-2 text-[14.5px] text-[var(--octo-text-primary)]">
                <SaudiFlag size={22} />
                +966
              </span>
              <span className="h-6 w-px bg-[var(--octo-border-input)]" />
              <input
                id="wl-phone"
                type="tel"
                inputMode="numeric"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value.replace(/[^\d\s]/g, "").slice(0, 12))}
                placeholder="000 000 000"
                className="h-full min-w-0 flex-1 rounded-e-[10px] bg-transparent px-3 text-[14.5px] text-[var(--octo-text-primary)] placeholder:text-[var(--octo-text-muted)] focus:outline-none"
              />
            </span>
          </Field>
          <Field label={t("waitlist.form.source")} required htmlFor="wl-source" error={errorText.source}>
            <SelectField id="wl-source" value={form.source} onChange={(v) => set("source", v as WaitlistSource | "")} placeholder={t("waitlist.form.chooseSource")} error={errorText.source}>
              {WAITLIST_SOURCES.map((source) => (
                <option key={source} value={source}>
                  {t(SOURCE_KEY[source])}
                </option>
              ))}
            </SelectField>
          </Field>

          <Field label={t("waitlist.form.partySize")} required>
            <span className="flex h-10 items-center justify-center gap-5 rounded-[10px] border border-[var(--octo-border-input)] bg-[var(--octo-card)]">
              <button
                type="button"
                aria-label={t("waitlist.form.decrease")}
                disabled={form.partySize <= 1}
                onClick={() => set("partySize", Math.max(1, form.partySize - 1))}
                className="grid h-7 w-7 place-items-center rounded-full bg-[var(--octo-track)] text-[var(--octo-text-primary)] transition-opacity disabled:opacity-40"
              >
                <Minus size={15} strokeWidth={2.2} />
              </button>
              <output aria-live="polite" className="min-w-6 text-center text-[15px] text-[var(--octo-text-primary)]">
                {form.partySize}
              </output>
              <button
                type="button"
                aria-label={t("waitlist.form.increase")}
                disabled={form.partySize >= 30}
                onClick={() => set("partySize", Math.min(30, form.partySize + 1))}
                className="grid h-7 w-7 place-items-center rounded-full bg-[#0D6EFD] text-white transition-opacity disabled:opacity-40"
              >
                <Plus size={15} strokeWidth={2.2} />
              </button>
            </span>
          </Field>
          <Field label={t("waitlist.form.channel")} required>
            <div role="radiogroup" aria-label={t("waitlist.form.channel")} className="flex flex-wrap gap-2.5">
              {CONTACT_CHANNELS.map((channel) => {
                const on = form.channel === channel;
                return (
                  <button
                    key={channel}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => set("channel", channel)}
                    className={clsx(
                      "flex h-10 items-center gap-2.5 rounded-[10px] border px-3 text-[15px] font-semibold transition-colors",
                      on
                        ? "border-[#0D6EFD] bg-[color-mix(in_srgb,#0D6EFD_5%,var(--octo-card))] text-[#0D6EFD]"
                        : "border-[var(--octo-border-input)] bg-[var(--octo-card)] text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]"
                    )}
                  >
                    {CHANNEL_ICON[channel]}
                    {t(CHANNEL_KEY[channel])}
                  </button>
                );
              })}
            </div>
          </Field>

          <div className="flex flex-col gap-5">
            <Field label={t("waitlist.form.areaPreference")} htmlFor="wl-area">
              <SelectField id="wl-area" value={form.areaPreference} onChange={(v) => set("areaPreference", v)} placeholder={t("waitlist.form.chooseArea")}>
                {floor.zones.map((zone) => (
                  <option key={zone.id} value={zone.name}>
                    {zone.name}
                  </option>
                ))}
              </SelectField>
            </Field>
            <Field label={t("waitlist.form.tablePreference")} htmlFor="wl-table">
              <SelectField id="wl-table" value={form.tablePreference} onChange={(v) => set("tablePreference", v)} placeholder={t("waitlist.form.chooseTable")}>
                {tables.map((table) => (
                  <option key={table.id} value={table.number}>
                    {fill(t("waitlist.form.tableOption"), { table: table.number, seats: table.seats })}
                  </option>
                ))}
              </SelectField>
            </Field>
            <Field label={t("waitlist.form.note")} hint={t("waitlist.form.noteHint")} htmlFor="wl-note">
              <textarea
                id="wl-note"
                value={form.note}
                maxLength={300}
                onChange={(e) => set("note", e.target.value)}
                placeholder={t("waitlist.form.notePlaceholder")}
                className={clsx(FIELD, border(), "h-auto min-h-[150px] flex-1 resize-none py-2.5")}
              />
            </Field>
          </div>

          <div className="flex flex-col gap-5 sm:pt-1">
            <section className="rounded-[10px] bg-[var(--octo-track)] px-3 py-3">
              <h3 className="text-[15px] font-semibold text-[var(--octo-text-primary)]">{t("waitlist.form.estimatedWait")}</h3>
              <p className="mt-1 text-[13px] text-[var(--octo-text-primary)]">{t("waitlist.form.estimatedWaitHint")}</p>
              <p className="mt-1 text-[26px] font-bold leading-tight text-[var(--octo-text-primary)]">
                {estimate}-{estimate + 5} {t("waitlist.min")}
              </p>
              <p className="mt-0.5 text-[13px] text-[var(--octo-text-secondary)]">{t("waitlist.form.estimatedWaitNotify")}</p>
            </section>
            <section className="rounded-[10px] bg-[var(--octo-track)] px-3 py-3">
              <h3 className="text-[15px] font-semibold text-[var(--octo-text-primary)]">{t("waitlist.form.queuePreview")}</h3>
              <p className="mt-1 text-[13px] text-[var(--octo-text-primary)]">{t(editing ? "waitlist.form.queueCurrent" : "waitlist.form.queuePosition")}</p>
              <p className="mt-1 text-[26px] font-bold leading-tight text-[#0B4FC0] [[data-theme=dark]_&]:text-[var(--octo-tone-info-text)]">#{position}</p>
              <p className="mt-0.5 text-[13px] text-[var(--octo-text-secondary)]">{fill(t(position - 1 === 1 ? "waitlist.form.behindOne" : "waitlist.form.behind"), { n: position - 1 })}</p>
            </section>
            <div className="mt-auto flex flex-col gap-3">
              <button type="submit" className="flex h-12 items-center justify-center gap-3 rounded-[10px] bg-[#0D6EFD] text-[18px] font-semibold text-white transition-opacity hover:opacity-90">
                <CircleCheck size={24} fill="#fff" className="text-[#0D6EFD]" strokeWidth={2.2} />
                {t(editing ? "waitlist.form.save" : "waitlist.form.add")}
              </button>
              <button type="button" onClick={onClose} className="h-12 rounded-[10px] bg-[#E2E8F0] text-[18px] font-semibold text-[#64748B] transition-colors hover:bg-[#CBD5E1] [[data-theme=dark]_&]:bg-[var(--octo-track)] [[data-theme=dark]_&]:text-[var(--octo-text-secondary)]">
                {t("waitlist.form.cancel")}
              </button>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}
