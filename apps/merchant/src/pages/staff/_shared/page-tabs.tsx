import clsx from "clsx";

export interface PageTabItem<T extends string> {
  id: T;
  label: string;
}

// The underlined tab row from the Staff frames: 16px medium labels 32px apart,
// a hairline rail 8px below them that only runs under the tabs (not the whole
// page), and the active tab's stretch of the rail turned blue.
export function PageTabs<T extends string>({
  items,
  value,
  onChange,
  className,
  railClassName,
  ariaLabel,
}: {
  items: PageTabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  /** Kept for existing call sites; both tab rows are drawn at one size. */
  size?: "lg" | "md";
  className?: string;
  /** Extra classes for the rail, e.g. a min-width where the frame runs it past the last tab. */
  railClassName?: string;
  ariaLabel: string;
}) {
  return (
    <div className={clsx("octo-scroll max-w-full overflow-x-auto", className)}>
      <div
        role="tablist"
        aria-label={ariaLabel}
        className={clsx(
          "inline-flex min-w-max items-start gap-8 border-b border-[#e2e8f0] [[data-theme=dark]_&]:border-[var(--octo-border-card)]",
          railClassName
        )}
      >
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
                "-mb-px whitespace-nowrap border-b pb-3 pt-1 text-[16px] font-medium leading-4 transition-colors focus:outline-none focus-visible:text-[#0D6EFD]",
                active
                  ? "border-[#0D6EFD] text-[#0D6EFD]"
                  : "border-transparent text-[#58606c] hover:text-[var(--octo-text-primary)] [[data-theme=dark]_&]:text-[var(--octo-text-secondary)]"
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
