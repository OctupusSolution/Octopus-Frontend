// apps/merchant/src/pages/orders-list/_shared/refund-controls.tsx
//
// The Refund frames' own form controls. The same look exists on the Customers
// page, but a page slice may not import another page's internals, so it is
// reproduced here rather than shared.
import type { ReactNode } from "react";
import clsx from "clsx";
import { ShellIcon } from "@/shared/ui/shell-icon";

// The frames' field outline (#cbd5e1) has no token, so dark mode falls back to
// the input-border token.
const FIELD_BORDER = "border border-[#cbd5e1] [[data-theme=dark]_&]:border-[var(--octo-border-input)]";

const FOCUS =
  "transition-colors focus:border-[#0D6EFD] focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/25 [[data-theme=dark]_&]:focus:border-[#0D6EFD]";

const TINT = "bg-[#f5f9ff] [[data-theme=dark]_&]:bg-[#0d6efd]/15";

/** 738px dialog, 24px padding, 24px semibold title that stays put while the
 *  body scrolls (without a visible scrollbar) on a short viewport. */
export const REFUND_MODAL_CLASS =
  "max-w-[738px] flex max-h-[calc(100dvh-2rem)] flex-col sm:p-6 [&>div]:-mx-1 [&>div]:min-h-0 [&>div]:flex-1 [&>div]:overflow-y-auto [&>div]:px-1 [&>div]:[scrollbar-width:none] [&>div::-webkit-scrollbar]:hidden [&>h2]:text-[24px] [&>h2]:font-semibold [&>h2]:leading-6 [&>h2+div]:mt-6";

export const REFUND_BACKDROP_CLASS = "bg-black/60";

export const REFUND_INPUT_CLASS = `h-10 w-full rounded-[12px] ${FIELD_BORDER} bg-[var(--octo-card)] px-2 text-[14px] text-[var(--octo-text-primary)] placeholder:text-[var(--octo-text-secondary)] ${FOCUS}`;

export const REFUND_TEXTAREA_CLASS = `block h-[103px] w-full resize-none rounded-[12px] ${FIELD_BORDER} bg-[var(--octo-card)] px-3 py-2 text-[12px] font-medium leading-[1.4] text-[var(--octo-text-primary)] placeholder:text-[var(--octo-text-secondary)] ${FOCUS}`;

/** Sticks to the bottom of the scrolling body; the two shadows are a solid
 *  card-coloured backing so rows scrolling underneath never show through. */
export const REFUND_SUBMIT_CLASS =
  "sticky bottom-0 z-[1] h-12 w-full shrink-0 rounded-[8px] bg-[#0D6EFD] px-3 text-[18px] font-bold leading-[18px] text-white shadow-[0_-12px_0_0_var(--octo-card),0_8px_0_0_var(--octo-card)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-[#86b7fe] disabled:hover:opacity-100 [[data-theme=dark]_&]:disabled:bg-[#1f4a94]";

export function RefundFieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <p className="text-[14px] font-medium leading-[14px] text-[var(--octo-text-primary)]">
      {children}
      {required && (
        <span aria-hidden className="text-[#d30202]">
          {" *"}
        </span>
      )}
    </p>
  );
}

export interface RefundRadioOption<T extends string> {
  value: T;
  label: string;
}

export function RefundRadioCards<T extends string>({
  name,
  ariaLabel,
  options,
  value,
  onChange,
}: {
  name: string;
  ariaLabel: string;
  options: readonly RefundRadioOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="grid w-full grid-cols-2 gap-3 sm:gap-6">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <label
            key={option.value}
            className={clsx(
              "flex h-10 cursor-pointer items-center justify-between gap-2 rounded-[12px] border p-2 text-[14px] font-medium leading-[14px] text-[var(--octo-text-primary)] transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#0D6EFD]/25",
              active
                ? `border-[#0D6EFD] ${TINT}`
                : "border-[#cbd5e1] hover:bg-[var(--octo-hover)] [[data-theme=dark]_&]:border-[var(--octo-border-input)]"
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={active}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <span className="truncate">{option.label}</span>
            <ShellIcon
              name={active ? "form-radio-on.svg" : "form-radio-off.svg"}
              size={24}
              className={active ? "text-[#0D6EFD]" : "text-[#64748b] [[data-theme=dark]_&]:text-[var(--octo-text-muted)]"}
            />
          </label>
        );
      })}
    </div>
  );
}

/** One line of the item checklist. The frame draws an unticked box as the
 *  same filled tick in grey, not as an empty outline. */
export function RefundCheckRow({
  label,
  value,
  checked,
  onChange,
}: {
  label: string;
  value: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3">
      <span className="flex min-w-0 items-center gap-2 rounded-[4px] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#0D6EFD]/25">
        <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
        <ShellIcon
          name="form-checkbox-on.svg"
          size={24}
          className={checked ? "text-[#0D6EFD]" : "text-[#cbd5e1] [[data-theme=dark]_&]:text-[var(--octo-border-input)]"}
        />
        <span className="truncate text-[14px] font-medium leading-[14px] text-[var(--octo-text-primary)]">{label}</span>
      </span>
      <span className="shrink-0 text-end text-[16px] font-bold leading-4 text-[var(--octo-text-primary)]">{value}</span>
    </label>
  );
}

export function RefundSelect({
  value,
  onChange,
  ariaLabel,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="relative w-full">
      <select
        value={value}
        aria-label={ariaLabel}
        onChange={(event) => onChange(event.target.value)}
        className={clsx(
          `h-10 w-full appearance-none rounded-[12px] ${FIELD_BORDER} bg-[var(--octo-card)] pe-10 ps-2 text-[14px] ${FOCUS}`,
          value === "" ? "text-[var(--octo-text-secondary)]" : "text-[var(--octo-text-primary)]"
        )}
      >
        {children}
      </select>
      <ShellIcon
        name="form-arrow-down.svg"
        size={24}
        className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 text-[var(--octo-text-primary)]"
      />
    </div>
  );
}

/** The tinted "Refund Amount: SAR 186.00" strip. The cash frame's "Max Refund
 *  Amount" label is drawn in the primary text colour, the others in grey. */
export function RefundSummaryBar({ label, value, strongLabel }: { label: string; value: string; strongLabel?: boolean }) {
  return (
    <div className={`flex w-full items-center justify-between gap-3 rounded-[8px] p-3 ${TINT}`}>
      <span
        className={clsx(
          "text-[14px] font-medium leading-[14px]",
          strongLabel ? "text-[var(--octo-text-primary)]" : "text-[var(--octo-text-secondary)]"
        )}
      >
        {label}
      </span>
      <span className="shrink-0 text-end text-[16px] font-bold leading-4 text-[#0D6EFD]">{value}</span>
    </div>
  );
}
