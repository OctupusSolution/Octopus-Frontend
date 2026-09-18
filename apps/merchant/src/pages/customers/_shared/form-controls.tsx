// apps/merchant/src/pages/customers/_shared/form-controls.tsx
import type { ReactNode } from "react";
import clsx from "clsx";
import { CalendarDays, Check } from "lucide-react";
import { useI18n } from "@/app/providers/i18n-provider";

const INPUT_SHELL =
  "relative flex h-10 w-full items-center rounded-[8px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 text-[14px] transition-colors focus-within:border-[#0D6EFD] focus-within:ring-2 focus-within:ring-[#0D6EFD]/25";

/**
 * Date input shown the way the frames draw it — "15 Sep" (or a placeholder)
 * with a calendar icon at the end — backed by a real `<input type="date">`
 * that covers the field invisibly and opens the browser's picker on click.
 */
export function DateField({
  value,
  onChange,
  placeholder,
  ariaLabel,
  withYear,
}: {
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  ariaLabel: string;
  withYear?: boolean;
}) {
  const { locale } = useI18n();
  const display = value
    ? new Date(`${value}T00:00:00`).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-GB", { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) })
    : "";
  return (
    <div className={INPUT_SHELL}>
      <span className={clsx("flex-1 truncate", display ? "text-[var(--octo-text-primary)]" : "text-[var(--octo-text-muted)]")}>{display || placeholder}</span>
      <CalendarDays size={20} strokeWidth={1.5} className="shrink-0 text-[var(--octo-text-primary)]" />
      <input
        type="date"
        aria-label={ariaLabel}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onClick={(event) => {
          try {
            event.currentTarget.showPicker?.();
          } catch {
            /* showPicker throws outside a user gesture in some browsers; the native control still works */
          }
        }}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </div>
  );
}

/** Radio rendered as an outlined box (add new customer.png / send
 *  message.png gender choice). */
export function RadioBox({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onClick}
      className={clsx(
        "flex h-10 flex-1 items-center gap-2.5 rounded-[8px] border px-3 text-[14px] transition-colors",
        checked ? "border-[#0D6EFD] text-[#0D6EFD]" : "border-[var(--octo-border-input)] text-[var(--octo-text-primary)]"
      )}
    >
      <RadioDot checked={checked} />
      {label}
    </button>
  );
}

export function RadioDot({ checked }: { checked: boolean }) {
  return (
    <span className={clsx("grid h-5 w-5 shrink-0 place-items-center rounded-full border-[1.5px]", checked ? "border-[#0D6EFD]" : "border-[var(--octo-text-muted)]")}>
      {checked && <span className="h-3 w-3 rounded-full bg-[#0D6EFD]" />}
    </span>
  );
}

/** Checkbox + label inside an outlined pill (add new customer.png
 *  "Preference & Communication"). */
export function CheckboxPill({ label, checked, onClick, icon }: { label: string; checked: boolean; onClick: () => void; icon?: ReactNode }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onClick}
      className={clsx(
        "inline-flex h-10 items-center gap-2 rounded-[8px] border px-2.5 text-[14px] font-medium transition-colors",
        checked ? "border-[#0D6EFD] bg-[#0D6EFD]/[0.04] text-[#0D6EFD]" : "border-[var(--octo-border-input)] text-[var(--octo-text-secondary)]"
      )}
    >
      <span
        className={clsx(
          "grid h-5 w-5 shrink-0 place-items-center rounded-[4px] border",
          checked ? "border-[#0D6EFD] bg-[#0D6EFD] text-white" : "border-[var(--octo-border-input)] text-[var(--octo-text-faint)]"
        )}
      >
        <Check size={13} strokeWidth={checked ? 3 : 2} />
      </span>
      {icon}
      {label}
    </button>
  );
}

/** A native select styled like the frames' 40px dropdowns. */
export function SelectBox({
  value,
  onChange,
  children,
  ariaLabel,
  placeholderShown,
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  ariaLabel?: string;
  placeholderShown?: boolean;
}) {
  return (
    <select
      value={value}
      aria-label={ariaLabel}
      onChange={(event) => onChange(event.target.value)}
      className={clsx(
        "h-10 w-full appearance-none rounded-[8px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] bg-no-repeat pe-10 ps-3 text-[14px] focus:border-[#0D6EFD] focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/25",
        "bg-[length:20px] bg-[position:right_12px_center] rtl:bg-[position:left_12px_center]",
        placeholderShown ? "text-[var(--octo-text-muted)]" : "text-[var(--octo-text-primary)]"
      )}
      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m4 8 8 8 8-8'/%3E%3C/svg%3E")` }}
    >
      {children}
    </select>
  );
}

export const TEXT_INPUT_CLASS =
  "h-10 w-full rounded-[8px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 text-[14px] text-[var(--octo-text-primary)] placeholder:text-[var(--octo-text-muted)] focus:border-[#0D6EFD] focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/25";

export const TEXTAREA_CLASS =
  "w-full rounded-[8px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-2.5 text-[14px] text-[var(--octo-text-primary)] placeholder:text-[var(--octo-text-muted)] focus:border-[#0D6EFD] focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/25";

export const PRIMARY_SUBMIT_CLASS =
  "mt-6 h-12 w-full rounded-[8px] bg-[#0D6EFD] text-[17px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";
