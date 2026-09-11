// Form controls sized to the Staff designs: sentence-case labels above
// 44px-tall fields, as opposed to the console primitives' compact uppercase
// labels, which read too small on the member profile.
import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";

const CONTROL =
  "h-11 w-full rounded-[10px] border bg-[var(--octo-card)] px-3 text-[14px] text-[var(--octo-text-primary)] placeholder:text-[var(--octo-text-faint)] transition-colors focus:border-[#0D6EFD] focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/20 disabled:cursor-not-allowed disabled:opacity-60";

export function Field({
  label,
  error,
  hint,
  children,
  className,
  htmlFor,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={clsx("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-[var(--octo-text-primary)]">
        {label}
      </label>
      {children}
      {error ? (
        <span className="text-[12px] text-[var(--octo-tone-danger-text)]">{error}</span>
      ) : hint ? (
        <span className="text-[12px] text-[var(--octo-text-muted)]">{hint}</span>
      ) : null}
    </div>
  );
}

export const TextInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; leading?: ReactNode; trailing?: ReactNode }
>(function TextInput({ className, invalid, leading, trailing, ...props }, ref) {
  return (
    <span className="relative flex items-center">
      {leading && (
        <span aria-hidden className="pointer-events-none absolute start-3.5 flex items-center text-[var(--octo-text-muted)]">
          {leading}
        </span>
      )}
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={clsx(
          CONTROL,
          invalid ? "border-[#EF4444]" : "border-[var(--octo-border-input)]",
          leading && "ps-11",
          trailing && "pe-11",
          className
        )}
        {...props}
      />
      {trailing && <span className="absolute end-1.5 flex items-center">{trailing}</span>}
    </span>
  );
});

export const SelectInput = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(
  function SelectInput({ className, invalid, children, ...props }, ref) {
    return (
      <span className="relative flex items-center">
        <select
          ref={ref}
          aria-invalid={invalid || undefined}
          className={clsx(CONTROL, "appearance-none pe-10", invalid ? "border-[#EF4444]" : "border-[var(--octo-border-input)]", className)}
          {...props}
        >
          {children}
        </select>
        <ChevronDown size={18} className="pointer-events-none absolute end-3 text-[var(--octo-text-secondary)]" />
      </span>
    );
  }
);

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextArea(
  { className, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      className={clsx(CONTROL, "h-auto min-h-[88px] resize-y border-[var(--octo-border-input)] py-2.5", className)}
      {...props}
    />
  );
});
