import type { ReactNode } from "react";
import clsx from "clsx";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={clsx("flex flex-col items-center justify-center gap-1 px-4 py-10 text-center", className)}>
      {icon && (
        <div className="mb-2 grid h-10 w-10 place-items-center rounded-full bg-[var(--octo-track)] text-[var(--octo-text-muted)]">
          {icon}
        </div>
      )}
      <h3 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{title}</h3>
      {description && (
        <p className="max-w-xs text-[12px] text-[var(--octo-text-muted)]">{description}</p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
