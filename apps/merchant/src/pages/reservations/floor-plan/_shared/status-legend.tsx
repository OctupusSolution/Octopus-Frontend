// "Table status legend". On the live floor each chip also filters: press one
// to pick out those tables, press it again to show everything.
import clsx from "clsx";
import { LIVE_STATUSES, type LiveStatus } from "@/entities/floor-plan";
import { useI18n } from "@/app/providers/i18n-provider";
import { BORDER_200, SURFACE_WHITE, TEXT_PRIMARY } from "../../_shared/theme";
import { STATUS_CHIP, SURFACE_LEGEND } from "../live/theme";

// Theme tone tokens for callers that paint a status chip inline.
export const LEGEND_CHIP: Record<LiveStatus, { bg: string; text: string }> = {
  cleaning: { bg: "var(--octo-tone-info-bg)", text: "var(--octo-tone-info-text)" },
  available: { bg: "var(--octo-tone-success-bg)", text: "var(--octo-tone-success-text)" },
  reserved: { bg: "var(--octo-tone-warning-bg)", text: "var(--octo-tone-warning-text)" },
  blocked: { bg: "var(--octo-tone-slate-bg)", text: "var(--octo-tone-slate-text)" },
  occupied: { bg: "var(--octo-tone-danger-bg)", text: "var(--octo-tone-danger-text)" },
};

export function StatusLegend({
  counts,
  active,
  onToggle,
  className,
}: {
  counts: Record<LiveStatus, number>;
  active?: LiveStatus | null;
  onToggle?: (status: LiveStatus) => void;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <section className={clsx("rounded-[12px] border px-4 py-2", BORDER_200, SURFACE_LEGEND, className)}>
      <h2 className={clsx("text-[18px] font-bold leading-[18px]", TEXT_PRIMARY)}>{t("floorPlan.legend.title")}</h2>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {LIVE_STATUSES.map((status) => {
          const pressed = active === status;
          const content = (
            <>
              <span className="h-2 w-2 shrink-0 rounded-full bg-current" />
              <span className="ms-1 whitespace-nowrap">{t(`floorPlan.status.${status}.legend`)}</span>
              <span className={clsx("ms-2 grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10px] leading-[10px]", SURFACE_WHITE)}>
                {counts[status]}
              </span>
            </>
          );
          const classes = clsx(
            "inline-flex h-[34px] items-center rounded-[4px] p-2 text-[14px] font-medium leading-[14px] transition-shadow",
            STATUS_CHIP[status],
            pressed && "ring-2 ring-current"
          );
          return onToggle ? (
            <button key={status} type="button" aria-pressed={pressed} onClick={() => onToggle(status)} className={classes}>
              {content}
            </button>
          ) : (
            <span key={status} className={classes}>
              {content}
            </span>
          );
        })}
      </div>
    </section>
  );
}
