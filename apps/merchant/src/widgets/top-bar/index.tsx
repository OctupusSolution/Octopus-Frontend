import { Sun } from "lucide-react";
import { useI18n } from "@/app/providers/i18n-provider";
import { useTheme } from "@/app/providers/theme-provider";
import { ShellIcon } from "@/shared/ui/shell-icon";

const ICON_BUTTON =
  "grid h-12 w-12 shrink-0 place-items-center rounded-[8px] border border-[var(--octo-border-input)] text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)]";

/** A page may portal its own heading into the bar's start side (the Public Link
 *  Builder's frames show the page title there). While the slot has content the
 *  search field steps aside. */
export const TOP_BAR_SLOT_ID = "octo-top-bar-slot";

// The frame's bar: a wide search on the start side, then connection state,
// theme, notifications and language. The sidebar carries its own collapse
// control, and the signed-in user lives in its footer card.
export function TopBar() {
  const { t, locale, setLocale } = useI18n();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="flex items-center justify-between gap-4 border-b border-[var(--octo-divider)] px-6 py-4">
      <div id={TOP_BAR_SLOT_ID} className="peer min-w-0 flex-1 empty:hidden" />
      {/* Not wired to anything yet — drawn as the frame's field, not an input
          that would accept text and do nothing with it. */}
      <div className="hidden h-12 min-w-0 max-w-[632px] flex-1 items-center peer-[:not(:empty)]:!hidden gap-2 rounded-[8px] border border-[#cbd5e1] p-2 text-[var(--octo-text-secondary)] sm:flex [[data-theme=dark]_&]:border-[var(--octo-border-input)]">
        <ShellIcon name="top-search.svg" />
        <span className="truncate text-[14px] leading-[14px]">{t("sidebar.search")}</span>
      </div>

      <div className="ms-auto flex items-center gap-3 sm:gap-6">
        <span className="flex h-12 items-center gap-1.5 rounded-[8px] bg-[#f4fff8] p-2 text-[14px] font-medium leading-[14px] text-[#009a39] [[data-theme=dark]_&]:bg-[#009a39]/15">
          <ShellIcon name="top-wifi.svg" />
          <span className="hidden sm:inline">{t("topbar.connected")}</span>
        </span>

        <button type="button" onClick={toggleTheme} aria-label={t("topbar.theme")} className={ICON_BUTTON}>
          {theme === "dark" ? <Sun size={22} strokeWidth={1.5} /> : <ShellIcon name="top-moon.svg" />}
        </button>

        <button type="button" aria-label={t("topbar.notifications")} className={ICON_BUTTON}>
          <ShellIcon name="top-notification.svg" />
        </button>

        <button
          type="button"
          onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
          aria-label={t("topbar.language")}
          className={ICON_BUTTON}
        >
          <ShellIcon name="top-language.svg" size={21.5} />
        </button>
      </div>
    </header>
  );
}
