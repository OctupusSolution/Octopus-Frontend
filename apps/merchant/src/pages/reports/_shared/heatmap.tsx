import { Fragment, type ReactNode } from "react";
import { ChartCard } from "./chart-card";

export interface HeatmapRow {
  label: string;
  values: readonly number[];
}

// Tinted matrix grid (no table borders — it reads as a heatmap). Each call
// supplies its own tint + text formatter so the cohort grid (green intensity)
// and the channel×branch revenue matrix (teal magnitude ramp) share one layout.
export function HeatmapCard({
  title,
  icon,
  note,
  colHeaders,
  rows,
  tint,
  format,
}: {
  title: string;
  icon?: ReactNode;
  note?: string;
  colHeaders: readonly string[];
  rows: readonly HeatmapRow[];
  tint: (value: number) => { background: string; color: string };
  format: (value: number) => string;
}) {
  const grid = `110px repeat(${colHeaders.length}, minmax(0, 1fr))`;

  return (
    <ChartCard title={title} icon={icon}>
      {note && <p className="mt-1 text-[11px] text-[var(--octo-text-faint)]">{note}</p>}
      <div className="mt-3 grid gap-1.5" style={{ gridTemplateColumns: grid }}>
        <span aria-hidden="true" />
        {colHeaders.map((header) => (
          <span key={header} className="text-center text-[10.5px] font-medium text-[var(--octo-text-faint)]">
            {header}
          </span>
        ))}

        {rows.map((row) => (
          <Fragment key={row.label}>
            <span className="flex items-center truncate text-[11.5px] font-medium text-[var(--octo-text-primary)]">
              {row.label}
            </span>
            {Array.from({ length: colHeaders.length }, (_, i) => {
              const v = row.values[i];
              // Rows may have fewer values than headers (cohort matrices are
              // triangular — later months don't exist yet). Pad with empty
              // cells so each row always occupies the full track count and
              // auto-placement never spills into the next row's columns.
              if (v === undefined) return <span key={i} aria-hidden="true" />;
              const style = tint(v);
              return (
                <span
                  key={i}
                  className="grid h-[30px] place-items-center rounded-md text-[11px] font-semibold"
                  style={{ backgroundColor: style.background, color: style.color }}
                >
                  {format(v)}
                </span>
              );
            })}
          </Fragment>
        ))}
      </div>
    </ChartCard>
  );
}
