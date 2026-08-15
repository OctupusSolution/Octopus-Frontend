import type { InputHTMLAttributes } from "react";
import { forwardRef } from "react";
import { Check } from "lucide-react";
import clsx from "clsx";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, className, id, ...props },
  ref
) {
  return (
    <label className={clsx("inline-flex items-center gap-2 text-[12.5px] text-[var(--octo-text-primary)]", className)}>
      <span className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center">
        <input
          ref={ref}
          id={id}
          type="checkbox"
          className="peer absolute inset-0 h-4 w-4 cursor-pointer appearance-none rounded-[4px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] transition-colors checked:border-[#0D6EFD] checked:bg-[#0D6EFD] disabled:cursor-not-allowed disabled:opacity-50"
          {...props}
        />
        <Check
          size={11}
          strokeWidth={3}
          className="pointer-events-none relative hidden text-white peer-checked:block"
        />
      </span>
      {label && <span>{label}</span>}
    </label>
  );
});
