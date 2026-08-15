import { BarChart3, SlidersHorizontal } from "lucide-react";
import {
  revenueByQuarter,
  revenueAxisMax,
  revenueAxisTicks,
} from "@/shared/api/mock-dashboard";
import { useI18n } from "@/app/providers/i18n-provider";

const LINE_COLOR = "#0D6EFD";

const VIEW_W = 700;
const VIEW_H = 220;

/** Catmull-Rom -> cubic bezier smoothing, so the line reads as a soft curve
    instead of straight segments between quarters. */
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export interface RevenueChannelChartProps {
  /** number of trailing quarters to render (defaults to all) */
  quarters?: number;
  /** range label shown in the pill (defaults to dashboard.revenueByChannel.range) */
  rangeLabel?: string;
}

export function RevenueChannelChart({ quarters, rangeLabel }: RevenueChannelChartProps) {
  const { t } = useI18n();

  const data = quarters ? revenueByQuarter.slice(-quarters) : revenueByQuarter;
  const n = data.length;
  const xFor = (i: number) => (n === 1 ? VIEW_W / 2 : (i / (n - 1)) * VIEW_W);
  const yFor = (value: number) => VIEW_H - (value / revenueAxisMax) * VIEW_H;

  const totalByQuarter = data.map(
    (bar) => bar.dineIn + bar.takeaway + bar.delivery + bar.kiosk + bar.aggregator
  );
  const points = totalByQuarter.map((value, i) => ({ x: xFor(i), y: yFor(value) }));
  const linePath = smoothPath(points);

  return (
    <section className="flex h-[280px] min-h-0 flex-col rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px] sm:h-[300px]">
      <div className="flex shrink-0 items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <BarChart3 size={15} className="mt-0.5 text-[var(--octo-text-muted)]" />
          <div>
            <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("dashboard.revenueByChannel")}</h2>
            <p className=" pb-5 text-[11px] text-[var(--octo-text-faint)]">{t("dashboard.revenueByChannel.subtitle")}</p>
            
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-[#e8f1ff] px-3 py-1.5 text-[11.5px] font-medium text-[#0D6EFD]">
          <SlidersHorizontal size={12} />
          {rangeLabel ? t(rangeLabel) : t("dashboard.revenueByChannel.range")}
        </span>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 gap-2">
        {/* Y axis */}
        <div className="relative w-[34px] shrink-0" aria-hidden="true">
          {revenueAxisTicks.map((tick) => (
            <span
              key={tick}
              className="absolute end-0 -translate-y-1/2 text-[10.5px] text-[var(--octo-text-faint)]"
              style={{ bottom: `${(tick / revenueAxisMax) * 100}%` }}
            >
              {tick === 0 ? "0" : `${tick}K`}
            </span>
          ))}
        </div>

        {/* Plot */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="relative min-h-0 flex-1">
            {revenueAxisTicks.map((tick) => (
              <div
                key={tick}
                className="absolute inset-x-0 border-t border-dashed border-[var(--octo-border-card)]"
                style={{ bottom: `${(tick / revenueAxisMax) * 100}%` }}
                aria-hidden="true"
              />
            ))}

            <svg
              viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full overflow-visible"
            >
              <path
                d={linePath}
                fill="none"
                stroke={LINE_COLOR}
                strokeWidth={2.5}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
              {points.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={3.5} fill={LINE_COLOR} vectorEffect="non-scaling-stroke" />
              ))}
            </svg>
          </div>

          <div className="mt-2 flex shrink-0 justify-between">
            {data.map((bar) => (
              <span
                key={bar.period}
                className="w-[38px] text-center text-[10.5px] text-[var(--octo-text-faint)]"
              >
                {bar.period}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
