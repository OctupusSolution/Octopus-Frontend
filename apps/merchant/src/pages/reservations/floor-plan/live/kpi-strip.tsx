// The five service KPIs under the floor. There is no analytics feed behind
// this build, so the figures are modelled from the plan's own capacity —
// deterministic, and proportionate to the restaurant actually drawn.
import type { ElementType } from "react";
import { CircleGauge, Clock3, EyeOff, TrendingDown, TrendingUp, UserCheck, UserRoundSearch } from "lucide-react";
import { hashString, type FloorPlanDoc } from "@/entities/floor-plan";
import { useI18n } from "@/app/providers/i18n-provider";
import { formatDuration } from "@/entities/floor-plan";
import { formatNumber, formatTime } from "../_shared/format";

export function modelledKpis(doc: FloorPlanDoc) {
  const seats = doc.tables.reduce((sum, t) => sum + t.seats, 0);
  const seed = hashString(`${doc.name}${doc.tables.length}`);
  return {
    occupancy: 64 + (seed % 17),
    covers: Math.max(8, Math.round(seats * (1.1 + ((seed >>> 4) % 30) / 100))),
    peakHour: 19 + ((seed >>> 8) % 3),
    dwellMinutes: 75 + ((seed >>> 12) % 31),
    noShow: 2 + ((seed >>> 16) % 4),
    trends: [3.46, 5.2, 0, -2.1, -0.8],
  };
}

export function KpiStrip({ doc }: { doc: FloorPlanDoc }) {
  const { t, locale } = useI18n();
  const kpis = modelledKpis(doc);
  const peak = new Date(2026, 0, 1, kpis.peakHour, 0).getTime();

  const cards: { Icon: ElementType; color: string; value: string; label: string; sub?: string; trend: number; goodWhenUp: boolean }[] = [
    { Icon: CircleGauge, color: "#2563EB", value: `${kpis.occupancy}%`, label: t("floorPlan.live.kpi.occupancy"), trend: kpis.trends[0], goodWhenUp: true },
    { Icon: UserCheck, color: "#16A34A", value: formatNumber(kpis.covers, locale), label: t("floorPlan.live.kpi.covers"), trend: kpis.trends[1], goodWhenUp: true },
    { Icon: Clock3, color: "#A16207", value: formatTime(peak, locale), label: t("floorPlan.live.kpi.peak"), sub: t("floorPlan.live.kpi.peakSub"), trend: 0, goodWhenUp: true },
    { Icon: UserRoundSearch, color: "#C026D3", value: formatDuration(kpis.dwellMinutes), label: t("floorPlan.live.kpi.dwell"), trend: kpis.trends[3], goodWhenUp: false },
    { Icon: EyeOff, color: "#DC2626", value: `${kpis.noShow}%`, label: t("floorPlan.live.kpi.noShow"), trend: kpis.trends[4], goodWhenUp: false },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
      {cards.map(({ Icon, color, value, label, sub, trend, goodWhenUp }) => {
        const good = trend === 0 ? true : trend > 0 === goodWhenUp;
        const TrendIcon = trend >= 0 ? TrendingUp : TrendingDown;
        return (
          <article key={label} className="flex flex-col rounded-[18px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <span className="grid h-12 w-12 place-items-center rounded-xl text-white" style={{ backgroundColor: color }}>
              <Icon size={24} strokeWidth={1.8} />
            </span>
            <span className="mt-3 text-[26px] font-bold leading-none text-[var(--octo-text-primary)]" dir="ltr">
              {value}
            </span>
            <span className="mt-1.5 text-[14px] text-[var(--octo-text-secondary)]">{label}</span>
            {sub ? (
              <span className="mt-2 text-[12px] text-[var(--octo-text-muted)]">{sub}</span>
            ) : (
              <span className="mt-2 flex flex-wrap items-center gap-1.5 text-[12px]">
                <span className="flex items-center gap-1 font-semibold" style={{ color: good ? "#16A34A" : "#DC2626" }}>
                  <TrendIcon size={14} />
                  {Math.abs(trend).toFixed(2)}%
                </span>
                <span className="text-[var(--octo-text-muted)]">{t("floorPlan.live.kpi.sinceLastMonth")}</span>
              </span>
            )}
          </article>
        );
      })}
    </div>
  );
}
