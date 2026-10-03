// Step 2's start column: which section you are filling, and its entries.
//
// The kebab is the module's anchored popover — the same one the library card
// and the section row use, for the same reason each time: a centred sheet over
// a list of near-identical rows loses which row you were on.
import { useState } from "react";
import clsx from "clsx";
import { MediaTile } from "@/shared/ui/media-tile";
import { OFFERS_SECTION_ID, type Item, type Section } from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";
import { useMenuCopy } from "../../copy";
import { PopoverMenu, SelectBox, type PopoverItem } from "../../_shared/controls";
import { MenuIcon } from "../../_shared/menu-icon";
import { LINE, PANEL, SURFACE_BLUE, TEXT } from "../../_shared/theme";
import { ADD_BUTTON, LABEL_14, PRICE_TEXT, SELECT_4 } from "./ui";

export type EntryAction = "duplicate" | "multiSection" | "move" | "delete";

/** "Move to section" is in the code but not in the frame's popover (Duplicate
 *  Item / Add to Multiple Sections / Delete); flip this to offer it again. */
const SHOW_MOVE_ACTION: boolean = false;

export function EntryList({
  sections,
  sectionId,
  onSectionChange,
  entries,
  selectedId,
  onSelect,
  onAdd,
  onAction,
  priceOf,
  addLabelKey,
  onAddExisting,
  addExistingLabel,
}: {
  sections: Section[];
  sectionId: string;
  onSectionChange: (id: string) => void;
  entries: Item[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onAction: (action: EntryAction, item: Item) => void;
  /** An Offer keeps its price under a different field, so the caller says what
   *  to show rather than this list reaching into a shape it may not have. */
  priceOf: (entry: Item) => number;
  addLabelKey: string;
  /** Picks from the business's catalog (items or offers) instead of a blank entry. */
  onAddExisting?: () => void;
  addExistingLabel?: string;
}) {
  const { t } = useI18n();
  const c = useMenuCopy();
  const [menuFor, setMenuFor] = useState<{ item: Item; anchor: DOMRect } | null>(null);

  // An offer cannot be copied into another section — there is only one offers
  // section — so that action is dropped there rather than shown and ignored.
  const isOffers = sectionId === OFFERS_SECTION_ID;
  const actions: EntryAction[] = isOffers
    ? ["duplicate", "delete"]
    : ["duplicate", "multiSection", ...(SHOW_MOVE_ACTION ? (["move"] as const) : []), "delete"];

  function actionLabel(action: EntryAction): string {
    if (isOffers) return t(action === "duplicate" ? "menuOffer.duplicate" : "menuOffer.delete");
    if (action === "move") return c("items.moveTo");
    return t(`menuWiz.item.action.${action}`);
  }

  const items: PopoverItem<EntryAction>[] = actions.map((action) => ({
    id: action,
    label: actionLabel(action),
    danger: action === "delete",
  }));

  return (
    <section className={clsx("flex flex-col gap-6", PANEL)}>
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className={LABEL_14}>{t("menuWiz.item.selectSection")}</span>
          <SelectBox value={sectionId} onChange={onSectionChange} className={SELECT_4}>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
          </SelectBox>
        </label>

        {entries.length > 0 && (
          <ul className="flex flex-col gap-3">
            {entries.map((item) => {
              const selected = selectedId === item.id;
              const name = item.name.trim() || t("menuWiz.item.untitled");
              return (
                <li
                  key={item.id}
                  className={clsx(
                    "flex items-center gap-2 rounded-[4px] border p-1",
                    selected ? `border-[#0D6EFD] ${SURFACE_BLUE}` : LINE
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(item.id)}
                    aria-current={selected ? "true" : undefined}
                    className="flex min-w-0 flex-1 items-center gap-2 text-start"
                  >
                    <span className="size-12 shrink-0 overflow-hidden rounded-[4px]">
                      <MediaTile src={item.image} rounded="rounded-[4px]" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-2">
                      <span className={clsx("truncate text-[14px] font-medium leading-[14px]", TEXT)}>{name}</span>
                      {/* The name may truncate; the price never does — it is the
                          one thing a merchant scans this list for. */}
                      <span className={clsx("whitespace-nowrap text-[12px] font-semibold leading-3", PRICE_TEXT)}>
                        SAR {priceOf(item)}
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    aria-label={t("menuWiz.item.actionsFor").replace("{name}", name)}
                    aria-haspopup="menu"
                    onClick={(e) => setMenuFor({ item, anchor: e.currentTarget.getBoundingClientRect() })}
                    className={clsx("grid size-6 shrink-0 place-items-center rounded-[4px] hover:bg-[var(--octo-hover)]", TEXT)}
                  >
                    <MenuIcon name="menu-more-vertical-fill.svg" size={24} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <button type="button" onClick={onAdd} className={clsx(ADD_BUTTON, "h-[42px] w-full")}>
          <MenuIcon name="menu-plus-line.svg" size={24} />
          {t(addLabelKey)}
        </button>
        {onAddExisting && (
          <button
            type="button"
            onClick={onAddExisting}
            className="flex h-9 w-full items-center justify-center rounded-[4px] px-3 text-[14px] font-medium leading-[14px] text-[#0D6EFD] hover:bg-[var(--octo-hover)]"
          >
            {addExistingLabel}
          </button>
        )}
      </div>

      <PopoverMenu
        anchor={menuFor?.anchor ?? null}
        items={items}
        minWidth={204}
        onClose={() => setMenuFor(null)}
        onPick={(action) => {
          const item = menuFor?.item;
          setMenuFor(null);
          if (item) onAction(action, item);
        }}
      />
    </section>
  );
}
