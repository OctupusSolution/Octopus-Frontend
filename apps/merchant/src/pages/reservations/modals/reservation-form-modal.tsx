// Task 9: the Add / Edit reservation form. One component serves four design
// frames — the three tabs of "Add Reservation" plus "Edit Reservation", which
// is the same form with a handful of additions (see the `mode === "edit"`
// branches below). Task 12 mounts this from the Reservations list and wires
// `onSubmit`/`onRequestCancel` into the row state; this task only builds and
// exports the component.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import clsx from "clsx";
import { Calendar, Check, FileText, Info, Plus, Send, User, X } from "lucide-react";
import { Button, Checkbox, Input, Modal, Select, Tabs, Textarea, type TabItem } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import {
  branches,
  floorTables,
  TODAY,
  type DepositState,
  type DepositType,
  type Reservation,
  type ReservationDeposit,
  type ReservationSource,
} from "@/shared/api/mock-reservations";
import {
  availableTagPresets,
  combinePhone,
  DEPOSIT_STATE_LABEL_KEY,
  durationMinuteOptions,
  formatDisplayDate,
  guestsText,
  hoursMinutesParts,
  NOW_MINUTES,
  phoneDigitsFrom,
  SOURCE_LABEL_KEY,
  tableLabel,
  timeSlotOptions,
} from "../_shared/model";
import { openDatePicker } from "../_shared/filter-bar";

export interface ReservationFormModalProps {
  open: boolean;
  mode: "add" | "edit";
  /** Required when `mode === "edit"` — the row being edited. */
  reservation: Reservation | null;
  onClose: () => void;
  onSubmit: (draft: Reservation, intent: "pending" | "confirm") => void;
  /** Edit mode's red "Cancel Reservation" footer button. */
  onRequestCancel: () => void;
  /** Edit mode's "View Payment" — opens the reservation's payment details. */
  onViewPayment?: () => void;
  /** Which tab to open on — the row's "Add Note" opens straight onto Notes. */
  initialTab?: "details" | "guest" | "notes";
}

const SOURCE_OPTIONS: readonly ReservationSource[] = [
  "Direct Booking", "Website", "Walk In", "Phone", "Instagram",
];

const DEPOSIT_TYPE_OPTIONS: readonly DepositType[] = ["Pre Reservation", "Per Guest", "Full Prepayment"];

const DEPOSIT_TYPE_LABEL_KEY: Record<DepositType, string> = {
  "Pre Reservation": "reservations.form.depositType.preReservation",
  "Per Guest": "reservations.form.depositType.perGuest",
  "Full Prepayment": "reservations.form.depositType.fullPrepayment",
};

// Every non-"none" deposit state, so the edit-only Deposit Status select can
// represent whatever the fixture happens to be in — not just paid/unpaid.
const DEPOSIT_STATUS_OPTIONS: readonly Exclude<DepositState, "none">[] = [
  "unpaid", "paid", "link-sent", "expired", "failed", "refunded", "cancelled",
];

// Seating areas offered as a preference — the same set the fixture's rows
// use, since there's no separate "areas" prop for this form to receive.
const AREA_OPTIONS = ["Main Dining", "Terrace", "Family Section", "Private Rooms"];

// Table preference options come from the floor plan's own table numbers,
// deduped and sorted, so they line up with what Floor Plan actually has —
// plus (fix round 4, finding 7) whatever table the reservation being
// edited is already on, even if that table isn't one floorTables lists at
// all (six fixture rows sit on T-09/T-11/T-12/T-28/T-30, none of which
// floorTables has). Without it the controlled <select> fell back to the
// blank "Any Available" option on open, and touching the select at all
// lost the real table — it was never among the options to begin with.
function tableOptionsFor(reservation: Reservation | null): string[] {
  const base = new Set(floorTables.map((table) => table.number));
  if (reservation?.table) base.add(reservation.table);
  return Array.from(base).sort();
}

const PARTY_SIZE_OPTIONS = Array.from({ length: 20 }, (_, i) => i + 1);

type Channel = "WhatsApp" | "SMS" | "Email";
const CHANNELS: readonly Channel[] = ["WhatsApp", "SMS", "Email"];

interface DraftState {
  date: string;
  time: number;
  partySize: number;
  durationMinutes: number;
  area: string;
  table: string;
  source: ReservationSource;
  depositEnabled: boolean;
  depositAmount: string;
  depositType: DepositType;
  depositState: Exclude<DepositState, "none">;
  tags: string[];
  sendLinkWith: Record<Channel, boolean>;
  firstName: string;
  lastName: string;
  phoneDigits: string;
  email: string;
  notes: string;
  notifyGuest: boolean;
}

function initDraft(mode: "add" | "edit", reservation: Reservation | null): DraftState {
  if (mode === "edit" && reservation) {
    const [firstName, ...rest] = reservation.guest.split(" ");
    return {
      date: reservation.date,
      time: reservation.startMinutes,
      partySize: reservation.partySize,
      // The real value, not rounded to a whole hour (fix round 4, finding
      // 11) — nine fixture rows are 90-minute bookings; rounding this to
      // "2 Hours" on open and saving wrote 120 back, silently growing every
      // one of them by half an hour.
      durationMinutes: reservation.durationMinutes,
      area: reservation.area || AREA_OPTIONS[0],
      table: reservation.table || "",
      source: reservation.source,
      depositEnabled: Boolean(reservation.deposit),
      depositAmount: reservation.deposit ? String(reservation.deposit.amount) : "",
      depositType: reservation.deposit?.type ?? "Pre Reservation",
      depositState: (reservation.deposit?.state === "none" ? "unpaid" : reservation.deposit?.state) ?? "unpaid",
      tags: [...(reservation.tags ?? [])],
      sendLinkWith: { WhatsApp: true, SMS: false, Email: false },
      firstName: firstName ?? "",
      lastName: rest.join(" "),
      phoneDigits: phoneDigitsFrom(reservation.phone),
      email: reservation.email ?? "",
      notes: reservation.notes ?? "",
      // The frame draws this filled/checked by default in edit mode — an
      // edit that changes a confirmed booking's details should default to
      // telling the guest, not silently skip it.
      notifyGuest: true,
    };
  }
  return {
    date: TODAY,
    time: NOW_MINUTES,
    partySize: 2,
    durationMinutes: 120,
    area: AREA_OPTIONS[0],
    table: "",
    source: "Direct Booking",
    // Fix round 1, finding 2 — the "reservation details" frame shows this
    // section expanded (toggle on, notice bar visible) as the tab's
    // starting state, not a filled-in example the way the frame's demo
    // guest/date/tags are. Deposit Amount stays blank rather than
    // mirroring the frame's "200" — that number isn't a rule this app
    // knows, just whatever the mock happened to show.
    depositEnabled: true,
    depositAmount: "",
    depositType: "Pre Reservation",
    depositState: "unpaid",
    tags: [],
    sendLinkWith: { WhatsApp: true, SMS: false, Email: false },
    firstName: "",
    lastName: "",
    phoneDigits: "",
    email: "",
    notes: "",
    notifyGuest: false,
  };
}

// Field labels in the frames are normal sentence case directly above the
// input — Input/Select's own `label` prop renders uppercase tracking-wide,
// which the frames don't show, so every field renders its own label instead.
function Field({
  label,
  sub,
  required,
  optional,
  className,
  children,
}: {
  label: string;
  sub?: string;
  required?: boolean;
  optional?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={clsx("flex flex-col gap-1.5", className)}>
      <span className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">
        {label}
        {required && <span className="text-[#EF4444]"> *</span>}
        {sub && <span className="ms-1.5 font-normal text-[var(--octo-text-muted)]">{sub}</span>}
        {optional && <span className="ms-1.5 font-normal text-[var(--octo-text-faint)]">{optional}</span>}
      </span>
      {children}
    </div>
  );
}

// The toggle every step of the builder uses (see
// pages/public-link/ui/switch.tsx) — duplicated locally rather than shared
// since this task may only touch the one new file plus _shared/model.ts.
function DepositSwitch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={clsx(
        "relative inline-flex h-[20px] w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40",
        checked ? "bg-[#0D6EFD]" : "bg-[var(--octo-switch-off)]"
      )}
    >
      <span
        className={clsx(
          "inline-block h-4 w-4 transform rounded-full bg-[var(--octo-card)] shadow transition-transform",
          checked ? "translate-x-[17px] rtl:-translate-x-[17px]" : "translate-x-[2px] rtl:-translate-x-[2px]"
        )}
      />
    </button>
  );
}

function SourceRadioPill({ active, label, onSelect }: { active: boolean; label: string; onSelect: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onSelect}
      className={clsx(
        "inline-flex items-center gap-2 rounded-[9px] border px-3 py-[9px] text-[12.5px] font-medium transition-colors",
        active
          ? "border-[#0D6EFD] text-[#0D6EFD]"
          : "border-[var(--octo-border-input)] text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]"
      )}
    >
      <span
        className={clsx(
          "inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border",
          active ? "border-[#0D6EFD]" : "border-[var(--octo-border-input)]"
        )}
      >
        {active && <span className="h-1.5 w-1.5 rounded-full bg-[#0D6EFD]" />}
      </span>
      {label}
    </button>
  );
}

function ChannelPill({ checked, label, onToggle }: { checked: boolean; label: string; onToggle: () => void }) {
  return (
    <label
      className={clsx(
        "inline-flex cursor-pointer items-center gap-2 rounded-[9px] border px-3 py-[9px] text-[12.5px] font-medium transition-colors",
        checked
          ? "border-[#0D6EFD] bg-[#0D6EFD] text-white"
          : "border-[var(--octo-border-input)] text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]"
      )}
    >
      <input type="checkbox" checked={checked} onChange={onToggle} className="sr-only" />
      <span
        className={clsx(
          "inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[4px] border",
          checked ? "border-white/70 bg-white/15" : "border-[var(--octo-border-input)]"
        )}
      >
        {/* Unchecked pills still show a faint check glyph in the frame,
            not an empty box — only the color signals the state. */}
        <Check size={10} strokeWidth={3} className={checked ? "text-white" : "text-[var(--octo-text-faint)]"} />
      </span>
      {label}
    </label>
  );
}

// Every frame draws the footer's Cancel as a grey filled button, not the
// white outline of the shared "secondary" variant.
const GREY_CANCEL =
  "!border-transparent !bg-[var(--octo-track)] !text-[var(--octo-text-secondary)] hover:!bg-[var(--octo-hover)]";

// Flag emoji don't render on Windows — Chrome shows the regional-indicator
// letters "SA" instead — so draw the round green flag the frame shows.
function SaudiFlag() {
  return (
    <svg viewBox="0 0 20 20" className="h-[18px] w-[18px] shrink-0" aria-hidden="true">
      <circle cx="10" cy="10" r="10" fill="#006C35" />
      <path d="M5.5 8h9" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M6.8 10.2h6.4" stroke="#fff" strokeWidth="1" strokeLinecap="round" />
      <path d="M5.2 13.2h9.6" stroke="#fff" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

export function ReservationFormModal({
  open,
  mode,
  reservation,
  onClose,
  onSubmit,
  onRequestCancel,
  onViewPayment,
  initialTab = "details",
}: ReservationFormModalProps) {
  const { t, locale } = useI18n();
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [draft, setDraft] = useState<DraftState>(() => initDraft(mode, reservation));

  // One draft object holds every field regardless of which tab is showing —
  // the tabs only change which part of it renders, so switching tabs never
  // loses what's been typed. Re-seeded every time the modal opens (or the
  // target reservation changes) rather than on every render, so a second
  // "Add" after a first doesn't inherit the previous attempt's values.
  useEffect(() => {
    if (open) {
      setDraft(initDraft(mode, reservation));
      setActiveTab(initialTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, reservation?.id, initialTab]);

  const timeOptions = useMemo(() => timeSlotOptions(draft.time), [draft.time]);
  const durationOptions = useMemo(() => durationMinuteOptions(draft.durationMinutes), [draft.durationMinutes]);
  const tableOptions = useMemo(() => tableOptionsFor(reservation), [reservation]);
  const remainingTagPresets = useMemo(() => availableTagPresets(draft.tags), [draft.tags]);

  const hasName = draft.firstName.trim() !== "" && draft.lastName.trim() !== "";
  const hasPhone = draft.phoneDigits.trim() !== "";
  const canSavePending = hasName && hasPhone;
  const canConfirm = canSavePending && draft.date !== "" && draft.partySize > 0;

  function update<K extends keyof DraftState>(key: K, value: DraftState[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function addTag() {
    if (remainingTagPresets.length === 0) return;
    update("tags", [...draft.tags, remainingTagPresets[0]]);
  }

  function removeTag(tag: string) {
    update("tags", draft.tags.filter((existing) => existing !== tag));
  }

  function toggleChannel(channel: Channel) {
    update("sendLinkWith", { ...draft.sendLinkWith, [channel]: !draft.sendLinkWith[channel] });
  }

  function buildReservation(intent: "pending" | "confirm"): Reservation {
    const guest = `${draft.firstName.trim()} ${draft.lastName.trim()}`.trim();
    const sendLinkChannels = CHANNELS.filter((channel) => draft.sendLinkWith[channel]);
    const deposit: ReservationDeposit | undefined = draft.depositEnabled
      ? {
          amount: Number(draft.depositAmount) || 0,
          currency: "SAR",
          type: draft.depositType,
          state: mode === "edit" ? draft.depositState : (reservation?.deposit?.state ?? "unpaid"),
          dueBy: reservation?.deposit?.dueBy,
          paidOn: reservation?.deposit?.paidOn,
          method: reservation?.deposit?.method,
          txnId: reservation?.deposit?.txnId,
        }
      : undefined;

    return {
      id: reservation?.id ?? "",
      date: draft.date,
      startMinutes: draft.time,
      durationMinutes: draft.durationMinutes,
      ref: reservation?.ref ?? "",
      guest,
      phone: combinePhone(draft.phoneDigits.trim()),
      email: draft.email.trim() || undefined,
      partySize: draft.partySize,
      area: draft.area,
      // Empty string ("no preference"), not the English literal "Any
      // Available" (fix round 4, finding 6) — that used to get persisted
      // into the model verbatim and print untranslated on the Arabic page.
      // Every renderer treats an empty table the same way now: fall back
      // to t("reservations.form.tableAny") instead of showing raw text.
      table: draft.table,
      branch: reservation?.branch ?? branches[0],
      source: draft.source,
      status: mode === "edit" && reservation ? reservation.status : intent === "confirm" ? "Confirmed" : "Pending",
      tags: draft.tags.length ? draft.tags : undefined,
      deposit,
      paymentLink: reservation?.paymentLink,
      confirmedOn: reservation?.confirmedOn,
      confirmedMethod: reservation?.confirmedMethod,
      cancelledAt: reservation?.cancelledAt,
      cancelReason: reservation?.cancelReason,
      notes: draft.notes.trim() || undefined,
      allergyTags: reservation?.allergyTags,
      sendLinkChannels: sendLinkChannels.length ? sendLinkChannels : undefined,
      notifyGuestOnChange: mode === "edit" ? draft.notifyGuest : undefined,
    };
  }

  function submit(intent: "pending" | "confirm") {
    onSubmit(buildReservation(intent), intent);
  }

  const tabItems: TabItem[] = [
    {
      id: "details",
      label: (
        <span className="inline-flex items-center gap-1.5">
          <Calendar size={14} />
          {t("reservations.form.tab.details")}
        </span>
      ),
    },
    {
      id: "guest",
      label: (
        <span className="inline-flex items-center gap-1.5">
          <User size={14} />
          {t("reservations.form.tab.guest")}
        </span>
      ),
    },
    {
      id: "notes",
      label: (
        <span className="inline-flex items-center gap-1.5">
          <FileText size={14} />
          {t("reservations.form.tab.notes")}
        </span>
      ),
    },
  ];

  const noteField = (
    <Field label={t("reservations.form.note")} sub={t("reservations.form.noteSub")}>
      <Textarea
        rows={4}
        value={draft.notes}
        onChange={(e) => update("notes", e.target.value)}
        placeholder={t("reservations.form.notePlaceholder")}
      />
    </Field>
  );

  // Edit Reservations.png shows only "Notify Guest (Optional)" over these
  // pills — no "Send Payment Link with" heading of its own (fix round 4,
  // finding 16). The heading (and the blue link-sent notice further down)
  // stay for Add, where the frame does draw both.
  const sendLinkSection = (
    <div>
      {mode === "add" && (
        <p className="mb-2 text-[12.5px] font-semibold text-[var(--octo-text-primary)]">
          {t("reservations.form.sendLinkWith")}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {CHANNELS.map((channel) => (
          <ChannelPill
            key={channel}
            checked={draft.sendLinkWith[channel]}
            label={
              channel === "WhatsApp"
                ? t("reservations.list.row.whatsapp")
                : channel === "Email"
                  ? t("reservations.list.row.email")
                  : t("marketing.channel.sms")
            }
            onToggle={() => toggleChannel(channel)}
          />
        ))}
      </div>
    </div>
  );

  const footer =
    mode === "add" ? (
      <>
        <Button variant="secondary" onClick={onClose} className={GREY_CANCEL}>
          {t("common.cancel")}
        </Button>
        <Button
          variant="secondary"
          disabled={!canSavePending}
          onClick={() => submit("pending")}
          className="!border-[#0D6EFD] !text-[#0D6EFD] hover:!bg-[#0D6EFD]/5"
        >
          {t("reservations.form.saveAsPending")}
        </Button>
        <Button variant="primary" icon={<Send size={14} />} disabled={!canConfirm} onClick={() => submit("confirm")}>
          {t("reservations.form.createAndSend")}
        </Button>
      </>
    ) : (
      <>
        <Button variant="secondary" onClick={onClose} className={GREY_CANCEL}>
          {t("common.cancel")}
        </Button>
        <Button
          variant="secondary"
          onClick={onRequestCancel}
          className="!border-transparent !bg-[var(--octo-tone-danger-bg)] !text-[var(--octo-tone-danger-text)] hover:!bg-[var(--octo-tone-danger-bg)]"
        >
          {t("reservations.form.cancelReservation")}
        </Button>
        <Button variant="primary" icon={<Send size={14} />} disabled={!canConfirm} onClick={() => submit("confirm")}>
          {t("reservations.form.createAndSend")}
        </Button>
      </>
    );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t(mode === "add" ? "reservations.form.addTitle" : "reservations.form.editTitle")}
      className="!max-w-[760px]"
      footer={footer}
    >
      <Tabs items={tabItems} value={activeTab} onChange={setActiveTab} />

      <div className="mt-4 max-h-[62vh] space-y-4 overflow-y-auto pe-1">
        {activeTab === "details" && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t("reservations.form.date")} required>
                {/* The frame shows a formatted date with a calendar icon, not the
                    browser's own "08/08/2026". Same approach as the filter
                    bar's date pill: formatted text, real input laid on top. */}
                <label className="relative flex cursor-pointer items-center justify-between rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-2 text-[12.5px] text-[var(--octo-text-primary)] transition-colors focus-within:border-[#0D6EFD] focus-within:ring-2 focus-within:ring-[#0D6EFD]/30">
                  <span dir="ltr">{draft.date ? formatDisplayDate(draft.date, locale) : "—"}</span>
                  <Calendar size={15} className="shrink-0 text-[var(--octo-text-muted)]" />
                  <input
                    type="date"
                    aria-label={t("reservations.form.date")}
                    value={draft.date}
                    onChange={(e) => update("date", e.target.value)}
                    onClick={(e) => openDatePicker(e.currentTarget)}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />
                </label>
              </Field>
              <Field label={t("reservations.form.time")} required>
                <Select value={String(draft.time)} onChange={(e) => update("time", Number(e.target.value))}>
                  {timeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label={t("reservations.form.partySize")} required>
                <Select value={String(draft.partySize)} onChange={(e) => update("partySize", Number(e.target.value))}>
                  {PARTY_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {guestsText(t, n)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("reservations.form.duration")}>
                <Select
                  value={String(draft.durationMinutes)}
                  onChange={(e) => update("durationMinutes", Number(e.target.value))}
                >
                  {durationOptions.map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {minutes % 60 === 0
                        ? t("reservations.form.durationHours").replace("{n}", String(minutes / 60))
                        : t("reservations.cancel.hoursMinutes")
                            .replace("{h}", String(hoursMinutesParts(minutes).h))
                            .replace("{m}", String(hoursMinutesParts(minutes).m))}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label={t("reservations.form.areaPreference")}>
                <Select value={draft.area} onChange={(e) => update("area", e.target.value)}>
                  {AREA_OPTIONS.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("reservations.form.tablePreference")}>
                <Select value={draft.table} onChange={(e) => update("table", e.target.value)}>
                  <option value="">{t("reservations.form.tableAny")}</option>
                  {tableOptions.map((table) => (
                    <option key={table} value={table}>
                      {tableLabel(table)}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            {mode === "add" ? (
              <div>
                <p className="mb-2 text-[12.5px] font-semibold text-[var(--octo-text-primary)]">
                  {t("reservations.form.source")}
                </p>
                <div role="radiogroup" className="flex flex-wrap gap-2">
                  {SOURCE_OPTIONS.map((source) => (
                    <SourceRadioPill
                      key={source}
                      active={draft.source === source}
                      label={t(SOURCE_LABEL_KEY[source])}
                      onSelect={() => update("source", source)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label={t("reservations.form.source")}>
                  <Input value={reservation?.source ?? ""} disabled />
                </Field>
                <Field label={t("reservations.form.reference")}>
                  <Input value={`#${reservation?.ref ?? ""}`} readOnly />
                </Field>
              </div>
            )}

            <div className="border-t border-[var(--octo-divider)] pt-4">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("reservations.form.deposit")}</p>
                <DepositSwitch
                  checked={draft.depositEnabled}
                  onChange={() => update("depositEnabled", !draft.depositEnabled)}
                  label={t("reservations.form.deposit")}
                />
              </div>

              {draft.depositEnabled && (
                <div className="mt-4 space-y-4">
                  <div className={clsx("grid grid-cols-1 gap-4 sm:grid-cols-2", mode === "edit" && "sm:grid-cols-3")}>
                    <Field label={t("reservations.form.depositAmount")}>
                      <div className="flex items-stretch rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] transition-colors focus-within:border-[#0D6EFD] focus-within:ring-2 focus-within:ring-[#0D6EFD]/30">
                        <span className="flex items-center border-e border-[var(--octo-divider)] px-3 text-[12.5px] font-semibold text-[var(--octo-text-secondary)]">
                          SAR
                        </span>
                        <input
                          type="number"
                          min={0}
                          value={draft.depositAmount}
                          onChange={(e) => update("depositAmount", e.target.value)}
                          className="w-full flex-1 rounded-e-[9px] bg-transparent px-3 py-2 text-[12.5px] text-[var(--octo-text-primary)] outline-none"
                        />
                      </div>
                    </Field>
                    <Field label={t("reservations.form.depositType")}>
                      <Select value={draft.depositType} onChange={(e) => update("depositType", e.target.value as DepositType)}>
                        {DEPOSIT_TYPE_OPTIONS.map((type) => (
                          <option key={type} value={type}>
                            {t(DEPOSIT_TYPE_LABEL_KEY[type])}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    {mode === "edit" && (
                      <Field label={t("reservations.form.depositStatus")}>
                        <Select
                          value={draft.depositState}
                          onChange={(e) => update("depositState", e.target.value as Exclude<DepositState, "none">)}
                          className={clsx(
                            "!w-auto !rounded-full !border-none !py-1 !text-[11px] !font-semibold",
                            draft.depositState === "paid"
                              ? "!bg-[var(--octo-tone-success-bg)] !text-[var(--octo-tone-success-text)]"
                              : "!bg-[var(--octo-track)] !text-[var(--octo-text-muted)]"
                          )}
                        >
                          {DEPOSIT_STATUS_OPTIONS.map((state) => (
                            <option key={state} value={state}>
                              {t(DEPOSIT_STATE_LABEL_KEY[state]).toUpperCase()}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    )}
                  </div>

                  {mode === "edit" && reservation?.deposit?.paidOn && (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[9px] bg-[#0D6EFD]/[0.06] px-3 py-2.5 text-[12px] text-[#0D6EFD]">
                      <span className="inline-flex items-center gap-2">
                        <Info size={14} className="shrink-0" />
                        {t("reservations.form.paidOn").replace("{when}", reservation.deposit.paidOn)}
                      </span>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={!onViewPayment}
                        title={onViewPayment ? undefined : t("reservations.list.actions.noBackend")}
                        onClick={onViewPayment}
                      >
                        {t("reservations.form.viewPayment")}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {mode === "add" && (
              <div>
                <div className="mb-2 flex items-baseline gap-1.5">
                  <span className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{t("reservations.form.tag")}</span>
                  <span className="text-[12px] text-[var(--octo-text-faint)]">{t("reservations.form.optional")}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={addTag}
                    disabled={remainingTagPresets.length === 0}
                    className="inline-flex items-center gap-1.5 rounded-[9px] border border-[#0D6EFD] px-3 py-[7px] text-[12px] font-medium text-[#0D6EFD] transition-colors hover:bg-[#0D6EFD]/5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                  >
                    <Plus size={13} />
                    {t("reservations.form.addTag")}
                  </button>
                  {draft.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 rounded-[9px] border border-[var(--octo-border-input)] px-3 py-[7px] text-[12px] font-medium text-[var(--octo-text-primary)]"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        aria-label={tag}
                        className="text-[var(--octo-text-muted)] transition-colors hover:text-[var(--octo-text-primary)]"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {mode === "edit" && (
              <>
                {noteField}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">
                    {t("reservations.form.notifyGuest")}{" "}
                    <span className="font-normal text-[var(--octo-text-faint)]">{t("reservations.form.optional")}</span>
                  </p>
                  <Checkbox
                    checked={draft.notifyGuest}
                    onChange={(e) => update("notifyGuest", e.target.checked)}
                    label={t("reservations.form.notifyAboutChanges")}
                  />
                </div>
              </>
            )}

            {sendLinkSection}
          </>
        )}

        {activeTab === "guest" && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t("reservations.form.firstName")} required>
                <Input
                  value={draft.firstName}
                  onChange={(e) => update("firstName", e.target.value)}
                  placeholder={t("reservations.form.firstNamePlaceholder")}
                />
              </Field>
              <Field label={t("reservations.form.lastName")} required>
                <Input
                  value={draft.lastName}
                  onChange={(e) => update("lastName", e.target.value)}
                  placeholder={t("reservations.form.lastNamePlaceholder")}
                />
              </Field>
            </div>

            <Field label={t("reservations.form.phone")} required>
              <div className="flex items-stretch rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] transition-colors focus-within:border-[#0D6EFD] focus-within:ring-2 focus-within:ring-[#0D6EFD]/30">
                <span className="flex items-center gap-1.5 border-e border-[var(--octo-border-input)] px-3 text-[12.5px] text-[var(--octo-text-primary)]">
                  <SaudiFlag />
                  +966
                </span>
                <input
                  value={draft.phoneDigits}
                  onChange={(e) => update("phoneDigits", e.target.value.replace(/\D/g, ""))}
                  placeholder="000 000 000"
                  className="w-full flex-1 rounded-e-[9px] bg-transparent px-3 py-2 text-[12.5px] text-[var(--octo-text-primary)] outline-none placeholder:text-[var(--octo-text-faint)]"
                />
              </div>
            </Field>

            <Field label={t("reservations.form.email")} optional={t("reservations.form.optional")}>
              <Input
                type="email"
                value={draft.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder={t("reservations.form.emailPlaceholder")}
              />
            </Field>
          </>
        )}

        {activeTab === "notes" && noteField}
      </div>

      {/* Add only (fix round 4, finding 16) — Edit Reservations.png has no
          equivalent notice; a link only ever goes out once, on creation. */}
      {mode === "add" && draft.depositEnabled && (
        // bg stays the original, softer 6% wash (re-review fix) — see the
        // matching note on the cancel dialog's Policy Preview box.
        <div className="mt-4 flex items-center gap-2 rounded-[9px] bg-[#0D6EFD]/[0.06] px-3 py-2.5 text-[12px] text-[var(--octo-tone-info-text)]">
          <Info size={14} className="shrink-0" />
          {t("reservations.form.linkNotice")}
        </div>
      )}
    </Modal>
  );
}
