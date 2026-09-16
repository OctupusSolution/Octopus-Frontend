// apps/merchant/src/pages/orders-list/_shared/pin-input.tsx
// Same interaction as features/session/_shared/otp-input.tsx (type-advances,
// backspace-back, arrow keys, paste-fill), reimplemented locally: pages/
// orders-list doesn't reach into features/session under this codebase's
// layering, and this modal's boxes are smaller than the auth screen's.
import { useRef, type ChangeEvent, type ClipboardEvent, type KeyboardEvent } from "react";
import { useI18n } from "@/app/providers/i18n-provider";

export const PIN_LENGTH = 4;

export function PinInput({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const { t } = useI18n();
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  function focusBox(index: number) {
    refs.current[Math.max(0, Math.min(PIN_LENGTH - 1, index))]?.focus();
  }

  function handleChange(index: number, event: ChangeEvent<HTMLInputElement>) {
    const digit = event.target.value.replace(/\D/g, "").slice(-1);
    const next = [...value];
    next[index] = digit;
    onChange(next);
    if (digit) focusBox(index + 1);
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !value[index]) {
      event.preventDefault();
      const next = [...value];
      next[index - 1] = "";
      onChange(next);
      focusBox(index - 1);
      return;
    }
    if (event.key === "ArrowLeft") focusBox(index - 1);
    if (event.key === "ArrowRight") focusBox(index + 1);
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const digits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, PIN_LENGTH);
    if (!digits) return;
    event.preventDefault();
    const next = Array.from({ length: PIN_LENGTH }, (_, i) => digits[i] ?? "");
    onChange(next);
    focusBox(digits.length);
  }

  return (
    <div dir="ltr" className="flex items-center justify-center gap-3">
      {Array.from({ length: PIN_LENGTH }, (_, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          value={value[index] ?? ""}
          onChange={(event) => handleChange(index, event)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={2}
          aria-label={t("orders.managerAuth.pinDigitLabel").replace("{n}", String(index + 1))}
          autoFocus={index === 0}
          className="h-14 w-14 rounded-xl border border-[var(--octo-border-input)] bg-[var(--octo-card)] text-center text-[20px] font-semibold text-[#0D6EFD] transition-colors focus:outline-none focus:ring-4 focus:ring-[#0D6EFD]/15 focus:border-[#0D6EFD]"
        />
      ))}
    </div>
  );
}
