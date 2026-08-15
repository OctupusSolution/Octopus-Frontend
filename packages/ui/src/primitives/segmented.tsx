import type { ReactNode } from "react";
import clsx from "clsx";

export interface SegmentedOption {
  id: string;
  label: ReactNode;
}

export interface SegmentedProps {
  options: SegmentedOption[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Segmented({ options, value, onChange, className }: SegmentedProps) {
  return (
    <div
      className={clsx("inline-flex shrink-0 items-center rounded-[9px] bg-[var(--octo-seg-bg)] p-[3px]", className)}
    >
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.id)}
            className={clsx(
              "rounded-[7px] px-3 py-1.5 text-[11.5px] font-medium transition-colors",
              active ? "bg-[var(--octo-card)] text-[var(--octo-text-primary)] shadow-sm" : "text-[var(--octo-text-muted)]"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
