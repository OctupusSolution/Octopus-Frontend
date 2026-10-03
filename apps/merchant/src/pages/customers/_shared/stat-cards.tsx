// apps/merchant/src/pages/customers/_shared/stat-cards.tsx
import { useI18n } from "@/app/providers/i18n-provider";
import { ShellIcon } from "@/shared/ui/shell-icon";
import { STAT_CARD_THEME, type StatCardKey } from "./theme";
import { customerStats } from "./mock-data";
import { useCustomerStats } from "./customer-store";

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
  // The business's own figures once they have loaded, the decorative ones until then.
  const stats = useCustomerStats() ?? customerStats;

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6 xl:gap-6">
      {CARD_ORDER.map((key) => {
        const theme = STAT_CARD_THEME[key];
        const Icon = theme.icon;
        const stat = stats[key];
        // When the customer list is genuinely empty, every KPI reads 0
        // instead of the decorative mock totals.
        const value = isEmpty ? "0" : key === "totalSpend" ? (stat as { display: string }).display : (stat as { value: number }).value.toLocaleString("en-US");
        const delta = isEmpty ? "0%" : stat.delta;

        return (
          <div
            key={key}
            className={`flex min-w-0 flex-col gap-3 rounded-[12px] border-2 border-[#fefefe] px-3 py-4 drop-shadow-[0_4px_2.5px_rgba(0,0,0,0.05)] [[data-theme=dark]_&]:border-[var(--octo-card)] ${theme.cardBg}`}
          >
            <div className="flex flex-col gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-[12px] text-white" style={{ backgroundColor: theme.tile }}>
                {typeof Icon === "string" ? <ShellIcon name={Icon} size={32} /> : <Icon size={28} strokeWidth={1.5} />}
              </div>
              <div className="flex flex-col gap-2">
                <div className="truncate text-[24px] font-bold leading-[24px] text-[var(--octo-text-primary)]">{value}</div>
                <div className="truncate text-[14px] font-medium leading-[14px] text-[var(--octo-text-secondary)]">{t(LABEL_KEY[key])}</div>
              </div>
            </div>
            <div className="flex items-end gap-2 whitespace-nowrap">
              <span className="flex items-end gap-1 text-[14px] font-medium leading-[14px] text-[#04783a] [[data-theme=dark]_&]:text-[#22c55e]">
                <span className="grid h-4 w-4 place-items-center">
                  <ShellIcon name="crm-trend-up.svg" size={15} />
                </span>
                {delta}
              </span>
              <span className="min-w-0 flex-1 truncate text-[10px] leading-[10px] text-[var(--octo-text-secondary)]">
                {t(key === "totalSpend" ? "customers.stat.deltaVsLastMonth" : "customers.stat.deltaVsYesterday")}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
