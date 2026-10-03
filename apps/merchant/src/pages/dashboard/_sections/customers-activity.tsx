import { useI18n } from "@/app/providers/i18n-provider";
import { customerActivity, customerActivityTicks } from "@/shared/api/mock-dashboard";
import { ShellIcon } from "@/shared/ui/shell-icon";

// The frame's 708x200 plot: gridlines every 40px from y=5, the curve between
// x=58 and x=704, day labels on a baseline under the last gridline.
const W = 708;
const H = 200;
const PLOT = { left: 58, right: 704, top: 5, bottom: 165 };
const GRID_LEFT = 24.5;
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
    <section className="flex flex-col justify-center gap-12 rounded-[12px] border border-[#cbd5e1] bg-[var(--octo-card)] p-[25px] [[data-theme=dark]_&]:border-[var(--octo-border-card)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-2">
          <h2 className="text-[16px] font-medium leading-[16px] text-[var(--octo-text-primary)]">{t("dashboard.customersActivity")}</h2>
          <p className="text-[14px] leading-[14px] text-[var(--octo-text-secondary)]">{t("dashboard.customersActivity.subtitle")}</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-2 rounded-[8px] border border-[#abcdff] bg-[#eff2ff] px-4 py-2 text-[14px] font-medium leading-[14px] text-[#0d6efd] [[data-theme=dark]_&]:border-[#0d6efd]/40 [[data-theme=dark]_&]:bg-[#0d6efd]/10">
          <ShellIcon name="filter.svg" />
          {t("dashboard.thisWeek")}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-6 w-full overflow-visible"
        style={{ direction: "ltr" }}
        role="img"
        aria-label={t("dashboard.customersActivity")}
      >
        {customerActivityTicks.map((tick) => (
          <g key={tick}>
            <line x1={GRID_LEFT} x2={W} y1={y(tick)} y2={y(tick)} stroke="var(--octo-border-card)" strokeDasharray={tick === 0 ? undefined : "4 4"} />
            <text x={17} y={y(tick) + 4} textAnchor="end" fontSize="11" fill="var(--octo-text-secondary)">{tick}</text>
          </g>
        ))}
        <path d={smoothPath(points)} fill="none" stroke="#0D6EFD" strokeWidth="2.5" strokeLinecap="round" />
        {points.map(([px, py], i) => (
          <circle key={i} cx={px} cy={py} r="4" fill="#0D6EFD" />
        ))}
        {customerActivity.map((d, i) => (
          <text key={d.dayKey} x={x(i)} y={182} textAnchor="middle" fontSize="11" fill="var(--octo-text-secondary)">
            {t(d.dayKey)}
          </text>
        ))}
      </svg>
    </section>
  );
}
