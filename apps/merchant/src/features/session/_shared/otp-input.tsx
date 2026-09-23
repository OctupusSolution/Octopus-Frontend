// One-character boxes that behave like one field: typing advances,
// Backspace on an empty box steps back, arrows move, and pasting a whole code
// fills every box at once rather than dropping the rest of the digits.
import { useRef, type ChangeEvent, type ClipboardEvent, type KeyboardEvent } from "react";
import clsx from "clsx";
import { useI18n } from "@/app/providers/i18n-provider";

// The backend issues two different code lengths from two different
// generators — EmailVerificationOtpGenerator (signup) and OtpGenerator
// (password reset) — confirmed 2026-09-21 against a real Brevo delivery: a
// signup code arrived as 6 digits ("213805") while this dialog only showed 4
// boxes, silently truncating it. See EmailVerificationPolicy.CodeDigits (6)
// and OtpGenerator's hardcoded "D4" format (4) in the backend.
export const OTP_LENGTH_EMAIL_VERIFICATION = 6;
export const OTP_LENGTH_PASSWORD_RESET = 4;

export function OtpInput({
  value,
  onChange,
  invalid,
  length,
}: {
  /** Always exactly `length` entries; "" marks an empty box. */
  value: string[];
  onChange: (next: string[]) => void;
  invalid?: boolean;
  length: number;
}) {
  const { t } = useI18n();
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  function focusBox(index: number) {
    refs.current[Math.max(0, Math.min(length - 1, index))]?.focus();
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
    const digits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!digits) return;
    event.preventDefault();
    const next = Array.from({ length }, (_, i) => digits[i] ?? "");
    onChange(next);
    focusBox(digits.length);
  }

  return (
    // dir="ltr" on purpose: a numeric code reads left-to-right even in Arabic,
    // so the boxes must not mirror with the rest of the dialog.
    <div dir="ltr" className="flex items-center justify-center gap-3">
      {Array.from({ length }, (_, index) => (
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
          aria-label={t("auth.otp.digitLabel").replace("{n}", String(index + 1)).replace("{length}", String(length))}
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
