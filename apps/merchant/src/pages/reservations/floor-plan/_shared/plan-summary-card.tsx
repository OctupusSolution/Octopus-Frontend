// "Welcome to Floor Plan" beside "Your Floor Plan Summary", as the draft and
// live frames draw them. Reports the published plan; before anything is
// published it reports the draft instead, labelled as such, rather than a
// row of dashes.
import type { ReactNode } from "react";
import { LayoutTemplate, RefreshCw, Users } from "lucide-react";
import clsx from "clsx";
import { docStats, type FloorPlanDraft, type PublishedFloorPlan } from "@/entities/floor-plan";
import { useI18n } from "@/app/providers/i18n-provider";
import { FLOOR_PLAN_ASSETS } from "@/shared/lib/floor-plan-assets";
import { formatDateTime, formatNumber } from "./format";
import { TableIcon } from "./icons";

function SummaryItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 sm:border-e sm:border-[var(--octo-border-card)] sm:pe-5 sm:last:border-e-0">
      <span className="text-[#2563EB]">{icon}</span>
      <span className="text-[12px] text-[var(--octo-text-secondary)]">{label}</span>
      <span className="truncate text-[14px] font-semibold text-[var(--octo-text-primary)]">{value}</span>
    </div>
  );
}

export function PlanSummaryCard({
  published,
  draft,
  action,
  className,
}: {
  published: PublishedFloorPlan | null;
  draft: FloorPlanDraft | null;
  action?: ReactNode;
  className?: string;
}) {
  const { t, locale } = useI18n();
  const source = published ?? draft;
  const doc = source?.doc;
  const stats = doc ? docStats(doc) : null;
  const when = published ? published.publishedAt : draft?.savedAt;

  return (
    <section
      className={clsx(
        "flex flex-col gap-5 rounded-2xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-5 lg:flex-row lg:items-center lg:gap-6",
        className
      )}
    >
      <div className="flex items-start gap-4 lg:max-w-[440px] lg:border-e lg:border-[var(--octo-border-card)] lg:pe-6">
        <img src={FLOOR_PLAN_ASSETS.floorPlanMark} alt="" className="h-14 w-14 shrink-0" />
        <div>
          <h2 className="text-[17px] font-semibold text-[var(--octo-text-primary)]">{t("floorPlan.summary.welcomeTitle")}</h2>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--octo-text-secondary)]">{t("floorPlan.summary.welcomeBody")}</p>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <h2 className="text-[17px] font-semibold text-[var(--octo-text-primary)]">{t("floorPlan.summary.title")}</h2>
        {doc && stats && when ? (
          <div className="mt-3 grid grid-cols-2 gap-4 sm:flex sm:flex-wrap sm:gap-5">
            <SummaryItem
              icon={<LayoutTemplate size={20} strokeWidth={1.7} />}
              label={published ? t("floorPlan.summary.publishedPlan") : t("floorPlan.summary.draftPlan")}
              value={doc.name}
            />
            <SummaryItem
              icon={<RefreshCw size={20} strokeWidth={1.7} />}
              label={published ? t("floorPlan.summary.lastUpdated") : t("floorPlan.summary.lastSaved")}
              value={formatDateTime(when, locale)}
            />
            <SummaryItem icon={<TableIcon size={20} />} label={t("floorPlan.summary.totalTables")} value={formatNumber(stats.tables, locale)} />
            <SummaryItem
              icon={<Users size={20} strokeWidth={1.7} />}
              label={t("floorPlan.summary.totalCapacity")}
              value={t("floorPlan.common.seatsCount").replace("{n}", formatNumber(stats.seats, locale))}
            />
          </div>
        ) : (
          <p className="mt-2 text-[13px] text-[var(--octo-text-muted)]">{t("floorPlan.summary.nothingYet")}</p>
        )}
      </div>

      {action && <div className="lg:shrink-0">{action}</div>}
    </section>
  );
}
