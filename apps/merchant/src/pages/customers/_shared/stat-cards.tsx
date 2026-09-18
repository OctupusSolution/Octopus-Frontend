// apps/merchant/src/pages/customers/_shared/stat-cards.tsx
import { ChartNoAxesColumnIncreasing } from "lucide-react";
import { useI18n } from "@/app/providers/i18n-provider";
import { STAT_CARD_THEME, type StatCardKey } from "./theme";
import { customerStats } from "./mock-data";

const CARD_ORDER: readonly StatCardKey[] = ["total", "active", "newThisMonth", "vip", "returning", "totalSpend"];
const LABEL_KEY: Record<StatCardKey, string> = {
  total: "customers.stat.total",
  active: "customers.stat.active",
  newThisMonth: "customers.stat.newThisMonth",
  vip: "customers.stat.vip",
  returning: "customers.stat.returning",
  totalSpend: "customers.stat.totalSpend",
};

export function CustomerStatCards({ isEmpty }: { isEmpty?: boolean }) {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {CARD_ORDER.map((key) => {
        const theme = STAT_CARD_THEME[key];
        const Icon = theme.icon;
        const stat = customerStats[key];
        // When the customer list is genuinely empty, every KPI reads 0 (per
        // CRM-Empty state.png) instead of the decorative mock totals.
        const value = isEmpty ? "0" : key === "totalSpend" ? (stat as { display: string }).display : (stat as { value: number }).value.toLocaleString("en-US");
        const delta = isEmpty ? "0%" : stat.delta;

        return (
          <div key={key} className={`min-w-0 rounded-2xl p-3.5 shadow-[0_2px_6px_rgba(16,24,40,0.06)] ${theme.cardBg}`}>
            <div className="grid h-11 w-11 place-items-center rounded-[10px]" style={{ backgroundColor: theme.tile }}>
              <Icon className="h-6 w-6 text-white" />
            </div>
            <div className="mt-3 truncate text-[24px] font-bold leading-none text-[var(--octo-text-primary)]">{value}</div>
            <div className="mt-1.5 truncate text-[13px] text-[var(--octo-text-muted)]">{t(LABEL_KEY[key])}</div>
            <div className="mt-2 flex items-center gap-1.5 whitespace-nowrap">
              <ChartNoAxesColumnIncreasing size={15} className="text-[#16A34A]" strokeWidth={2} />
              <span className="text-[13px] font-medium text-[#16A34A]">{delta}</span>
              <span className="ms-1 truncate text-[10px] text-[var(--octo-text-muted)]">
                {t(key === "totalSpend" ? "customers.stat.deltaVsLastMonth" : "customers.stat.deltaVsYesterday")}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
