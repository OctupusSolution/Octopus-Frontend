// Step 5 while connected: the sections of one page at a time. A page picker
// chooses which (the Pages step's "Customize" lands here with that page
// selected); sections reorder (PUT …/sections/order), switch on/off
// (PUT …/sections/{id}/enabled), are added from the catalogue or bound to
// another module's content (POST …/sections) and removed (DELETE …). The
// selected section opens in the catalogue-driven inspector; a bound section
// opens the module inspector (module-section-inspector.tsx): the item it is
// bound to, its display settings, whether it is shown.
import { useEffect, useState } from "react";
import clsx from "clsx";
import { Link2 } from "lucide-react";
import { EmptyState, Modal } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import type { PublicLinkSync, SiteAction, SiteDraft } from "@/entities/site-draft";
import { usePlText } from "../../_shared/texts";
import { catalogueText } from "../../_shared/catalogue-text";
import { PlButton, PlSelect, plText } from "../../ui/kit";
import { ReorderHint, ReorderList } from "../../ui/reorder-list";
import { Switch } from "../../ui/switch";
import { AddSectionOption, SECTION_ROWS, SectionEditButton, SectionsHeader, sectionNameClass } from "../customize/controls";
import { orderedPages, pageTitle, useBusy } from "./common";
import { FieldsInspector } from "./fields-inspector";
import { ModuleSectionInspector } from "./module-section-inspector";

const KNOWN_LABELS: Record<string, string> = {
  hero: "publicLink.section.hero",
  testimonials: "publicLink.section.testimonials",
  "social-feed": "publicLink.section.instagram",
  menu: "publicLink.section.menu",
  reservation: "publicLink.section.reservations",
};

export function useSectionLabel() {
  const tx = usePlText();
  return (type: string) => {
    const key = KNOWN_LABELS[type];
    if (key) {
      const text = tx(key);
      if (text !== key) return text;
    }
    const camel = type.replace(/[-_](\w)/g, (_, c: string) => c.toUpperCase());
    const fromCatalogue = catalogueText(`sections.${camel}.name`);
    if (fromCatalogue) return fromCatalogue;
    return type
      .split(/[-_]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };
}

export function ServerSectionsList({
  sync,
  draft,
  dispatch,
  selected,
  onSelect,
}: {
  sync: PublicLinkSync;
  draft: SiteDraft;
  dispatch: (action: SiteAction) => void;
  selected: string | null;
  onSelect: (sectionId: string | null) => void;
}) {
  const tx = usePlText();
  const { t, locale } = useI18n();
  const label = useSectionLabel();
  const { act, busy } = useBusy();
  const [adding, setAdding] = useState(false);
  const server = sync.server!;
  const pages = orderedPages(server);
  const pageId = draft.selectedPageId && pages.some((p) => p.pageId === draft.selectedPageId) ? draft.selectedPageId : pages[0]?.pageId;
  const page = pageId ? server.pages[pageId] : undefined;

  useEffect(() => {
    if (pageId && !server.pages[pageId]) void sync.loadPage(pageId).catch(() => undefined);
  }, [pageId, server.pages, sync]);

  const sections = page?.sections ?? [];
  const types = server.catalogues?.sectionTypes ?? [];
  const sources = server.sources.filter((s) => s.descriptor.placements.some((p) => p.toLowerCase() === "section"));
  const full = page ? sections.length >= server.overview.limits.maxSectionsPerPage : true;

  function add(id: string, input: Parameters<PublicLinkSync["addSection"]>[1]) {
    if (!page) return;
    void act(id, async () => {
      const sectionId = await sync.addSection(page.pageId, input);
      setAdding(false);
      if (sectionId) onSelect(sectionId);
    });
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <PlSelect
        aria-label={tx("pl.sections.page")}
        value={pageId ?? ""}
        onChange={(e) => {
          dispatch({ type: "selectPage", pageId: e.target.value });
          onSelect(null);
        }}
      >
        {pages.map((p) => (
          <option key={p.pageId} value={p.pageId}>
            {pageTitle(p, locale, sync.editLanguage)}
          </option>
        ))}
      </PlSelect>
      <SectionsHeader
        title={t("publicLink.customize.homepageSections")}
        addLabel={t("publicLink.customize.addSection")}
        disabled={!page || full}
        onAdd={() => setAdding(true)}
      />

      {page && sections.length === 0 && <p className={plText.hint}>{tx("pl.sections.empty")}</p>}
      {page && (
        <ReorderList
          className={SECTION_ROWS}
          items={sections}
          getId={(s) => s.sectionId}
          getLabel={(s) => label(s.source?.sourceKey ?? s.type)}
          onReorder={(next) => void act("order", () => sync.reorderSections(page.pageId, next.map((s) => s.sectionId)))}
          renderRow={(section, _index, grip) => {
            const name = label(section.source?.sourceKey ?? section.type);
            return (
              <>
                {grip}
                {section.source && (
                  <Link2 size={16} className={clsx("shrink-0", selected === section.sectionId ? "text-[var(--pl-primary)]" : "text-[var(--pl-text)]")} />
                )}
                <button
                  type="button"
                  onClick={() => onSelect(section.sectionId)}
                  className={clsx(sectionNameClass(selected === section.sectionId), "rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40")}
                >
                  {name}
                  {section.sourceState === "unavailable" && " ⚠"}
                </button>
                <SectionEditButton label={`${name} — ${t("publicLink.customize.selectedSection")}`} onClick={() => onSelect(section.sectionId)} />
                <Switch
                  checked={section.enabled}
                  onChange={() => {
                    if (section.primary || busy !== null) return;
                    void act(`en:${section.sectionId}`, () => sync.setSectionEnabled(page.pageId, section.sectionId, !section.enabled));
                  }}
                  label={`${name} — ${t("publicLink.customize.homepageSections")}`}
                />
              </>
            );
          }}
        />
      )}
      <ReorderHint>{t("publicLink.reorder.hint")}</ReorderHint>

      <Modal open={adding} onClose={() => setAdding(false)} title={t("publicLink.customize.addSection")}>
        {types.length === 0 && sources.length === 0 ? (
          <EmptyState title={t("publicLink.customize.addSection")} />
        ) : (
          <ul className="flex flex-col gap-2">
            {types.map((type) => {
              const count = sections.filter((s) => s.type === type.key).length;
              const blocked = type.maxPerPage !== null && count >= type.maxPerPage;
              return (
                <li key={type.key}>
                  <AddSectionOption disabled={blocked || busy !== null} onClick={() => add(type.key, { type: type.key })}>
                    {label(type.key)}
                    {busy === type.key && <span className="ms-auto text-[12px] font-normal">{tx("pl.common.saving")}</span>}
                  </AddSectionOption>
                </li>
              );
            })}
            {sources.flatMap((source) =>
              source.items.map((item) => {
                const id = `${source.sourceKey}:${item.contentKey}`;
                return (
                  <li key={id}>
                    <AddSectionOption disabled={busy !== null} onClick={() => add(id, { source: { sourceKey: source.sourceKey, contentKey: item.contentKey } })}>
                      <Link2 size={16} className="shrink-0" />
                      <span className="min-w-0 truncate">
                        {label(source.sourceKey)} · {item.displayNames?.[locale] ?? item.displayName}
                      </span>
                      {busy === id && <span className="ms-auto text-[12px] font-normal">{tx("pl.common.saving")}</span>}
                    </AddSectionOption>
                  </li>
                );
              })
            )}
          </ul>
        )}
      </Modal>
    </div>
  );
}

export function ServerSectionInspector({
  sync,
  draft,
  sectionId,
  onDeleted,
  onSelect,
}: {
  sync: PublicLinkSync;
  draft: SiteDraft;
  sectionId: string | null;
  onDeleted: () => void;
  onSelect: (sectionId: string) => void;
}) {
  const tx = usePlText();
  const { t } = useI18n();
  const label = useSectionLabel();
  const { act, busy } = useBusy();
  const server = sync.server!;
  const pages = orderedPages(server);
  const pageId = draft.selectedPageId && pages.some((p) => p.pageId === draft.selectedPageId) ? draft.selectedPageId : pages[0]?.pageId;
  const page = pageId ? server.pages[pageId] : undefined;
  const section = page?.sections.find((s) => s.sectionId === sectionId);

  if (!page || !section) return <p className={plText.hint}>{tx("pl.sections.select")}</p>;
  const type = server.catalogues?.sectionTypes.find((st) => st.key === section.type);

  return (
    <div className="flex flex-col gap-4">
      {section.source || !type ? (
        <ModuleSectionInspector
          key={section.sectionId}
          sync={sync}
          page={page}
          section={section}
          label={label(section.source?.sourceKey ?? section.type)}
          onRebound={onSelect}
        />
      ) : (
        <FieldsInspector key={section.sectionId} sync={sync} page={page} section={section} type={type} />
      )}
      {!section.primary && (
        <PlButton
          variant="dangerSoft"
          size="lg"
          disabled={busy !== null}
          className="w-full !text-[16px] !leading-[16px]"
          onClick={() => void act("delete", () => sync.removeSection(page.pageId, section.sectionId)).then((ok) => ok && onDeleted())}
        >
          {t("publicLink.customize.deleteSection")}
        </PlButton>
      )}
    </div>
  );
}
