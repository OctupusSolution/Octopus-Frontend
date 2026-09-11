import clsx from "clsx";

export interface PageTabItem<T extends string> {
  id: T;
  label: string;
}

// The underlined tab row from the Staff designs: the active tab turns blue,
// and the rule only runs under the tabs rather than across the whole page.
export function PageTabs<T extends string>({
  items,
  value,
  onChange,
  size = "lg",
  className,
  ariaLabel,
}: {
  items: PageTabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  size?: "lg" | "md";
  className?: string;
  ariaLabel: string;
}) {
  return (
    <div className={clsx("octo-scroll max-w-full overflow-x-auto", className)}>
      <div role="tablist" aria-label={ariaLabel} className="inline-flex min-w-max items-end gap-7 border-b border-[var(--octo-divider)]">
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
                "-mb-px whitespace-nowrap border-b-2 px-0.5 font-medium transition-colors focus:outline-none focus-visible:text-[#0D6EFD]",
                size === "lg" ? "pb-3 text-[16px]" : "pb-2.5 text-[15px]",
                active
                  ? "border-[#0D6EFD] text-[#0D6EFD]"
                  : "border-transparent text-[var(--octo-text-secondary)] hover:text-[var(--octo-text-primary)]"
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
