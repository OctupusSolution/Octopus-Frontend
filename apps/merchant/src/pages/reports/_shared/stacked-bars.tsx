import type { ReactNode } from "react";
import { ChartCard } from "./chart-card";
import { useI18n } from "@/app/providers/i18n-provider";

export interface BarsSeries {
  key: string;
  labelKey: string;
  color: string;
}

export interface BarsPoint {
  period: string;
}

function valueAt(point: BarsPoint, key: string): number {
  const v = (point as unknown as Record<string, string | number>)[key];
  return typeof v === "number" ? v : Number(v) || 0;
}

// Stacked (or grouped) bar chart built from flex divs, like the dashboard's
// RevenueChannelChart — bar and tick positions are percentages so the plot
// reflows to any card height. `points` may come from any mock series that has
// a `period` field plus one numeric field per `series` entry.
export function StackedBarsCard({
  title,
  icon,
  series,
  points,
  axisMax,
  ticks,
  mode = "stacked",
  tickFormat,
}: {
  title: string;
  icon?: ReactNode;
  series: readonly BarsSeries[];
  points: readonly BarsPoint[];
  axisMax: number;
  ticks: readonly number[];
  mode?: "stacked" | "grouped";
  tickFormat?: (value: number) => string;
}) {
  const { t } = useI18n();
  const formatTick = (v: number) => (tickFormat ? tickFormat(v) : v === 0 ? "0" : `${v}K`);

  return (
    <ChartCard title={title} icon={icon}>
      <div className="mt-3 flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1.5">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 whitespace-nowrap text-[11px] text-[var(--octo-text-secondary)]">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
            {t(s.labelKey)}
          </span>
        ))}
      </div>

      <div className="mt-3 flex h-[200px] min-h-0 gap-2 sm:h-[220px]">
        <div className="relative w-[34px] shrink-0" aria-hidden="true">
          {ticks.map((tk) => (
            <span
              key={tk}
              className="absolute end-0 -translate-y-1/2 text-[10.5px] text-[var(--octo-text-faint)]"
              style={{ bottom: `${(tk / axisMax) * 100}%` }}
            >
              {formatTick(tk)}
            </span>
          ))}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="relative min-h-0 flex-1">
            {ticks.map((tk) => (
              <div
                key={tk}
                className="absolute inset-x-0 border-t border-dashed border-[var(--octo-border-card)]"
                style={{ bottom: `${(tk / axisMax) * 100}%` }}
                aria-hidden="true"
              />
            ))}

            <div className="absolute inset-0 flex justify-between">
              {points.map((point) => (
                <div
                  key={point.period}
                  title={point.period}
                  className={`flex w-[38px] ${
                    mode === "grouped" ? "items-end justify-center gap-[3px]" : "flex-col-reverse gap-[2px]"
                  }`}
                >
                  {series.map((s) => (
                    <div
                      key={s.key}
                      className={`${mode === "grouped" ? "w-[11px]" : "w-full"} rounded-[3px]`}
                      style={{
                        height: `${(valueAt(point, s.key) / axisMax) * 100}%`,
                        backgroundColor: s.color,
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-2 flex shrink-0 justify-between">
            {points.map((point) => (
              <span key={point.period} className="w-[38px] text-center text-[10.5px] text-[var(--octo-text-faint)]">
                {point.period}
              </span>
            ))}
          </div>
        </div>
      </div>
    </ChartCard>
  );
}
