import type { ComponentType, ReactNode } from "react";
import clsx from "clsx";
import { ChartNoAxesCombined, Hourglass, Timer, Users } from "lucide-react";
import { useI18n } from "@/app/providers/i18n-provider";
import type { Kpis } from "./model";

interface CardSpec {
  key: string;
  cardBg: string;
  tile: string;
  icon: ComponentType<{ className?: string }>;
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

export function KpiCards({ kpis, totalLabel }: KpiCardsProps) {
  const { t } = useI18n();

  const cards: CardSpec[] = [
    {
      key: "today",
      cardBg: "bg-[#0D6EFD]/[0.06]",
      tile: "#0D6EFD",
      icon: Users,
      value: kpis.total,
      label: totalLabel,
      // No yesterday comparison comes from the API, so no trend is shown.
      percent: null,
    },
    {
      key: "confirmed",
      cardBg: "bg-[#16A34A]/[0.06]",
      tile: "#16A34A",
      // Frame draws a chart-with-a-trend glyph here, not a calendar (fix round 1).
      icon: ChartNoAxesCombined,
      value: kpis.confirmed,
      label: t("reservations.list.kpi.confirmed"),
      percent: <span className="text-[12px] font-medium text-[#16A34A]">{kpis.confirmedPct}%</span>,
    },
    {
      key: "pending",
      cardBg: "bg-[var(--octo-track)]",
      tile: "#475569",
      icon: Timer,
      value: kpis.pending,
      label: t("reservations.list.kpi.pending"),
      percent: <span className="text-[12px] font-medium text-[var(--octo-text-muted)]">{kpis.pendingPct}%</span>,
    },
    {
      key: "cancelled",
      cardBg: "bg-[#EF4444]/[0.06]",
      tile: "#DC2626",
      icon: Hourglass,
      value: kpis.cancelled,
      label: t("reservations.list.kpi.cancelled"),
      percent: <span className="text-[12px] font-medium text-[#DC2626]">{kpis.cancelledPct}%</span>,
    },
    {
      key: "noShow",
      cardBg: "bg-[#D97706]/[0.06]",
      tile: "#D97706",
      // Frame uses the same stopwatch glyph as Pending, not a plain clock (fix round 1).
      icon: Timer,
      value: kpis.noShow,
      label: t("reservations.list.kpi.noShow"),
      percent: <span className="text-[12px] font-medium text-[#D97706]">{kpis.noShowPct}%</span>,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      {cards.map(({ key, cardBg, tile, icon: Icon, value, label, percent }) => (
        <div key={key} className={clsx("rounded-xl p-5", cardBg)}>
          <div className="grid h-9 w-9 place-items-center rounded-[10px]" style={{ backgroundColor: tile }}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div className="mt-4 text-[26px] font-bold leading-none text-[var(--octo-text-primary)]">{value}</div>
          <div className="mt-1 text-[12px] text-[var(--octo-text-muted)]">{label}</div>
          <div className="mt-1.5">{percent}</div>
        </div>
      ))}
    </div>
  );
}
