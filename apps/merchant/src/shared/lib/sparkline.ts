// Builds inline-SVG path data for the KPI card sparklines.
// No chart library — the dashboard draws its own SVG so stroke width,
// gradient fade and full-bleed alignment stay exactly on spec.

export interface SparklinePaths {
  /** stroke path along the top of the series */
  line: string;
  /** same path closed down to the baseline, for the gradient fill */
  area: string;
}

export function sparklinePaths(
  values: readonly number[],
  width: number,
  height: number
): SparklinePaths {
  if (values.length < 2) return { line: "", area: "" };

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = width / (values.length - 1);

  // Inset the curve slightly so the 2px stroke isn't clipped at the top edge.
  const top = 2;
  const usable = height - top;

  const points = values.map((v, i) => {
    const x = i * step;
    const y = top + usable - ((v - min) / range) * usable;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  const line = `M${points.join(" L")}`;
  const area = `${line} L${width},${height} L0,${height} Z`;

  return { line, area };
}
