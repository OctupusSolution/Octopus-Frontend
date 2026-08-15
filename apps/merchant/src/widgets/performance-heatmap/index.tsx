import { Percent } from "lucide-react";
import { performanceHeatmap, heatmapColumns } from "@/shared/api/mock-dashboard";
import { useI18n } from "@/app/providers/i18n-provider";

// Single-hue green scale — tile darkens as achievement rises.
// (Spec calls for a green intensity ramp rather than red/amber/green states.)
// color-mix over a transparent base lets the ramp adapt to light and dark cards.
function tileBackground(value: number): string {
  const min = 84;
  const max = 100;
  const t = Math.min(1, Math.max(0, (value - min) / (max - min)));
  const pct = Math.round(8 + t * 48);
  return `color-mix(in srgb, #22C55E ${pct}%, transparent)`;
}

const GRID = "66px repeat(5, minmax(0, 1fr))";

export function PerformanceHeatmap({ branches }: { branches?: readonly string[] }) {
  const { t } = useI18n();

  const rows =
    branches && branches.length > 0
      ? performanceHeatmap.filter((row) => branches.includes(row.id))
      : performanceHeatmap;

  return (
    <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
      <div className="flex items-center gap-2">
        <Percent size={15} className="text-[var(--octo-text-muted)]" />
        <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("dashboard.heatmap")}</h2>
      </div>

      <div className="mt-4 grid gap-1.5" style={{ gridTemplateColumns: GRID }}>
        <span aria-hidden="true" />
        {heatmapColumns.map((col) => (
          <span key={col} className="text-center text-[11px] text-[var(--octo-text-faint)]">
            {col}
          </span>
        ))}

        {rows.map((row) => (
          <Row key={row.id} branch={row.branch} values={row.values} />
        ))}
      </div>
    </section>
  );
}

function Row({ branch, values }: { branch: string; values: readonly number[] }) {
  return (
    <>
      <span className="flex items-center text-[12px] font-medium text-[var(--octo-text-primary)]">{branch}</span>
      {values.map((v, i) => (
        <span
          key={i}
          className="grid h-[34px] place-items-center rounded-lg text-[12px] font-semibold text-[var(--octo-text-primary)]"
          style={{ backgroundColor: tileBackground(v) }}
        >
          {v}%
        </span>
      ))}
    </>
  );
}
