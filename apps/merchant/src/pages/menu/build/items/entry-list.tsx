// Step 2's start column: which section you are filling, and its entries.
//
// The kebab reuses the anchored-popover shape the library card and the section
// row already use — same reason each time: a centred sheet over a list of
// near-identical rows loses which row you were on.
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Library, MoreVertical, Plus } from "lucide-react";
import { Select } from "@ui/primitives";
import { MediaTile } from "@/shared/ui/media-tile";
import { OFFERS_SECTION_ID, type Item, type Section } from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";
import { useMenuCopy } from "../../copy";

export type EntryAction = "duplicate" | "multiSection" | "move" | "delete";

const MENU_WIDTH = 220;
const GAP = 6;
const VIEWPORT_MARGIN = 8;

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
  const { t, dir } = useI18n();
  const c = useMenuCopy();
  const [menuFor, setMenuFor] = useState<{ item: Item; anchor: DOMRect } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuFor) return;
    function close() {
      setMenuFor(null);
    }
    function onDocClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) close();
    }
    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [menuFor]);

  // An offer cannot be copied into another section — there is only one offers
  // section — so that action is dropped there rather than shown and ignored.
  const isOffers = sectionId === OFFERS_SECTION_ID;
  const actions: EntryAction[] = isOffers
    ? ["duplicate", "delete"]
    : ["duplicate", "multiSection", "move", "delete"];

  function actionLabel(action: EntryAction): string {
    if (isOffers) return t(action === "duplicate" ? "menuOffer.duplicate" : "menuOffer.delete");
    if (action === "move") return c("items.moveTo");
    return t(`menuWiz.item.action.${action}`);
  }

  return (
    <section className="rounded-[14px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
      <label className="block">
        <span className="text-[14px] font-medium text-[var(--octo-text-primary)]">
          {t("menuWiz.item.selectSection")}
        </span>
        <Select
          className="mt-1.5"
          value={sectionId}
          onChange={(e) => onSectionChange(e.target.value)}
        >
          {sections.map((section) => (
            <option key={section.id} value={section.id}>
              {section.name}
            </option>
          ))}
        </Select>
      </label>

      <ul className="mt-3 space-y-2.5">
        {entries.map((item) => (
          <li
            key={item.id}
            className={clsx(
              "flex items-center gap-2.5 rounded-[10px] border p-2",
              selectedId === item.id
                ? "border-[var(--octo-accent)] bg-[var(--octo-selected)]"
                : "border-[var(--octo-border-card)]"
            )}
          >
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              className="flex min-w-0 flex-1 items-center gap-2.5 text-start"
            >
              <span className="h-12 w-12 shrink-0 overflow-hidden rounded-[8px]">
                <MediaTile src={item.image} rounded="rounded-[8px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium text-[var(--octo-text-primary)]">
                  {item.name}
                </span>
                {/* The name may truncate; the price never does — it is the
                    one thing a merchant scans this list for. */}
                <span className="block whitespace-nowrap text-[13px] font-semibold text-[var(--octo-accent)]">
                  SAR {priceOf(item)}
                </span>
              </span>
            </button>

            <button
              type="button"
              aria-label={`${item.name} actions`}
              onClick={(e) => setMenuFor({ item, anchor: e.currentTarget.getBoundingClientRect() })}
              className="shrink-0 rounded-[8px] p-1.5 text-[var(--octo-text-secondary)] hover:bg-[var(--octo-hover)]"
            >
              <MoreVertical size={17} />
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onAdd}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-[8px] border border-[var(--octo-accent)] bg-[var(--octo-card)] px-3 py-2.5 text-[15px] font-medium text-[var(--octo-accent)] hover:bg-[var(--octo-selected)]"
      >
        <Plus size={18} aria-hidden />
        {t(addLabelKey)}
      </button>
      {onAddExisting && (
        <button
          type="button"
          onClick={onAddExisting}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-[8px] px-3 py-2 text-[14px] font-medium text-[var(--octo-accent)] hover:bg-[var(--octo-selected)]"
        >
          <Library size={16} aria-hidden />
          {addExistingLabel}
        </button>
      )}

      {menuFor && (
        <div
          ref={ref}
          role="menu"
          aria-label={menuFor.item.name}
          style={{
            top: menuFor.anchor.bottom + GAP,
            left: Math.min(
              Math.max(
                VIEWPORT_MARGIN,
                dir === "rtl" ? menuFor.anchor.left : menuFor.anchor.right - MENU_WIDTH
              ),
              window.innerWidth - MENU_WIDTH - VIEWPORT_MARGIN
            ),
            width: MENU_WIDTH,
          }}
          className="fixed z-50 space-y-1.5 rounded-[12px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-2 shadow-lg"
        >
          {actions.map((action) => (
            <button
              key={action}
              type="button"
              role="menuitem"
              onClick={() => {
                const item = menuFor.item;
                setMenuFor(null);
                onAction(action, item);
              }}
              className={clsx(
                "block w-full rounded-[8px] px-3 py-2.5 text-start text-[15px]",
                action === "delete"
                  ? "bg-error/10 text-error hover:bg-error/20"
                  : "bg-[var(--octo-hover)] text-[var(--octo-text-primary)] hover:bg-[var(--octo-selected)]"
              )}
            >
              {actionLabel(action)}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
