// The Menu & Order section's inspector. Unlike Reservations/Waitlist it has
// no tab strip in the frames — a single scrolling column of four numbered
// blocks: connect a saved menu, homepage display, primary action, and the
// module's ordering settings. Manage Menus opens the menu module itself; the
// service-area Edit opens a one-area-per-line editor.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "@ui/primitives";
import { savedMenus } from "@/shared/api/mock-site-menus";
import type { MenuSettings, SiteAction, SiteDraft } from "../../_shared/site-draft";
import { usePlText } from "../../_shared/texts";
import { rules, useTouched, useValidation } from "../../_shared/validation";
import { PlButton, PlField, PlFieldError, PlInput, PlTextarea, plText } from "../../ui/kit";
import { CheckCard, NumberedHeading, RadioCard, ToggleRow } from "./controls";
import { amountOnly, FieldGroup, OptionSelect, RadioPills, SelectCard, SoftButton, StatusLine } from "./inspector-parts";

const DISPLAY_OPTIONS = [
  { id: "highlighted", labelKey: "pl.customize.menu.highlighted", noteKey: "pl.customize.menu.highlightedNote" },
  { id: "categories", labelKey: "pl.customize.menu.categories", noteKey: "pl.customize.menu.categoriesNote" },
  { id: "preview", labelKey: "pl.customize.menu.preview", noteKey: "pl.customize.menu.previewNote" },
  { id: "full", labelKey: "pl.customize.menu.full", noteKey: "pl.customize.menu.fullNote" },
] as const;

const PRIMARY_ACTION_OPTIONS = [
  { id: "menuPage", labelKey: "pl.customize.menu.openPage", noteKey: "pl.customize.menu.openPageNote" },
  { id: "menuDrawer", labelKey: "pl.customize.menu.openDrawer", noteKey: "pl.customize.menu.openDrawerNote" },
  { id: "ordering", labelKey: "pl.customize.menu.openOrdering", noteKey: "pl.customize.menu.openOrderingNote" },
] as const;

const ORDERING_MODE_OPTIONS = [
  { id: "ordering", labelKey: "pl.customize.menu.modeOrdering" },
  { id: "reservation", labelKey: "pl.customize.menu.modeReservation" },
  { id: "view", labelKey: "pl.customize.menu.modeView" },
] as const;

const TAX_OPTIONS = ["inclusive", "exclusive"] as const;
const TAX_LABEL: Readonly<Record<(typeof TAX_OPTIONS)[number], string>> = {
  inclusive: "pl.customize.menu.taxInclusive",
  exclusive: "pl.customize.menu.taxExclusive",
};

const MAX_MIN_ORDER = 100000;
const MAX_PREP_TIME_LENGTH = 40;
const MAX_AREAS_LENGTH = 200;

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
  const tx = usePlText();
  const navigate = useNavigate();
  const { check } = useValidation();
  const { touched, touch } = useTouched();
  const settings = draft.sectionSettings.menu;
  const connectedMenu = savedMenus.find((menu) => menu.id === settings.connectedMenuId) ?? null;
  const [areasOpen, setAreasOpen] = useState(false);
  const [areasDraft, setAreasDraft] = useState("");

  // The prep time is promised to customers at checkout, so it is needed as
  // soon as the section takes orders.
  const prepTimeNeeded = settings.orderAhead || settings.orderingMode === "ordering";
  const errors = {
    menu: check(settings.connectedMenuId, [rules.required()]),
    minOrder: check(settings.minOrder, [rules.amount({ min: 0, max: MAX_MIN_ORDER })]),
    prepTime: check(settings.prepTime, [...(prepTimeNeeded ? [rules.required()] : []), rules.maxLength(MAX_PREP_TIME_LENGTH)]),
    serviceAreas: check(settings.serviceAreas, [rules.maxLength(MAX_AREAS_LENGTH)]),
    taxDisplay: check(settings.taxDisplay, [rules.required()]),
  };
  const shown = (name: keyof typeof errors) => (touched(name) ? errors[name] : undefined);
  const areasDraftError = check(linesToAreas(areasDraft), [rules.maxLength(MAX_AREAS_LENGTH)]);

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
    if (areasDraftError) return;
    patch({ serviceAreas: linesToAreas(areasDraft) });
    touch("serviceAreas");
    setAreasOpen(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <NumberedHeading n={1} title={tx("pl.customize.menu.connect")} note={tx("pl.customize.menu.connectNote")} />
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <PlField label={tx("pl.customize.menu.select")} error={shown("menu")}>
            <SelectCard
              label={tx("pl.customize.menu.select")}
              value={settings.connectedMenuId}
              placeholder={tx("publicLink.select.placeholder")}
              invalid={Boolean(shown("menu"))}
              options={savedMenus.map((menu) => ({
                id: menu.id,
                title: menu.name,
                note: tx("pl.customize.menu.meta", { days: menu.updatedDaysAgo, items: menu.itemCount }),
                image: menu.thumbnail,
              }))}
              onChange={(connectedMenuId) => patch({ connectedMenuId })}
              onBlur={() => touch("menu")}
            />
          </PlField>
          {connectedMenu && <StatusLine>{tx("publicLink.menu.connected")}</StatusLine>}
        </div>
        <SoftButton onClick={() => navigate("/menu")}>{tx("publicLink.menu.manageMenus")}</SoftButton>
      </div>

      <NumberedHeading n={2} title={tx("pl.customize.insp.displayOnHomepage")} note={tx("pl.customize.menu.displayNote")} />
      <div className="flex flex-col gap-3">
        {DISPLAY_OPTIONS.map((option) => (
          <CheckCard
            key={option.id}
            title={tx(option.labelKey)}
            note={tx(option.noteKey)}
            checked={settings.homepageDisplay.includes(option.id)}
            onToggle={() => toggleDisplay(option.id)}
          />
        ))}
      </div>

      <NumberedHeading n={3} title={tx("pl.customize.insp.primaryAction")} note={tx("pl.customize.menu.primaryNote")} />
      <div className="flex flex-col gap-3">
        {PRIMARY_ACTION_OPTIONS.map((option) => (
          <RadioCard
            key={option.id}
            title={tx(option.labelKey)}
            note={tx(option.noteKey)}
            selected={settings.primaryAction === option.id}
            onSelect={() => patch({ primaryAction: option.id })}
          />
        ))}
      </div>

      <NumberedHeading n={4} title={tx("pl.customize.menu.moduleSetting")} note={tx("pl.customize.menu.moduleSettingNote")} />
      <FieldGroup label={tx("pl.customize.menu.orderingMode")}>
        <RadioPills
          label={tx("pl.customize.menu.orderingMode")}
          options={ORDERING_MODE_OPTIONS.map((option) => ({ id: option.id, label: tx(option.labelKey) }))}
          value={settings.orderingMode}
          onChange={(orderingMode) => patch({ orderingMode })}
        />
      </FieldGroup>

      <PlField
        label={
          <>
            {tx("pl.customize.menu.minOrder")} <span className="text-[12px] font-normal leading-[12px]">{tx("pl.customize.menu.minOrderUnit")}</span>
          </>
        }
        error={shown("minOrder")}
      >
        <PlInput
          inputMode="decimal"
          aria-label={tx("pl.customize.menu.minOrder")}
          placeholder={tx("pl.customize.menu.enterPrice")}
          value={settings.minOrder}
          invalid={Boolean(shown("minOrder"))}
          onChange={(e) => patch({ minOrder: amountOnly(e.target.value) })}
          onBlur={() => touch("minOrder")}
        />
      </PlField>

      <ToggleRow
        label={tx("pl.customize.menu.orderAhead")}
        note={tx("pl.customize.menu.orderAheadNote")}
        checked={settings.orderAhead}
        onChange={() => patch({ orderAhead: !settings.orderAhead })}
      />

      <PlField label={tx("pl.customize.menu.prepTime")} required={prepTimeNeeded} hint={tx("pl.customize.menu.prepTimeNote")} error={shown("prepTime")}>
        <PlInput
          aria-label={tx("pl.customize.menu.prepTime")}
          placeholder={tx("pl.customize.menu.prepTimePlaceholder")}
          maxLength={MAX_PREP_TIME_LENGTH}
          value={settings.prepTime}
          invalid={Boolean(shown("prepTime"))}
          onChange={(e) => patch({ prepTime: e.target.value })}
          onBlur={() => touch("prepTime")}
        />
      </PlField>

      <div className="flex items-start gap-4">
        <PlField
          className="flex-1"
          label={
            <>
              {tx("pl.customize.menu.serviceAreas")} <span className="text-[10px] font-normal leading-[10px]">{tx("pl.customize.menu.serviceAreasUnit")}</span>
            </>
          }
          error={shown("serviceAreas")}
        >
          <PlInput
            aria-label={tx("pl.customize.menu.serviceAreas")}
            placeholder={tx("pl.customize.menu.serviceAreasPlaceholder")}
            value={settings.serviceAreas}
            invalid={Boolean(shown("serviceAreas"))}
            onChange={(e) => patch({ serviceAreas: e.target.value })}
            onBlur={() => touch("serviceAreas")}
          />
        </PlField>
        <button
          type="button"
          onClick={openAreas}
          className="shrink-0 rounded-[2px] text-[12px] font-semibold leading-[12px] text-[var(--pl-primary)] underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40"
        >
          {tx("publicLink.menu.edit")}
        </button>
      </div>

      <PlField label={tx("pl.customize.menu.taxDisplay")} hint={tx("pl.customize.menu.taxNote")} error={shown("taxDisplay")}>
        <OptionSelect
          label={tx("pl.customize.menu.taxDisplay")}
          value={settings.taxDisplay}
          options={TAX_OPTIONS}
          labelFor={(id) => tx(TAX_LABEL[id])}
          placeholder={tx("publicLink.select.placeholder")}
          invalid={Boolean(shown("taxDisplay"))}
          onChange={(taxDisplay) => patch({ taxDisplay })}
          onBlur={() => touch("taxDisplay")}
        />
      </PlField>

      <Modal
        open={areasOpen}
        onClose={() => setAreasOpen(false)}
        title={tx("publicLink.menu.serviceAreasTitle")}
        footer={
          <div className="flex justify-end gap-2">
            <PlButton variant="neutral" size="md" onClick={() => setAreasOpen(false)}>
              {tx("common.cancel")}
            </PlButton>
            <PlButton size="md" disabled={Boolean(areasDraftError)} onClick={saveAreas}>
              {tx("common.save")}
            </PlButton>
          </div>
        }
      >
        <div className="flex flex-col gap-2">
          <PlTextarea
            rows={6}
            value={areasDraft}
            invalid={Boolean(areasDraftError)}
            onChange={(e) => setAreasDraft(e.target.value)}
            aria-label={tx("publicLink.menu.serviceAreasTitle")}
          />
          {areasDraftError ? <PlFieldError>{areasDraftError}</PlFieldError> : <p className={plText.hint}>{tx("publicLink.menu.serviceAreasHint")}</p>}
        </div>
      </Modal>
    </div>
  );
}
