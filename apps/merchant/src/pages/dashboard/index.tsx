import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Share2, SlidersHorizontal, Clock, Check, X, ChevronDown } from "lucide-react";
import { StatCard } from "@/widgets/sales-summary-chart";
import { RevenueChannelChart } from "@/widgets/revenue-channel-chart";
import { OrderChannelDonut } from "@/widgets/order-channel-donut";
import { AiInsightsPanel } from "@/widgets/ai-insights-panel";
import { PerformanceHeatmap } from "@/widgets/performance-heatmap";
import { BranchDistribution } from "@/widgets/branch-distribution";
import {
  kpiCards,
  lastUpdatedLabel,
  updatedJustNowLabel,
  dashboardRangeOptions,
  dashboardBranchOptions,
  type DashboardRangeOption,
  type DashboardBranchOption,
} from "@/shared/api/mock-dashboard";
import { useI18n } from "@/app/providers/i18n-provider";
import { useTenantConfig } from "@/app/providers/tenant-config-provider";
import { labelKey } from "@/shared/lib/labels";
import { Checkbox } from "@ui/primitives";

const DEFAULT_RANGE = "all";
const DEFAULT_BRANCHES: string[] = [];

/** KPI card id -> drill-down route */
const KPI_ROUTES: Record<string, string> = {
  "orders-today": "/orders",
  reservations: "/reservations",
  revenue: "/reports/sales",
  "avg-order": "/orders",
};

// Natural document flow — the parent `.octo-scroll` container (see app.tsx)
// owns the scroll. Rows are NOT given a fixed height: grid rows auto-size to
// their tallest card and `align-items: stretch` (default) matches the rest —
// a fixed row height here previously caused cards with more content (e.g.
// AI Insights text wrapping at narrower widths) to overflow into the row
// below. RevenueChannelChart still sets its own fixed height internally
// since its bar chart needs a definite height to resolve percentages.
export function DashboardPage() {
  const { t } = useI18n();
  const { activeBusiness } = useTenantConfig();
  const navigate = useNavigate();

  // The subtitle used to name someone else's company outright. It now names
  // the business the merchant actually created, with the generic label as the
  // fallback for an unprovisioned session.
  const businessLabel = activeBusiness?.businessName?.trim() || t("sidebar.accountFallback");

  const [refreshing, setRefreshing] = useState(false);
  const [updatedLabel, setUpdatedLabel] = useState<string>(lastUpdatedLabel);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [rangeId, setRangeId] = useState<string>(DEFAULT_RANGE);
  const [branches, setBranches] = useState<string[]>(DEFAULT_BRANCHES);
  const [draftRangeId, setDraftRangeId] = useState<string>(DEFAULT_RANGE);
  const [draftBranches, setDraftBranches] = useState<string[]>(DEFAULT_BRANCHES);
  const filterRef = useRef<HTMLDivElement>(null);

  const activeRange = dashboardRangeOptions.find((r) => r.id === rangeId) ?? dashboardRangeOptions[0];
  const isFiltered = rangeId !== DEFAULT_RANGE || branches.length > 0;

  const handleRefresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    window.setTimeout(() => {
      setRefreshing(false);
      setUpdatedLabel(updatedJustNowLabel);
    }, 900);
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
    } catch {
      setShareCopied(false);
    }
    setShareOpen(true);
  };

  useEffect(() => {
    if (!shareCopied) return;
    const id = window.setTimeout(() => setShareCopied(false), 1600);
    return () => window.clearTimeout(id);
  }, [shareCopied]);

  // Close the filter panel on outside click / Escape.
  useEffect(() => {
    if (!filterOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFilterOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [filterOpen]);

  const openFilter = () => {
    setDraftRangeId(rangeId);
    setDraftBranches(branches);
    setFilterOpen(true);
  };

  const applyFilter = () => {
    setRangeId(draftRangeId);
    setBranches(draftBranches);
    setFilterOpen(false);
  };

  const resetFilter = () => {
    setDraftRangeId(DEFAULT_RANGE);
    setDraftBranches(DEFAULT_BRANCHES);
    setRangeId(DEFAULT_RANGE);
    setBranches(DEFAULT_BRANCHES);
    setFilterOpen(false);
  };

  const toggleBranch = (id: string) => {
    setDraftBranches((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  };

  const isShareOpen = shareOpen || shareCopied;

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("dashboard.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">
            {t("dashboard.subtitle").replace("{business}", businessLabel)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="hidden items-center gap-1.5 text-[11.5px] text-[var(--octo-text-muted)] md:flex">
            <Clock size={13} />
            {t(labelKey(updatedLabel))}
          </span>

          <button
            type="button"
            aria-label={t("common.refresh")}
            title={t("common.refresh")}
            onClick={handleRefresh}
            className="grid h-[30px] w-[30px] place-items-center rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)]"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : undefined} />
          </button>

          <div className="relative">
            <button
              type="button"
              aria-haspopup="dialog"
              aria-expanded={isShareOpen}
              onClick={() => setShareOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-[7px] text-[12px] font-medium text-[var(--octo-text-primary)] transition-colors hover:bg-[var(--octo-hover)]"
            >
              {shareCopied ? <Check size={13} className="text-[#16a34a]" /> : <Share2 size={13} />}
              {t(shareCopied ? "dashboard.share.copied" : "common.share")}
            </button>

            {shareOpen && (
              <div className="absolute end-0 top-[calc(100%+6px)] z-30 w-64 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-3 shadow-lg">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">
                    {t("dashboard.share.title")}
                  </p>
                  <button
                    type="button"
                    aria-label={t("common.cancel")}
                    onClick={() => setShareOpen(false)}
                    className="text-[var(--octo-text-faint)] transition-colors hover:text-[var(--octo-text-secondary)]"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="mt-2.5 flex items-center gap-2 rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-hover)] px-2.5 py-2">
                  <span className="min-w-0 flex-1 truncate text-[11.5px] text-[var(--octo-text-muted)]">
                    {typeof window !== "undefined" ? window.location.href : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleShare()}
                    className="flex shrink-0 items-center gap-1 rounded-[7px] bg-[#0D6EFD] px-2.5 py-1 text-[11.5px] font-medium text-white transition-opacity hover:opacity-90"
                  >
                    {shareCopied ? <Check size={12} /> : <Share2 size={12} />}
                    {t(shareCopied ? "dashboard.share.copied" : "common.share")}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div ref={filterRef} className="relative">
            <button
              type="button"
              aria-haspopup="dialog"
              aria-expanded={filterOpen}
              onClick={() => (filterOpen ? setFilterOpen(false) : openFilter())}
              className="flex items-center gap-1.5 rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-[7px] text-[12px] font-medium text-[var(--octo-text-primary)] transition-colors hover:bg-[var(--octo-hover)]"
            >
              <SlidersHorizontal size={13} />
              {t("dashboard.globalFilter")}
              {isFiltered && <span className="h-1.5 w-1.5 rounded-full bg-[#0D6EFD]" />}
              <ChevronDown size={12} className={`transition-transform ${filterOpen ? "rotate-180" : ""}`} />
            </button>

            {filterOpen && (
              <div
                role="dialog"
                aria-label={t("dashboard.globalFilter")}
                className="absolute end-0 top-[calc(100%+6px)] z-30 w-[300px] rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-3.5 shadow-lg"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">
                    {t("dashboard.globalFilter")}
                  </p>
                  <button
                    type="button"
                    aria-label={t("common.cancel")}
                    onClick={() => setFilterOpen(false)}
                    className="text-[var(--octo-text-faint)] transition-colors hover:text-[var(--octo-text-secondary)]"
                  >
                    <X size={14} />
                  </button>
                </div>

                <p className="mt-3 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
                  {t("dashboard.filter.period")}
                </p>
                <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                  {dashboardRangeOptions.map((opt: DashboardRangeOption) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setDraftRangeId(opt.id)}
                      aria-pressed={draftRangeId === opt.id}
                      className={
                        draftRangeId === opt.id
                          ? "rounded-[9px] border border-[#0D6EFD] bg-[#eaf2ff] px-2 py-1.5 text-[11.5px] font-medium text-[#0D6EFD]"
                          : "rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-2 py-1.5 text-[11.5px] font-medium text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)]"
                      }
                    >
                      {t(labelKey(opt.label))}
                    </button>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
                    {t("dashboard.filter.branches")}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setDraftBranches(
                        draftBranches.length === dashboardBranchOptions.length
                          ? []
                          : dashboardBranchOptions.map((b) => b.id)
                      )
                    }
                    className="text-[11px] font-medium text-[#0D6EFD] hover:underline"
                  >
                    {t("dashboard.filter.allBranches")}
                  </button>
                </div>
                <div className="mt-2 flex flex-col gap-2">
                  {dashboardBranchOptions.map((opt: DashboardBranchOption) => (
                    <Checkbox
                      key={opt.id}
                      label={opt.label}
                      checked={draftBranches.includes(opt.id)}
                      onChange={() => toggleBranch(opt.id)}
                    />
                  ))}
                </div>

                <div className="mt-4 flex items-center gap-2 border-t border-[var(--octo-divider)] pt-3">
                  <button
                    type="button"
                    onClick={resetFilter}
                    className="flex-1 rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-[7px] text-[12px] font-medium text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)]"
                  >
                    {t("dashboard.filter.reset")}
                  </button>
                  <button
                    type="button"
                    onClick={applyFilter}
                    className="flex-1 rounded-[9px] bg-[#0D6EFD] px-3 py-[7px] text-[12px] font-medium text-white transition-opacity hover:opacity-90"
                  >
                    {t("dashboard.filter.apply")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* KPI row */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => (
          <StatCard key={card.id} data={card} onClick={KPI_ROUTES[card.id] ? () => navigate(KPI_ROUTES[card.id]) : undefined} />
        ))}
      </div>

      {/* Main analytics row */}
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[1.55fr_1fr_1fr] lg:items-stretch">
        <RevenueChannelChart quarters={activeRange.quarters} rangeLabel={`dashboard.range.${activeRange.id}`} />
        <OrderChannelDonut />
        <AiInsightsPanel />
      </div>

      {/* Bottom analytics row */}
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[1.15fr_1fr] lg:items-stretch">
        <PerformanceHeatmap branches={branches} />
        <BranchDistribution branches={branches} />
      </div>
    </div>
  );
}
