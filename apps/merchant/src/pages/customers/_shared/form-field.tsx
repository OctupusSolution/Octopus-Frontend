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
    <div className={clsx("flex flex-col gap-3", className)}>
      <span className="px-2 text-[16px] font-medium leading-4 text-[var(--octo-text-primary)]">
        {label}
        {required && <span className="text-[#d30202]"> *</span>}
        {optional && <span className="ms-1.5 text-[12px] font-normal text-[var(--octo-text-secondary)]">{optional}</span>}
      </span>
      {children}
      {error && <span role="alert" className="-mt-1 px-2 text-[12px] text-[#d30202]">{error}</span>}
    </div>
  );
}
