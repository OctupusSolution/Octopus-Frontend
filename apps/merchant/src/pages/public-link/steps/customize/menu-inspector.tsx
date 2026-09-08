// The Menu & Order section's inspector. Unlike Reservations/Waitlist it has
// no tab strip in the frames — a single scrolling column of four numbered
// blocks: connect a saved menu, homepage display, primary action, and the
// module's ordering settings.
import { CheckCircle2 } from "lucide-react";
import { Button, Input, Segmented, Select } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { savedMenus } from "@/shared/api/mock-site-menus";
import type { MenuSettings, SiteAction, SiteDraft } from "../../_shared/site-draft";
import { CheckCard, FieldRow, NumberedHeading, RadioCard, ToggleRow } from "./controls";

const DISPLAY_OPTIONS = [
  { id: "highlighted", labelKey: "publicLink.menu.displayHighlighted", noteKey: "publicLink.menu.displayHighlightedNote" },
  { id: "categories", labelKey: "publicLink.menu.displayCategories", noteKey: "publicLink.menu.displayCategoriesNote" },
  { id: "preview", labelKey: "publicLink.menu.displayPreview", noteKey: "publicLink.menu.displayPreviewNote" },
  { id: "full", labelKey: "publicLink.menu.displayFull", noteKey: "publicLink.menu.displayFullNote" },
] as const;

const PRIMARY_ACTION_OPTIONS = [
  { id: "menuPage", labelKey: "publicLink.menu.openMenuPage", noteKey: "publicLink.menu.openMenuPageNote" },
  { id: "menuDrawer", labelKey: "publicLink.menu.openMenuDrawer", noteKey: "publicLink.menu.openMenuDrawerNote" },
  { id: "ordering", labelKey: "publicLink.menu.openOrdering", noteKey: "publicLink.menu.openOrderingNote" },
] as const;

const ORDERING_MODE_OPTIONS = [
  { id: "ordering", labelKey: "publicLink.menu.ordering" },
  { id: "reservation", labelKey: "publicLink.menu.reservation" },
  { id: "view", labelKey: "publicLink.menu.view" },
] as const;

const TAX_OPTIONS = [
  { id: "inclusive", labelKey: "publicLink.menu.taxInclusive" },
  { id: "exclusive", labelKey: "publicLink.menu.taxExclusive" },
] as const;

export function MenuInspector({ draft, dispatch }: { draft: SiteDraft; dispatch: (action: SiteAction) => void }) {
  const { t } = useI18n();
  const settings = draft.sectionSettings.menu;
  const connectedMenu = savedMenus.find((menu) => menu.id === settings.connectedMenuId) ?? null;

  function patch(patch: Partial<MenuSettings>) {
    dispatch({ type: "patchSection", section: "menu", patch });
  }

  function toggleDisplay(id: string) {
    const has = settings.homepageDisplay.includes(id);
    patch({ homepageDisplay: has ? settings.homepageDisplay.filter((entry) => entry !== id) : [...settings.homepageDisplay, id] });
  }

  return (
    <div className="flex flex-col gap-4">
      <NumberedHeading n={1} title={t("publicLink.menu.connectSaved")} note={t("publicLink.menu.connectNote")} />
      <FieldRow label={t("publicLink.menu.selectMenu")}>
        <Select value={settings.connectedMenuId} onChange={(e) => patch({ connectedMenuId: e.target.value })}>
          <option value="" />
          {savedMenus.map((menu) => (
            <option key={menu.id} value={menu.id}>
              {menu.name} — {t("publicLink.menu.updatedAgo").replace("{n}", String(menu.updatedDaysAgo))} · {t("publicLink.menu.itemCount").replace("{n}", String(menu.itemCount))}
            </option>
          ))}
        </Select>
      </FieldRow>
      {connectedMenu && (
        <div className="flex items-center gap-3 rounded-[10px] border border-[var(--octo-border-input)] px-3 py-2.5">
          <img src={connectedMenu.thumbnail} alt="" className="h-10 w-10 shrink-0 rounded-[8px] object-cover" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-[12.5px] font-medium text-[var(--octo-text-primary)]">{connectedMenu.name}</span>
            <span className="text-[11px] text-[var(--octo-text-muted)]">
              {t("publicLink.menu.updatedAgo").replace("{n}", String(connectedMenu.updatedDaysAgo))} · {t("publicLink.menu.itemCount").replace("{n}", String(connectedMenu.itemCount))}
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-[#16a34a]">
              <CheckCircle2 size={12} />
              {t("publicLink.menu.connected")}
            </span>
          </div>
          <Button variant="secondary" size="sm">
            {t("publicLink.menu.manageMenus")}
          </Button>
        </div>
      )}

      <NumberedHeading n={2} title={t("publicLink.reservations.menuDisplay")} />
      <div className="grid grid-cols-2 gap-3">
        {DISPLAY_OPTIONS.map((option) => (
          <CheckCard
            key={option.id}
            title={t(option.labelKey)}
            note={t(option.noteKey)}
            checked={settings.homepageDisplay.includes(option.id)}
            onToggle={() => toggleDisplay(option.id)}
          />
        ))}
      </div>

      <NumberedHeading n={3} title={t("publicLink.menu.primaryActionMenu")} />
      <div className="flex flex-col gap-2.5">
        {PRIMARY_ACTION_OPTIONS.map((option) => (
          <RadioCard
            key={option.id}
            title={t(option.labelKey)}
            note={t(option.noteKey)}
            selected={settings.primaryAction === option.id}
            onSelect={() => patch({ primaryAction: option.id })}
          />
        ))}
      </div>

      <NumberedHeading n={4} title={t("publicLink.menu.moduleSetting")} />
      <FieldRow label={t("publicLink.menu.orderingMode")}>
        <Segmented
          options={ORDERING_MODE_OPTIONS.map((option) => ({ id: option.id, label: t(option.labelKey) }))}
          value={settings.orderingMode}
          onChange={(id) => patch({ orderingMode: id as MenuSettings["orderingMode"] })}
        />
      </FieldRow>

      <FieldRow label={t("publicLink.menu.minOrder")}>
        <Input
          placeholder={t("publicLink.menu.enterPrice")}
          value={settings.minOrder}
          onChange={(e) => patch({ minOrder: e.target.value })}
        />
      </FieldRow>

      <ToggleRow
        label={t("publicLink.menu.orderAhead")}
        note={t("publicLink.menu.orderAheadNote")}
        checked={settings.orderAhead}
        onChange={() => patch({ orderAhead: !settings.orderAhead })}
      />

      <FieldRow label={t("publicLink.menu.prepTime")}>
        <>
          <Input value={settings.prepTime} onChange={(e) => patch({ prepTime: e.target.value })} />
          <p className="mt-1 text-[11px] text-[var(--octo-text-muted)]">{t("publicLink.menu.prepTimeNote")}</p>
        </>
      </FieldRow>

      <FieldRow label={t("publicLink.menu.serviceAreas")}>
        <div className="flex items-center gap-2">
          <Input className="flex-1" value={settings.serviceAreas} onChange={(e) => patch({ serviceAreas: e.target.value })} />
          <Button variant="ghost" size="sm">
            {t("publicLink.menu.edit")}
          </Button>
        </div>
      </FieldRow>

      <FieldRow label={t("publicLink.menu.taxDisplay")}>
        <>
          <Select value={settings.taxDisplay} onChange={(e) => patch({ taxDisplay: e.target.value })}>
            <option value="" />
            {TAX_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {t(option.labelKey)}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-[11px] text-[var(--octo-text-muted)]">{t("publicLink.menu.taxNote")}</p>
        </>
      </FieldRow>
    </div>
  );
}
