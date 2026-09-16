// Four single-character boxes that behave like one field: typing advances,
// Backspace on an empty box steps back, arrows move, and pasting a whole code
// fills every box at once rather than dropping three of the four digits.
import { useRef, type ChangeEvent, type ClipboardEvent, type KeyboardEvent } from "react";
import clsx from "clsx";
import { useI18n } from "@/app/providers/i18n-provider";

export const OTP_LENGTH = 4;

export function OtpInput({
  value,
  onChange,
  invalid,
}: {
  /** Always exactly OTP_LENGTH entries; "" marks an empty box. */
  value: string[];
  onChange: (next: string[]) => void;
  invalid?: boolean;
}) {
  const { t } = useI18n();
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  function focusBox(index: number) {
    refs.current[Math.max(0, Math.min(OTP_LENGTH - 1, index))]?.focus();
  }

  function handleChange(index: number, event: ChangeEvent<HTMLInputElement>) {
    // Take the last digit typed, so overtyping a filled box replaces it
    // instead of being swallowed by the maxLength.
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
    const digits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!digits) return;
    event.preventDefault();
    const next = Array.from({ length: OTP_LENGTH }, (_, i) => digits[i] ?? "");
    onChange(next);
    focusBox(digits.length);
  }

  return (
    // dir="ltr" on purpose: a numeric code reads left-to-right even in Arabic,
    // so the boxes must not mirror with the rest of the dialog.
    <div dir="ltr" className="flex items-center justify-center gap-3">
      {Array.from({ length: OTP_LENGTH }, (_, index) => (
        <input
          key={index}
          ref={(el) => { refs.current[index] = el; }}
          value={value[index] ?? ""}
          onChange={(event) => handleChange(index, event)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={2}
          aria-label={t("auth.otp.digitLabel").replace("{n}", String(index + 1))}
          autoFocus={index === 0}
          className={clsx(
            "h-[64px] w-[64px] rounded-xl border bg-[var(--octo-card)] text-center text-[24px] font-semibold text-ocean-blue transition-colors",
            "focus:outline-none focus:ring-4 focus:ring-ocean-blue/15",
            invalid ? "border-[#EF4444]" : "border-[var(--octo-border-input)] focus:border-ocean-blue"
          )}
        />
      ))}
    </div>
  );
}
