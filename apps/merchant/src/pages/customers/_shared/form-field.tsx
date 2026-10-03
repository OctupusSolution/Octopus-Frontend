// apps/merchant/src/pages/customers/_shared/form-field.tsx
import clsx from "clsx";
import type { ReactNode } from "react";

export function Field({
  label,
  required,
  optional,
  error,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  optional?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={clsx("flex flex-col gap-2", className)}>
      <span className="px-1 text-[15px] font-medium text-[var(--octo-text-primary)]">
        {label}
        {required && <span className="text-[#EF4444]"> *</span>}
        {optional && <span className="ms-1.5 text-[12.5px] font-normal text-[var(--octo-text-muted)]">{optional}</span>}
      </span>
      {children}
      {error && <span role="alert" className="px-1 text-[12px] text-[#EF4444]">{error}</span>}
    </div>
  );
}
