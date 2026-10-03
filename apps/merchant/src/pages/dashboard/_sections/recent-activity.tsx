import { useI18n } from "@/app/providers/i18n-provider";
import { recentActivity } from "@/shared/api/mock-dashboard";
import { ShellIcon } from "@/shared/ui/shell-icon";

export function RecentActivity() {
  const { t } = useI18n();
  return (
    <section className="flex flex-col gap-4 rounded-[12px] bg-[var(--octo-soft-bg)] px-6 py-4">
      <h2 className="text-[18px] font-bold leading-[18px] text-[var(--octo-text-primary)]">{t("dashboard.recentActivity")}</h2>
      <ul className="flex flex-col gap-3">
        {recentActivity.map((item, i) => (
          <li
            key={item.key}
            className={`flex items-center gap-2 ${i < recentActivity.length - 1 ? "border-b border-[#e2e8f0] pb-1 [[data-theme=dark]_&]:border-[var(--octo-border-card)]" : ""}`}
          >
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-[4px] bg-[#f5f9ff] text-[#0d6efd] [[data-theme=dark]_&]:bg-[#0d6efd]/15">
              <ShellIcon name="notification-bing.svg" size={16} />
            </span>
            <span className="min-w-0 flex-1 text-[14px] font-medium leading-[14px] text-[var(--octo-text-primary)]">{t(item.textKey)} ·</span>
            <span className="shrink-0 text-[12px] font-medium leading-[12px] text-[var(--octo-text-secondary)]">
              {t("dashboard.minutesAgo").replace("{n}", String(item.minutesAgo))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
