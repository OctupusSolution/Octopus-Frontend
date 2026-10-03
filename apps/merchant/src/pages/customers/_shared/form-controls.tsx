// apps/merchant/src/pages/customers/_shared/form-controls.tsx
import type { ReactNode } from "react";
import clsx from "clsx";
import { useI18n } from "@/app/providers/i18n-provider";
import { ShellIcon } from "@/shared/ui/shell-icon";

// The frames' field outline (#cbd5e1) has no token, so dark mode falls back to
// the input-border token. The dark rule outranks a plain `focus:` utility,
// hence the explicit dark focus variants on each control.
export const FIELD_BORDER = "border border-[#cbd5e1] [[data-theme=dark]_&]:border-[var(--octo-border-input)]";

const FOCUS_WITHIN =
  "transition-colors focus-within:border-[#0D6EFD] focus-within:ring-2 focus-within:ring-[#0D6EFD]/25 [[data-theme=dark]_&]:focus-within:border-[#0D6EFD]";

const FOCUS =
  "focus:border-[#0D6EFD] focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/25 [[data-theme=dark]_&]:focus:border-[#0D6EFD]";

const INPUT_SHELL = `relative flex h-10 w-full items-center rounded-[12px] ${FIELD_BORDER} bg-[var(--octo-card)] px-2 text-[14px] ${FOCUS_WITHIN}`;

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
      <span className={clsx("flex-1 truncate", display ? "text-[var(--octo-text-primary)]" : "text-[var(--octo-text-secondary)]")}>{display || placeholder}</span>
      <ShellIcon name="form-calendar.svg" size={24} className="text-[var(--octo-text-primary)]" />
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

/** Radio rendered as an outlined card (the Add New Customer / Send Message
 *  gender choice). */
export function RadioBox({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onClick}
      className={clsx(
        "flex h-10 flex-1 items-center gap-2 rounded-[12px] px-2 text-[14px] font-medium leading-[14px] transition-colors",
        checked
          ? "border border-[#0D6EFD] text-[#0058da] [[data-theme=dark]_&]:text-[#0D6EFD]"
          : `${FIELD_BORDER} text-[var(--octo-text-secondary)]`
      )}
    >
      <RadioDot checked={checked} />
      {label}
    </button>
  );
}

export function RadioDot({ checked }: { checked: boolean }) {
  return (
    <ShellIcon
      name={checked ? "form-radio-on.svg" : "form-radio-off.svg"}
      size={24}
      className={checked ? "text-[#0D6EFD]" : "text-[#64748b] [[data-theme=dark]_&]:text-[var(--octo-text-muted)]"}
    />
  );
}

/** Checkbox + label inside an outlined chip (Add New Customer
 *  "Preference & Communication"). */
export function CheckboxPill({ label, checked, onClick, icon }: { label: string; checked: boolean; onClick: () => void; icon?: ReactNode }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onClick}
      className={clsx(
        "inline-flex h-10 items-center gap-2 rounded-[12px] px-2 text-[14px] font-semibold leading-[14px] transition-colors",
        checked
          ? "border border-[#0D6EFD] bg-[#f5f9ff] text-[#0D6EFD] [[data-theme=dark]_&]:bg-[#0d6efd]/15"
          : `${FIELD_BORDER} text-[var(--octo-text-secondary)]`
      )}
    >
      <ShellIcon
        name={checked ? "form-checkbox-on.svg" : "form-checkbox-off.svg"}
        size={24}
        className={checked ? "text-[#0D6EFD]" : "text-[#cbd5e1] [[data-theme=dark]_&]:text-[var(--octo-border-input)]"}
      />
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
    <div className="relative w-full">
      <select
        value={value}
        aria-label={ariaLabel}
        onChange={(event) => onChange(event.target.value)}
        className={clsx(
          `h-10 w-full appearance-none rounded-[12px] ${FIELD_BORDER} bg-[var(--octo-card)] pe-10 ps-2 text-[14px] ${FOCUS}`,
          placeholderShown ? "text-[var(--octo-text-secondary)]" : "text-[var(--octo-text-primary)]"
        )}
      >
        {children}
      </select>
      <ShellIcon name="form-arrow-down.svg" size={24} className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 text-[var(--octo-text-secondary)]" />
    </div>
  );
}

export const TEXT_INPUT_CLASS = `h-10 w-full rounded-[12px] ${FIELD_BORDER} bg-[var(--octo-card)] px-2 text-[14px] text-[var(--octo-text-primary)] placeholder:text-[var(--octo-text-secondary)] ${FOCUS}`;

export const TEXTAREA_CLASS = `w-full rounded-[12px] ${FIELD_BORDER} bg-[var(--octo-card)] px-2 py-3 text-[14px] text-[var(--octo-text-primary)] placeholder:text-[var(--octo-text-secondary)] ${FOCUS}`;

export const PRIMARY_SUBMIT_CLASS =
  "sticky bottom-0 z-[1] mt-6 h-12 w-full shrink-0 rounded-[8px] shadow-[0_-12px_0_0_var(--octo-card),0_8px_0_0_var(--octo-card)] bg-[#0D6EFD] px-3 text-[18px] font-bold leading-[18px] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-[#86b7fe] disabled:hover:opacity-100 [[data-theme=dark]_&]:disabled:bg-[#1f4a94]";
