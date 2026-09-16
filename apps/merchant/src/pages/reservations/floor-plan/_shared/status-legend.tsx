// "Table status legend". On the live floor each chip also filters: press one
// to pick out those tables, press it again to show everything.
import clsx from "clsx";
import { LIVE_STATUSES, type LiveStatus } from "@/entities/floor-plan";
import { TABLE_TONES } from "@/widgets/floor-plan-canvas";
import { useI18n } from "@/app/providers/i18n-provider";

// Theme tone tokens, not literals: the dark palette lifts each text shade so
// a chip stays readable on its tint (a literal grey "Blocked" vanished there).
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
    <section className={clsx("rounded-2xl border border-[var(--octo-border-card)] bg-[var(--octo-soft-bg)] px-5 py-4", className)}>
      <h2 className="text-[16px] font-semibold text-[var(--octo-text-primary)]">{t("floorPlan.legend.title")}</h2>
      <div className="mt-3 flex flex-wrap gap-2.5">
        {LIVE_STATUSES.map((status) => {
          const chip = LEGEND_CHIP[status];
          const pressed = active === status;
          const content = (
            <>
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: TABLE_TONES[status].dot }} />
              {t(`floorPlan.status.${status}.legend`)}
              <span className="grid min-w-[22px] place-items-center rounded-md bg-[var(--octo-card)] px-1.5 py-px text-[11px] font-semibold">
                {counts[status]}
              </span>
            </>
          );
          const classes = clsx(
            "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[14px] font-medium transition-shadow",
            pressed && "ring-2 ring-current ring-offset-1 ring-offset-[var(--octo-soft-bg)]"
          );
          return onToggle ? (
            <button
              key={status}
              type="button"
              aria-pressed={pressed}
              onClick={() => onToggle(status)}
              className={classes}
              style={{ backgroundColor: chip.bg, color: chip.text }}
            >
              {content}
            </button>
          ) : (
            <span key={status} className={classes} style={{ backgroundColor: chip.bg, color: chip.text }}>
              {content}
            </span>
          );
        })}
      </div>
    </section>
  );
}
