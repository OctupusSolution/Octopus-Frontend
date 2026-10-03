// apps/merchant/src/pages/orders-list/_shared/stat-cards.tsx
import { formatSar } from "@octopus/api-client";
import { useI18n } from "@/app/providers/i18n-provider";
import { ShellIcon } from "@/shared/ui/shell-icon";
import type { OrdersStats } from "./stats";

// Card tints are the frame's pastels on light and the same hue mixed into the
// card token on dark.
const CARDS: readonly {
  key: keyof OrdersStats;
  icon: string;
  tile: string;
  cardBg: string;
  labelKey: string;
  money?: boolean;
}[] = [
  {
    key: "totalOrders",
    icon: "ord-stat-total.svg",
    tile: "#0063F6",
    cardBg: "bg-[#f0f6ff] [[data-theme=dark]_&]:bg-[color:color-mix(in_srgb,#0063f6_14%,var(--octo-card))]",
    labelKey: "orders.stat.totalOrders",
  },
  {
    key: "salesGrossSar",
    icon: "ord-stat-sales.svg",
    tile: "#C27C00",
    cardBg: "bg-[#fffaf0] [[data-theme=dark]_&]:bg-[color:color-mix(in_srgb,#c27c00_14%,var(--octo-card))]",
    labelKey: "orders.stat.salesGross",
    money: true,
  },
  {
    key: "openOrders",
    icon: "ord-stat-open.svg",
    tile: "#64748B",
    cardBg: "bg-[#f1f5f9] [[data-theme=dark]_&]:bg-[color:color-mix(in_srgb,#64748b_14%,var(--octo-card))]",
    labelKey: "orders.stat.openOrders",
  },
  {
    key: "completed",
    icon: "ord-stat-completed.svg",
    tile: "#009A39",
    cardBg: "bg-[#effff5] [[data-theme=dark]_&]:bg-[color:color-mix(in_srgb,#009a39_14%,var(--octo-card))]",
    labelKey: "orders.state.completed",
  },
  {
    key: "cancelled",
    icon: "ord-stat-cancelled.svg",
    tile: "#D30202",
    cardBg: "bg-[#fef0f0] [[data-theme=dark]_&]:bg-[color:color-mix(in_srgb,#d30202_14%,var(--octo-card))]",
    labelKey: "orders.stat.cancelledLabel",
  },
];

export function OrdersStatCards({ stats }: { stats: OrdersStats }) {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5 xl:gap-6">
      {CARDS.map(({ key, icon, tile, cardBg, labelKey, money }) => (
        <div
          key={key}
          className={`flex min-w-0 flex-col gap-3 rounded-[12px] border-2 border-[#fefefe] p-4 drop-shadow-[0_4px_2.5px_rgba(0,0,0,0.05)] [[data-theme=dark]_&]:border-[var(--octo-card)] ${cardBg}`}
        >
          <div className="flex flex-col gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-[12px] text-white" style={{ backgroundColor: tile }}>
              <ShellIcon name={icon} size={32} />
            </div>
            <div className="flex flex-col gap-2">
              <div className="truncate text-[24px] font-bold leading-[24px] text-[var(--octo-text-primary)]">
                {money ? formatSar(stats[key]) : stats[key]}
              </div>
              <div className="truncate text-[14px] font-medium leading-[14px] text-[var(--octo-text-secondary)]">{t(labelKey)}</div>
            </div>
          </div>
          {/* The frame's "3.46% vs Yesterday" line. The API returns no
              day-over-day comparison, so the figure is a dash rather than an
              invented percentage. */}
          <div className="flex items-end gap-2 whitespace-nowrap">
            <span className="flex items-end gap-1 text-[14px] font-medium leading-[14px] text-[#04783a] [[data-theme=dark]_&]:text-[#22c55e]">
              <span className="grid h-4 w-4 place-items-center">
                <ShellIcon name="ord-trend-up.svg" size={15} />
              </span>
              —
            </span>
            <span className="min-w-0 flex-1 truncate text-[10px] leading-[10px] text-[var(--octo-text-secondary)]">
              {t("orders.stat.deltaVsYesterday")}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
