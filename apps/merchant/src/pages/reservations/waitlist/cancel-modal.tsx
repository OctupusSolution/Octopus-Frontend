import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { APPROVAL_PIN_MAX_DIGITS, APPROVAL_PIN_MIN_DIGITS, getWaitingListSettings } from "@octopus/api-client";
import { Modal } from "@ui/primitives";
import { useAuth } from "@/app/providers/auth-provider";
import { useI18n } from "@/app/providers/i18n-provider";
import { ManageApprovalPinLink } from "@/features/session/approval-pin";
import { useWaitlistExtraText } from "./_shared/extra-text";
import { BTN_PRIMARY, GRAY, INK, LINE, SURFACE_BLUE } from "./_shared/theme";
import { WaitlistIcon } from "./_shared/waitlist-icon";

export interface Cancellation {
  reasonCode: string | null;
  note: string;
  pin: string;
}

const DIALOG = "!max-w-[738px] !rounded-[12px] !p-6 !shadow-none";
const TITLE = "text-[24px] font-semibold leading-[24px] text-[#0E0E0E] [[data-theme=dark]_&]:text-[var(--octo-text-primary)]";
const LABEL = clsx(INK, "text-[14px] font-medium leading-[14px]");

/** A reason code as the settings store it ("no_show") read as a label. */
function reasonLabel(code: string): string {
  const words = code.replace(/[_-]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? ""}${parts.length > 1 ? parts[parts.length - 1][0] : ""}`.toUpperCase();
}

/** The two cancellation frames: why the party is leaving, then the manager's
 *  PIN. `count` is how many guests the cancellation covers. */
export function CancelWaitlistModal({ open, count, onClose, onConfirm }: { open: boolean; count: number; onClose: () => void; onConfirm: (cancellation: Cancellation) => void }) {
  const { t, locale } = useI18n();
  const text = useWaitlistExtraText();
  const { activeBusinessId, user } = useAuth();
  const [step, setStep] = useState<"reason" | "pin">("reason");
  const [reasons, setReasons] = useState<readonly string[]>([]);
  const [required, setRequired] = useState(false);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [pin, setPin] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const pinRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setStep("reason");
    setReason("");
    setNote("");
    setPin("");
    setSubmitted(false);
    if (!activeBusinessId) return;
    let live = true;
    // The reason list is the business's own; a failed load leaves it empty
    // and the server falls back to its default reason.
    getWaitingListSettings(activeBusinessId).then(
      (settings) => {
        if (!live) return;
        setReasons(settings.removeReasonCodes);
        setRequired(settings.requireRemoveReason);
      },
      () => undefined
    );
    return () => {
      live = false;
    };
  }, [open, activeBusinessId]);

  useEffect(() => {
    if (open && step === "pin") pinRef.current?.focus();
  }, [open, step]);

  const reasonMissing = required && reasons.length > 0 && !reason;
  const pinReady = pin.length >= APPROVAL_PIN_MIN_DIGITS;
  const boxes = Math.max(APPROVAL_PIN_MIN_DIGITS, Math.min(APPROVAL_PIN_MAX_DIGITS, pin.length + (pinReady ? 0 : 1)));
  const now = new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", { hour: "2-digit", minute: "2-digit", numberingSystem: "latn" }).format(new Date());

  if (step === "reason") {
    return (
      <Modal open={open} onClose={onClose} backdropClassName="bg-black/60" className={DIALOG}>
        <form
          noValidate
          className="flex flex-col gap-6"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(true);
            if (!reasonMissing) setStep("pin");
          }}
        >
          <h2 className={TITLE}>{count > 1 ? text.cancelTitleMany.replace("{n}", String(count)) : text.cancelTitle}</h2>
          <div className="flex flex-col gap-2">
            <label htmlFor="wl-cancel-reason" className={LABEL}>
              {text.cancelReason}
            </label>
            <span className="relative flex items-center">
              <select
                id="wl-cancel-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                aria-invalid={submitted && reasonMissing}
                className={clsx(
                  "h-10 w-full appearance-none rounded-[12px] border bg-transparent ps-2 pe-10 text-[14px] leading-[14px] focus:border-[#0D6EFD] focus:outline-none",
                  submitted && reasonMissing ? "border-[#D30202]" : LINE,
                  reason ? INK : GRAY
                )}
              >
                <option value="">{text.cancelReasonPlaceholder}</option>
                {reasons.map((code) => (
                  <option key={code} value={code}>
                    {reasonLabel(code)}
                  </option>
                ))}
              </select>
              <WaitlistIcon name="arrow-down.svg" className="pointer-events-none absolute end-2 text-[#687280]" />
            </span>
            {submitted && reasonMissing && (
              <p role="alert" className="text-[12px] text-[#D30202]">
                {text.cancelReasonRequired}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="wl-cancel-note" className={LABEL}>
              {t("waitlist.form.note")}
            </label>
            <textarea
              id="wl-cancel-note"
              value={note}
              maxLength={300}
              onChange={(e) => setNote(e.target.value)}
              className={clsx(INK, LINE, "h-[103px] w-full resize-none rounded-[12px] border bg-transparent px-3 py-2 text-[12px] font-medium leading-[1.4] focus:border-[#0D6EFD] focus:outline-none")}
            />
          </div>
          <button type="submit" className={clsx(BTN_PRIMARY, "w-full")}>
            {text.cancelNext}
          </button>
        </form>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} backdropClassName="bg-black/60" className={DIALOG}>
      <form
        noValidate
        className="flex flex-col items-center gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (pinReady) onConfirm({ reasonCode: reason || null, note: note.trim(), pin });
        }}
      >
        <h2 className={clsx(TITLE, "w-full")}>{text.cancelAuthTitle}</h2>
        <div className={clsx(SURFACE_BLUE, "flex w-full items-center gap-3 rounded-[8px] p-3")}>
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#0D6EFD] text-[16px] font-bold text-white">{initialsOf(user?.name ?? "")}</span>
          <div className="flex min-w-0 flex-col gap-1">
            <p className={clsx(INK, "truncate text-[16px] font-semibold leading-[16px]")}>{user?.name}</p>
            <p className="truncate text-[14px] font-medium leading-[14px] text-[#0058DA] [[data-theme=dark]_&]:text-[var(--octo-tone-info-text)]">{user?.role}</p>
            <p className={clsx(GRAY, "text-[12px] font-medium leading-[12px]")}>
              {text.cancelToday}, <span dir="ltr">{now}</span>
            </p>
          </div>
        </div>
        <div className="flex w-full flex-col items-center gap-4">
          <label htmlFor="wl-cancel-pin" className={clsx(GRAY, "w-full text-center text-[16px] leading-[16px]")}>
            {text.cancelPinPrompt}
          </label>
          <div dir="ltr" className="relative flex gap-4" onClick={() => pinRef.current?.focus()}>
            <input
              ref={pinRef}
              id="wl-cancel-pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, APPROVAL_PIN_MAX_DIGITS))}
              className="peer absolute inset-0 h-full w-full cursor-text opacity-0"
            />
            {Array.from({ length: boxes }, (_, i) => (
              <span
                key={i}
                aria-hidden
                className={clsx(
                  "grid h-[58px] w-[58px] place-items-center rounded-[8px] border bg-[#FBFAFC] text-[24px] font-semibold leading-[24px] text-[#0D6EFD] [[data-theme=dark]_&]:bg-[var(--octo-track)]",
                  i < pin.length ? "border-[#0D6EFD]" : clsx(LINE, i === pin.length && "peer-focus:border-[#0D6EFD]")
                )}
              >
                {i < pin.length ? "•" : ""}
              </span>
            ))}
          </div>
          {/* The backend answers "PIN not set" until the approver sets one —
              this is the only place in the console that can. */}
          <ManageApprovalPinLink />
        </div>
        <button
          type="submit"
          disabled={!pinReady}
          className="inline-flex h-12 w-full items-center justify-center rounded-[8px] bg-[#D30202] px-3 py-2 text-[18px] font-bold leading-[18px] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {text.cancelConfirm}
        </button>
      </form>
    </Modal>
  );
}
