import type { ReactNode } from "react";

export type KpiTone = "default" | "success" | "warning" | "error";

const VALUE_COLOR: Record<KpiTone, string> = {
  default: "text-[var(--octo-text-primary)]",
  success: "text-[#16a34a]",
  warning: "text-[#c2660a]",
  error: "text-[#dc2626]",
};

export interface MiniKpiCardProps {
  label: string;
  value: string;
  tone?: KpiTone;
  meta?: ReactNode;
}

export function MiniKpiCard({ label, value, tone = "default", meta }: MiniKpiCardProps) {
  return (
    <article className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{label}</p>
      <p className={`mt-2 whitespace-nowrap text-[36px] font-bold leading-none tracking-[-0.02em] ${VALUE_COLOR[tone]}`}>
        {value}
      </p>
      {meta && <div className="mt-2.5 text-[11.5px] text-[var(--octo-text-muted)]">{meta}</div>}
    </article>
  );
}
