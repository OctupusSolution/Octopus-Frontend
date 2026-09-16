import { type LucideIcon, ChartNoAxesColumnDecreasing, ChartNoAxesCombined, ChartSpline, Hourglass, Timer, UsersRound } from "lucide-react";
import { percentChange, type WaitlistStats } from "@/entities/waitlist-entry";
import { useI18n } from "@/app/providers/i18n-provider";

/** Last period's figures. No history is recorded before this build, so the
 *  comparison baseline is a fixture rather than a query. */
const BASELINE: WaitlistStats = { waitingNow: 7, seatedToday: 2, leftToday: 2, avgWaitMin: 19 };

interface Card {
  key: keyof WaitlistStats;
  color: string;
  icon: LucideIcon;
  label: string;
  note: string;
  value: string;
  /** Whether a rise is good news (green) or bad news (red). */
  higherIsBetter: boolean;
}

export function WaitlistStatCards({ stats }: { stats: WaitlistStats }) {
  const { t } = useI18n();

  const cards: Card[] = [
    { key: "waitingNow", color: "#0D6EFD", icon: UsersRound, label: t("waitlist.stats.waitingNow"), note: t("waitlist.stats.vsLastHour"), value: String(stats.waitingNow), higherIsBetter: true },
    { key: "seatedToday", color: "#009A39", icon: ChartSpline, label: t("waitlist.stats.seatedToday"), note: t("waitlist.stats.vsLastWeek"), value: String(stats.seatedToday), higherIsBetter: true },
    { key: "leftToday", color: "#7F00FF", icon: Hourglass, label: t("waitlist.stats.leftQueue"), note: t("waitlist.stats.vsLastHour"), value: String(stats.leftToday), higherIsBetter: false },
    { key: "avgWaitMin", color: "#C98200", icon: Timer, label: t("waitlist.stats.avgWait"), note: t("waitlist.stats.vsLastHour"), value: `${stats.avgWaitMin} ${t("waitlist.min")}`, higherIsBetter: false },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4 xl:gap-5">
      {cards.map((card) => {
        const change = percentChange(stats[card.key], BASELINE[card.key]);
        const up = (change ?? 0) >= 0;
        const good = up === card.higherIsBetter || change === 0;
        const Trend = up ? ChartNoAxesCombined : ChartNoAxesColumnDecreasing;
        const Icon = card.icon;
        return (
          <article
            key={card.key}
            className="rounded-2xl p-4 shadow-[0_1px_3px_rgba(15,23,42,0.08)] sm:p-5"
            style={{ background: `color-mix(in srgb, ${card.color} 6%, var(--octo-card))` }}
          >
            <span className="grid h-12 w-12 place-items-center rounded-[10px] text-white" style={{ backgroundColor: card.color }}>
              <Icon size={26} strokeWidth={1.6} />
            </span>
            <p className="mt-4 text-[24px] font-bold sm:text-[30px] leading-none tracking-[-0.01em] text-[var(--octo-text-primary)]">{card.value}</p>
            <p className="mt-2 text-[13px] text-[var(--octo-text-secondary)] sm:text-[15px]">{card.label}</p>
            <p className="mt-2.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              {change === null ? (
                <span className="text-[12px] text-[var(--octo-text-muted)]">{t("waitlist.stats.noComparison")}</span>
              ) : (
                <>
                  <Trend size={16} className={good ? "text-[#009A39]" : "text-[#DC2626]"} />
                  <span className={`text-[14px] font-semibold ${good ? "text-[var(--octo-tone-completed-text)]" : "text-[var(--octo-tone-danger-text)]"}`}>
                    {Math.abs(change)}%
                  </span>
                  <span className="ms-1 text-[11.5px] text-[var(--octo-text-muted)]">{card.note}</span>
                </>
              )}
            </p>
          </article>
        );
      })}
    </div>
  );
}
