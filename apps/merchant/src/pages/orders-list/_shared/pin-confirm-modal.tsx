// apps/merchant/src/pages/orders-list/_shared/pin-confirm-modal.tsx
import { useState } from "react";
import { Modal } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { useAuth } from "@/app/providers/auth-provider";
import { PIN_LENGTH, PinInput } from "./pin-input";
import { FLOW_BACKDROP_CLASS, FLOW_MODAL_CLASS, PrimaryButton } from "./form-bits";

// The approver is the signed-in account, confirming with its own approval
// PIN. The frame's sample manager only stands in when there is no session.
const MANAGER_NAME = "Reem Al-Subaie";
const MANAGER_PHOTO_URL = new URL("../../../../../assets/Dashboard/icons/ord-flow-manager.png", import.meta.url).href;

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
  const { user } = useAuth();
  const approverName = user?.name?.trim() || null;
  const roleKey = `staff.role.${user?.role ?? ""}`;
  const approverRole = approverName && t(roleKey) !== roleKey ? t(roleKey) : t("orders.managerAuth.role");
  const [pin, setPin] = useState<string[]>(Array.from({ length: PIN_LENGTH }, () => ""));

  if (!open) return null;
  const complete = pin.every((digit) => digit !== "");
  const signedInAt = t("orders.managerAuth.todayAt").replace(
    "{time}",
    new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  );

  return (
    <Modal open onClose={onClose} title={t("orders.managerAuth.title")} className={FLOW_MODAL_CLASS} backdropClassName={FLOW_BACKDROP_CLASS}>
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3 rounded-[8px] bg-[#f5f9ff] p-3 [[data-theme=dark]_&]:bg-[#0d6efd]/15">
          {approverName ? (
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#0d6efd] text-[16px] font-bold uppercase text-white">
              {approverName.split(/\s+/).slice(0, 2).map((word) => word[0]).join("")}
            </span>
          ) : (
            <img src={MANAGER_PHOTO_URL} alt="" width={48} height={48} className="h-12 w-12 shrink-0 rounded-full object-cover" />
          )}
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-[16px] font-semibold leading-4 text-[var(--octo-text-primary)]">{approverName ?? MANAGER_NAME}</p>
            <p className="text-[14px] font-medium leading-[14px] text-[#0058da] [[data-theme=dark]_&]:text-[#0D6EFD]">
              {approverRole}
            </p>
            <p className="text-[12px] font-medium leading-3 text-[var(--octo-text-secondary)]">{signedInAt}</p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4">
          <p className="text-center text-[16px] leading-4 text-[var(--octo-text-secondary)]">{t(promptKey)}</p>
          <PinInput value={pin} onChange={setPin} />
          {errorText && <p className="text-center text-[12px] font-medium leading-[1.4] text-[#d30202]">{errorText}</p>}
        </div>

        <PrimaryButton
          label={t(confirmLabelKey)}
          accent={accent}
          disabled={!complete || submitting}
          onClick={() => onConfirm(pin.join(""))}
        />
      </div>
    </Modal>
  );
}
