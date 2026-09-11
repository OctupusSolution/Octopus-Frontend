import clsx from "clsx";

export type PillTone = "success" | "neutral" | "danger" | "warning" | "info";

const TONES: Record<PillTone, string> = {
  success: "bg-[var(--octo-tone-success-bg)] text-[var(--octo-tone-success-text)]",
  neutral: "bg-[var(--octo-tone-slate-bg)] text-[var(--octo-tone-slate-text)]",
  danger: "bg-[var(--octo-tone-danger-bg)] text-[var(--octo-tone-danger-text)]",
  warning: "bg-[var(--octo-tone-warning-bg)] text-[var(--octo-tone-warning-text)]",
  info: "bg-[var(--octo-tone-info-bg)] text-[var(--octo-tone-info-text)]",
};

export function StatusPill({ tone, label, className }: { tone: PillTone; label: string; className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-medium", TONES[tone], className)}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
