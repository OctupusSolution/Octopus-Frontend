// Step 5 of the builder, and the largest screen in it: which sections make up
// the homepage (start column), the settings for whichever one is selected
// (middle column, switched by `SiteSection.inspector`), and a live preview of
// the result (end column). Structurally it follows pages-step.tsx and
// navigation-step.tsx: a card per column, `ReorderList` for the drag/keyboard
// reordering, `Switch` for the boolean toggles.
import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import clsx from "clsx";
import { Button, EmptyState, Modal } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import type { PreviewDevice } from "@/widgets/storefront-preview";
import { previewModelFromSite } from "../_shared/preview-model";
import { SITE_SECTIONS } from "../_shared/section-catalog";
import type { SectionEntry, SiteAction } from "../_shared/site-draft";
import { DeviceFrame } from "../ui/device-frame";
import { ReorderList } from "../ui/reorder-list";
import { Switch } from "../ui/switch";
import { GenericInspector } from "./customize/generic-inspector";
import { HeroInspector } from "./customize/hero-inspector";
import { MenuInspector } from "./customize/menu-inspector";
import { OffersInspector } from "./customize/offers-inspector";
import { ReservationsInspector } from "./customize/reservations-inspector";
import { WaitlistInspector } from "./customize/waitlist-inspector";
import type { StepProps } from "../_shared/steps";

/** Module scope, not nested inside `CustomizeStep`: a component redefined on
 *  every render would remount every row on every keystroke elsewhere on the
 *  page, dropping focus from whichever switch or pencil a merchant just
 *  used. */
function SectionRow({
  section,
  grip,
  selected,
  dispatch,
}: {
  section: SectionEntry;
  grip: React.ReactNode;
  selected: boolean;
  dispatch: (action: SiteAction) => void;
}) {
  const { t } = useI18n();
  const meta = SITE_SECTIONS.find((s) => s.id === section.id);
  if (!meta) return null;

  const Icon = meta.icon;
  const label = t(meta.labelKey);

  return (
    <>
      {grip}
      <Icon size={14} className="shrink-0 text-[var(--octo-text-faint)]" />
      <span className={clsx("min-w-0 flex-1 truncate text-[12.5px]", selected ? "font-medium text-[#0D6EFD]" : "text-[var(--octo-text-primary)]")}>
        {label}
      </span>
      <button
        type="button"
        aria-label={`${label} — ${t("publicLink.customize.selectedSection")}`}
        onClick={() => dispatch({ type: "selectSection", id: section.id })}
        className="shrink-0 rounded p-1 text-[var(--octo-text-faint)] transition-colors hover:text-[var(--octo-text-secondary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40"
      >
        <Pencil size={13} />
      </button>
      <Switch
        checked={section.enabled}
        onChange={() => dispatch({ type: "toggleSection", id: section.id })}
        label={`${label} — ${t("publicLink.customize.homepageSections")}`}
      />
    </>
  );
}

function sectionLabel(section: SectionEntry, t: (key: string) => string): string {
  const meta = SITE_SECTIONS.find((s) => s.id === section.id);
  return meta ? t(meta.labelKey) : section.id;
}

export function CustomizeStep({ draft, dispatch }: StepProps) {
  const { t, locale } = useI18n();
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const [addOpen, setAddOpen] = useState(false);

  const model = previewModelFromSite(draft, device, t, locale);
  const selectedMeta = SITE_SECTIONS.find((s) => s.id === draft.selectedSection);
  const available = SITE_SECTIONS.filter((s) => !draft.sections.some((entry) => entry.id === s.id));

  function addSection(id: string) {
    dispatch({ type: "setSections", sections: [...draft.sections, { id, enabled: true }] });
    setAddOpen(false);
  }

  // "hero", "reservations", "waitlist", "menu" and "offers" all have their
  // own hand-written inspectors; every other section falls back to
  // `GenericInspector`, driven by `SiteSection.fields`.
  function renderInspector() {
    if (selectedMeta?.inspector === "hero") return <HeroInspector draft={draft} dispatch={dispatch} />;
    if (selectedMeta?.inspector === "reservations") return <ReservationsInspector draft={draft} dispatch={dispatch} />;
    if (selectedMeta?.inspector === "waitlist") return <WaitlistInspector draft={draft} dispatch={dispatch} />;
    if (selectedMeta?.inspector === "menu") return <MenuInspector draft={draft} dispatch={dispatch} />;
    if (selectedMeta?.inspector === "offers") return <OffersInspector draft={draft} dispatch={dispatch} />;
    return <GenericInspector draft={draft} dispatch={dispatch} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 xl:grid-cols-[280px_340px_minmax(0,1fr)]">
        {/* Start: the homepage section list */}
        <div className="flex flex-col gap-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("publicLink.customize.homepageSections")}</p>
            <Button size="sm" variant="secondary" icon={<Plus size={13} />} onClick={() => setAddOpen(true)}>
              {t("publicLink.customize.addSection")}
            </Button>
          </div>

          <ReorderList
            items={draft.sections}
            getId={(section) => section.id}
            getLabel={(section) => sectionLabel(section, t)}
            onReorder={(sections) => dispatch({ type: "setSections", sections })}
            renderRow={(section, _index, grip) => (
              <SectionRow section={section} grip={grip} selected={section.id === draft.selectedSection} dispatch={dispatch} />
            )}
          />

          <p className="rounded-[10px] border border-dashed border-[var(--octo-border-input)] px-3 py-2.5 text-center text-[11px] text-[var(--octo-text-faint)]">
            {t("publicLink.reorder.hint")}
          </p>
        </div>

        {/* Middle: the selected section's inspector. The frame gives this
            one title line: "Selected Section" when the section has its own
            tabbed inspector (hero, reservations, waitlist), or "Setting for
            Selected Section" for the generic/menu/offers panels that have
            none. */}
        <div className="flex flex-col gap-4 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
          <p className="text-[13px] font-semibold text-[var(--octo-text-primary)]">
            {t(
              selectedMeta?.inspector === "hero" ||
                selectedMeta?.inspector === "reservations" ||
                selectedMeta?.inspector === "waitlist"
                ? "publicLink.customize.selectedSection"
                : "publicLink.customize.settingForSelected"
            )}
          </p>
          {renderInspector()}
        </div>

        <DeviceFrame model={model} device={device} onDevice={setDevice} devices={["desktop"]} />
      </div>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={t("publicLink.customize.addSection")}
      >
        {available.length === 0 ? (
          <EmptyState title={t("publicLink.customize.addSection")} />
        ) : (
          <ul className="flex flex-col gap-1.5">
            {available.map((section) => {
              const Icon = section.icon;
              return (
                <li key={section.id}>
                  <button
                    type="button"
                    onClick={() => addSection(section.id)}
                    className="flex w-full items-center gap-2 rounded-[9px] border border-[var(--octo-border-input)] px-3 py-2 text-[12.5px] text-[var(--octo-text-primary)] transition-colors hover:border-[#0D6EFD] hover:text-[#0D6EFD] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40"
                  >
                    <Icon size={14} className="shrink-0" />
                    {t(section.labelKey)}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Modal>
    </div>
  );
}
