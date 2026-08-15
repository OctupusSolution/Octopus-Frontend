import type { ReactNode } from "react";
import { ChartCard } from "./chart-card";
import { useI18n } from "@/app/providers/i18n-provider";

const SIZE = 172;
const STROKE = 15;
const R = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

export interface DonutItem {
  labelKey: string;
  value: string;
  percent: number;
  color: string;
}

// Multi-segment donut (no chart library): each segment is an SVG circle whose
// dash starts where the previous segment ended via a negative strokeDashoffset.
export function DonutCard({
  title,
  icon,
  caption,
  total,
  items,
}: {
  title: string;
  icon?: ReactNode;
  caption: string;
  total: string;
  items: readonly DonutItem[];
}) {
  const { t } = useI18n();
  let cumulative = 0;

  return (
    <ChartCard title={title} icon={icon}>
      <div className="relative mx-auto mt-4 grid place-items-center">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="var(--octo-track-ring)" strokeWidth={STROKE} />
          {items.map((item) => {
            const dash = (CIRC * item.percent) / 100;
            const seg = Math.max(dash - 2, 0); // tiny visual gap between segments
            const offset = -cumulative;
            cumulative += dash;
            return (
              <circle
                key={item.labelKey}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                fill="none"
                stroke={item.color}
                strokeWidth={STROKE}
                strokeDasharray={`${seg} ${CIRC - seg}`}
                strokeDashoffset={offset}
                transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
              />
            );
          })}
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-[11px] text-[var(--octo-text-faint)]">{caption}</span>
          <span className="text-[22px] font-bold leading-tight text-[var(--octo-text-primary)]">{total}</span>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li key={item.labelKey} className="flex items-center gap-2 text-[11.5px]">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="truncate text-[var(--octo-text-secondary)]">{t(item.labelKey)}</span>
            <span className="ms-auto shrink-0 font-medium text-[var(--octo-text-primary)]">{item.value}</span>
            <span className="w-11 shrink-0 text-end text-[var(--octo-text-faint)]">{item.percent}%</span>
          </li>
        ))}
      </ul>
    </ChartCard>
  );
}
