// Step 2 — Add & Configure Items.
//
// Three columns over the two wide cards, as the frame lays it out. Selecting
// the built-in offers section swaps the item editor for the offer editor.
//
// The Modifiers tab is the exception to that layout: its frames drop the entry
// list and the Item Information card and give the whole width to Modifiers
// Group | Edit Group | the customer preview, with the tab bar straight above.
import { useEffect, useState } from "react";
import clsx from "clsx";
import { AlertCircle } from "lucide-react";
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
  duplicateOffer,
  moveModifierGroup,
  moveModifierOption,
  removeItem,
  removeModifierGroup,
  removeModifierOption,
  removeOffer,
  removeOfferEntry,
  setOfferEntry,
  syncDiscountPrice,
  updateItem,
  updateModifierGroup,
  updateModifierOption,
  updateOffer,
  type Item,
  type Menu,
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
import { ITEM_TABS, ItemTabs, type ItemTabId } from "./item-tabs";
import { TabModifiers } from "./tab-modifiers";
import { AvailabilityCard, NutritionStrip, ScheduleCard } from "./item-extras";

/** Keeps a group's selection rules satisfiable after any edit to it.
 *
 *  Required and min are one fact seen twice — a required group is one that
 *  needs at least one choice — so whichever the merchant touched decides the
 *  other. A single-choice group takes exactly one choice at most, both limits
 *  are capped by how many options exist, and min never passes max. */
function applyGroupRules(group: ModifierGroup, patch: Partial<ModifierGroup>): ModifierGroup {
  const next = { ...group, ...patch };
  const cap = Math.max(1, next.options.length);

  if ("required" in patch) next.min = patch.required ? Math.max(1, next.min) : 0;
  if ("type" in patch) {
    // The radio look follows the type unless the merchant changes it later.
    next.showAsRadio = next.type === "single";
    if (next.type === "single") {
      const firstDefault = next.options.findIndex((o) => o.isDefault);
      next.options = next.options.map((o, i) => (o.isDefault && i !== firstDefault ? { ...o, isDefault: false } : o));
    }
  }

  next.max = next.type === "single" ? 1 : Math.min(Math.max(1, next.max), cap);
  next.min = Math.min(Math.max(0, next.min), cap);
  if (next.min > next.max) {
    // The field the merchant just moved wins; the other one follows it.
    if ("max" in patch || next.type === "single") next.min = next.max;
    else next.max = next.min;
  }
  next.required = next.min >= 1;
  return next;
}

export function ItemsStep() {
  const { t } = useI18n();
  const { draft, setDraft, addAnother, setNextBlocked } = useDraft();

  const firstItems = draft.sections.find((s) => s.id !== OFFERS_SECTION_ID);
  const [sectionId, setSectionId] = useState(firstItems?.id ?? OFFERS_SECTION_ID);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<ItemTabId>("general");
  const [groupId, setGroupId] = useState<string | null>(null);
  const [offerId, setOfferId] = useState<string | null>(null);
  const [offerTab, setOfferTab] = useState<OfferTabId>("info");
  const [multiFor, setMultiFor] = useState<Item | null>(null);
  const [multiTargets, setMultiTargets] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<Item | null>(null);

  const section = draft.sections.find((s) => s.id === sectionId) ?? null;
  const entries = (section?.entries ?? []) as Item[];
  const selected = entries.find((e) => e.id === selectedId) ?? entries[0] ?? null;
  const isOffers = sectionId === OFFERS_SECTION_ID;

  const offers = (section?.entries ?? []) as unknown as Offer[];
  const offer = isOffers ? (offers.find((o) => o.id === offerId) ?? offers[0] ?? null) : null;
  // The frame's red bar names the tabs still missing something, so Next Step is
  // gated on the same list the bar prints rather than a separate boolean.
  const missing = offer ? incompleteTabs(offer) : [];
  const blocked = isOffers && missing.length > 0;

  useEffect(() => {
    setNextBlocked(blocked);
  }, [blocked, setNextBlocked]);
  // Released on unmount too, so leaving the step never strands the footer.
  useEffect(() => () => setNextBlocked(false), [setNextBlocked]);

  const onModifiers = !isOffers && selected !== null && tab === "modifiers";

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

  // Re-pointed every render, so the footer always calls the addNewItem that
  // closes over the current draft and section.
  useEffect(() => {
    addAnother.current = addNewItem;
    return () => {
      addAnother.current = null;
    };
  });

  function runEntryAction(action: EntryAction, item: Item) {
    if (!section) return;
    if (isOffers) {
      if (action === "duplicate") {
        const id = `${item.id}-copy-${Date.now().toString(36)}`;
        setDraft(duplicateOffer(draft, item.id, id));
        setOfferId(id);
        setOfferTab("info");
      }
      if (action === "delete") {
        setDraft(removeOffer(draft, item.id));
        if (offerId === item.id) setOfferId(null);
      }
      return;
    }
    if (action === "duplicate") {
      const id = `${item.id}-copy-${Date.now().toString(36)}`;
      setDraft(duplicateItem(draft, section.id, item.id, id));
      setSelectedId(id);
      return;
    }
    if (action === "delete") {
      // An item carries its modifiers and pricing with it; a kebab slip should
      // not cost all that, so it asks first — as section delete does.
      setConfirmDelete(item);
      return;
    }
    setMultiTargets([]);
    setMultiFor(item);
  }

  /** Every offer edit goes through here, so a discount-priced offer re-quotes
   *  itself whether its lines or its discount changed. */
  function commitOffer(next: Menu) {
    if (!offer) return;
    setDraft(syncDiscountPrice(next, offer.id));
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
      const current = selected.modifierGroups.find((g) => g.id === id);
      if (!current) return;
      const { id: _id, ...rest } = applyGroupRules(current, patch);
      setDraft(updateModifierGroup(draft, section.id, selected.id, id, rest));
    },
    onRemoveGroup: (id: string) => {
      if (!section || !selected) return;
      setDraft(removeModifierGroup(draft, section.id, selected.id, id));
      if (groupId === id) setGroupId(null);
    },
    onMoveGroup: (from: number, to: number) => {
      if (!section || !selected) return;
      setDraft(moveModifierGroup(draft, section.id, selected.id, from, to));
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
    onUpdateOption: (id: string, optionId: string, patch: Partial<ModifierOption>) => {
      if (!section || !selected) return;
      setDraft(updateModifierOption(draft, section.id, selected.id, id, optionId, patch));
    },
    onMoveOption: (id: string, from: number, to: number) => {
      if (!section || !selected) return;
      setDraft(moveModifierOption(draft, section.id, selected.id, id, from, to));
    },
    onRemoveOption: (id: string, optionId: string) => {
      if (!section || !selected) return;
      let next = removeModifierOption(draft, section.id, selected.id, id, optionId);
      // Fewer options can leave min/max asking for more than exists.
      const group = (next.sections.find((s) => s.id === section.id)?.entries.find(
        (e) => e.id === selected.id
      ) as Item | undefined)?.modifierGroups.find((g) => g.id === id);
      if (group) {
        const { id: _id, ...rest } = applyGroupRules(group, {});
        next = updateModifierGroup(next, section.id, selected.id, id, rest);
      }
      setDraft(next);
    },
  };

  // Only item sections can receive a copy — never the offers section.
  const otherSections = draft.sections.filter((s) => s.id !== sectionId && s.kind === "items");

  return (
    <>
      {onModifiers && selected ? (
        <>
          {/* ItemTabs' own bar lives inside the Item Information card, which
              these frames do not have — so the same tabs are drawn bare here,
              and any of them leads back to the full layout. */}
          <div
            role="tablist"
            className="mb-5 flex w-fit flex-wrap gap-x-10 border-b border-[var(--octo-border-card)]"
          >
            {ITEM_TABS.map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={clsx(
                  "-mb-px border-b-2 pb-2.5 text-[16px]",
                  tab === id
                    ? "border-[var(--octo-accent)] font-medium text-[var(--octo-accent)]"
                    : "border-transparent text-[var(--octo-text-secondary)] hover:text-[var(--octo-text-primary)]"
                )}
              >
                {t(`menuWiz.item.tab.${id}`)}
              </button>
            ))}
          </div>

          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,370fr)_minmax(0,720fr)_minmax(0,430fr)]">
            <TabModifiers item={selected} {...modifiers} />
            <ModifierPreview item={selected} />
          </div>
        </>
      ) : (
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
              onPatch={(patch) => offer && commitOffer(updateOffer(draft, offer.id, patch))}
              onSetEntry={(itemId, qty, price) =>
                offer && commitOffer(setOfferEntry(draft, offer.id, itemId, qty, price))
              }
              onRemoveEntry={(itemId) =>
                offer && commitOffer(removeOfferEntry(draft, offer.id, itemId))
              }
              onReplaceEntry={(fromId, toId, qty, price) =>
                offer &&
                commitOffer(
                  updateOffer(draft, offer.id, {
                    entries: offer.entries.map((e) =>
                      e.itemId === fromId ? { itemId: toId, qty, price } : e
                    ),
                  })
                )
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

          <PreviewRail menu={draft} />
        </div>
      )}

      {blocked && offer && (
        <p
          role="alert"
          className="mt-4 flex items-center gap-2 rounded-[10px] bg-[var(--octo-tone-danger-bg)] px-3.5 py-3 text-[15px] text-[var(--octo-tone-danger-text)]"
        >
          <AlertCircle size={20} className="shrink-0" aria-hidden />
          {t("menuOffer.incomplete")}
        </p>
      )}

      {selected && !isOffers && !onModifiers && (
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

      <Modal
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title={t("menuWiz.item.deleteTitle")}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
              {t("menuWiz.cancel")}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirmDelete && section) {
                  setDraft(removeItem(draft, section.id, confirmDelete.id));
                  if (selectedId === confirmDelete.id) setSelectedId(null);
                }
                setConfirmDelete(null);
              }}
            >
              {t("menuWiz.item.action.delete")}
            </Button>
          </div>
        }
      >
        <p className="text-[14px] text-[var(--octo-text-secondary)]">
          {t("menuWiz.item.deleteBody").replace("{name}", confirmDelete?.name ?? "")}
        </p>
      </Modal>
    </>
  );
}
