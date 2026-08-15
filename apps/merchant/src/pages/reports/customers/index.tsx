import { useState } from "react";
import { Table2, Users, UsersRound } from "lucide-react";
import { ReportShell } from "../_shared/report-shell";
import { StackedBarsCard } from "../_shared/stacked-bars";
import { DonutCard } from "../_shared/donut";
import { HeatmapCard } from "../_shared/heatmap";
import { ChartCard } from "../_shared/chart-card";
import { downloadCsv } from "../_shared/export";
import { buildKpi, RANGE_SCALE } from "../_shared/kpi";
import { formatSAR, formatCount } from "../_shared/format";
import {
  customerKpiBase,
  newVsReturning,
  newVsReturningAxisMax,
  newVsReturningAxisTicks,
  cohortMonths,
  cohortRetention,
  rfmSegments,
  topCustomers,
  type ReportRange,
} from "@/shared/api/mock-reports";
import { useI18n } from "@/app/providers/i18n-provider";

const NEW_RETURNING_SERIES = [
  { key: "new", labelKey: "reports.customers.series.new", color: "#2ec9c0" },
  { key: "returning", labelKey: "reports.customers.series.returning", color: "#5b8def" },
] as const;

const rfmTotal = rfmSegments.reduce((sum, segment) => sum + segment.count, 0);

const rfmDonutItems = rfmSegments.map((segment) => ({
  labelKey: segment.labelKey,
  value: formatCount(segment.count),
  percent: Number(((segment.count / rfmTotal) * 100).toFixed(1)),
  color: segment.color,
}));

function cohortTint(value: number) {
  // Green intensity ramp over the card — same read as the dashboard heatmap.
  const tValue = Math.min(1, Math.max(0, (value - 40) / 60));
  const pct = Math.round(8 + tValue * 48);
  return { background: `color-mix(in srgb, #22C55E ${pct}%, transparent)`, color: "var(--octo-text-primary)" };
}

const SEGMENT_STYLE: Record<string, { bg: string; fg: string }> = {
  "reports.customers.rfm.champions": { bg: "#2ec9c022", fg: "#0f766e" },
  "reports.customers.rfm.loyal": { bg: "#5b8def22", fg: "#2563eb" },
  "reports.customers.rfm.newCustomers": { bg: "#8b7cf022", fg: "#6C4DFF" },
  "reports.customers.rfm.atRisk": { bg: "#fb923c22", fg: "#b45309" },
  "reports.customers.rfm.lost": { bg: "var(--octo-track)", fg: "var(--octo-text-secondary)" },
};

export function CustomersPage() {
  const { t } = useI18n();
  const [range, setRange] = useState<ReportRange>("30d");
  const scale = RANGE_SCALE[range];
  const base = customerKpiBase;

  const kpiCards = [
    buildKpi("cust-new", "reports.customers.kpi.new", formatCount(base.newCustomers * scale), "+12.4%", "violet"),
    buildKpi("cust-returning", "reports.customers.kpi.returning", `${base.returningPct.toFixed(1)}%`, "+2.1%", "blue"),
    buildKpi("cust-retention", "reports.customers.kpi.retention", `${base.retentionRate.toFixed(1)}%`, "+1.3%", "green"),
    buildKpi("cust-frequency", "reports.customers.kpi.frequency", `${base.avgFrequency.toFixed(1)}`, "+0.2", "cyan"),
    buildKpi("cust-clv", "reports.customers.kpi.clv", formatSAR(base.clv * scale), "+6.8%", "orange"),
  ];

  const exportTop = () =>
    downloadCsv(
      "top-customers-by-spend.csv",
      [
        t("reports.customers.col.rank"),
        t("customers.col.customer"),
        t("customers.col.visits"),
        t("reports.customers.col.spend"),
        t("reports.customers.col.avgBasket"),
        t("reports.customers.col.frequency"),
        t("reports.customers.col.segment"),
      ],
      topCustomers.map((row) => [
        row.rank,
        row.name,
        row.visits,
        row.spend,
        row.avgBasket.toFixed(1),
        row.frequency.toFixed(1),
        t(row.segmentKey),
      ])
    );

  const cohortRows = cohortRetention.map((row) => ({ label: row.cohort, values: row.values }));

  return (
    <ReportShell
      title={t("reports.customers.title")}
      subtitle={t("reports.customers.subtitle")}
      kpiCards={kpiCards}
      dateRange={range}
      onDateRangeChange={setRange}
      onExport={exportTop}
    >
      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
        <StackedBarsCard
          title={t("reports.customers.chart.newReturning")}
          icon={<Users size={15} />}
          series={NEW_RETURNING_SERIES}
          points={newVsReturning}
          axisMax={newVsReturningAxisMax}
          ticks={newVsReturningAxisTicks}
          tickFormat={(value) => value.toLocaleString("en-US")}
        />
        <DonutCard
          title={t("reports.customers.chart.rfm")}
          icon={<UsersRound size={15} />}
          caption={t("common.total")}
          total={formatCount(rfmTotal)}
          items={rfmDonutItems}
        />
      </div>

      <div className="mt-3">
        <HeatmapCard
          title={t("reports.customers.chart.cohort")}
          icon={<UsersRound size={15} />}
          note={t("reports.customers.cohort.note")}
          colHeaders={cohortMonths}
          rows={cohortRows}
          tint={cohortTint}
          format={(value) => `${value}%`}
        />
      </div>

      <TopCustomersTable exportTop={exportTop} />
    </ReportShell>
  );
}

/* ------------------------------------------------- card — top customers */

function TopCustomersTable({ exportTop }: { exportTop: () => void }) {
  const { t } = useI18n();
  return (
    <ChartCard
      title={t("reports.customers.table.title")}
      icon={<Table2 size={15} />}
      className="mt-3 overflow-hidden"
      action={
        <button
          type="button"
          onClick={exportTop}
          className="rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-2.5 py-[5px] text-[11.5px] font-medium text-[var(--octo-text-primary)] transition-colors hover:bg-[var(--octo-hover)]"
        >
          {t("reports.export")}
        </button>
      }
    >
      <div className="octo-scroll mt-3 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-[12.5px]">
          <thead>
            <tr className="border-b border-[var(--octo-divider)]">
              {[
                "reports.customers.col.rank",
                "customers.col.customer",
                "customers.col.visits",
                "reports.customers.col.spend",
                "reports.customers.col.avgBasket",
                "reports.customers.col.frequency",
                "reports.customers.col.segment",
              ].map((key) => (
                <th
                  key={key}
                  className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]"
                >
                  {t(key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {topCustomers.map((row) => {
              const segmentStyle = SEGMENT_STYLE[row.segmentKey] ?? { bg: "#f2f2f4", fg: "#6b6b74" };
              return (
                <tr key={row.rank} className="border-b border-[var(--octo-row-border)] last:border-0 hover:bg-[var(--octo-row-hover)]">
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-faint)]">#{row.rank}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 font-medium text-[var(--octo-text-primary)]">{row.name}</td>
                  <td className="whitespace-nowrap px-2 py-2.5">{formatCount(row.visits)}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 font-semibold text-[var(--octo-text-primary)]">{formatSAR(row.spend)}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{formatSAR(row.avgBasket)}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{row.frequency.toFixed(1)}</td>
                  <td className="whitespace-nowrap px-2 py-2.5">
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{ backgroundColor: segmentStyle.bg, color: segmentStyle.fg }}
                    >
                      {t(row.segmentKey)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}
