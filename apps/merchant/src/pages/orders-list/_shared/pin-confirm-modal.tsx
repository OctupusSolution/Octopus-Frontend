// apps/merchant/src/pages/orders-list/_shared/pin-confirm-modal.tsx
import { useState } from "react";
import { Modal } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { PIN_LENGTH, PinInput } from "./pin-input";

export function PinConfirmModal({
  open,
  onClose,
  onConfirm,
  accent,
  promptKey,
  confirmLabelKey,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  accent: string;
  promptKey: string;
  confirmLabelKey: string;
}) {
  const { t } = useI18n();
  const [pin, setPin] = useState<string[]>(Array.from({ length: PIN_LENGTH }, () => ""));

  if (!open) return null;
  const complete = pin.every((digit) => digit !== "");

  return (
    <Modal open onClose={onClose} className="max-w-md">
      <h2 className="text-[17px] font-bold text-[var(--octo-text-primary)]">{t("orders.managerAuth.title")}</h2>

      {/* Static mock manager identity — same convention as this app's other
          mock-auth screens; no real PIN store exists yet, any 4 digits work. */}
      <div className="mt-4 flex items-center gap-3 rounded-[10px] bg-[var(--octo-hover)] p-3">
        <div className="h-10 w-10 shrink-0 rounded-full bg-[var(--octo-track)]" aria-hidden="true" />
        <div>
          <p className="text-[13px] font-semibold text-[var(--octo-text-primary)]">Reem Al-Subaie</p>
          <p className="text-[12px] font-medium text-[#0D6EFD]">{t("orders.managerAuth.role")}</p>
        </div>
      </div>

      <p className="mt-4 text-center text-[13px] text-[var(--octo-text-secondary)]">{t(promptKey)}</p>

      <div className="mt-4">
        <PinInput value={pin} onChange={setPin} />
      </div>

      <button
        type="button"
        disabled={!complete}
        onClick={onConfirm}
        className="mt-5 w-full rounded-[9px] py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        style={{ backgroundColor: accent }}
      >
        {t(confirmLabelKey)}
      </button>
    </Modal>
  );
}
