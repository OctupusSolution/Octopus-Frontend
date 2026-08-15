import { useState } from "react";
import { BarChart3, Building2, PieChart, Table2 } from "lucide-react";
import { ReportShell } from "../_shared/report-shell";
import { StackedBarsCard } from "../_shared/stacked-bars";
import { DonutCard } from "../_shared/donut";
import { ChartCard } from "../_shared/chart-card";
import { downloadCsv } from "../_shared/export";
import { buildKpi, RANGE_SCALE } from "../_shared/kpi";
import { formatSAR, formatCount } from "../_shared/format";
import {
  salesKpiBase,
  salesTrendSeries,
  salesTrend,
  salesTrendAxisMax,
  salesTrendAxisTicks,
  channelMix,
  salesByBranch,
  dailySales,
  type ReportRange,
} from "@/shared/api/mock-reports";
import { useI18n } from "@/app/providers/i18n-provider";

export function SalesPage() {
  const { t } = useI18n();
  const [range, setRange] = useState<ReportRange>("30d");
  const scale = RANGE_SCALE[range];
  const base = salesKpiBase;

  const kpiCards = [
    buildKpi("sales-net", "reports.sales.kpi.netSales", formatSAR(base.netSales * scale), "+12.5%", "violet"),
    buildKpi("sales-gross", "reports.sales.kpi.grossSales", formatSAR(base.grossSales * scale), "+11.8%", "blue"),
    buildKpi("sales-discounts", "reports.sales.kpi.discounts", formatSAR(base.discounts * scale), "-4.2%", "orange"),
    buildKpi("sales-orders", "reports.sales.kpi.orders", formatCount(base.orders * scale), "+9.6%", "green"),
    buildKpi("sales-basket", "reports.sales.kpi.avgBasket", formatSAR(base.avgBasket), "+2.1%", "cyan"),
  ];

  const exportDaily = () =>
    downloadCsv(
      "sales-daily-breakdown.csv",
      [
        t("reports.sales.col.date"),
        t("channels.dineIn"),
        t("channels.takeaway"),
        t("channels.delivery"),
        t("channels.kiosk"),
        t("channels.aggregator"),
        t("reports.sales.col.total"),
        t("reports.sales.col.growth"),
      ],
      dailySales.map((row) => [
        row.date,
        row.dineIn,
        row.takeaway,
        row.delivery,
        row.kiosk,
        row.aggregator,
        row.total,
        `${row.growthPct}%`,
      ])
    );

  return (
    <ReportShell
      title={t("reports.sales.title")}
      subtitle={t("reports.sales.subtitle")}
      kpiCards={kpiCards}
      dateRange={range}
      onDateRangeChange={setRange}
      onExport={exportDaily}
    >
      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
        <StackedBarsCard
          title={t("reports.sales.chart.trend")}
          icon={<BarChart3 size={15} />}
          series={salesTrendSeries}
          points={salesTrend}
          axisMax={salesTrendAxisMax}
          ticks={salesTrendAxisTicks}
        />
        <DonutCard
          title={t("reports.sales.chart.mix")}
          icon={<PieChart size={15} />}
          caption={t(channelMix.captionKey)}
          total={channelMix.total}
          items={channelMix.items}
        />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
        <BranchBars />
        <DailyBreakdownTable />
      </div>
    </ReportShell>
  );
}

/* ----------------------------------------------------- card — sales by branch */

function BranchBars() {
  const { t } = useI18n();
  return (
    <ChartCard title={t("reports.sales.chart.branch")} icon={<Building2 size={15} />}>
      <ul className="mt-3 space-y-3">
        {salesByBranch.map((row) => (
          <li key={row.branch} className="flex items-center gap-3">
            <span className="w-[130px] shrink-0 truncate text-[11.5px] text-[var(--octo-text-primary)]">{row.branch}</span>
            <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--octo-track)]">
              <div className="h-full rounded-full" style={{ width: `${row.percent}%`, backgroundColor: row.color }} />
            </div>
            <span className="w-[76px] shrink-0 text-end text-[11.5px] font-medium text-[var(--octo-text-primary)]">
              {formatSAR(row.revenue)}
            </span>
            <span className="w-[46px] shrink-0 text-end text-[11px] text-[var(--octo-text-faint)]">{row.percent}%</span>
          </li>
        ))}
      </ul>
    </ChartCard>
  );
}

/* -------------------------------------------------- card — daily breakdown */

const DAILY_CHANNELS = [
  { key: "dineIn", labelKey: "channels.dineIn" },
  { key: "takeaway", labelKey: "channels.takeaway" },
  { key: "delivery", labelKey: "channels.delivery" },
  { key: "kiosk", labelKey: "channels.kiosk" },
  { key: "aggregator", labelKey: "channels.aggregator" },
] as const;

function DailyBreakdownTable() {
  const { t } = useI18n();
  return (
    <ChartCard title={t("reports.sales.table.title")} icon={<Table2 size={15} />} className="overflow-hidden">
      <div className="octo-scroll mt-3 overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-[12.5px]">
          <thead>
            <tr className="border-b border-[var(--octo-divider)]">
              {[
                "reports.sales.col.date",
                "channels.dineIn",
                "channels.takeaway",
                "channels.delivery",
                "channels.kiosk",
                "channels.aggregator",
                "reports.sales.col.total",
                "reports.sales.col.growth",
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
            {dailySales.map((row) => (
              <tr key={row.date} className="border-b border-[var(--octo-row-border)] last:border-0 hover:bg-[var(--octo-row-hover)]">
                <td className="whitespace-nowrap px-2 py-2.5 font-medium text-[var(--octo-text-primary)]">{row.date}</td>
                {DAILY_CHANNELS.map((channel) => (
                  <td key={channel.key} className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">
                    {formatSAR(row[channel.key])}
                  </td>
                ))}
                <td className="whitespace-nowrap px-2 py-2.5 font-semibold text-[var(--octo-text-primary)]">{formatSAR(row.total)}</td>
                <td
                  className={`whitespace-nowrap px-2 py-2.5 font-medium ${
                    row.growthPct >= 0 ? "text-[#16a34a]" : "text-[#ef4444]"
                  }`}
                >
                  {row.growthPct > 0 ? "+" : ""}
                  {row.growthPct}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}
