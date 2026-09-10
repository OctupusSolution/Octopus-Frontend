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
  addModifierGroup,
  addModifierOption,
  addOffer,
  blankItem,
  blankOffer,
  duplicateItem,
  removeItem,
  removeModifierGroup,
  removeModifierOption,
  removeOfferEntry,
  setOfferEntry,
  updateItem,
  updateOffer,
  updateModifierGroup,
  type Item,
  type ModifierGroup,
  type ModifierOption,
  type Offer,
} from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";
import { useDraft } from "../use-draft";
import { PreviewRail } from "../preview-rail";
import { ModifierPreview } from "./modifier-preview";
import { OffersEditor, incompleteTabs, type OfferTabId } from "../offers";
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
  const [groupId, setGroupId] = useState<string | null>(null);
  const [offerId, setOfferId] = useState<string | null>(null);
  const [offerTab, setOfferTab] = useState<OfferTabId>("info");
  const [multiFor, setMultiFor] = useState<Item | null>(null);
  const [multiTargets, setMultiTargets] = useState<string[]>([]);

  const section = draft.sections.find((s) => s.id === sectionId) ?? null;
  const entries = (section?.entries ?? []) as Item[];
  const selected = entries.find((e) => e.id === selectedId) ?? entries[0] ?? null;
  const isOffers = sectionId === OFFERS_SECTION_ID;

  const offers = (section?.entries ?? []) as unknown as Offer[];
  const offer = isOffers ? (offers.find((o) => o.id === offerId) ?? offers[0] ?? null) : null;
  // The frame's red bar names the tabs still missing something, so Next Step is
  // gated on the same list the bar prints rather than a separate boolean.
  const missing = offer ? incompleteTabs(offer) : [];

  function patchItem(patch: Partial<Item>) {
    if (!selected || !section) return;
    setDraft(updateItem(draft, section.id, selected.id, patch));
  }

  function addNewItem() {
    if (!section) return;
    if (isOffers) {
      const id = `of-${Date.now().toString(36)}`;
      setDraft(addOffer(draft, blankOffer(id, "")));
      setOfferId(id);
      setOfferTab("info");
      return;
    }
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

  // Every modifier edit needs the same three coordinates — section, item,
  // group — so they are bound once here rather than threaded through the tab.
  const modifiers = {
    selectedGroupId: groupId,
    onSelectGroup: setGroupId,
    onAddGroup: (g: Pick<ModifierGroup, "name" | "required" | "type">) => {
      if (!section || !selected) return;
      const id = `g-${Date.now().toString(36)}`;
      setDraft(
        addModifierGroup(draft, section.id, selected.id, {
          id,
          name: g.name,
          type: g.type,
          customerLabel: g.name,
          helpText: "",
          // A required group must take one choice; an optional one may take none.
          min: g.required ? 1 : 0,
          max: 1,
          required: g.required,
          showAsRadio: g.type === "single",
          options: [],
        })
      );
      setGroupId(id);
    },
    onPatchGroup: (id: string, patch: Partial<ModifierGroup>) => {
      if (!section || !selected) return;
      setDraft(updateModifierGroup(draft, section.id, selected.id, id, patch));
    },
    onRemoveGroup: (id: string) => {
      if (!section || !selected) return;
      setDraft(removeModifierGroup(draft, section.id, selected.id, id));
      if (groupId === id) setGroupId(null);
    },
    onAddOption: (id: string, option: Omit<ModifierOption, "id">) => {
      if (!section || !selected) return;
      setDraft(
        addModifierOption(draft, section.id, selected.id, id, {
          ...option,
          id: `o-${Date.now().toString(36)}`,
        })
      );
    },
    onRemoveOption: (id: string, optionId: string) => {
      if (!section || !selected) return;
      setDraft(removeModifierOption(draft, section.id, selected.id, id, optionId));
    },
  };

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
          selectedId={isOffers ? (offer?.id ?? null) : (selected?.id ?? null)}
          onSelect={isOffers ? setOfferId : setSelectedId}
          onAdd={addNewItem}
          onAction={runEntryAction}
          priceOf={(entry) =>
            isOffers
              ? ((entry as unknown as Offer).pricing.offerPrice ?? 0)
              : entry.pricing.price
          }
          addLabelKey={isOffers ? "menuOffer.addNew" : "menuWiz.item.addNew"}
        />

        {isOffers ? (
          <OffersEditor
            menu={draft}
            offer={offer}
            tab={offerTab}
            onTabChange={setOfferTab}
            onPatch={(patch) => offer && setDraft(updateOffer(draft, offer.id, patch))}
            onSetEntry={(itemId, qty, price) =>
              offer && setDraft(setOfferEntry(draft, offer.id, itemId, qty, price))
            }
            onRemoveEntry={(itemId) =>
              offer && setDraft(removeOfferEntry(draft, offer.id, itemId))
            }
          />
        ) : selected ? (
          <ItemTabs
            item={selected}
            sectionName={section?.name ?? ""}
            tab={tab}
            onTabChange={setTab}
            onPatch={patchItem}
            modifiers={modifiers}
          />
        ) : (
          <section className="rounded-[14px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
            <EmptyState title={t("menuWiz.item.addNew")} />
          </section>
        )}

        {tab === "modifiers" && selected && !isOffers ? (
          <ModifierPreview item={selected} />
        ) : (
          <PreviewRail menu={draft} />
        )}
      </div>

      {isOffers && offer && missing.length > 0 && (
        <p className="mt-4 rounded-[10px] border border-[var(--octo-tone-danger-border,var(--octo-border-card))] bg-[var(--octo-tone-danger-bg)] px-3.5 py-2.5 text-[13.5px] text-[var(--octo-tone-danger-text)]">
          {t("menuOffer.incomplete")}
        </p>
      )}

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
