import type { ReactNode } from "react";
import clsx from "clsx";
import { useI18n } from "@/app/providers/i18n-provider";
import { ShellIcon } from "@/shared/ui/shell-icon";
import type { Kpis } from "./model";

interface CardSpec {
  key: string;
  cardBg: string;
  tile: string;
  /** A frame glyph under assets/Dashboard/icons. */
  icon: string;
  value: number;
  label: string;
  percent: ReactNode;
}

export interface KpiCardsProps {
  kpis: Kpis;
  /** Card 1's label. "Today's Reservations" on the default Today view, as
   *  the frame reads; "Reservations: {day}" once another day is picked, so
   *  the label still says which day the numbers belong to. */
  totalLabel: string;
}

const PERCENT = "text-[14px] font-medium leading-[14px]";

export function KpiCards({ kpis, totalLabel }: KpiCardsProps) {
  const { t } = useI18n();

  // Card tints are the frame's pastels on light and the same hue mixed into
  // the card token on dark (same approach as customers/_shared/theme.ts).
  const cards: CardSpec[] = [
    {
      key: "today",
      cardBg: "bg-[#f0f6ff] [[data-theme=dark]_&]:bg-[color:color-mix(in_srgb,#0063f6_14%,var(--octo-card))]",
      tile: "#0063F6",
      icon: "rsv-kpi-people.svg",
      value: kpis.total,
      label: totalLabel,
      // No yesterday comparison comes from the API, so no trend is shown.
      percent: null,
    },
    {
      key: "confirmed",
      cardBg: "bg-[#effff5] [[data-theme=dark]_&]:bg-[color:color-mix(in_srgb,#01a036_14%,var(--octo-card))]",
      tile: "#01A036",
      icon: "rsv-kpi-chart.svg",
      value: kpis.confirmed,
      label: t("reservations.list.kpi.confirmed"),
      percent: <span className={clsx(PERCENT, "text-[#04783a] [[data-theme=dark]_&]:text-[#22c55e]")}>{kpis.confirmedPct}%</span>,
    },
    {
      key: "pending",
      cardBg: "bg-[#f1f5f9] [[data-theme=dark]_&]:bg-[color:color-mix(in_srgb,#64748b_14%,var(--octo-card))]",
      tile: "#64748B",
      icon: "rsv-kpi-timer.svg",
      value: kpis.pending,
      label: t("reservations.list.kpi.pending"),
      percent: <span className={clsx(PERCENT, "text-[#58606c] [[data-theme=dark]_&]:text-[var(--octo-text-secondary)]")}>{kpis.pendingPct}%</span>,
    },
    {
      key: "cancelled",
      cardBg: "bg-[#fef0f0] [[data-theme=dark]_&]:bg-[color:color-mix(in_srgb,#d30202_14%,var(--octo-card))]",
      tile: "#D30202",
      icon: "rsv-kpi-hourglass.svg",
      value: kpis.cancelled,
      label: t("reservations.list.kpi.cancelled"),
      percent: <span className={clsx(PERCENT, "text-[#d30202] [[data-theme=dark]_&]:text-[#f87171]")}>{kpis.cancelledPct}%</span>,
    },
    {
      key: "noShow",
      cardBg: "bg-[#fffaf0] [[data-theme=dark]_&]:bg-[color:color-mix(in_srgb,#c27c00_14%,var(--octo-card))]",
      tile: "#C27C00",
      // Frame uses the same stopwatch glyph as Pending, not a plain clock (fix round 1).
      icon: "rsv-kpi-timer.svg",
      value: kpis.noShow,
      label: t("reservations.list.kpi.noShow"),
      percent: <span className={clsx(PERCENT, "text-[#c27c00] [[data-theme=dark]_&]:text-[#f59e0b]")}>{kpis.noShowPct}%</span>,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5 xl:gap-6">
      {cards.map(({ key, cardBg, tile, icon, value, label, percent }) => (
        <div
          key={key}
          className={clsx(
            "flex min-w-0 flex-col gap-3 rounded-[12px] border-2 border-[#fefefe] p-4 drop-shadow-[0_4px_2.5px_rgba(0,0,0,0.05)] [[data-theme=dark]_&]:border-[var(--octo-card)]",
            cardBg
          )}
        >
          <div className="flex flex-col gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-[12px] text-white" style={{ backgroundColor: tile }}>
              <ShellIcon name={icon} size={32} />
            </div>
            <div className="flex flex-col gap-2">
              <div className="truncate text-[32px] font-bold leading-[32px] text-[#0f172a] [[data-theme=dark]_&]:text-[var(--octo-text-primary)]">
                {value}
              </div>
              <div className="truncate text-[14px] font-medium leading-[14px] text-[#6f6f6f] [[data-theme=dark]_&]:text-[var(--octo-text-secondary)]">
                {label}
              </div>
            </div>
          </div>
          {percent && <div className="flex items-end">{percent}</div>}
        </div>
      ))}
    </div>
  );
}
