import type { ReactNode } from "react";
import { Download } from "lucide-react";
import { StatCard } from "@/widgets/sales-summary-chart";
import { Segmented, Button } from "@ui/primitives";
import type { KpiCard } from "@/shared/api/mock-dashboard";
import type { ReportRange } from "@/shared/api/mock-reports";
import { useI18n } from "@/app/providers/i18n-provider";

const RANGE_OPTIONS: readonly { id: ReportRange; key: string }[] = [
  { id: "today", key: "reports.range.today" },
  { id: "7d", key: "reports.range.7d" },
  { id: "30d", key: "reports.range.30d" },
  { id: "quarter", key: "reports.range.quarter" },
  { id: "year", key: "reports.range.year" },
];

export interface ReportShellProps {
  title: string;
  subtitle?: string;
  kpiCards: readonly KpiCard[];
  dateRange: ReportRange;
  onDateRangeChange: (range: ReportRange) => void;
  onExport?: () => void;
  exportLabel?: string;
  /** primary renders the action as the emphasised CTA (compliance audit export) */
  exportVariant?: "secondary" | "primary";
  children: ReactNode;
}

// Shared header + date-range + export + KPI strip for every Pattern F report
// page. Each page owns its own chart/table cards as `children`.
export function ReportShell({
  title,
  subtitle,
  kpiCards,
  dateRange,
  onDateRangeChange,
  onExport,
  exportLabel,
  exportVariant = "secondary",
  children,
}: ReportShellProps) {
  const { t } = useI18n();

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">{subtitle}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            value={dateRange}
            onChange={(id) => onDateRangeChange(id as ReportRange)}
            options={RANGE_OPTIONS.map((o) => ({ id: o.id, label: t(o.key) }))}
          />
          {onExport && (
            <Button
              variant={exportVariant}
              icon={<Download size={13} />}
              onClick={onExport}
            >
              {exportLabel ?? t("reports.export")}
            </Button>
          )}
        </div>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => (
          <StatCard key={card.id} data={card} />
        ))}
      </div>

      {children}
    </div>
  );
}
