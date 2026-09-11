// The Menu & Order section's inspector. Unlike Reservations/Waitlist it has
// no tab strip in the frames — a single scrolling column of four numbered
// blocks: connect a saved menu, homepage display, primary action, and the
// module's ordering settings. Manage Menus opens the menu module itself; the
// service-area Edit opens a one-area-per-line editor.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Button, Input, Modal, Segmented, Select, Textarea } from "@ui/primitives";
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

/** Areas are stored as one comma-separated string; the editor shows one per
 *  line, which is how a merchant actually lists neighbourhoods. */
function areasToLines(areas: string): string {
  return areas
    .split(",")
    .map((area) => area.trim())
    .filter(Boolean)
    .join("\n");
}

function linesToAreas(lines: string): string {
  return lines
    .split("\n")
    .map((area) => area.trim())
    .filter(Boolean)
    .join(", ");
}

export function MenuInspector({ draft, dispatch }: { draft: SiteDraft; dispatch: (action: SiteAction) => void }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const settings = draft.sectionSettings.menu;
  const connectedMenu = savedMenus.find((menu) => menu.id === settings.connectedMenuId) ?? null;
  const [areasOpen, setAreasOpen] = useState(false);
  const [areasDraft, setAreasDraft] = useState("");

  function patch(patch: Partial<MenuSettings>) {
    dispatch({ type: "patchSection", section: "menu", patch });
  }

  function toggleDisplay(id: string) {
    const has = settings.homepageDisplay.includes(id);
    patch({ homepageDisplay: has ? settings.homepageDisplay.filter((entry) => entry !== id) : [...settings.homepageDisplay, id] });
  }

  function openAreas() {
    setAreasDraft(areasToLines(settings.serviceAreas));
    setAreasOpen(true);
  }

  function saveAreas() {
    patch({ serviceAreas: linesToAreas(areasDraft) });
    setAreasOpen(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <NumberedHeading n={1} title={t("publicLink.menu.connectSaved")} note={t("publicLink.menu.connectNote")} />
      <FieldRow label={t("publicLink.menu.selectMenu")}>
        <Select value={settings.connectedMenuId} onChange={(e) => patch({ connectedMenuId: e.target.value })}>
          <option value="" disabled>
            {t("publicLink.select.placeholder")}
          </option>
          {savedMenus.map((menu) => (
            <option key={menu.id} value={menu.id}>
              {menu.name} — {t("publicLink.menu.updatedAgo").replace("{n}", String(menu.updatedDaysAgo))} · {t("publicLink.menu.itemCount").replace("{n}", String(menu.itemCount))}
            </option>
          ))}
        </Select>
      </FieldRow>
      {connectedMenu && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-3 rounded-[10px] border border-[var(--octo-border-input)] p-2.5">
            <img
              src={connectedMenu.thumbnail}
              alt=""
              className="h-12 w-12 shrink-0 rounded-[8px] bg-[var(--octo-hover)] object-contain"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[12.5px] font-medium text-[var(--octo-text-primary)]">{connectedMenu.name}</span>
              <span className="text-[11px] text-[var(--octo-text-muted)]">
                {t("publicLink.menu.updatedAgo").replace("{n}", String(connectedMenu.updatedDaysAgo))} ·{" "}
                {t("publicLink.menu.itemCount").replace("{n}", String(connectedMenu.itemCount))}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-[12px] font-medium text-[#16a34a]">
              <CheckCircle2 size={14} />
              {t("publicLink.menu.connected")}
            </span>
            <Button variant="secondary" size="sm" onClick={() => navigate("/menu")}>
              {t("publicLink.menu.manageMenus")}
            </Button>
          </div>
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
          type="number"
          min={0}
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
          <Button variant="secondary" size="sm" onClick={openAreas}>
            {t("publicLink.menu.edit")}
          </Button>
        </div>
      </FieldRow>

      <FieldRow label={t("publicLink.menu.taxDisplay")}>
        <>
          <Select value={settings.taxDisplay} onChange={(e) => patch({ taxDisplay: e.target.value })}>
            <option value="" disabled>
              {t("publicLink.select.placeholder")}
            </option>
            {TAX_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {t(option.labelKey)}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-[11px] text-[var(--octo-text-muted)]">{t("publicLink.menu.taxNote")}</p>
        </>
      </FieldRow>

      <Modal
        open={areasOpen}
        onClose={() => setAreasOpen(false)}
        title={t("publicLink.menu.serviceAreasTitle")}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAreasOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={saveAreas}>{t("common.save")}</Button>
          </div>
        }
      >
        <div className="flex flex-col gap-1.5">
          <Textarea
            rows={6}
            value={areasDraft}
            onChange={(e) => setAreasDraft(e.target.value)}
            aria-label={t("publicLink.menu.serviceAreasTitle")}
          />
          <p className="text-[11px] text-[var(--octo-text-muted)]">{t("publicLink.menu.serviceAreasHint")}</p>
        </div>
      </Modal>
    </div>
  );
}
