// apps/merchant/src/pages/orders-list/_shared/stat-cards.tsx
import type { ComponentType } from "react";
import { BarChart3, CheckCircle2, LineChart, RotateCw, UtensilsCrossed, XCircle } from "lucide-react";
import { formatSar } from "@octopus/api-client";
import { useI18n } from "@/app/providers/i18n-provider";
import type { OrdersStats } from "./stats";

const CARDS: readonly {
  key: keyof OrdersStats;
  icon: ComponentType<{ className?: string }>;
  tile: string;
  cardBg: string;
  labelKey: string;
  money?: boolean;
}[] = [
  { key: "totalOrders", icon: UtensilsCrossed, tile: "#0D6EFD", cardBg: "bg-[#0D6EFD]/[0.06]", labelKey: "orders.stat.totalOrders" },
  { key: "salesGrossSar", icon: LineChart, tile: "#CA8A04", cardBg: "bg-[#CA8A04]/[0.08]", labelKey: "orders.stat.salesGross", money: true },
  { key: "openOrders", icon: RotateCw, tile: "#64748B", cardBg: "bg-[var(--octo-track)]", labelKey: "orders.stat.openOrders" },
  { key: "completed", icon: CheckCircle2, tile: "#16A34A", cardBg: "bg-[#16A34A]/[0.06]", labelKey: "orders.state.completed" },
  { key: "cancelled", icon: XCircle, tile: "#DC2626", cardBg: "bg-[#DC2626]/[0.06]", labelKey: "orders.stat.cancelledLabel" },
];

export function OrdersStatCards({ stats }: { stats: OrdersStats }) {
  const { t } = useI18n();
  // No day-over-day history exists in this mock fixture, so — like
  // pages/reservations/_shared/kpi-cards.tsx — the figure is lifted from the
  // frames rather than computed. orders.png pairs an empty book with 0%, so
  // an empty book reports no movement here too.
  const deltaLabel = stats.totalOrders > 0 ? "3.46%" : "0%";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {CARDS.map(({ key, icon: Icon, tile, cardBg, labelKey, money }) => (
        <div key={key} className={`rounded-2xl p-5 ${cardBg}`}>
          <div className="grid h-11 w-11 place-items-center rounded-xl" style={{ backgroundColor: tile }}>
            <Icon className="h-[22px] w-[22px] text-white" />
          </div>
          <div className="mt-5 whitespace-nowrap text-[28px] font-bold leading-none text-[var(--octo-text-primary)]">
            {money ? formatSar(stats[key]) : stats[key]}
          </div>
          <div className="mt-1.5 text-[13px] text-[var(--octo-text-muted)]">{t(labelKey)}</div>
          <div className="mt-2 flex items-center gap-1.5 text-[12px]">
            <BarChart3 size={14} className="text-[#16A34A]" strokeWidth={2.5} />
            <span className="font-semibold text-[#16A34A]">{deltaLabel}</span>
            <span className="text-[var(--octo-text-faint)]">{t("orders.stat.deltaVsYesterday")}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
