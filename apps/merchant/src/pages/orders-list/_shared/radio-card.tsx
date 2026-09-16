// apps/merchant/src/pages/orders-list/_shared/radio-card.tsx
import clsx from "clsx";

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
    <div role="radiogroup" className={clsx("grid grid-cols-2 gap-3", className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <label
            key={option.value}
            className={clsx(
              "flex cursor-pointer items-center justify-between gap-2 rounded-[10px] border px-4 py-3.5 text-[14px] font-medium text-[var(--octo-text-primary)] transition-colors",
              active
                ? "border-[#0D6EFD] bg-[#0D6EFD]/[0.04]"
                : "border-[var(--octo-border-input)] hover:bg-[var(--octo-hover)]"
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
            {option.label}
            <span
              className={clsx(
                "grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-[1.5px]",
                active ? "border-[#0D6EFD]" : "border-[var(--octo-crumb)]"
              )}
            >
              {active && <span className="h-[8px] w-[8px] rounded-full bg-[#0D6EFD]" />}
            </span>
          </label>
        );
      })}
    </div>
  );
}
