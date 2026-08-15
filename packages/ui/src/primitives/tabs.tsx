import type { ReactNode } from "react";
import clsx from "clsx";

export interface TabItem {
  id: string;
  label: ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ items, value, onChange, className }: TabsProps) {
  return (
    <div role="tablist" className={clsx("flex items-center gap-5 border-b border-[var(--octo-divider)]", className)}>
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={clsx(
              "-mb-px border-b-2 pb-2 text-[12.5px] font-medium transition-colors",
              active
                ? "border-[#0D6EFD] text-[var(--octo-text-primary)]"
                : "border-transparent text-[var(--octo-text-muted)] hover:text-[var(--octo-text-primary)]"
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
