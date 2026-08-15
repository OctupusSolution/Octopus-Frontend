import { TrendingUp, CircleCheck } from "lucide-react";
import { sparklinePaths } from "@/shared/lib/sparkline";
import type { KpiCard } from "@/shared/api/mock-dashboard";
import { useI18n } from "@/app/providers/i18n-provider";
import { labelKey } from "@/shared/lib/labels";

const SPARK_W = 320;
const SPARK_H = 62;

export function StatCard({ data, onClick }: { data: KpiCard; onClick?: () => void }) {
  const { line, area } = sparklinePaths(data.sparkline, SPARK_W, SPARK_H);
  const gradientId = `spark-${data.id}`;
  const { t } = useI18n();

  const interactive = Boolean(onClick);

  return (
    <article
      className={
        interactive
          ? "flex cursor-pointer flex-col overflow-hidden rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] transition-colors hover:border-[#0D6EFD]/50"
          : "flex flex-col overflow-hidden rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)]"
      }
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      <div className="px-[18px] pb-3 pt-[15px]">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
          {t(labelKey(data.label))}
        </p>
        <p className="mt-2 whitespace-nowrap text-[36px] font-bold leading-none tracking-[-0.02em] text-[var(--octo-text-primary)]">
          {data.value}
          {data.valueUnit ? ` ${t(data.valueUnit)}` : ""}
        </p>

        <div className="mt-2.5 flex items-center gap-1.5 text-[11.5px]">
          <TrendingUp size={13} className="text-[#16a34a]" strokeWidth={2.5} />
          <span className="font-semibold text-[#16a34a]">
            {data.delta}
            {data.deltaUnit ? ` ${t(data.deltaUnit)}` : ""}
          </span>
          <span className="text-[var(--octo-text-faint)]">{t(labelKey(data.deltaNote))}</span>
        </div>

        {data.subNote && (
          <div className="mt-1.5 flex items-center gap-1.5 text-[11.5px]">
            <CircleCheck size={13} className="text-[#2ec9c0]" strokeWidth={2.5} />
            <span className="text-[var(--octo-text-muted)]">{t(labelKey(data.subNote))}</span>
          </div>
        )}
      </div>

      {/* full-bleed area sparkline pinned to the bottom of the card */}
      <div className="mt-auto h-[62px] w-full">
        <svg
          viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
          preserveAspectRatio="none"
          className="h-full w-full"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={data.color} stopOpacity={0.32} />
              <stop offset="100%" stopColor={data.color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${gradientId})`} />
          <path
            d={line}
            fill="none"
            stroke={data.color}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </article>
  );
}
