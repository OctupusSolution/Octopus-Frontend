import type { ReactNode } from "react";

// Generic analytics card chrome — icon + title + optional right-aligned action.
// All five Pattern-F report pages build their cards from this so the header row
// and card frame stay visually identical across the module.
export function ChartCard({
  icon,
  title,
  action,
  className,
  children,
}: {
  icon?: ReactNode;
  title: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`flex min-w-0 flex-col rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px] ${className ?? ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {icon && <span className="shrink-0 text-[var(--octo-text-muted)]">{icon}</span>}
          <h2 className="truncate text-[13px] font-semibold text-[var(--octo-text-primary)]">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
