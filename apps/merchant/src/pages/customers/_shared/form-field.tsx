// apps/merchant/src/pages/customers/_shared/form-field.tsx
import clsx from "clsx";
import type { ReactNode } from "react";

export function Field({
  label,
  required,
  optional,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  optional?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={clsx("flex flex-col gap-1.5", className)}>
      <span className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">
        {label}
        {required && <span className="text-[#EF4444]"> *</span>}
        {optional && <span className="ms-1.5 font-normal text-[var(--octo-text-faint)]">{optional}</span>}
      </span>
      {children}
    </div>
  );
}
