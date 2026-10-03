// Form controls drawn the way the Floor Plan frames draw them: 44px fields
// with 10px corners, a medium label, and an optional quoted hint beside it
// ("Prefix "Optional"").
import { useId, useState, type ReactNode } from "react";
import { ChevronDown, Minus, Plus } from "lucide-react";
import clsx from "clsx";

export function Field({
  label,
  hint,
  htmlFor,
  error,
  children,
  className,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("flex min-w-0 flex-col gap-2", className)}>
      <label htmlFor={htmlFor} className="text-[14px] font-medium text-[var(--octo-text-primary)]">
        {label}
        {hint && <span className="ms-1.5 text-[12px] font-normal text-[var(--octo-text-muted)]">“{hint}”</span>}
      </label>
      {children}
      {error && <p className="text-[12px] text-[var(--octo-tone-danger-text)]">{error}</p>}
    </div>
  );
}

const CONTROL =
  "h-11 w-full rounded-[10px] border bg-[var(--octo-card)] px-3.5 text-[14px] text-[var(--octo-text-primary)] placeholder:text-[var(--octo-text-faint)] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/25 focus:border-[#0D6EFD] disabled:cursor-not-allowed disabled:opacity-60";

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
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id} className={className}>
      <div className="relative">
        <select
          id={id}
          value={value ?? ""}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value as T)}
          className={clsx(CONTROL, "appearance-none border-[var(--octo-border-input)] pe-10")}
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
        <ChevronDown size={18} className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-[var(--octo-text-secondary)]" />
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
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id} error={error} className={className}>
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
        className={clsx(CONTROL, error ? "border-[#EF4444]" : "border-[var(--octo-border-input)]")}
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  maxLength?: number;
}) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} className={className}>
      <textarea
        id={id}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={3}
        onChange={(event) => onChange(event.target.value)}
        className={clsx(CONTROL, "h-auto min-h-[76px] resize-y border-[var(--octo-border-input)] py-2.5")}
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
        "flex h-11 items-center justify-center gap-4 rounded-[10px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3",
        disabled && "opacity-60",
        className
      )}
    >
      <button
        type="button"
        aria-label={`${label} −`}
        disabled={disabled || (value !== null && value <= min)}
        onClick={() => commit((value ?? min) - 1)}
        className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--octo-track)] text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-border-input)] disabled:opacity-40"
      >
        <Minus size={14} strokeWidth={2.4} />
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
          className="w-[3.2ch] bg-transparent text-center text-[15px] font-medium text-[var(--octo-text-primary)] focus:outline-none"
        />
        {suffix && <span className="text-[11px] text-[var(--octo-text-muted)]">{suffix}</span>}
      </span>
      <button
        type="button"
        aria-label={`${label} +`}
        disabled={disabled || (value !== null && value >= max)}
        onClick={() => commit((value ?? min - 1) + 1)}
        className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#0D6EFD] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        <Plus size={14} strokeWidth={2.4} />
      </button>
    </div>
  );
}
