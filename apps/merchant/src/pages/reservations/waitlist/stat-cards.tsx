import { type LucideIcon, ChartSpline, Hourglass, Timer, UsersRound } from "lucide-react";
import type { WaitlistStats } from "@/entities/waitlist-entry";
import { useI18n } from "@/app/providers/i18n-provider";

interface Card {
  key: keyof WaitlistStats;
  color: string;
  icon: LucideIcon;
  label: string;
  value: string;
}

// No past-period figures come from the API, so no trend is drawn rather than
// comparing against an invented baseline.
export function WaitlistStatCards({ stats }: { stats: WaitlistStats }) {
  const { t } = useI18n();

  const cards: Card[] = [
    { key: "waitingNow", color: "#0D6EFD", icon: UsersRound, label: t("waitlist.stats.waitingNow"), value: String(stats.waitingNow) },
    { key: "seatedToday", color: "#009A39", icon: ChartSpline, label: t("waitlist.stats.seatedToday"), value: String(stats.seatedToday) },
    { key: "leftToday", color: "#7F00FF", icon: Hourglass, label: t("waitlist.stats.leftQueue"), value: String(stats.leftToday) },
    { key: "avgWaitMin", color: "#C98200", icon: Timer, label: t("waitlist.stats.avgWait"), value: `${stats.avgWaitMin} ${t("waitlist.min")}` },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4 xl:gap-5">
      {cards.map((card) => {
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
          </article>
        );
      })}
    </div>
  );
}
