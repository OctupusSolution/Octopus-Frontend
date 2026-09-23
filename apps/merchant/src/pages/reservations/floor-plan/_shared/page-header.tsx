import { setSyncError, useSyncError } from "@/entities/floor-plan";
import type { ReactNode } from "react";
import clsx from "clsx";

export function PageShell({
  children,
  className,
  fill,
}: {
  children: ReactNode;
  className?: string;
  /** Fills the routed viewport height instead of growing with its content, so a
   *  screen with a fixed-height working area (the floor plan editor) needs no
   *  page-level scroll — only the working area scrolls internally. */
  fill?: boolean;
}) {
  return (
    <div
      className={clsx(
        fill ? "flex h-full min-h-0 flex-col px-4 pb-4 pt-5 sm:px-8 sm:pt-6" : "px-4 pb-10 pt-5 sm:px-8 sm:pt-7",
        className
      )}
    >
      <SyncErrorBar />
      {children}
    </div>
  );
}

function SyncErrorBar() {
  const error = useSyncError();
  if (!error) return null;
  return (
    <div role="alert" className="mb-3 flex items-center justify-between gap-3 rounded-[10px] bg-error/10 px-4 py-2.5 text-[13px] text-error">
      <span>{error}</span>
      <button type="button" className="shrink-0 underline" onClick={() => setSyncError(null)}>
        OK
      </button>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  badge,
  aside,
}: {
  title: string;
  subtitle?: ReactNode;
  badge?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[24px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[27px]">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="mt-1.5 text-[14px] text-[var(--octo-text-secondary)] sm:text-[15px]">{subtitle}</p>}
      </div>
      {aside}
    </header>
  );
}
