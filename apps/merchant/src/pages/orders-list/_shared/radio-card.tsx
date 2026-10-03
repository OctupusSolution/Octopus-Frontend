// apps/merchant/src/pages/orders-list/_shared/radio-card.tsx
import clsx from "clsx";
import { ShellIcon } from "@/shared/ui/shell-icon";
import { FLOW_FIELD_BORDER } from "./form-bits";

export interface RadioCardOption<T extends string> {
  value: T;
  label: string;
}

export function RadioCardGroup<T extends string>({
  name,
  options,
  value,
  onChange,
  className,
}: {
  name: string;
  options: readonly RadioCardOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div role="radiogroup" className={clsx("grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2", className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <label
            key={option.value}
            className={clsx(
              "flex h-10 cursor-pointer items-center justify-between gap-2 rounded-[12px] px-2 text-[14px] font-medium leading-[14px] text-[var(--octo-text-primary)] transition-colors focus-within:ring-2 focus-within:ring-[#0D6EFD]/25",
              active
                ? "border border-[#0D6EFD] bg-[#f5f9ff] [[data-theme=dark]_&]:bg-[#0d6efd]/15"
                : `${FLOW_FIELD_BORDER} hover:bg-[var(--octo-hover)]`
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
