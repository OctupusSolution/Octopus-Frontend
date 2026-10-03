// apps/merchant/src/pages/orders-list/_shared/pin-input.tsx
// Same interaction as features/session/_shared/otp-input.tsx (type-advances,
// backspace-back, arrow keys, paste-fill), reimplemented locally: pages/
// orders-list doesn't reach into features/session under this codebase's
// layering, and this modal's boxes are smaller than the auth screen's.
import { useRef, type ChangeEvent, type ClipboardEvent, type KeyboardEvent } from "react";
import clsx from "clsx";
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
    <div dir="ltr" className="flex items-center justify-center gap-4">
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
          className={clsx(
            "h-[58px] w-[58px] rounded-[8px] border bg-[#fbfafc] p-0 text-center text-[24px] font-semibold leading-6 text-[#0D6EFD] transition-colors focus:border-[#0D6EFD] focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/25 [[data-theme=dark]_&]:bg-[var(--octo-soft-bg)] [[data-theme=dark]_&]:focus:border-[#0D6EFD]",
            // A filled box keeps the blue outline the frame draws on its "5".
            value[index] ? "border-[#0D6EFD]" : "border-[#cbd5e1] [[data-theme=dark]_&]:border-[var(--octo-border-input)]"
          )}
        />
      ))}
    </div>
  );
}
