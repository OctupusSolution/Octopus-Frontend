import type { ReactNode } from "react";
import clsx from "clsx";

export interface StatItem {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
}

/** The rounded summary strip under the canvas. */
export function StatsBar({ items, className }: { items: StatItem[]; className?: string }) {
  return (
    <section
      className={clsx(
        "grid grid-cols-2 gap-y-2 rounded-2xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-3 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:grid-cols-3 lg:flex lg:items-center lg:px-1.5",
        className
      )}
    >
      {items.map((item, index) => (
        <div
          key={index}
          className={clsx(
            "flex min-w-0 items-center gap-2 px-2 lg:flex-1 lg:justify-center",
            index > 0 && "lg:border-s lg:border-[var(--octo-border-card)]"
          )}
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--octo-selected)] text-[#2563EB] [&>svg]:h-4 [&>svg]:w-4">{item.icon}</span>
          <span className="min-w-0">
            <span className="block truncate text-[11px] text-[var(--octo-text-secondary)]">{item.label}</span>
            <span className="block truncate text-[13.5px] font-semibold text-[var(--octo-text-primary)]">{item.value}</span>
            {item.sub && <span className="block truncate text-[10.5px] text-[var(--octo-text-muted)]">{item.sub}</span>}
          </span>
        </div>
      ))}
    </section>
  );
}
