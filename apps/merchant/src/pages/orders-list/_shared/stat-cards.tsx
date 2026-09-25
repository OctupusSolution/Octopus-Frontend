// apps/merchant/src/pages/orders-list/_shared/stat-cards.tsx
import type { ComponentType } from "react";
import { CheckCircle2, LineChart, RotateCw, UtensilsCrossed, XCircle } from "lucide-react";
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

  // No day-over-day comparison comes from the API, so no trend line is drawn
  // rather than showing an invented figure.
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
        </div>
      ))}
    </div>
  );
}
