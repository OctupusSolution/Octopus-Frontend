// "Welcome to Floor Plan" beside "Your Floor Plan Summary", as the draft and
// live frames draw them. Reports the published plan; before anything is
// published it reports the draft instead, labelled as such, rather than a
// row of dashes.
import type { ReactNode } from "react";
import clsx from "clsx";
import { docStats, type FloorPlanDraft, type PublishedFloorPlan } from "@/entities/floor-plan";
import { useI18n } from "@/app/providers/i18n-provider";
import { ShellIcon } from "@/shared/ui/shell-icon";
import { BORDER_200, BORDER_300, TEXT_PRIMARY, TEXT_SECONDARY } from "../../_shared/theme";
import { formatDateTime, formatNumber } from "./format";

const ICON_BLUE = "text-[#0058da] [[data-theme=dark]_&]:text-[var(--octo-accent)]";

function SummaryItem({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className={clsx("flex min-w-0 flex-col items-start gap-1 border-e px-2", BORDER_200)}>
      <ShellIcon name={icon} size={24} className={ICON_BLUE} />
      <span className={clsx("whitespace-nowrap text-[10px] font-medium leading-[10px]", TEXT_SECONDARY)}>{label}</span>
      <span className={clsx("whitespace-nowrap text-[12px] font-semibold leading-[1.4]", TEXT_PRIMARY)}>{value}</span>
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
        "flex flex-col gap-4 rounded-xl border px-2 py-3 lg:flex-row lg:items-center lg:justify-between",
        BORDER_300,
        className
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-10">
        <div className={clsx("flex items-start gap-3 lg:w-[367px] lg:min-w-0 lg:shrink lg:border-e lg:pe-3", BORDER_300)}>
          <ShellIcon name="fp-hub-plan-mark.svg" size={58} className={ICON_BLUE} />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <h2 className={clsx("text-[16px] font-semibold leading-[16px]", TEXT_PRIMARY)}>{t("floorPlan.summary.welcomeTitle")}</h2>
            <p className={clsx("text-[14px] font-medium leading-[1.4]", TEXT_SECONDARY)}>{t("floorPlan.summary.welcomeBody")}</p>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-4 pe-2 lg:shrink-0">
          <h2 className={clsx("text-[16px] font-semibold leading-[16px]", TEXT_PRIMARY)}>{t("floorPlan.summary.title")}</h2>
          {doc && stats && when ? (
            <div className="flex flex-wrap items-stretch gap-x-6 gap-y-3 lg:flex-nowrap">
              <SummaryItem
                icon="fp-hub-plan.svg"
                label={published ? t("floorPlan.summary.publishedPlan") : t("floorPlan.summary.draftPlan")}
                value={doc.name}
              />
              <SummaryItem
                icon="fp-hub-update.svg"
                label={published ? t("floorPlan.summary.lastUpdated") : t("floorPlan.summary.lastSaved")}
                value={formatDateTime(when, locale)}
              />
              <SummaryItem icon="fp-hub-table.svg" label={t("floorPlan.summary.totalTables")} value={formatNumber(stats.tables, locale)} />
              <SummaryItem
                icon="fp-hub-users.svg"
                label={t("floorPlan.summary.totalCapacity")}
                value={t("floorPlan.common.seatsCount").replace("{n}", formatNumber(stats.seats, locale))}
              />
            </div>
          ) : (
            <p className={clsx("text-[14px] font-medium leading-[1.4]", TEXT_SECONDARY)}>{t("floorPlan.summary.nothingYet")}</p>
          )}
        </div>
      </div>

      {action && <div className="lg:shrink-0">{action}</div>}
    </section>
  );
}
