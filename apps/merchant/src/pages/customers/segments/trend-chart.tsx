// apps/merchant/src/pages/customers/segments/trend-chart.tsx
// The membership trend, drawn from the segment's own series: the card's small
// sparkline and the details page's area chart. Inline SVG — there is no chart
// library in this app.
import { useId } from "react";
import type { SegmentTrendPoint } from "./segment-model";

/** Evenly spaced points with the lowest value on the bottom edge and the
 *  highest `top` px below the top one, as both frames draw the line. */
function trendPoints(trend: readonly SegmentTrendPoint[], width: number, height: number, top: number): [number, number][] {
  const values = trend.map((p) => p.members);
  const min = Math.min(...values);
  const span = Math.max(...values) - min;
  const step = width / (values.length - 1);
  return values.map((value, index) => [
    index * step,
    // A flat series has no slope to show; it sits on the middle line.
    span === 0 ? (height + top) / 2 : height - ((value - min) / span) * (height - top),
  ]);
}

const path = (points: [number, number][]) => points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`).join("");

function TrendShape({
  trend,
  width,
  height,
  top,
  stroke,
  strokeWidth,
  className,
  stretch,
}: {
  trend: readonly SegmentTrendPoint[];
  width: number;
  height: number;
  top: number;
  stroke: string;
  strokeWidth: number;
  className?: string;
  /** Fills the width of its box instead of keeping the frame's fixed size. */
  stretch?: boolean;
}) {
  const gradientId = useId();
  // One point is not a trend, and neither is none.
  if (trend.length < 2) return <div aria-hidden className={className} style={stretch ? { height } : { width, height }} />;
  const points = trendPoints(trend, width, height, top);
  const line = path(points);
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${width} ${height}`}
      width={stretch ? "100%" : width}
      height={height}
      preserveAspectRatio="none"
      fill="none"
      className={className}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1={top} x2="0" y2={height} gradientUnits="userSpaceOnUse">
          <stop stopColor="#0D6EFD" stopOpacity="0.28" />
          <stop offset="1" stopColor="#0D6EFD" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line}L${width} ${height}L0 ${height}Z`} fill={`url(#${gradientId})`} />
      <path d={line} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** The card's 96 × 32 sparkline. */
export function TrendSparkline({ trend }: { trend: readonly SegmentTrendPoint[] }) {
  return <TrendShape trend={trend} width={96} height={32} top={2} stroke="#0058DA" strokeWidth={1.13} className="shrink-0" />;
}

/** The details page's 120px-high area chart, as wide as its card. */
export function TrendAreaChart({ trend }: { trend: readonly SegmentTrendPoint[] }) {
  return <TrendShape trend={trend} width={720} height={120} top={3} stroke="#0D6EFD" strokeWidth={2.145} className="block" stretch />;
}
