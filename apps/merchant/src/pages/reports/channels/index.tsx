import { useState } from "react";
import { BarChart3, PieChart, Store, TrendingUp } from "lucide-react";
import { ReportShell } from "../_shared/report-shell";
import { StackedBarsCard } from "../_shared/stacked-bars";
import { DonutCard } from "../_shared/donut";
import { HeatmapCard } from "../_shared/heatmap";
import { ChartCard } from "../_shared/chart-card";
import { downloadCsv } from "../_shared/export";
import { formatSAR, formatCount } from "../_shared/format";
import {
  channelPerformance,
  channelMix,
  salesTrendSeries,
  salesTrend,
  salesTrendAxisMax,
  salesTrendAxisTicks,
  branchNames,
  channelBranchRevenue,
  type ReportRange,
} from "@/shared/api/mock-reports";
import { useI18n } from "@/app/providers/i18n-provider";
import { labelKey } from "@/shared/lib/labels";

const MAX_CELL_K = 330;

const CHANNEL_COLORS: Record<string, string> = {
  "Dine-in": "#2ec9c0",
  Takeaway: "#22c9d9",
  Delivery: "#5b8def",
  Kiosk: "#8b7cf0",
  Aggregator: "#4c35d4",
};

function revenueTint(value: number) {
  const tValue = Math.min(1, Math.max(0, value / MAX_CELL_K));
  // teal alpha ramp over the card; text flips to white past 50%.
  const pct = Math.round(8 + tValue * 55);
  return {
    background: `color-mix(in srgb, #14B8A6 ${pct}%, transparent)`,
    color: tValue > 0.5 ? "#ffffff" : "var(--octo-text-primary)",
  };
}

export function ChannelsPage() {
  const { t } = useI18n();
  const [range, setRange] = useState<ReportRange>("30d");

  const exportChannels = () =>
    downloadCsv(
      "channels-performance.csv",
      [
        t("reports.channels.col.channel"),
        t("reports.sales.col.orders"),
        t("reports.col.revenue"),
        t("reports.sales.col.avgBasket"),
        t("reports.channels.col.growth"),
      ],
      channelPerformance.map((row) => [t(labelKey(row.channel)), row.orders, row.revenue, row.avgBasket, row.growth])
    );

  const heatmapRows = channelBranchRevenue.map((row) => ({ label: t(labelKey(row.channel)), values: row.cells }));

  return (
    <ReportShell
      title={t("reports.channels.title")}
      subtitle={t("reports.channels.subtitle")}
      kpiCards={[]}
      dateRange={range}
      onDateRangeChange={setRange}
      onExport={exportChannels}
    >
      <ChannelTable />

      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
        <DonutCard
          title={t("reports.channels.chart.mix")}
          icon={<PieChart size={15} />}
          caption={t(channelMix.captionKey)}
          total={channelMix.total}
          items={channelMix.items}
        />
        <StackedBarsCard
          title={t("reports.channels.chart.trend")}
          icon={<BarChart3 size={15} />}
          series={salesTrendSeries}
          points={salesTrend}
          axisMax={salesTrendAxisMax}
          ticks={salesTrendAxisTicks}
        />
      </div>

      <HeatmapCard
        title={t("reports.channels.table.title")}
        icon={<Store size={15} />}
        note={t("reports.channels.table.unit")}
        colHeaders={branchNames}
        rows={heatmapRows}
        tint={revenueTint}
        format={(value) => `${value}K`}
      />
    </ReportShell>
  );
}

/* ------------------------------------------- per-channel KPI rows (no strip) */

function ChannelTable() {
  const { t } = useI18n();
  return (
    <ChartCard title={t("reports.channels.kpiTitle")} icon={<TrendingUp size={15} />} className="mt-3">
      <div className="octo-scroll mt-3 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-[12.5px]">
          <thead>
            <tr className="border-b border-[var(--octo-divider)]">
              {[
                "reports.channels.col.channel",
                "reports.sales.col.orders",
                "reports.col.revenue",
                "reports.sales.col.avgBasket",
                "reports.channels.col.growth",
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
            {channelPerformance.map((row) => (
              <tr key={row.channel} className="border-b border-[var(--octo-row-border)] last:border-0 hover:bg-[var(--octo-row-hover)]">
                <td className="whitespace-nowrap px-2 py-2.5">
                  <span className="flex items-center gap-2 font-medium text-[var(--octo-text-primary)]">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: CHANNEL_COLORS[row.channel] ?? "#5b8def" }}
                    />
                    {t(labelKey(row.channel))}
                  </span>
                </td>
                <td className="whitespace-nowrap px-2 py-2.5">{formatCount(row.orders)}</td>
                <td className="whitespace-nowrap px-2 py-2.5 font-medium text-[var(--octo-text-primary)]">{formatSAR(row.revenue)}</td>
                <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{formatSAR(row.avgBasket)}</td>
                <td className="whitespace-nowrap px-2 py-2.5">
                  <span className="flex items-center gap-1 text-[#16a34a]">
                    <TrendingUp size={12} strokeWidth={2.5} />
                    {row.growth.toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}
