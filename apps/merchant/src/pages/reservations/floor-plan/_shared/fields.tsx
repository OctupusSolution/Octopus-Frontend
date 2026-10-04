// Form controls drawn the way the Floor Plan frames draw them: 40px fields
// with 12px corners on a #cbd5e1 hairline, a medium label, and an optional
// quoted hint beside it ("Prefix "Optional""). `compact` is the inspector
// variant: a 12px label flush with the field instead of 14px inset by 8px.
import { useId, useState, type ReactNode } from "react";
import clsx from "clsx";
import { ShellIcon } from "@/shared/ui/shell-icon";
import { BORDER_300, SURFACE_100, SURFACE_WHITE, TEXT_PRIMARY, TEXT_SEC_GRAY, TEXT_SECONDARY } from "../../_shared/theme";

export function Field({
  label,
  hint,
  htmlFor,
  error,
  children,
  className,
  compact,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  error?: string;
  children: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={clsx("flex min-w-0 flex-col gap-2", className)}>
      <label
        htmlFor={htmlFor}
        className={clsx("font-medium", TEXT_PRIMARY, compact ? "text-[12px] leading-[12px]" : "px-2 text-[14px] leading-[14px]")}
      >
        {label}
        {hint && <span className={clsx("ms-1 text-[12px] leading-[12px]", TEXT_SECONDARY)}>“{hint}”</span>}
      </label>
      {children}
      {error && <p className="text-[12px] text-[var(--octo-tone-danger-text)]">{error}</p>}
    </div>
  );
}

const CONTROL = clsx(
  "h-10 w-full rounded-[12px] border px-2 text-[14px] transition-colors focus:border-[#0d6efd] focus:outline-none focus:ring-2 focus:ring-[#0d6efd]/25 disabled:cursor-not-allowed disabled:opacity-60",
  "placeholder:text-[#58606c] [[data-theme=dark]_&]:placeholder:text-[var(--octo-text-faint)]",
  SURFACE_WHITE
);

export interface Option<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

export function SelectField<T extends string>({
  label,
  hint,
  value,
  onChange,
  options,
  mixedLabel,
  className,
  disabled,
  compact,
  muted,
}: {
  label: string;
  hint?: string;
  value: T | null;
  onChange: (value: T) => void;
  options: readonly Option<T>[];
  /** Shown when `value` is null — a multi-selection whose values differ. */
  mixedLabel?: string;
  className?: string;
  disabled?: boolean;
  compact?: boolean;
  /** Draws the value in the secondary grey, as the Add Tables form does. */
  muted?: boolean;
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id} className={className} compact={compact}>
      <div className="relative">
        <select
          id={id}
          value={value ?? ""}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value as T)}
          className={clsx(CONTROL, BORDER_300, muted ? TEXT_SECONDARY : TEXT_PRIMARY, "appearance-none truncate pe-9")}
        >
          {value === null && (
            <option value="" disabled>
              {mixedLabel ?? "—"}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
              {option.hint ? ` “${option.hint}”` : ""}
            </option>
          ))}
        </select>
        <ShellIcon
          name="fp-builder-arrow-down.svg"
          size={24}
          className={clsx("pointer-events-none absolute end-2 top-1/2 -translate-y-1/2", muted ? TEXT_SECONDARY : TEXT_SEC_GRAY)}
        />
      </div>
    </Field>
  );
}

export function TextField({
  label,
  hint,
  value,
  onChange,
  placeholder,
  error,
  className,
  maxLength,
  inputMode,
  disabled,
  onBlur,
  compact,
  muted,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  className?: string;
  maxLength?: number;
  inputMode?: "text" | "numeric";
  disabled?: boolean;
  onBlur?: () => void;
  compact?: boolean;
  muted?: boolean;
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id} error={error} className={className} compact={compact}>
      <input
        id={id}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        inputMode={inputMode}
        disabled={disabled}
        onBlur={onBlur}
        aria-invalid={Boolean(error)}
        onChange={(event) => onChange(event.target.value)}
        className={clsx(CONTROL, muted ? TEXT_SECONDARY : TEXT_PRIMARY, error ? "border-[#d30202]" : BORDER_300)}
      />
    </Field>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  className,
  maxLength = 240,
  compact,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  maxLength?: number;
  compact?: boolean;
}) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} className={className} compact={compact}>
      <textarea
        id={id}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={2}
        onChange={(event) => onChange(event.target.value)}
        className={clsx(CONTROL, BORDER_300, TEXT_PRIMARY, "!h-auto min-h-[56px] resize-y py-2 leading-[18px]")}
      />
    </Field>
  );
}

/** "− 4 +" — minus in a grey disc, plus in a blue one, and the number itself
 *  typeable for anyone who wants 16 without pressing plus twelve times. */
export function NumberStepper({
  value,
  onChange,
  min,
  max,
  label,
  suffix,
  className,
  disabled,
}: {
  value: number | null;
  onChange: (value: number) => void;
  min: number;
  max: number;
  label: string;
  suffix?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? (value === null ? "" : String(value));

  function commit(next: number) {
    onChange(Math.min(max, Math.max(min, Math.round(next))));
  }

  return (
    <div
      className={clsx(
        "flex h-10 items-center justify-center gap-3 rounded-[12px] border px-2",
        BORDER_300,
        SURFACE_WHITE,
        disabled && "opacity-60",
        className
      )}
    >
      <button
        type="button"
        aria-label={`${label} −`}
        disabled={disabled || (value !== null && value <= min)}
        onClick={() => commit((value ?? min) - 1)}
        className={clsx("grid h-5 w-5 shrink-0 place-items-center rounded-full transition-opacity hover:opacity-80 disabled:opacity-40", SURFACE_100, TEXT_SECONDARY)}
      >
        <ShellIcon name="fp-builder-minus.svg" size={14} />
      </button>
      <span className="flex items-baseline gap-1">
        <input
          aria-label={label}
          inputMode="numeric"
          disabled={disabled}
          value={shown}
          placeholder="—"
          onChange={(event) => setText(event.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
          onBlur={() => {
            if (text !== null && text !== "") commit(Number(text));
            setText(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") (event.target as HTMLInputElement).blur();
          }}
          className={clsx("w-[3.2ch] bg-transparent text-center text-[14px] leading-none focus:outline-none", TEXT_PRIMARY)}
        />
        {suffix && <span className={clsx("text-[10px] leading-none", TEXT_SECONDARY)}>{suffix}</span>}
      </span>
      <button
        type="button"
        aria-label={`${label} +`}
        disabled={disabled || (value !== null && value >= max)}
        onClick={() => commit((value ?? min - 1) + 1)}
        className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#0d6efd] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        <ShellIcon name="fp-builder-plus.svg" size={14} />
      </button>
    </div>
  );
}
