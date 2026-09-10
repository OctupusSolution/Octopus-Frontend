// Step 2 — Add & Configure Items.
//
// Three columns over the two wide cards, as the frame lays it out. Selecting
// the built-in offers section shows an empty state: its five tabs are a
// different editor entirely, and they arrive with plan 2.
import { useState } from "react";
import { Button, Checkbox, EmptyState, Modal } from "@ui/primitives";
import {
  OFFERS_SECTION_ID,
  addItem,
  addItemToSections,
  blankItem,
  duplicateItem,
  removeItem,
  updateItem,
  type Item,
} from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";
import { useDraft } from "../use-draft";
import { PreviewRail } from "../preview-rail";
import { EntryList, type EntryAction } from "./entry-list";
import { ItemTabs, type ItemTabId } from "./item-tabs";
import { AvailabilityCard, NutritionStrip, ScheduleCard } from "./item-extras";

export function ItemsStep() {
  const { t } = useI18n();
  const { draft, setDraft } = useDraft();

  const firstItems = draft.sections.find((s) => s.id !== OFFERS_SECTION_ID);
  const [sectionId, setSectionId] = useState(firstItems?.id ?? OFFERS_SECTION_ID);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<ItemTabId>("general");
  const [multiFor, setMultiFor] = useState<Item | null>(null);
  const [multiTargets, setMultiTargets] = useState<string[]>([]);

  const section = draft.sections.find((s) => s.id === sectionId) ?? null;
  const entries = (section?.entries ?? []) as Item[];
  const selected = entries.find((e) => e.id === selectedId) ?? entries[0] ?? null;
  const isOffers = sectionId === OFFERS_SECTION_ID;

  function patchItem(patch: Partial<Item>) {
    if (!selected || !section) return;
    setDraft(updateItem(draft, section.id, selected.id, patch));
  }

  function addNewItem() {
    if (!section) return;
    const id = `i-${Date.now().toString(36)}`;
    setDraft(addItem(draft, section.id, blankItem(id, "")));
    setSelectedId(id);
    setTab("general");
  }

  function runEntryAction(action: EntryAction, item: Item) {
    if (!section) return;
    if (action === "duplicate") {
      const id = `${item.id}-copy-${Date.now().toString(36)}`;
      setDraft(duplicateItem(draft, section.id, item.id, id));
      setSelectedId(id);
      return;
    }
    if (action === "delete") {
      setDraft(removeItem(draft, section.id, item.id));
      if (selectedId === item.id) setSelectedId(null);
      return;
    }
    setMultiTargets([]);
    setMultiFor(item);
  }

  const otherSections = draft.sections.filter(
    (s) => s.id !== sectionId && s.id !== OFFERS_SECTION_ID
  );

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.35fr)_minmax(0,1fr)]">
        <EntryList
          sections={draft.sections}
          sectionId={sectionId}
          onSectionChange={(id) => {
            setSectionId(id);
            setSelectedId(null);
          }}
          entries={entries}
          selectedId={selected?.id ?? null}
          onSelect={setSelectedId}
          onAdd={addNewItem}
          onAction={runEntryAction}
        />

        {isOffers ? (
          <section className="rounded-[14px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
            <EmptyState title={section?.name ?? ""} />
          </section>
        ) : selected ? (
          <ItemTabs
            item={selected}
            sectionName={section?.name ?? ""}
            tab={tab}
            onTabChange={setTab}
            onPatch={patchItem}
          />
        ) : (
          <section className="rounded-[14px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
            <EmptyState title={t("menuWiz.item.addNew")} />
          </section>
        )}

        <PreviewRail menu={draft} />
      </div>

      {selected && !isOffers && (
        <>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <AvailabilityCard item={selected} onPatch={patchItem} />
            <ScheduleCard item={selected} onPatch={patchItem} />
          </div>
          <div className="mt-4">
            <NutritionStrip item={selected} onOpenNutrition={() => setTab("nutrition")} />
          </div>
        </>
      )}

      {/* "Add to Multiple Sections" — the frame offers it from the entry kebab
          but shows no picker, so this is the smallest thing that can honour it:
          the other item sections, checked. */}
      <Modal
        open={multiFor !== null}
        onClose={() => setMultiFor(null)}
        title={t("menuWiz.item.multiTitle")}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setMultiFor(null)}>
              {t("menuWiz.cancel")}
            </Button>
            <Button
              disabled={multiTargets.length === 0}
              onClick={() => {
                if (multiFor && section) {
                  setDraft(
                    addItemToSections(
                      draft,
                      multiFor.id,
                      section.id,
                      multiTargets,
                      (i) => `${multiFor.id}-in-${multiTargets[i]}`
                    )
                  );
                }
                setMultiFor(null);
              }}
            >
              {t("menuWiz.item.multiSave")}
            </Button>
          </div>
        }
      >
        <div className="space-y-2">
          {otherSections.map((s) => (
            <label key={s.id} className="flex items-center gap-2.5 text-[14px]">
              <Checkbox
                checked={multiTargets.includes(s.id)}
                onChange={() =>
                  setMultiTargets((prev) =>
                    prev.includes(s.id) ? prev.filter((x) => x !== s.id) : [...prev, s.id]
                  )
                }
              />
              <span className="text-[var(--octo-text-primary)]">{s.name}</span>
            </label>
          ))}
        </div>
      </Modal>
    </>
  );
}
