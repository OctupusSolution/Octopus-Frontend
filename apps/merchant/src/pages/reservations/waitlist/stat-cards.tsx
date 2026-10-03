import type { CSSProperties } from "react";
import type { WaitlistStats } from "@/entities/waitlist-entry";
import { useI18n } from "@/app/providers/i18n-provider";
import { WaitlistImg } from "./_shared/waitlist-icon";

interface Card {
  key: keyof WaitlistStats;
  /** The card's pastel wash and the solid tile behind its icon. */
  wash: string;
  tile: string;
  icon: string;
  label: string;
  value: string;
}

export function WaitlistStatCards({ stats }: { stats: WaitlistStats }) {
  const { t } = useI18n();

  const cards: Card[] = [
    { key: "waitingNow", wash: "#F0F6FF", tile: "#0063F6", icon: "people.svg", label: t("waitlist.stats.waitingNow"), value: String(stats.waitingNow) },
    { key: "seatedToday", wash: "#EFFFF5", tile: "#01A036", icon: "favorite-chart.svg", label: t("waitlist.stats.seatedToday"), value: String(stats.seatedToday) },
    { key: "leftToday", wash: "#F7F4FF", tile: "#7900F3", icon: "hourglass.svg", label: t("waitlist.stats.leftQueue"), value: String(stats.leftToday) },
    { key: "avgWaitMin", wash: "#FFFAF0", tile: "#C27C00", icon: "timer.svg", label: t("waitlist.stats.avgWait"), value: `${stats.avgWaitMin} ${t("waitlist.min")}` },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4 xl:gap-6">
      {cards.map((card) => (
        <article
          key={card.key}
          style={{ "--wash": card.wash, "--tile": card.tile } as CSSProperties}
          className="flex flex-col gap-3 rounded-[12px] border-2 border-[#FEFEFE] bg-[var(--wash)] px-4 py-4 drop-shadow-[0px_4px_2.5px_rgba(0,0,0,0.05)] [[data-theme=dark]_&]:border-[var(--octo-border-card)] [[data-theme=dark]_&]:bg-[color:color-mix(in_srgb,var(--tile)_12%,var(--octo-card))]"
        >
          <div className="flex flex-col gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-[12px] bg-[var(--tile)]">
              <WaitlistImg name={card.icon} size={32} />
            </span>
            <div className="flex flex-col gap-2">
              <p className="text-[32px] font-bold leading-[32px] text-[#0F172A] [[data-theme=dark]_&]:text-[var(--octo-text-primary)]">{card.value}</p>
              <p className="text-[14px] font-medium leading-[14px] text-[#6F6F6F] [[data-theme=dark]_&]:text-[var(--octo-text-secondary)]">{card.label}</p>
            </div>
          </div>
          {/* The frame's trend line ("3.46% vs last hour"). The API returns no
              past-period figures, so the line says so rather than showing an
              invented percentage; it keeps the card at the frame's height. */}
          <p className="flex h-4 items-end text-[10px] leading-[10px] text-[#6F6F6F] [[data-theme=dark]_&]:text-[var(--octo-text-muted)]">{t("waitlist.stats.noComparison")}</p>
        </article>
      ))}
    </div>
  );
}
