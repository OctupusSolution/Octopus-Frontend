import { useEffect, useMemo, useState, type ReactNode } from "react";
import clsx from "clsx";
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
import { ChannelGlyph, SaudiFlag } from "./_shared/glyphs";
import { CHANNEL_KEY, SOURCE_KEY, fill } from "./_shared/labels";
import { BTN_NEUTRAL, BTN_PRIMARY, DEEP_BLUE, GRAY, INK, LINE, SURFACE_BLUE, SURFACE_GRAY } from "./_shared/theme";
import { WaitlistIcon, WaitlistImg } from "./_shared/waitlist-icon";

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

// The frame's input: 40px tall, 12px radius, 14px text on a #CBD5E1 outline.
const FIELD = clsx(
  INK,
  "h-10 w-full rounded-[12px] border bg-transparent px-2 text-[14px] leading-[14px] placeholder:text-[#687280] focus:border-[#0D6EFD] focus:outline-none [[data-theme=dark]_&]:placeholder:text-[var(--octo-text-muted)]"
);
const border = (error?: string) => (error ? "border-[#D30202]" : LINE);
const INFO_CARD = clsx(SURFACE_GRAY, INK, "flex flex-col gap-2 rounded-[8px] px-2 py-3");

function Field({ label, required, hint, error, htmlFor, className, children }: { label: string; required?: boolean; hint?: string; error?: string; htmlFor?: string; className?: string; children: ReactNode }) {
  return (
    <div className={clsx("flex flex-col gap-3", className)}>
      <label htmlFor={htmlFor} className={clsx(INK, "px-2 text-[16px] font-medium leading-[16px]")}>
        {label}
        {hint && <span className={clsx(GRAY, "ms-1 text-[14px] font-normal leading-[14px]")}>{hint}</span>}
        {required && <span className="ms-1 text-[#D30202]">*</span>}
      </label>
      {children}
      {error && (
        <p role="alert" className="-mt-1 px-2 text-[12px] text-[#D30202]">
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
        className={clsx(FIELD, border(error), "appearance-none pe-10", !value && "!text-[#687280] [[data-theme=dark]_&]:!text-[var(--octo-text-muted)]")}
      >
        <option value="">{placeholder}</option>
        {children}
      </select>
      <WaitlistIcon name="arrow-down.svg" className="pointer-events-none absolute end-2 text-[#687280]" />
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

  return (
    <Modal open={open} onClose={onClose} backdropClassName="bg-black/60" className="octo-scroll max-h-[calc(100vh-32px)] !max-w-[738px] overflow-y-auto !rounded-[12px] !p-6 !shadow-none">
      <form
        noValidate
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <h2 className="text-[24px] font-semibold leading-[24px] text-[#0E0E0E] [[data-theme=dark]_&]:text-[var(--octo-text-primary)]">{t(editing ? "waitlist.form.editTitle" : "waitlist.form.title")}</h2>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Field label={t("waitlist.form.firstName")} required htmlFor="wl-first" error={errorText.firstName}>
            <input id="wl-first" autoFocus value={form.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder={t("waitlist.form.firstNamePlaceholder")} className={clsx(FIELD, border(errorText.firstName))} />
          </Field>
          <Field label={t("waitlist.form.lastName")} required htmlFor="wl-last" error={errorText.lastName}>
            <input id="wl-last" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder={t("waitlist.form.lastNamePlaceholder")} className={clsx(FIELD, border(errorText.lastName))} />
          </Field>

          <Field label={t("waitlist.form.phone")} required htmlFor="wl-phone" error={errorText.phone}>
            <span dir="ltr" className={clsx(INK, "flex h-10 items-center gap-1 rounded-[12px] border px-3 text-[14px] leading-none focus-within:border-[#0D6EFD]", border(errorText.phone))}>
              <span className="flex items-center gap-2">
                <SaudiFlag size={24} />
                +966
              </span>
              <input
                id="wl-phone"
                type="tel"
                inputMode="numeric"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value.replace(/[^\d\s]/g, "").slice(0, 12))}
                placeholder="000 000 000"
                className={clsx(LINE, "h-[30px] min-w-0 flex-1 border-l bg-transparent px-2 text-[14px] leading-none placeholder:text-[#58606C] focus:outline-none [[data-theme=dark]_&]:placeholder:text-[var(--octo-text-muted)]")}
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
            <span className={clsx(LINE, "flex h-10 items-center justify-center gap-6 rounded-[12px] border")}>
              <button
                type="button"
                aria-label={t("waitlist.form.decrease")}
                disabled={form.partySize <= 1}
                onClick={() => set("partySize", Math.max(1, form.partySize - 1))}
                className={clsx(SURFACE_GRAY, "grid h-6 w-6 place-items-center rounded-full text-[#687280] transition-opacity disabled:opacity-40")}
              >
                <WaitlistIcon name="minus.svg" size={16} />
              </button>
              <output aria-live="polite" className={clsx(INK, "min-w-[9px] text-center text-[14px] leading-none")}>
                {form.partySize}
              </output>
              <button
                type="button"
                aria-label={t("waitlist.form.increase")}
                disabled={form.partySize >= 30}
                onClick={() => set("partySize", Math.min(30, form.partySize + 1))}
                className="grid h-6 w-6 place-items-center rounded-full bg-[#0D6EFD] transition-opacity disabled:opacity-40"
              >
                <WaitlistImg name="plus-16.svg" size={16} />
              </button>
            </span>
          </Field>
          <Field label={t("waitlist.form.channel")} required>
            <div role="radiogroup" aria-label={t("waitlist.form.channel")} className="flex flex-wrap gap-2">
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
                      "flex h-10 items-center gap-2 rounded-[12px] border p-2 text-[14px] font-semibold leading-[14px] transition-colors",
                      on ? clsx(SURFACE_BLUE, "border-[#0D6EFD] text-[#0D6EFD]") : clsx(LINE, INK, "hover:bg-[#F8FAFC] [[data-theme=dark]_&]:hover:bg-[var(--octo-hover)]")
                    )}
                  >
                    <ChannelGlyph channel={channel} />
                    {t(CHANNEL_KEY[channel])}
                  </button>
                );
              })}
            </div>
          </Field>

          <div className="flex flex-col gap-6">
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
            <Field label={t("waitlist.form.note")} hint={t("waitlist.form.noteHint")} htmlFor="wl-note" className="flex-1">
              <textarea
                id="wl-note"
                value={form.note}
                maxLength={300}
                onChange={(e) => set("note", e.target.value)}
                placeholder={t("waitlist.form.notePlaceholder")}
                className={clsx(FIELD, border(), "h-auto min-h-[116px] flex-1 resize-none py-3")}
              />
            </Field>
          </div>

          <div className="flex flex-col gap-6">
            <section className={INFO_CARD}>
              <h3 className="text-[14px] font-semibold leading-[14px]">{t("waitlist.form.estimatedWait")}</h3>
              <p className="text-[12px] leading-[12px]">{t("waitlist.form.estimatedWaitHint")}</p>
              <p className="text-[24px] font-semibold leading-[24px]">
                {estimate}-{estimate + 5} {t("waitlist.min")}
              </p>
              <p className={clsx(GRAY, "text-[12px] leading-[12px]")}>{t("waitlist.form.estimatedWaitNotify")}</p>
            </section>
            <section className={INFO_CARD}>
              <h3 className="text-[14px] font-semibold leading-[14px]">{t("waitlist.form.queuePreview")}</h3>
              <p className="text-[12px] leading-[12px]">{t(editing ? "waitlist.form.queueCurrent" : "waitlist.form.queuePosition")}</p>
              <p className={clsx(DEEP_BLUE, "text-[24px] font-semibold leading-[24px]")}>#{position}</p>
              <p className={clsx(GRAY, "text-[12px] leading-[12px]")}>{fill(t(position - 1 === 1 ? "waitlist.form.behindOne" : "waitlist.form.behind"), { n: position - 1 })}</p>
            </section>
            <div className="mt-auto flex flex-col gap-3">
              <button type="submit" className={clsx(BTN_PRIMARY, "w-full !gap-2")}>
                <WaitlistImg name="done.svg" />
                {t(editing ? "waitlist.form.save" : "waitlist.form.add")}
              </button>
              <button type="button" onClick={onClose} className={clsx(BTN_NEUTRAL, "w-full")}>
                {t("waitlist.form.cancel")}
              </button>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}
