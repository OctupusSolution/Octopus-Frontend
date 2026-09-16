// apps/merchant/src/pages/orders-list/_shared/stat-cards.tsx
import type { ComponentType } from "react";
import { CheckCircle2, RotateCw, TrendingUp, UtensilsCrossed, XCircle } from "lucide-react";
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
  { key: "salesGrossSar", icon: TrendingUp, tile: "#D97706", cardBg: "bg-[#D97706]/[0.06]", labelKey: "orders.stat.salesGross", money: true },
  { key: "openOrders", icon: RotateCw, tile: "#64748B", cardBg: "bg-[var(--octo-track)]", labelKey: "orders.stat.openOrders" },
  { key: "completed", icon: CheckCircle2, tile: "#16A34A", cardBg: "bg-[#16A34A]/[0.06]", labelKey: "orders.state.completed" },
  { key: "cancelled", icon: XCircle, tile: "#DC2626", cardBg: "bg-[#DC2626]/[0.06]", labelKey: "orders.stat.cancelledLabel" },
];

export function OrdersStatCards({ stats }: { stats: OrdersStats }) {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {CARDS.map(({ key, icon: Icon, tile, cardBg, labelKey, money }) => (
        <div key={key} className={`rounded-xl p-[18px] ${cardBg}`}>
          <div className="grid h-9 w-9 place-items-center rounded-[10px]" style={{ backgroundColor: tile }}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div className="mt-4 whitespace-nowrap text-[26px] font-bold leading-none text-[var(--octo-text-primary)]">
            {money ? formatSar(stats[key]) : stats[key]}
          </div>
          <div className="mt-1 text-[12px] text-[var(--octo-text-muted)]">{t(labelKey)}</div>
          <div className="mt-1.5 flex items-center gap-1.5 text-[11.5px]">
            <TrendingUp size={13} className="text-[#16A34A]" strokeWidth={2.5} />
            {/* No day-over-day history exists in this mock fixture, so — like
                pages/reservations/_shared/kpi-cards.tsx — this is a fixed
                figure lifted from the mockup, not a computed comparison. */}
            <span className="font-semibold text-[#16A34A]">3.46%</span>
            <span className="text-[var(--octo-text-faint)]">{t("orders.stat.deltaVsYesterday")}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
