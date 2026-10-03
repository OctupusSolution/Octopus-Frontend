// Step 5 of the builder, and the largest screen in it: which sections make up
// the homepage (start column), the settings for whichever one is selected
// (middle column, switched by `SiteSection.inspector`), and a live preview of
// the result (end column). Drawn to the Figma "Public Link-step 5" frames:
// an unboxed 464px list, a white "Selected Section" panel and the narrow
// "Live Preview" card.
import { useState } from "react";
import clsx from "clsx";
import { EmptyState, Modal } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import type { PreviewDevice } from "@/widgets/storefront-preview";
import { SITE_SECTIONS, type SiteSection } from "../_shared/section-catalog";
import type { SectionEntry, SiteAction } from "../_shared/site-draft";
import { PlIcon } from "../ui/kit";
import { ReorderHint, ReorderList } from "../ui/reorder-list";
import { SitePreview } from "../ui/site-preview";
import { Switch } from "../ui/switch";
import { AddSectionOption, InspectorPanel, SECTION_ROWS, SectionEditButton, SectionsHeader, sectionNameClass } from "./customize/controls";
import { GenericInspector } from "./customize/generic-inspector";
import { HeroInspector } from "./customize/hero-inspector";
import { MenuInspector } from "./customize/menu-inspector";
import { OffersInspector } from "./customize/offers-inspector";
import { ReservationsInspector } from "./customize/reservations-inspector";
import { WaitlistInspector } from "./customize/waitlist-inspector";
import type { StepProps } from "../_shared/steps";
import { ServerSectionInspector, ServerSectionsList } from "./connected/sections-panel";

/** The frames' own 16px row icons (apps/assets/PublicLink/icons), by section
 *  id, with the size each was exported at. A section the frames do not draw
 *  keeps its catalogue icon. */
const SECTION_ICON: Readonly<Record<string, { name: string; width?: number; height?: number }>> = {
  hero: { name: "customize-home" },
  reservations: { name: "customize-calendar-add" },
  menu: { name: "customize-menu-board" },
  reservationsCta: { name: "customize-clipboard-text" },
  waitlist: { name: "customize-clipboard-text" },
  offers: { name: "customize-discount", width: 14.335, height: 14.334 },
  events: { name: "customize-calendar-check" },
  testimonials: { name: "customize-chat-feedback", width: 14.333, height: 13.667 },
  instagram: { name: "customize-instagram" },
};

function SectionIcon({ meta }: { meta: SiteSection }) {
  const icon = SECTION_ICON[meta.id];
  if (!icon) {
    const Icon = meta.icon;
    return <Icon size={16} className="shrink-0" />;
  }
  return (
    <span className="grid h-4 w-4 shrink-0 place-items-center">
      <PlIcon name={icon.name} width={icon.width ?? 16} height={icon.height ?? 16} />
    </span>
  );
}

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

  const label = t(meta.labelKey);

  return (
    <>
      {grip}
      <span className={clsx("flex min-w-0 flex-1 items-center gap-2", selected ? "text-[var(--pl-primary)]" : "text-[var(--pl-text)]")}>
        <SectionIcon meta={meta} />
        <span className={sectionNameClass(selected)}>{label}</span>
      </span>
      <SectionEditButton
        label={`${label} — ${t("publicLink.customize.selectedSection")}`}
        onClick={() => dispatch({ type: "selectSection", id: section.id })}
      />
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

// The frames' three columns, kept in their proportions so the row scales with
// the console's width: 464 / 277 / 375 for the short panels (hero, offers and
// the generic ones), 464 / 387 / 265 where the inspector is the wide one
// (menu, reservations, waitlist).
const GRID_NARROW = "xl:grid-cols-[minmax(0,464fr)_minmax(0,277fr)_minmax(0,375fr)]";
const GRID_WIDE = "xl:grid-cols-[minmax(0,464fr)_minmax(0,387fr)_minmax(0,265fr)]";

export function CustomizeStep({ draft, dispatch, publicLinkSync }: StepProps) {
  const { t } = useI18n();
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const [addOpen, setAddOpen] = useState(false);
  const [serverSection, setServerSection] = useState<string | null>(null);

  // Connected: the server's pages and their typed sections. The hand-written
  // inspectors below (reservations, waitlist, menu, offers) and
  // `draft.sectionSettings` are the local, no-business-session builder only;
  // connected, a Menu/Reservation section is a bound section edited with real
  // data in connected/module-section-inspector.tsx, and modules the backend
  // registers no content source for (offers, events, loyalty, waitlist) are
  // not offered at all.
  if (publicLinkSync.connected) {
    return (
      <div className={clsx("grid items-start gap-4", GRID_WIDE)}>
        <ServerSectionsList sync={publicLinkSync} draft={draft} dispatch={dispatch} selected={serverSection} onSelect={setServerSection} />
        <InspectorPanel title={t("publicLink.customize.settingForSelected")}>
          <ServerSectionInspector sync={publicLinkSync} draft={draft} sectionId={serverSection} onDeleted={() => setServerSection(null)} onSelect={setServerSection} />
        </InspectorPanel>
        <SitePreview
          draft={draft}
          dispatch={dispatch}
          sync={publicLinkSync}
          device={device}
          onDevice={setDevice}
          height={680}
          selectedSectionId={serverSection}
          onSelectSection={setServerSection}
        />
      </div>
    );
  }

  const selectedMeta = SITE_SECTIONS.find((s) => s.id === draft.selectedSection);
  const available = SITE_SECTIONS.filter((s) => !draft.sections.some((entry) => entry.id === s.id));
  const kind = selectedMeta?.inspector;
  const tabbed = kind === "hero" || kind === "reservations" || kind === "waitlist";
  const wide = kind === "menu" || kind === "reservations" || kind === "waitlist";

  function addSection(id: string) {
    dispatch({ type: "setSections", sections: [...draft.sections, { id, enabled: true }] });
    setAddOpen(false);
  }

  // "hero", "reservations", "waitlist", "menu" and "offers" all have their
  // own hand-written inspectors; every other section falls back to
  // `GenericInspector`, driven by `SiteSection.fields`.
  function renderInspector() {
    if (kind === "hero") return <HeroInspector draft={draft} dispatch={dispatch} />;
    if (kind === "reservations") return <ReservationsInspector draft={draft} dispatch={dispatch} />;
    if (kind === "waitlist") return <WaitlistInspector draft={draft} dispatch={dispatch} />;
    if (kind === "menu") return <MenuInspector draft={draft} dispatch={dispatch} />;
    if (kind === "offers") return <OffersInspector draft={draft} dispatch={dispatch} />;
    return <GenericInspector draft={draft} dispatch={dispatch} />;
  }

  return (
    <>
      <div className={clsx("grid items-start gap-4", wide ? GRID_WIDE : GRID_NARROW)}>
        {/* Start: the homepage section list */}
        <div className="flex min-w-0 flex-col gap-3">
          <SectionsHeader
            title={t("publicLink.customize.homepageSections")}
            addLabel={t("publicLink.customize.addSection")}
            onAdd={() => setAddOpen(true)}
          />

          <ReorderList
            className={SECTION_ROWS}
            items={draft.sections}
            getId={(section) => section.id}
            getLabel={(section) => sectionLabel(section, t)}
            onReorder={(sections) => dispatch({ type: "setSections", sections })}
            renderRow={(section, _index, grip) => (
              <SectionRow section={section} grip={grip} selected={section.id === draft.selectedSection} dispatch={dispatch} />
            )}
          />

          <ReorderHint>{t("publicLink.reorder.hint")}</ReorderHint>
        </div>

        {/* Middle: the selected section's inspector. The frame gives this
            one title line: "Selected Section" when the section has its own
            tabbed inspector (hero, reservations, waitlist), or "Setting for
            Selected Section" for the generic/menu/offers panels that have
            none. */}
        <InspectorPanel title={t(tabbed ? "publicLink.customize.selectedSection" : "publicLink.customize.settingForSelected")}>
          {renderInspector()}
        </InspectorPanel>

        <SitePreview draft={draft} dispatch={dispatch} sync={publicLinkSync} device={device} onDevice={setDevice} devices={["desktop"]} />
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title={t("publicLink.customize.addSection")}>
        {available.length === 0 ? (
          <EmptyState title={t("publicLink.customize.addSection")} />
        ) : (
          <ul className="flex flex-col gap-2">
            {available.map((section) => (
              <li key={section.id}>
                <AddSectionOption onClick={() => addSection(section.id)}>
                  <SectionIcon meta={section} />
                  {t(section.labelKey)}
                </AddSectionOption>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </>
  );
}
