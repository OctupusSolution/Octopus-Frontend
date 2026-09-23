import { SlidersHorizontal } from "lucide-react";
import { useI18n } from "@/app/providers/i18n-provider";
import { customerActivity, customerActivityTicks } from "@/shared/api/mock-dashboard";

const W = 740;
const H = 250;
const PLOT = { left: 56, right: 726, top: 16, bottom: 212 };
const MAX = customerActivityTicks[customerActivityTicks.length - 1];

const x = (i: number) => PLOT.left + ((PLOT.right - PLOT.left) * i) / (customerActivity.length - 1);
const y = (v: number) => PLOT.bottom - ((PLOT.bottom - PLOT.top) * v) / MAX;

/** Catmull-Rom through every point, as cubic Béziers — the frame's soft curve. */
function smoothPath(points: [number, number][]): string {
  let d = `M${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
  }
  return d;
}

export function CustomersActivity() {
  const { t } = useI18n();
  const points = customerActivity.map((d, i) => [x(i), y(d.value)] as [number, number]);

  return (
    <section className="flex flex-col rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-6 pb-5 pt-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-medium text-[var(--octo-text-primary)]">{t("dashboard.customersActivity")}</h2>
          <p className="mt-1 text-[14px] text-[var(--octo-text-secondary)]">{t("dashboard.customersActivity.subtitle")}</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-[#0D6EFD]/30 bg-[#0D6EFD]/[0.07] px-4 py-2 text-[15px] text-[#0D6EFD]">
          <SlidersHorizontal size={17} />
          {t("dashboard.thisWeek")}
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="mt-auto w-full pt-6" style={{ direction: "ltr" }} role="img" aria-label={t("dashboard.customersActivity")}>
        {customerActivityTicks.map((tick) => (
          <g key={tick}>
            <line x1={PLOT.left} x2={PLOT.right} y1={y(tick)} y2={y(tick)} stroke="var(--octo-border-card)" strokeDasharray="4 4" />
            <text x={PLOT.left - 26} y={y(tick) + 4} textAnchor="end" fontSize="11" fill="var(--octo-text-muted)">{tick}</text>
          </g>
        ))}
        <path d={smoothPath(points)} fill="none" stroke="#0D6EFD" strokeWidth="2.5" strokeLinecap="round" />
        {points.map(([px, py], i) => (
          <circle key={i} cx={px} cy={py} r="4" fill="#0D6EFD" />
        ))}
        {customerActivity.map((d, i) => (
          <text
            key={d.dayKey}
            x={x(i)}
            y={H - 12}
            textAnchor={i === 0 ? "start" : i === customerActivity.length - 1 ? "end" : "middle"}
            fontSize="11"
            fill="var(--octo-text-muted)"
          >
            {t(d.dayKey)}
          </text>
        ))}
      </svg>
    </section>
  );
}
