import { Wifi, Bell, Search, Sun, Moon } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useI18n } from "@/app/providers/i18n-provider";
import { useTheme } from "@/app/providers/theme-provider";
import { routes } from "@/app/routes/registry";
import { labelKey } from "@/shared/lib/labels";

// Breadcrumb text comes from the route registry's English section/page
// fields; labelKey() maps them to dictionary keys so they can be localized.
const CRUMBS: Record<string, [string, string]> = Object.fromEntries(
  routes.map((r) => [r.path, [labelKey(r.section), labelKey(r.page)]])
);

export function TopBar() {
  const { pathname } = useLocation();
  const [sectionKey, pageKey] = CRUMBS[pathname] ?? [labelKey("Dashboard"), labelKey("Overview")];
  const { t } = useI18n();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="flex items-center gap-4 border-b border-[var(--octo-divider)] px-[26px] py-4">
      <nav aria-label={t("topbar.breadcrumb")} className="shrink-0 text-[12.5px]">
        <span className="text-[var(--octo-text-faint)]">{t(sectionKey)}</span>
        <span className="mx-1.5 text-[var(--octo-crumb)]">/</span>
        <span className="font-medium text-[var(--octo-text-primary)]">{t(pageKey)}</span>
      </nav>

      <div className="ms-auto hidden items-center gap-2 rounded-[10px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-2 text-[var(--octo-text-faint)] sm:flex sm:w-[220px]">
        <Search size={14} />
        <span className="text-xs">{t("sidebar.search")}</span>
        <kbd className="ms-auto rounded border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-1.5 py-0.5 text-[10px] text-[var(--octo-text-faint)]">
          Ctrl F
        </kbd>
      </div>

      <div className="flex items-center gap-3.5">
        <span className="flex items-center gap-1.5 text-[12px] font-medium text-[#16a34a]">
          <Wifi size={14} />
          {t("topbar.connected")}
        </span>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label={t("topbar.theme")}
          className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--octo-border-input)] bg-[var(--octo-card)] text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)]"
        >
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        <button
          type="button"
          aria-label={t("topbar.notifications")}
          className="relative grid h-8 w-8 place-items-center rounded-lg border border-[var(--octo-border-input)] bg-[var(--octo-card)] text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)]"
        >
          <Bell size={15} />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#ef4444]" />
        </button>

        <div className="grid h-8 w-8 place-items-center rounded-full bg-[#0D6EFD] text-[11px] font-semibold text-white">
          OM
        </div>
      </div>
    </header>
  );
}
