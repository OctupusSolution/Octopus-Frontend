import { useEffect, useRef, useState } from "react";
import { RefreshCw, Share2, SlidersHorizontal, Clock, Check, X } from "lucide-react";
import { AiInsightsPanel } from "@/widgets/ai-insights-panel";
import {
  distributionCards,
  lastUpdatedLabel,
  updatedJustNowLabel,
  dashboardBranchOptions,
} from "@/shared/api/mock-dashboard";
import { useI18n } from "@/app/providers/i18n-provider";
import { useTenantConfig } from "@/app/providers/tenant-config-provider";
import { labelKey } from "@/shared/lib/labels";
import { Checkbox } from "@ui/primitives";
import { KpiCards } from "./_sections/kpi-cards";
import { CustomersActivity } from "./_sections/customers-activity";
import { DistributionCard } from "./_sections/distribution-card";
import { LiveOrders } from "./_sections/live-orders";
import { RecentActivity } from "./_sections/recent-activity";

const outlineButton =
  "flex h-11 items-center gap-2 rounded-lg border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-4 text-[15px] font-medium text-[var(--octo-text-primary)] transition-colors hover:bg-[var(--octo-hover)]";

export function DashboardPage() {
  const { t } = useI18n();
  const { activeBusiness } = useTenantConfig();

  const businessLabel = activeBusiness?.businessName?.trim() || t("sidebar.accountFallback");

  const [refreshing, setRefreshing] = useState(false);
  const [updatedLabel, setUpdatedLabel] = useState<string>(lastUpdatedLabel);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [branches, setBranches] = useState<string[]>([]);
  const [draftBranches, setDraftBranches] = useState<string[]>([]);
  const filterRef = useRef<HTMLDivElement>(null);

  const handleRefresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    window.setTimeout(() => {
      setRefreshing(false);
      setUpdatedLabel(updatedJustNowLabel);
    }, 900);
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
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
    setDraftBranches(branches);
    setFilterOpen(true);
  };

  const toggleBranch = (id: string) => {
    setDraftBranches((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]));
  };

  return (
    <div className="px-4 pb-10 pt-6 sm:px-[26px] lg:ps-[50px] lg:pt-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold leading-tight text-[var(--octo-text-primary)] sm:text-[26px]">
            {t("dashboard.title")}
          </h1>
          <p className="mt-1.5 text-[13.5px] text-[var(--octo-text-secondary)] sm:text-[15px]">
            {t("dashboard.subtitle").replace("{business}", businessLabel)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="hidden items-center gap-2 text-[15px] text-[var(--octo-text-secondary)] md:flex">
            <Clock size={21} strokeWidth={1.6} />
            {t(labelKey(updatedLabel))}
          </span>

          <button
            type="button"
            aria-label={t("common.refresh")}
            title={t("common.refresh")}
            onClick={handleRefresh}
            className="grid h-11 w-11 place-items-center rounded-lg border border-[var(--octo-border-input)] bg-[var(--octo-card)] text-[var(--octo-text-primary)] transition-colors hover:bg-[var(--octo-hover)]"
          >
            <RefreshCw size={20} strokeWidth={1.7} className={refreshing ? "animate-spin" : undefined} />
          </button>

          <div className="relative">
            <button
              type="button"
              aria-haspopup="dialog"
              aria-expanded={shareOpen}
              onClick={() => setShareOpen((v) => !v)}
              className={outlineButton}
            >
              {shareCopied ? <Check size={19} className="text-[#16a34a]" /> : <Share2 size={19} strokeWidth={1.7} />}
              {t(shareCopied ? "dashboard.share.copied" : "common.share")}
            </button>

            {shareOpen && (
              <div className="absolute end-0 top-[calc(100%+6px)] z-30 w-64 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-3 shadow-lg">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{t("dashboard.share.title")}</p>
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
                  <span className="min-w-0 flex-1 truncate text-[11.5px] text-[var(--octo-text-muted)]">{window.location.href}</span>
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
              className={outlineButton}
            >
              <SlidersHorizontal size={19} strokeWidth={1.7} />
              {t("dashboard.globalFilter")}
              {branches.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-[#0D6EFD]" />}
            </button>

            {filterOpen && (
              <div
                role="dialog"
                aria-label={t("dashboard.globalFilter")}
                className="absolute end-0 top-[calc(100%+6px)] z-30 w-[280px] rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-3.5 shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
                    {t("dashboard.filter.branches")}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setDraftBranches(draftBranches.length === dashboardBranchOptions.length ? [] : dashboardBranchOptions.map((b) => b.id))
                    }
                    className="text-[11px] font-medium text-[#0D6EFD] hover:underline"
                  >
                    {t("dashboard.filter.allBranches")}
                  </button>
                </div>
                <div className="mt-2 flex flex-col gap-2">
                  {dashboardBranchOptions.map((opt) => (
                    <Checkbox
                      key={opt.id}
                      label={t(opt.labelKey)}
                      checked={draftBranches.includes(opt.id)}
                      onChange={() => toggleBranch(opt.id)}
                    />
                  ))}
                </div>

                <div className="mt-4 flex items-center gap-2 border-t border-[var(--octo-divider)] pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setDraftBranches([]);
                      setBranches([]);
                      setFilterOpen(false);
                    }}
                    className="flex-1 rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-[7px] text-[12px] font-medium text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)]"
                  >
                    {t("dashboard.filter.reset")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBranches(draftBranches);
                      setFilterOpen(false);
                    }}
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

      <div className="mt-10">
        <KpiCards />
      </div>

      <div className="mt-12 grid grid-cols-1 gap-[25px] lg:grid-cols-[2.06fr_1fr]">
        <CustomersActivity />
        <AiInsightsPanel />
      </div>

      <div className="mt-12 grid grid-cols-1 gap-[26px] lg:grid-cols-2">
        {distributionCards.map((card) => (
          <DistributionCard key={card.id} data={card} branches={branches} />
        ))}
      </div>

      <div className="mt-14">
        <LiveOrders branches={branches} />
      </div>

      <div className="mt-12">
        <RecentActivity />
      </div>
    </div>
  );
}
