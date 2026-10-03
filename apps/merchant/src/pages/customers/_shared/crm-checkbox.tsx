// apps/merchant/src/pages/customers/_shared/crm-checkbox.tsx
import type { ReactNode } from "react";
import clsx from "clsx";
import { ShellIcon } from "@/shared/ui/shell-icon";

/** The CRM frames' 24px checkbox: a filled blue tile when on, a grey outline
 *  with a faint tick when off. A real input sits on top so keyboard and
 *  screen-reader behaviour stay native. */
export function CrmCheckbox({
  checked,
  onChange,
  label,
  className,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  onChange: () => void;
  label?: ReactNode;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <label className={clsx("relative inline-flex cursor-pointer items-center gap-1", className)}>
      <span className="relative grid h-6 w-6 shrink-0 place-items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          aria-label={ariaLabel}
          className="peer absolute inset-0 z-10 h-6 w-6 cursor-pointer opacity-0"
        />
        {/* The tick is a hole in the mask, so it needs white behind it. */}
        {checked && <span className="absolute inset-[3px] bg-white" />}
        <ShellIcon
          name={checked ? "crm-checkbox-on.svg" : "crm-checkbox-off.svg"}
          size={24}
          className={clsx("relative", checked ? "text-[#0d6efd]" : "text-[#cbd5e1] [[data-theme=dark]_&]:text-[var(--octo-border-input)]")}
        />
        <span className="pointer-events-none absolute inset-0 rounded-[4px] peer-focus-visible:ring-2 peer-focus-visible:ring-[#0d6efd]/40" />
      </span>
      {label}
    </label>
  );
}
