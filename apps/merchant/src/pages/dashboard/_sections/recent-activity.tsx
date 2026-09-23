import { Bell } from "lucide-react";
import { useI18n } from "@/app/providers/i18n-provider";
import { recentActivity } from "@/shared/api/mock-dashboard";

export function RecentActivity() {
  const { t } = useI18n();
  return (
    <section className="rounded-xl bg-[var(--octo-soft-bg)] px-6 pb-4 pt-5">
      <h2 className="text-[19px] font-semibold text-[var(--octo-text-primary)]">{t("dashboard.recentActivity")}</h2>
      <ul className="mt-2">
        {recentActivity.map((item, i) => (
          <li
            key={item.key}
            className={`flex items-center gap-3 py-2.5 ${i < recentActivity.length - 1 ? "border-b border-[var(--octo-border-card)]" : ""}`}
          >
            <Bell size={17} className="shrink-0 text-[#0D6EFD]" />
            <span className="min-w-0 flex-1 text-[14.5px] text-[var(--octo-text-primary)]">{t(item.textKey)} ·</span>
            <span className="shrink-0 text-[12.5px] text-[var(--octo-text-secondary)]">
              {t("dashboard.minutesAgo").replace("{n}", String(item.minutesAgo))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
