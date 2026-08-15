import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { forwardRef } from "react";
import clsx from "clsx";

const FIELD_BASE =
  "w-full rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-2 text-[12.5px] text-[var(--octo-text-primary)] placeholder:text-[var(--octo-text-faint)] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/30 focus:border-[#0D6EFD] disabled:cursor-not-allowed disabled:opacity-50";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, icon, className, id, ...props },
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
        {icon && (
          <span className="pointer-events-none absolute start-3 flex items-center text-[var(--octo-text-muted)]">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          id={id}
          className={clsx(FIELD_BASE, icon && "ps-8", error && "border-[#EF4444]", className)}
          aria-invalid={Boolean(error)}
          {...props}
        />
      </span>
      {error && <span className="text-[11px] text-[#EF4444]">{error}</span>}
    </label>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, className, id, ...props },
  ref
) {
  return (
    <label className="flex flex-col gap-1.5">
      {label && (
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
          {label}
        </span>
      )}
      <textarea
        ref={ref}
        id={id}
        className={clsx(FIELD_BASE, error && "border-[#EF4444]", className)}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {error && <span className="text-[11px] text-[#EF4444]">{error}</span>}
    </label>
  );
});
