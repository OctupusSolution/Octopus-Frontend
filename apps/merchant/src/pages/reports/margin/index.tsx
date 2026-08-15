import { useState } from "react";
import { PieChart, Table2, TriangleAlert, Wallet } from "lucide-react";
import { ReportShell } from "../_shared/report-shell";
import { StackedBarsCard } from "../_shared/stacked-bars";
import { DonutCard } from "../_shared/donut";
import { ChartCard } from "../_shared/chart-card";
import { downloadCsv } from "../_shared/export";
import { buildKpi, RANGE_SCALE } from "../_shared/kpi";
import { formatSAR, formatCount } from "../_shared/format";
import {
  marginKpiBase,
  marginTrend,
  marginTrendAxisMax,
  marginTrendAxisTicks,
  costStructure,
  marginByItem,
  type ReportRange,
} from "@/shared/api/mock-reports";
import { useI18n } from "@/app/providers/i18n-provider";

const MARGIN_SERIES = [
  { key: "revenue", labelKey: "reports.col.revenue", color: "#2ec9c0" },
  { key: "cogs", labelKey: "reports.margin.series.cogs", color: "#fb923c" },
] as const;

const MARGIN_TARGET_PCT = 40;

const marginRows = marginByItem.map((row) => {
  const margin = row.revenue - row.cost;
  return { ...row, margin, marginPct: (margin / row.revenue) * 100 };
});
const maxContribution = Math.max(...marginRows.map((row) => row.contributionPct));

export function MarginPage() {
  const { t } = useI18n();
  const [range, setRange] = useState<ReportRange>("30d");
  const scale = RANGE_SCALE[range];
  const base = marginKpiBase;

  const kpiCards = [
    buildKpi("margin-revenue", "reports.margin.kpi.revenue", formatSAR(base.revenue * scale), "+12.5%", "violet"),
    buildKpi("margin-cogs", "reports.margin.kpi.cogs", formatSAR(base.cogs * scale), "+9.8%", "blue"),
    buildKpi("margin-gross", "reports.margin.kpi.grossMarginPct", `${base.grossMarginPct.toFixed(1)}%`, "+1.1%", "green"),
    buildKpi("margin-food", "reports.margin.kpi.foodCostPct", `${base.foodCostPct.toFixed(1)}%`, "-0.6%", "orange"),
    buildKpi("margin-labour", "reports.margin.kpi.labourCostPct", `${base.labourCostPct.toFixed(1)}%`, "-0.3%", "cyan"),
  ];

  const exportItems = () =>
    downloadCsv(
      "margin-by-item.csv",
      [
        t("reports.margin.col.item"),
        t("reports.col.revenue"),
        t("reports.margin.col.cost"),
        t("reports.margin.col.margin"),
        t("reports.margin.col.marginPct"),
        t("reports.col.units"),
        t("reports.margin.col.contribution"),
      ],
      marginRows.map((row) => [
        row.item,
        row.revenue,
        row.cost,
        row.margin,
        `${row.marginPct.toFixed(1)}%`,
        row.units,
        row.contributionPct,
      ])
    );

  return (
    <ReportShell
      title={t("reports.margin.title")}
      subtitle={t("reports.margin.subtitle")}
      kpiCards={kpiCards}
      dateRange={range}
      onDateRangeChange={setRange}
      onExport={exportItems}
    >
      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
        <StackedBarsCard
          title={t("reports.margin.chart.trend")}
          icon={<Wallet size={15} />}
          series={MARGIN_SERIES}
          points={marginTrend}
          axisMax={marginTrendAxisMax}
          ticks={marginTrendAxisTicks}
          mode="grouped"
        />
        <DonutCard
          title={t("reports.margin.chart.costStructure")}
          icon={<PieChart size={15} />}
          caption={t(costStructure.captionKey)}
          total={costStructure.total}
          items={costStructure.items}
        />
      </div>

      <MarginTable exportItems={exportItems} />
    </ReportShell>
  );
}

/* ---------------------------------------------- card — item margin breakdown */

function MarginTable({ exportItems }: { exportItems: () => void }) {
  const { t } = useI18n();
  return (
    <ChartCard
      title={t("reports.margin.table.title")}
      icon={<Table2 size={15} />}
      className="mt-3 overflow-hidden"
      action={
        <button
          type="button"
          onClick={exportItems}
          className="rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-2.5 py-[5px] text-[11.5px] font-medium text-[var(--octo-text-primary)] transition-colors hover:bg-[var(--octo-hover)]"
        >
          {t("reports.export")}
        </button>
      }
    >
      <p className="mt-1 flex items-center gap-1.5 text-[11px] text-[var(--octo-text-faint)]">
        <TriangleAlert size={12} />
        {t("reports.margin.flagHint")}
      </p>

      <div className="octo-scroll mt-3 overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-[12.5px]">
          <thead>
            <tr className="border-b border-[var(--octo-divider)]">
              {[
                "reports.margin.col.item",
                "reports.col.revenue",
                "reports.margin.col.cost",
                "reports.margin.col.margin",
                "reports.margin.col.marginPct",
                "reports.col.units",
                "reports.margin.col.contribution",
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
            {marginRows.map((row) => {
              const belowTarget = row.marginPct < MARGIN_TARGET_PCT;
              return (
                <tr
                  key={row.id}
                  className={`border-b border-[var(--octo-row-border)] last:border-0 hover:bg-[var(--octo-row-hover)] ${belowTarget ? "bg-[#fef3e8]/40" : ""}`}
                >
                  <td className="px-2 py-2.5">
                    <p className="font-medium text-[var(--octo-text-primary)]">{row.item}</p>
                    <p className="text-[11px] text-[var(--octo-text-faint)]">{row.itemAr}</p>
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5">{formatSAR(row.revenue)}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{formatSAR(row.cost)}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 font-medium text-[var(--octo-text-primary)]">{formatSAR(row.margin)}</td>
                  <td className="whitespace-nowrap px-2 py-2.5">
                    <span
                      className={`font-semibold ${
                        row.marginPct >= MARGIN_TARGET_PCT ? "text-[#16a34a]" : "text-[#c2660a]"
                      }`}
                    >
                      {row.marginPct.toFixed(1)}%
                    </span>
                    {belowTarget && (
                      <span className="ms-1.5 rounded-full bg-[#fef3e8] px-2 py-0.5 text-[10px] font-medium text-[#c2660a]">
                        {t("reports.margin.belowTarget")}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{formatCount(row.units)}</td>
                  <td className="whitespace-nowrap px-2 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-[6px] w-16 overflow-hidden rounded-full bg-[var(--octo-track)]">
                        <div
                          className="h-full rounded-full bg-[#5b8def]"
                          style={{ width: `${(row.contributionPct / maxContribution) * 100}%` }}
                        />
                      </div>
                      <span className="text-[11.5px] text-[var(--octo-text-secondary)]">{row.contributionPct.toFixed(1)}%</span>
                    </div>
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
