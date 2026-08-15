import type { KpiCard } from "@/shared/api/mock-dashboard";
import { kpiSparklines, type ReportRange } from "@/shared/api/mock-reports";

// Scaler used by every report page so the date-range Segmented actually
// rescales the KPI strip. The mock bases are monthly figures.
export const RANGE_SCALE: Record<ReportRange, number> = {
  today: 1 / 30,
  "7d": 7 / 30,
  "30d": 1,
  quarter: 3,
  year: 12,
};

const SPARK_COLORS: Record<keyof typeof kpiSparklines, string> = {
  blue: "#60a5fa",
  green: "#a3e635",
  orange: "#fb923c",
  violet: "#a78bfa",
  cyan: "#22c9d9",
};

// Builds a KpiCard for the shared StatCard widget. `label` is an i18n key
// (StatCard passes it through labelKey() → t(), both of which keep it intact).
export function buildKpi(
  id: string,
  label: string,
  value: string,
  delta: string,
  spark: keyof typeof kpiSparklines,
  color?: string
): KpiCard {
  return {
    id,
    label,
    value,
    delta,
    deltaNote: "reports.delta.vsPrevPeriod",
    color: color ?? SPARK_COLORS[spark],
    sparkline: [...kpiSparklines[spark]],
  };
}
