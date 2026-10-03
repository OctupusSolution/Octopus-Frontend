// apps/merchant/src/pages/orders-list/_shared/pin-confirm-modal.tsx
import { useState } from "react";
import { Modal } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { PIN_LENGTH, PinInput } from "./pin-input";

// Static mock manager identity — same convention as this app's other
// mock-auth screens; no real PIN store exists yet, so any 4 digits work.
const MANAGER_NAME = "Reem Al-Subaie";
const MANAGER_INITIALS = "RA";

export function PinConfirmModal({
  open,
  onClose,
  onConfirm,
  accent,
  promptKey,
  confirmLabelKey,
  errorText,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  /** Called with the entered PIN. For a mock order this ignores it and
   *  always proceeds; for a real order (RealOrderRef present) the caller
   *  sends it on as the step-up approval and may reject via `errorText`. */
  onConfirm: (pin: string) => void;
  accent: string;
  promptKey: string;
  confirmLabelKey: string;
  /** Set after a real approval call comes back wrong (bad PIN, no PIN set,
   *  locked out, ...) — shown under the PIN boxes; absent for the mock flow. */
  errorText?: string | null;
  /** Disables the confirm button while a real approval call is in flight. */
  submitting?: boolean;
}) {
  const { t } = useI18n();
  const [pin, setPin] = useState<string[]>(Array.from({ length: PIN_LENGTH }, () => ""));

  if (!open) return null;
  const complete = pin.every((digit) => digit !== "");
  const signedInAt = t("orders.managerAuth.todayAt").replace(
    "{time}",
    new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  );

  return (
    <Modal open onClose={onClose} className="max-w-[720px]">
      <h2 className="text-[22px] font-bold text-[var(--octo-text-primary)]">{t("orders.managerAuth.title")}</h2>

      <div className="mt-5 flex items-center gap-3 rounded-xl bg-[#0D6EFD]/[0.05] p-3.5">
        <span
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#0D6EFD] text-[15px] font-bold text-white"
          aria-hidden="true"
        >
          {MANAGER_INITIALS}
        </span>
        <div>
          <p className="text-[14.5px] font-bold text-[var(--octo-text-primary)]">{MANAGER_NAME}</p>
          <p className="text-[13px] font-medium text-[#0D6EFD]">{t("orders.managerAuth.role")}</p>
          <p className="mt-0.5 text-[12px] text-[var(--octo-text-muted)]">{signedInAt}</p>
        </div>
      </div>

      <p className="mt-6 text-center text-[14px] text-[var(--octo-text-secondary)]">{t(promptKey)}</p>

      <div className="mt-4">
        <PinInput value={pin} onChange={setPin} />
      </div>

      {errorText && <p className="mt-3 text-center text-[12.5px] text-[#EF4444]">{errorText}</p>}

      <button
        type="button"
        disabled={!complete || submitting}
        onClick={() => onConfirm(pin.join(""))}
        className="mt-6 w-full rounded-[10px] py-3.5 text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        style={{ backgroundColor: accent }}
      >
        {t(confirmLabelKey)}
      </button>
    </Modal>
  );
}
