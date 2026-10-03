// The reservation draft and every field section, shared by the Add
// Reservation page (pages/reservations/new) and the Edit Reservation dialog
// (modals/reservation-form-modal.tsx). The two only differ in how they frame
// these fields — a two-step page versus a tabbed dialog — so the fields live
// here once rather than drifting apart in two copies.
import { type ReactNode } from "react";
import clsx from "clsx";
import { Calendar, Check, Info, Plus, X } from "lucide-react";
import { Button, Checkbox, Input, Select, Textarea } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import {
  branches,
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
} from "./model";
import { openDatePicker } from "./filter-bar";

export type FormMode = "add" | "edit";

const SOURCE_OPTIONS: readonly ReservationSource[] = ["Direct Booking", "Website", "Walk In", "Phone", "Instagram"];

const DEPOSIT_TYPE_OPTIONS: readonly DepositType[] = ["Pre Reservation", "Per Guest", "Full Prepayment"];

const DEPOSIT_TYPE_LABEL_KEY: Record<DepositType, string> = {
  "Pre Reservation": "reservations.form.depositType.preReservation",
  "Per Guest": "reservations.form.depositType.perGuest",
  "Full Prepayment": "reservations.form.depositType.fullPrepayment",
};

// Every non-"none" deposit state, so the edit-only Deposit Status select can
// represent whatever the reservation happens to be in — not just paid/unpaid.
const DEPOSIT_STATUS_OPTIONS: readonly Exclude<DepositState, "none">[] = [
  "unpaid", "paid", "link-sent", "expired", "failed", "refunded", "cancelled",
];

/** Seating areas when no floor plan supplies zones — the Edit dialog, whose
 *  fixture rows predate the floor plan. The Add page offers the floor's zones. */
export const DEFAULT_AREAS: readonly string[] = ["Main Dining", "Terrace", "Family Section", "Private Rooms"];

const PARTY_SIZE_OPTIONS = Array.from({ length: 20 }, (_, i) => i + 1);

export type Channel = "WhatsApp" | "SMS" | "Email";
const CHANNELS: readonly Channel[] = ["WhatsApp", "SMS", "Email"];

export interface DraftState {
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

export type UpdateDraft = <K extends keyof DraftState>(key: K, value: DraftState[K]) => void;

export function initDraft(mode: FormMode, reservation: Reservation | null): DraftState {
  if (mode === "edit" && reservation) {
    const [firstName, ...rest] = reservation.guest.split(" ");
    return {
      date: reservation.date,
      time: reservation.startMinutes,
      partySize: reservation.partySize,
      // The real value, never rounded to a whole hour: nine fixture rows are
      // 90-minute bookings, and rounding silently grew each by half an hour.
      durationMinutes: reservation.durationMinutes,
      area: reservation.area || DEFAULT_AREAS[0],
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
      // The Edit frame draws "Notify guest about changes" checked.
      notifyGuest: true,
    };
  }
  return {
    date: TODAY,
    time: NOW_MINUTES,
    partySize: 2,
    durationMinutes: 120,
    area: DEFAULT_AREAS[0],
    table: "",
    source: "Direct Booking",
    // The frames show the deposit section expanded as the starting state. The
    // amount stays blank rather than copying the mockup's "200".
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

/** Pending needs someone to reach; confirming also needs when and how many. */
export function draftValidity(draft: DraftState): { canSavePending: boolean; canConfirm: boolean } {
  const hasName = draft.firstName.trim() !== "" && draft.lastName.trim() !== "";
  const hasPhone = draft.phoneDigits.trim() !== "";
  const canSavePending = hasName && hasPhone;
  return { canSavePending, canConfirm: canSavePending && draft.date !== "" && draft.partySize > 0 };
}

export function buildReservation(
  draft: DraftState,
  mode: FormMode,
  reservation: Reservation | null,
  intent: "pending" | "confirm"
): Reservation {
  const guest = `${draft.firstName.trim()} ${draft.lastName.trim()}`.trim();
  const sendLinkChannels = CHANNELS.filter((channel) => draft.sendLinkWith[channel]);
  // A deposit with no amount isn't a deposit: the toggle starts on with the
  // amount blank, and saving that used to create a "SAR 0 · UNPAID" deposit.
  const depositAmount = Number(draft.depositAmount) || 0;
  const deposit: ReservationDeposit | undefined = draft.depositEnabled && depositAmount > 0
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
    // Empty means "no preference"; every renderer translates that itself.
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

/* ============================================================ Building blocks */

// Field labels in the frames are sentence case directly above the input —
// Input/Select's own `label` prop renders uppercase and tracking-wide, which
// the frames don't show, so every field renders its own label.
export function Field({
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

/** Every frame draws Cancel as a grey filled button, not the white outline of
 *  the shared "secondary" variant. */
export const GREY_CANCEL =
  "!border-transparent !bg-[var(--octo-track)] !text-[var(--octo-text-secondary)] hover:!bg-[var(--octo-hover)]";

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
        {/* Unchecked pills still show a faint check glyph in the frame. */}
        <Check size={10} strokeWidth={3} className={checked ? "text-white" : "text-[var(--octo-text-faint)]"} />
      </span>
      {label}
    </label>
  );
}

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

/** "A payment link will be sent to the guest after saving this reservation." */
export function LinkNotice({ className }: { className?: string }) {
  const { t } = useI18n();
  return (
    <div
      className={clsx(
        "flex items-center gap-2 rounded-[9px] bg-[#0D6EFD]/[0.06] px-3 py-2.5 text-[12px] text-[var(--octo-tone-info-text)]",
        className
      )}
    >
      <Info size={14} className="shrink-0" />
      {t("reservations.form.linkNotice")}
    </div>
  );
}

export function NoteField({ draft, update }: { draft: DraftState; update: UpdateDraft }) {
  const { t } = useI18n();
  return (
    <Field label={t("reservations.form.note")} sub={t("reservations.form.noteSub")}>
      <Textarea
        rows={4}
        value={draft.notes}
        onChange={(e) => update("notes", e.target.value)}
        placeholder={t("reservations.form.notePlaceholder")}
      />
    </Field>
  );
}

/* ================================================================= Sections */

export function ReservationDetailsFields({
  mode,
  draft,
  update,
  reservation,
  areaOptions,
  tableOptions,
  onViewPayment,
}: {
  mode: FormMode;
  draft: DraftState;
  update: UpdateDraft;
  reservation: Reservation | null;
  areaOptions: readonly string[];
  tableOptions: readonly string[];
  onViewPayment?: () => void;
}) {
  const { t, locale } = useI18n();
  const timeOptions = timeSlotOptions(draft.time);
  const durationOptions = durationMinuteOptions(draft.durationMinutes);
  const remainingTagPresets = availableTagPresets(draft.tags);
  // Keep the draft's own area selectable even if it isn't one of the offered
  // areas, so a controlled <select> never silently falls back to the first.
  const areas = areaOptions.includes(draft.area) || !draft.area ? areaOptions : [draft.area, ...areaOptions];

  const channelLabel = (channel: Channel) =>
    channel === "WhatsApp"
      ? t("reservations.list.row.whatsapp")
      : channel === "Email"
        ? t("reservations.list.row.email")
        : t("marketing.channel.sms");

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t("reservations.form.date")} required>
          {/* Formatted date with a calendar icon, as the frame shows, with the
              real input laid invisibly on top so the picker still opens. */}
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
          <Select value={String(draft.durationMinutes)} onChange={(e) => update("durationMinutes", Number(e.target.value))}>
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
            {areas.map((area) => (
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
          <p className="mb-2 text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{t("reservations.form.source")}</p>
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
            <Input value={reservation ? t(SOURCE_LABEL_KEY[reservation.source]) : ""} disabled />
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
              onClick={() => remainingTagPresets.length > 0 && update("tags", [...draft.tags, remainingTagPresets[0]])}
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
                  onClick={() => update("tags", draft.tags.filter((existing) => existing !== tag))}
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
          <NoteField draft={draft} update={update} />
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

      <div>
        {/* The Edit frame has only "Notify Guest" over these pills, no heading. */}
        {mode === "add" && (
          <p className="mb-2 text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{t("reservations.form.sendLinkWith")}</p>
        )}
        <div className="flex flex-wrap gap-2">
          {CHANNELS.map((channel) => (
            <ChannelPill
              key={channel}
              checked={draft.sendLinkWith[channel]}
              label={channelLabel(channel)}
              onToggle={() => update("sendLinkWith", { ...draft.sendLinkWith, [channel]: !draft.sendLinkWith[channel] })}
            />
          ))}
        </div>
      </div>
    </>
  );
}

export function GuestDetailsFields({
  draft,
  update,
  withNote = false,
}: {
  draft: DraftState;
  update: UpdateDraft;
  /** The Add page keeps the note on this tab; the Edit dialog gives it its own. */
  withNote?: boolean;
}) {
  const { t } = useI18n();
  return (
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
          <span dir="ltr" className="flex items-center gap-1.5 border-e border-[var(--octo-border-input)] px-3 text-[12.5px] text-[var(--octo-text-primary)]">
            <SaudiFlag />
            +966
          </span>
          <input
            dir="ltr"
            inputMode="tel"
            value={draft.phoneDigits}
            onChange={(e) => update("phoneDigits", e.target.value.replace(/\D/g, ""))}
            placeholder="000 000 000"
            className="w-full flex-1 rounded-e-[9px] bg-transparent px-3 py-2 text-[12.5px] text-[var(--octo-text-primary)] outline-none placeholder:text-[var(--octo-text-faint)] rtl:text-end"
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

      {withNote && <NoteField draft={draft} update={update} />}
    </>
  );
}
