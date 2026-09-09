// Task 11: the cancel-reservation dialog. Reuses the guest card and meta
// row lifted out of reservation-detail-modal.tsx (Task 10) into
// `_shared/guest-card.tsx` / `_shared/meta-row.tsx`, then adds the
// action-type/reason selects, an optional note, and a Policy Preview box
// whose four rows are derived from `refundPolicy` against the module's
// fixed `NOW_MINUTES` "now" — never `Date.now()` — so the preview is
// deterministic and matches the calendar's mock clock.
import { useEffect, useState, type ReactNode } from "react";
import clsx from "clsx";
import { Info } from "lucide-react";
import { Button, Modal, Select, Textarea } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import type { Reservation } from "@/shared/api/mock-reservations";
import { GuestCard } from "../_shared/guest-card";
import { MetaRow } from "../_shared/meta-row";
import { hoursMinutesParts, NOW_MINUTES, refundPolicy, type RefundPolicy } from "../_shared/model";

export interface CancelReservationModalProps {
  open: boolean;
  reservation: Reservation | null;
  onClose: () => void;
  onConfirm: (payload: { actionType: ActionType; reason: string; note: string }) => void;
}

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
// BANNER_CLASS already uses for confirmed/pending/expired, just with a
// visible border added for the "outline chip" look the frame draws.
const RESULT_CHIP_CLASS: Record<Tier, string> = {
  full: "border border-[#16A34A]/30 bg-[#16A34A]/10 text-[#15803D]",
  partial: "border border-[#F59E0B]/30 bg-[#F59E0B]/10 text-[#B45309]",
  none: "border border-[var(--octo-border-card)] bg-[var(--octo-track)] text-[var(--octo-text-secondary)]",
};

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
    <div className="flex flex-col gap-1.5">
      <span className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">
        {label}
        {required && <span className="text-[#EF4444]"> *</span>}
        {optional && <span className="ms-1.5 font-normal text-[var(--octo-text-faint)]">{optional}</span>}
      </span>
      {children}
    </div>
  );
}

// The Policy Preview box's label-left / value-right rows.
function PolicyRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between text-[12.5px]">
      <span className="text-[var(--octo-text-secondary)]">{label}</span>
      <span className="font-medium text-[var(--octo-text-primary)]">{value}</span>
    </div>
  );
}

export function CancelReservationModal({ open, reservation, onClose, onConfirm }: CancelReservationModalProps) {
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

  const policy = refundPolicy(reservation, NOW_MINUTES);
  const { h, m } = hoursMinutesParts(policy.minutesToEvent);
  const timeToEventText = t("reservations.cancel.hoursMinutes").replace("{h}", String(h)).replace("{m}", String(m));
  const depositText = reservation.deposit
    ? `${reservation.deposit.currency} ${reservation.deposit.amount} ${t("reservations.cancel.perReservation")}`
    : "—";

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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("reservations.cancel.title").replace("{ref}", reservation.ref)}
      className="!max-w-[620px]"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button variant="primary" className="flex-1 justify-center" disabled={!reason} onClick={handleConfirm}>
            {t("reservations.cancel.confirm")}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <GuestCard reservation={reservation} />
        <MetaRow reservation={reservation} />

        <div className="grid grid-cols-2 gap-3">
          <Field label={t("reservations.cancel.actionType")} required>
            <Select value={actionType} onChange={(e) => setActionType(e.target.value as ActionType)}>
              {ACTION_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.key)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("reservations.cancel.reason")} required>
            <Select value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="">{t("reservations.cancel.reasonPlaceholder")}</option>
              {REASON_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.key)}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label={t("reservations.cancel.note")} optional={t("reservations.cancel.noteOption")}>
          <Textarea
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("reservations.cancel.notePlaceholder")}
          />
        </Field>

        <div className="rounded-[9px] bg-[#0D6EFD]/[0.04] px-3.5 py-3">
          <div className="mb-2.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-[#0D6EFD]">
            <Info size={14} />
            {t("reservations.cancel.policyPreview")}
          </div>
          <div className="space-y-2">
            <PolicyRow label={t("reservations.cancel.timeToEvent")} value={timeToEventText} />
            <PolicyRow label={t("reservations.cancel.policy")} value={t(POLICY_SENTENCE_KEY[policy.tier])} />
            <PolicyRow label={t("reservations.cancel.deposit")} value={depositText} />
            <PolicyRow
              label={t("reservations.cancel.result")}
              value={
                <span
                  className={clsx(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                    RESULT_CHIP_CLASS[policy.tier]
                  )}
                >
                  {t(RESULT_LABEL_KEY[policy.tier])}
                </span>
              }
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
