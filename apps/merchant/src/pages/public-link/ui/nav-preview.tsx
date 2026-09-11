// Pictures of the merchant's own navigation — not operable UI. Same
// discipline widgets/storefront-preview follows for the same reason: a
// mock of a menu that answered a click, or that a screen reader announced
// as a real one, would be lying about what it is. Every row here is a span,
// never a button, and the purely decorative chrome is aria-hidden; the
// pages-enabled count beneath `DrawerNavPreview` is the one piece of real
// information, so it alone stays outside the aria-hidden block.
import { ExternalLink, type LucideIcon } from "lucide-react";
import { useI18n } from "@/app/providers/i18n-provider";
import { PAGE_MODULES, type PageModule } from "../_shared/page-catalog";
import type { SiteDraft } from "../_shared/site-draft";

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

/** The dark sidebar mock from the Pages step: the drawer a customer opens on
 *  the storefront, showing only the pages the merchant has switched into
 *  navigation. */
export function DrawerNavPreview({ draft }: { draft: SiteDraft }) {
  const { t } = useI18n();
  const modules = modulesInNav(draft);
  const total = draft.pages.length;

  return (
    <div className="flex flex-col gap-2">
      <div aria-hidden className="flex flex-col gap-4 rounded-xl bg-[#081026] px-[18px] py-[15px]">
        <div className="flex items-center gap-2">
          <img src={octopusLogoUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
          <span className="text-[13px] font-semibold text-white">OCTOPUS</span>
        </div>

        <ul className="flex flex-col gap-1">
          {modules.map((module) => {
            const Icon: LucideIcon = module.icon;
            return (
              <li key={module.id} className="flex items-center gap-2 rounded-[8px] px-2 py-1.5 text-[12.5px] text-white/80">
                <Icon size={14} />
                {t(module.labelKey)}
              </li>
            );
          })}
        </ul>

        <div className="flex flex-col gap-2 pt-2">
          <span className="rounded-[9px] bg-white px-3 py-2 text-center text-[12px] font-medium text-[#081026]">
            {t("publicLink.nav.bookTable")}
          </span>
          <span className="rounded-[9px] bg-white/10 px-3 py-2 text-center text-[12px] font-medium text-white">
            {t("publicLink.nav.viewMenu")}
          </span>
        </div>
      </div>

      <p className="text-[11.5px] text-[var(--octo-text-muted)]">
        {t("publicLink.pages.enabledCount").replace("{n}", String(modules.length)).replace("{total}", String(total))}
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

  const modules = modulesInRenderedNav(draft);

  return (
    <div
      aria-hidden
      className="flex items-center gap-4 overflow-x-auto rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]"
    >
      <img src={octopusLogoUrl} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover" />
      {modules.map((module) => (
        <span key={module.id} className="shrink-0 text-[11.5px] font-medium text-[var(--octo-text-secondary)]">
          {t(module.labelKey)}
        </span>
      ))}
    </div>
  );
}

/** The phone-shaped drawer beside it: the same navigation, stacked the way it
 *  opens on a mobile storefront, with icons carried over from the drawer
 *  mock so the pair reads as one navigation shown at two sizes. Honours both
 *  "Show in Drawer Menu" (stands in for the whole drawer being switched off)
 *  and "Show Icons" (final review finding F5 — both had no consumer at all
 *  before this fix). */
export function MobileDrawerPreview({ draft }: { draft: SiteDraft }) {
  const { t } = useI18n();
  if (!draft.navigation.showInDrawer) {
    return (
      <div
        aria-hidden
        className="mx-auto flex w-[140px] items-center justify-center rounded-[20px] border border-dashed border-[var(--octo-border-input)] bg-[var(--octo-card)] p-3 text-center text-[10.5px] text-[var(--octo-text-faint)]"
      >
        {t("publicLink.navigation.drawerPreviewOff")}
      </div>
    );
  }

  const modules = modulesInRenderedNav(draft);
  const showIcons = draft.navigation.showIcons;
  const primary = draft.brand.colors.primary;

  return (
    <div
      aria-hidden
      className="mx-auto flex w-[140px] flex-col gap-3 rounded-[20px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-3"
    >
      <div className="flex items-center gap-1.5">
        <img src={octopusLogoUrl} alt="" className="h-4 w-4 rounded-full object-cover" />
        <span className="text-[10.5px] font-semibold text-[var(--octo-text-primary)]">OCTOPUS</span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {modules.map((module, index) => {
          const Icon: LucideIcon = module.icon;
          // The first visible page is the one a customer lands on, so it
          // carries the Active Page Indicator; "Open Links in Same Tab" off
          // shows the same new-tab glyph the web header does.
          const active = index === 0 && draft.navigation.activeIndicator;
          return (
            <li
              key={module.id}
              className="flex items-center gap-1.5 rounded-[6px] px-1 py-0.5 text-[10.5px]"
              style={
                active
                  ? { color: primary, fontWeight: 600, backgroundColor: `color-mix(in srgb, ${primary} 10%, transparent)` }
                  : { color: "var(--octo-text-secondary)" }
              }
            >
              {showIcons && <Icon size={11} className={active ? undefined : "text-[var(--octo-text-faint)]"} />}
              <span className="min-w-0 flex-1 truncate">{t(module.labelKey)}</span>
              {!draft.navigation.sameTab && <ExternalLink size={8} className="shrink-0 opacity-60" />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
