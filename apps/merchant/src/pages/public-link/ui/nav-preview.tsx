// Pictures of the merchant's own navigation — not operable UI. Same
// discipline widgets/storefront-preview follows for the same reason: a
// mock of a menu that answered a click, or that a screen reader announced
// as a real one, would be lying about what it is. Every row here is a span,
// never a button, and the purely decorative chrome is aria-hidden; the
// pages-enabled count beneath `DrawerNavPreview` is the one piece of real
// information, so it alone stays outside the aria-hidden block.
import { ExternalLink, FileText, type LucideIcon } from "lucide-react";
import clsx from "clsx";
import { useI18n } from "@/app/providers/i18n-provider";
import { PAGE_MODULES, type PageModule } from "../_shared/page-catalog";
import type { SiteDraft } from "../_shared/site-draft";
import { PlIcon } from "./kit";

/** The drawer mock's logo, as the Pages frame draws it (30px, on navy). */
const drawerLogoUrl = new URL("../../../../../assets/PublicLink/pages-octopus-logo.svg", import.meta.url).href;
const octopusLogoUrl = new URL("../../../../../assets/Logo/OCTOPUS LOGO.svg", import.meta.url).href;

function modulesInNav(draft: SiteDraft): readonly PageModule[] {
  const navIds = new Set(draft.pages.filter((page) => page.inNav).map((page) => page.id));
  return PAGE_MODULES.filter((module) => navIds.has(module.id));
}

/** `WebNavPreview` and `MobileDrawerPreview` render the Navigation step's own
 *  eye toggle (`navigation.hidden`) on top of `inNav` — a page can be in the
 *  order list and still invisible in the rendered header/drawer nav, which is
 *  exactly what that toggle is for. `DrawerNavPreview` (the Pages step) has no
 *  such toggle to honour and keeps using `modulesInNav` unchanged. */
function modulesInRenderedNav(draft: SiteDraft): readonly PageModule[] {
  const hidden = new Set(draft.navigation.hidden);
  return modulesInNav(draft).filter((module) => !hidden.has(module.id));
}

interface NavEntry {
  id: string;
  label: string;
  icon: LucideIcon;
}

/** What each preview lists: the server's menu while connected (`draft.remote`,
 *  literal labels), else the local page modules. `where` picks the rendered
 *  header, the rendered drawer, or every entry (the Pages step's mock). */
function navEntries(draft: SiteDraft, t: (key: string) => string, where: "all" | "header" | "drawer"): NavEntry[] {
  if (draft.remote) {
    return draft.remote.navItems
      .filter((item) => where === "all" || (where === "header" ? item.visible : item.drawer ?? item.visible))
      .map((item, index) => ({ id: `${index}:${item.label}`, label: item.label, icon: FileText }));
  }
  const modules = where === "all" ? modulesInNav(draft) : modulesInRenderedNav(draft);
  return modules.map((module) => ({ id: module.id, label: t(module.labelKey), icon: module.icon }));
}

/** The frames' own 16px page icons (apps/assets/PublicLink/icons), by page
 *  module id. The Pages step's table and its drawer mock both draw these.
 *  `size` is the exported artwork's own box where it is not the full 16px. */
export const PL_PAGE_ICON: Readonly<Record<string, { name: string; size?: number }>> = {
  home: { name: "pages-home" },
  menu: { name: "pages-menu-board" },
  reservations: { name: "pages-calendar-add" },
  waitlist: { name: "pages-clipboard-text" },
  offers: { name: "pages-discount", size: 14.33 },
  events: { name: "pages-calendar-check" },
  loyalty: { name: "pages-heart-tick" },
  about: { name: "pages-about" },
  contact: { name: "pages-call" },
};

/** A 16px slot holding one of `PL_PAGE_ICON`; a page the frames draw no icon
 *  for (a custom server page) falls back to a document glyph. */
export function PlPageIcon({ id, className }: { id: string | undefined; className?: string }) {
  const icon = id ? PL_PAGE_ICON[id] : undefined;
  return (
    <span aria-hidden className={clsx("grid h-4 w-4 shrink-0 place-items-center", className)}>
      {icon ? <PlIcon name={icon.name} size={icon.size ?? 16} /> : <FileText size={16} strokeWidth={1.5} />}
    </span>
  );
}

/** What the Pages step's drawer mock lists: every server menu entry while
 *  connected (literal labels), else the page modules switched into nav. Kept
 *  apart from `navEntries`, which the Navigation step's previews own. */
function drawerEntries(draft: SiteDraft, t: (key: string) => string): { id: string; label: string; iconId?: string }[] {
  if (draft.remote) {
    return draft.remote.navItems.map((item, index) => ({ id: `${index}:${item.label}`, label: item.label }));
  }
  return modulesInNav(draft).map((module) => ({ id: module.id, label: t(module.labelKey), iconId: module.id }));
}

/** The "Navigation Preview" card from the Pages step: the dark drawer a
 *  customer opens on the storefront, showing only the pages the merchant has
 *  switched into navigation, and the pages-enabled count under it. */
export function DrawerNavPreview({ draft }: { draft: SiteDraft }) {
  const { t } = useI18n();
  const entries = drawerEntries(draft, t);
  const total = draft.remote ? draft.remote.visiblePages : draft.pages.length;

  return (
    <div className="flex flex-col gap-3">
      <div aria-hidden className="flex min-h-[520px] w-[220px] max-w-full flex-col items-center gap-8 overflow-hidden bg-[#001e4b] pb-6">
        <div className="flex w-full flex-col gap-4">
          <div className="flex h-[81px] w-full items-center justify-between border-b border-[#f1f5f9] px-3 py-2">
            <span className="flex min-w-0 items-center gap-0.5">
              <img src={drawerLogoUrl} alt="" width={30} height={30} className="h-[30px] w-[30px] shrink-0" />
              <span className="text-[14px] font-bold leading-[14px] text-white">OCTOPUS</span>
            </span>
            <PlIcon name="pages-grid-4" className="text-white" />
          </div>

          <ul className="flex w-full flex-col gap-1">
            {entries.map((entry) => (
              <li key={entry.id} className="flex items-center gap-2 rounded-[12px] p-2 text-white">
                <PlPageIcon id={entry.iconId} />
                <span className="min-w-0 flex-1 truncate text-[14px] font-medium leading-[14px]">{entry.label}</span>
                {entry.iconId === "menu" && <PlIcon name="chevron-16" size={16} className="-rotate-90 rtl:rotate-90" />}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex w-[188px] max-w-full flex-col gap-4">
          <span className="flex h-10 items-center justify-center rounded-[24px] bg-white p-2 text-[14px] font-bold leading-[14px] text-[#0f172a]">
            {t("publicLink.nav.bookTable")}
          </span>
          <span className="flex h-10 items-center justify-center rounded-[24px] bg-white/10 p-2 text-[14px] font-bold leading-[14px] text-white">
            {t("publicLink.nav.viewMenu")}
          </span>
        </div>
      </div>

      <p className="flex items-center gap-2 text-[12px] font-bold leading-[12px] text-[var(--pl-text-3)]">
        <PlIcon name="pages-about" size={16} />
        {t("publicLink.pages.enabledCount").replace("{n}", String(entries.length)).replace("{total}", String(total))}
      </p>
    </div>
  );
}

/** The scaled desktop header strip from the Navigation step — the same
 *  enabled pages as `DrawerNavPreview`, laid out the way a storefront header
 *  actually reads them: left to right, icon-free. Honours "Show in Header"
 *  (final review finding F5) by standing in for the whole header nav being
 *  switched off, rather than silently drawing it unchanged either way. */
export function WebNavPreview({ draft }: { draft: SiteDraft }) {
  const { t } = useI18n();
  if (!draft.navigation.showInHeader) {
    return (
      <div
        aria-hidden
        className="flex items-center justify-center rounded-xl border border-dashed border-[var(--octo-border-input)] bg-[var(--octo-card)] px-[18px] py-[15px] text-center text-[11px] text-[var(--octo-text-faint)]"
      >
        {t("publicLink.navigation.headerPreviewOff")}
      </div>
    );
  }

  const modules = navEntries(draft, t, "header");

  return (
    <div
      aria-hidden
      className="flex items-center gap-4 overflow-x-auto rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]"
    >
      <img src={octopusLogoUrl} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover" />
      {modules.map((module) => (
        <span key={module.id} className="shrink-0 text-[11.5px] font-medium text-[var(--octo-text-secondary)]">
          {module.label}
        </span>
      ))}
    </div>
  );
}

/** The phone-shaped drawer beside it, drawn as the Figma "Mobile Drawer
 *  Preview" tile: a 110×253 white sheet with the logo, the navigation stacked
 *  the way it opens on a mobile storefront, and the language pill at its foot.
 *  Honours "Show in Drawer Menu" (stands in for the whole drawer being
 *  switched off), "Show Icons", the active page indicator and the new-tab
 *  glyph (final review finding F5). */
const DRAWER_TILE = "mx-auto h-[253px] w-[110px] shrink-0 overflow-hidden rounded-[8px] shadow-[0_0_8px_rgba(0,0,0,0.08)]";

export function MobileDrawerPreview({ draft }: { draft: SiteDraft }) {
  const { t, locale } = useI18n();
  if (!draft.navigation.showInDrawer) {
    return (
      <div
        aria-hidden
        className={`${DRAWER_TILE} flex items-center justify-center border border-dashed border-[var(--pl-g300)] bg-[var(--pl-g50)] p-2 text-center text-[8px] font-medium leading-[1.4] text-[var(--pl-text-3)] shadow-none`}
      >
        {t("publicLink.navigation.drawerPreviewOff")}
      </div>
    );
  }

  const modules = navEntries(draft, t, "drawer");
  const showIcons = draft.navigation.showIcons;
  const primary = draft.brand.colors.primary;

  return (
    <div aria-hidden className={`${DRAWER_TILE} flex flex-col gap-2 bg-[var(--pl-surface)] px-2 pb-2 pt-3`}>
      <img src={octopusLogoUrl} alt="" className="ms-1 h-[14px] w-[14px] shrink-0 object-contain" />
      <ul className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden">
        {modules.map((module, index) => {
          const Icon: LucideIcon = module.icon;
          // The first visible page is the one a customer lands on, so it
          // carries the Active Page Indicator; "Open Links in Same Tab" off
          // shows the same new-tab glyph the web header does.
          const active = index === 0 && draft.navigation.activeIndicator;
          return (
            <li
              key={module.id}
              className="flex h-[18px] shrink-0 items-center gap-1 rounded-[4px] px-1.5 text-[7px] font-medium leading-none"
              style={
                active
                  ? { color: primary, fontWeight: 600, backgroundColor: `color-mix(in srgb, ${primary} 8%, transparent)` }
                  : { color: "var(--pl-text)" }
              }
            >
              {showIcons && <Icon size={9} className="shrink-0" />}
              <span className="min-w-0 flex-1 truncate">{module.label}</span>
              {!draft.navigation.sameTab && <ExternalLink size={7} className="shrink-0 opacity-60" />}
            </li>
          );
        })}
      </ul>
      <span className="flex h-[16px] shrink-0 items-center justify-center gap-1 rounded-full border border-[var(--pl-g200)] text-[6.5px] font-medium leading-none text-[var(--pl-text)]">
        <PlIcon name="language" size={8} />
        {locale === "ar" ? "العربية" : "English"}
      </span>
    </div>
  );
}
