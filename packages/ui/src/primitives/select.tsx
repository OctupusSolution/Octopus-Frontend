import type { SelectHTMLAttributes } from "react";
import { forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, className, id, children, ...props },
  ref
) {
  return (
    <label className="flex flex-col gap-1.5">
      {label && (
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
          {label}
        </span>
      )}
      <span className="relative flex items-center">
        <select
          ref={ref}
          id={id}
          className={clsx(
            "w-full appearance-none rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-2 pe-8 text-[12.5px] text-[var(--octo-text-primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/30 focus:border-[#0D6EFD] disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-[#EF4444]",
            className
          )}
          aria-invalid={Boolean(error)}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          size={14}
          className="pointer-events-none absolute end-2.5 text-[var(--octo-text-muted)]"
        />
      </span>
      {error && <span className="text-[11px] text-[#EF4444]">{error}</span>}
    </label>
  );
});
