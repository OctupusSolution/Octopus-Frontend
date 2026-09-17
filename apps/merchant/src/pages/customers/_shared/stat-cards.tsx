// apps/merchant/src/pages/customers/_shared/stat-cards.tsx
import { BarChart3 } from "lucide-react";
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

export function CustomerStatCards() {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {CARD_ORDER.map((key) => {
        const theme = STAT_CARD_THEME[key];
        const Icon = theme.icon;
        const stat = customerStats[key];
        const value = key === "totalSpend" ? (stat as { display: string }).display : (stat as { value: number }).value.toLocaleString();

        return (
          <div key={key} className={`rounded-2xl p-4 ${theme.cardBg}`}>
            <div className="grid h-10 w-10 place-items-center rounded-xl" style={{ backgroundColor: theme.tile }}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div className="mt-3 whitespace-nowrap text-[22px] font-bold leading-none text-[var(--octo-text-primary)]">
              {value}
            </div>
            <div className="mt-1 text-[12px] text-[var(--octo-text-muted)]">{t(LABEL_KEY[key])}</div>
            <div className="mt-1.5 flex items-center gap-1.5 text-[11.5px]">
              <BarChart3 size={13} className="text-[#16A34A]" strokeWidth={2.5} />
              <span className="font-semibold text-[#16A34A]">{stat.delta}</span>
              <span className="text-[var(--octo-text-faint)]">
                {t(key === "totalSpend" ? "customers.stat.deltaVsLastMonth" : "customers.stat.deltaVsYesterday")}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
