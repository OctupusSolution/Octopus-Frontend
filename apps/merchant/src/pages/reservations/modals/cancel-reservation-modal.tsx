// Task 11: the cancel-reservation dialog. Reuses the guest card and meta
// row lifted out of reservation-detail-modal.tsx (Task 10) into
// `_shared/guest-card.tsx` / `_shared/meta-row.tsx`, then adds the
// action-type/reason selects, an optional note, and a Policy Preview box
// whose four rows are derived from `refundPolicy` against the module's
// fixed `NOW_MINUTES` "now" — never `Date.now()` — so the preview is
// deterministic and matches the calendar's mock clock.
import { useEffect, useState, type ReactNode } from "react";
import clsx from "clsx";
import type { ReservationCancellationPreviewResponse } from "@octopus/api-client";
import { Modal } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import type { Reservation } from "@/shared/api/mock-reservations";
import { ShellIcon } from "@/shared/ui/shell-icon";
import { GuestCard } from "../_shared/guest-card";
import { MetaRow } from "../_shared/meta-row";
import { hoursMinutesParts, NOW_MINUTES, refundPolicy, type RefundPolicy } from "../_shared/model";
import {
  BORDER_300,
  SURFACE_100,
  SURFACE_WHITE,
  TEXT_BRAND_DEEP,
  TEXT_PRIMARY,
  TEXT_SEC_GRAY,
  TEXT_SECONDARY,
  TEXT_SUCCESS,
} from "../_shared/theme";
import { DIALOG_BACKDROP_CLASS, DIALOG_CLASS, DialogTitle, FOOTER_BUTTON } from "./reservation-detail-modal";

export interface CancelReservationModalProps {
  open: boolean;
  reservation: Reservation | null;
  /** The business's real refund bands applied to this reservation right now
   *  — null while it's still loading (or failed), in which case the preview
   *  falls back to its own local re-derivation of the policy. */
  preview: ReservationCancellationPreviewResponse | null;
  onClose: () => void;
  onConfirm: (payload: { actionType: ActionType; reason: string; note: string }) => void;
}

const OUTCOME_TIER: Record<ReservationCancellationPreviewResponse["outcome"], Tier> = {
  Full: "full",
  Partial: "partial",
  None: "none",
};

type Tier = RefundPolicy["tier"];

// "Mark as no show" is not a cancellation — ReservationStatus already keeps
// "No-show" and "Cancelled" distinct (see calendar/index.tsx:901, which sets
// "No-show" as its own action) — so Task 12's dispatch needs this out of
// onConfirm as a stable enum, not inferred from the (translated) reason
// string.
type ActionType = "guest" | "restaurant" | "no-show";

const ACTION_TYPE_OPTIONS: readonly { value: ActionType; key: string }[] = [
  { value: "guest", key: "reservations.cancel.action.byGuest" },
  { value: "restaurant", key: "reservations.cancel.action.byRestaurant" },
  { value: "no-show", key: "reservations.cancel.action.noShow" },
];

const REASON_OPTIONS = [
  { value: "changeOfPlans", key: "reservations.cancel.reason.changeOfPlans" },
  { value: "doubleBooking", key: "reservations.cancel.reason.doubleBooking" },
  { value: "weather", key: "reservations.cancel.reason.weather" },
  { value: "other", key: "reservations.cancel.reason.other" },
] as const;

const POLICY_SENTENCE_KEY: Record<Tier, string> = {
  full: "reservations.cancel.policyFull",
  partial: "reservations.cancel.policyPartial",
  none: "reservations.cancel.policyNone",
};

const RESULT_LABEL_KEY: Record<Tier, string> = {
  full: "reservations.cancel.resultFull",
  partial: "reservations.cancel.resultPartial",
  none: "reservations.cancel.resultNone",
};

// Green outline / amber / grey — the same hue families the detail dialog's
// banners use for confirmed/pending/expired, with the visible border of the
// frame's "outline chip". Green is the frame's own pair; amber and grey have
// no frame, so they follow it. Each tone carries its own dark-mode pair (fix
// round 4, finding 27).
const RESULT_CHIP_CLASS: Record<Tier, string> = {
  full: `border border-[#009a39] bg-[#dcffef] [[data-theme=dark]_&]:border-[#4ade80] [[data-theme=dark]_&]:bg-[rgb(34_197_94_/_0.16)] ${TEXT_SUCCESS}`,
  partial:
    "border border-[#d96703] bg-[#fff5e4] text-[#d96703] [[data-theme=dark]_&]:border-[#fbbf24] [[data-theme=dark]_&]:bg-[rgb(245_158_11_/_0.16)] [[data-theme=dark]_&]:text-[#fbbf24]",
  none: `border ${BORDER_300} ${SURFACE_WHITE} ${TEXT_SEC_GRAY}`,
};
const RESULT_CHIP = "inline-flex items-center rounded-full px-[9px] py-[5px] text-[12px] font-medium leading-3";

// The frame's 40px select / 78px note box: 12px radius, 1px #cbd5e1 border,
// 14px text.
const CONTROL_CLASS = `w-full rounded-[12px] border bg-transparent text-[14px] font-normal leading-[14px] transition-colors focus:border-[#0d6efd] focus:outline-none focus:ring-2 focus:ring-[#0d6efd]/30 ${BORDER_300} ${TEXT_PRIMARY}`;

// Field labels in the frame are sentence case directly above the control —
// Select's own `label` prop renders uppercase and tracking-wide, which the
// frame doesn't show, so every field renders its own label instead (same
// fix reservation-form-modal.tsx made for Task 9's fields).
function Field({
  label,
  required,
  optional,
  children,
}: {
  label: string;
  required?: boolean;
  optional?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-3">
      <span className={`px-2 text-[16px] font-medium leading-4 ${TEXT_PRIMARY}`}>
        {label}
        {required && <span className="text-[#d30202] [[data-theme=dark]_&]:text-[#f87171]"> *</span>}
        {optional && <span className={`ms-1 text-[14px] font-normal leading-[14px] ${TEXT_SEC_GRAY}`}>{optional}</span>}
      </span>
      {children}
    </label>
  );
}

// A real <select> drawn as the frame's 40px box, with the frame's own 24px
// arrow in place of the native one.
function SelectBox({
  value,
  onChange,
  arrowClassName,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  arrowClassName: string;
  children: ReactNode;
}) {
  return (
    <span className="relative block">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={clsx(CONTROL_CLASS, "h-10 appearance-none py-0 pe-10 ps-2 [&>option]:bg-white [&>option]:text-[#0f172a]")}
      >
        {children}
      </select>
      <ShellIcon
        name="rsv-arrow-down.svg"
        size={24}
        className={clsx("pointer-events-none absolute end-2 top-1/2 -translate-y-1/2", arrowClassName)}
      />
    </span>
  );
}

// The Policy Preview box's label-left / value-right rows.
function PolicyRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={`shrink-0 text-[12px] font-medium leading-3 ${TEXT_SECONDARY}`}>{label}</span>
      <span className={`min-w-0 text-end text-[14px] font-medium leading-[14px] [overflow-wrap:anywhere] ${TEXT_PRIMARY}`}>{value}</span>
    </div>
  );
}

export function CancelReservationModal({ open, reservation, preview, onClose, onConfirm }: CancelReservationModalProps) {
  const { t } = useI18n();
  const [actionType, setActionType] = useState<ActionType>(ACTION_TYPE_OPTIONS[0].value);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  // Reset the form whenever a fresh reservation is opened, so cancelling a
  // second reservation after a first doesn't inherit the previous guest's
  // reason and note.
  useEffect(() => {
    if (open) {
      setActionType(ACTION_TYPE_OPTIONS[0].value);
      setReason("");
      setNote("");
    }
  }, [open, reservation?.id]);

  if (!reservation) return null;

  // The countdown to the event is genuinely local (today's own clock against
  // the reservation's own time) — only the refund tier and its wording need
  // the server's real bands, so `refundPolicy` still supplies the former and
  // is the fallback for the latter until `preview` loads.
  const policy = refundPolicy(reservation, NOW_MINUTES);
  const { h, m } = hoursMinutesParts(policy.minutesToEvent);
  const timeToEventText = t("reservations.cancel.hoursMinutes").replace("{h}", String(h)).replace("{m}", String(m));
  const depositText = reservation.deposit
    ? `${reservation.deposit.currency} ${reservation.deposit.amount} ${t("reservations.cancel.perReservation")}`
    : "—";
  const tier: Tier = preview ? (OUTCOME_TIER[preview.outcome] ?? policy.tier) : policy.tier;
  const policySentence = preview ? preview.bandDescription : t(POLICY_SENTENCE_KEY[tier]);

  function handleConfirm() {
    if (!reason) return;
    // `reason` is free text (matches how reservation.cancelReason is stored
    // and displayed elsewhere, e.g. "Guest requested cancellation" in the
    // mock fixture) — pass the translated label, not the option key.
    // `actionType` stays the stable enum value so Task 12's dispatch can
    // branch on it directly instead of parsing a translated string.
    const selected = REASON_OPTIONS.find((option) => option.value === reason);
    onConfirm({ actionType, reason: selected ? t(selected.key) : reason, note });
  }

  const title = t("reservations.cancel.title").replace("{ref}", reservation.ref);

  return (
    <Modal open={open} onClose={onClose} title={title} className={DIALOG_CLASS} backdropClassName={DIALOG_BACKDROP_CLASS}>
      <div className="flex flex-col gap-4">
        <DialogTitle>{title}</DialogTitle>
        <GuestCard reservation={reservation} />
        <MetaRow reservation={reservation} />

        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <Field label={t("reservations.cancel.actionType")} required>
            <SelectBox value={actionType} onChange={(value) => setActionType(value as ActionType)} arrowClassName={TEXT_PRIMARY}>
              {ACTION_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.key)}
                </option>
              ))}
            </SelectBox>
          </Field>
          <Field label={t("reservations.cancel.reason")} required>
            <SelectBox value={reason} onChange={setReason} arrowClassName={TEXT_SECONDARY}>
              <option value="">{t("reservations.cancel.reasonPlaceholder")}</option>
              {REASON_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.key)}
                </option>
              ))}
            </SelectBox>
          </Field>
        </div>

        <Field label={t("reservations.cancel.note")} optional={t("reservations.cancel.noteOption")}>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("reservations.cancel.notePlaceholder")}
            className={clsx(
              CONTROL_CLASS,
              "block h-[78px] resize-none px-2 py-3 placeholder:text-[#687280] [[data-theme=dark]_&]:placeholder:text-[var(--octo-text-secondary)]"
            )}
          />
        </Field>

        {/* No refund policy applies to a no-show (fix round 4, finding 3) —
            it isn't a cancellation and no deposit is ever taken for it —
            so the whole preview is hidden rather than showing "Result:
            FULL REFUND" on a branch that refunds nothing. */}
        {actionType !== "no-show" && (
          <div className={`flex flex-col gap-1 rounded-[12px] px-3 py-2 ${SURFACE_100}`}>
            <div className={`flex items-center gap-1 text-[14px] font-medium leading-[14px] ${TEXT_BRAND_DEEP}`}>
              <ShellIcon name="rsv-modal-error-circle.svg" size={24} />
              {t("reservations.cancel.policyPreview")}
            </div>
            <div className="flex flex-col gap-3">
              <PolicyRow label={t("reservations.cancel.timeToEvent")} value={timeToEventText} />
              <PolicyRow label={t("reservations.cancel.policy")} value={policySentence} />
              <PolicyRow label={t("reservations.cancel.deposit")} value={depositText} />
              <PolicyRow
                label={t("reservations.cancel.result")}
                value={
                  // No deposit at all means there's nothing to refund,
                  // full stop — say so plainly instead of running it
                  // through the refund-tier wording, which used to read
                  // "FULL REFUND" on seven of eighteen fixture rows that
                  // carry no deposit (fix round 4, finding 4).
                  reservation.deposit ? (
                    <span className={clsx(RESULT_CHIP, RESULT_CHIP_CLASS[tier])}>{t(RESULT_LABEL_KEY[tier])}</span>
                  ) : (
                    <span className={clsx(RESULT_CHIP, RESULT_CHIP_CLASS.none)}>{t("reservations.cancel.resultNoDeposit")}</span>
                  )
                }
              />
            </div>
          </div>
        )}

        {/* 225 : 449 in the frame's 690px row — kept as a ratio so the pair
            shrinks together on a narrow screen. */}
        <div className="flex items-center gap-4">
          {/* Grey filled, as the frame draws it — not the white outline of
              the shared "secondary" variant. */}
          <button
            type="button"
            onClick={onClose}
            className={clsx(
              FOOTER_BUTTON,
              "min-w-0 flex-[225_1_0%] bg-[#e2e8f0] [[data-theme=dark]_&]:bg-[var(--octo-track)]",
              TEXT_SEC_GRAY
            )}
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            className={clsx(FOOTER_BUTTON, "min-w-0 flex-[449_1_0%] bg-[#0d6efd] text-white")}
            disabled={!reason}
            onClick={handleConfirm}
          >
            {t("reservations.cancel.confirm")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
