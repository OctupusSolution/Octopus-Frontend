// Step 2's start column: which section you are filling, and its entries.
//
// The kebab reuses the anchored-popover shape the library card and the section
// row already use — same reason each time: a centred sheet over a list of
// near-identical rows loses which row you were on.
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { MoreVertical, Plus } from "lucide-react";
import { Select } from "@ui/primitives";
import { OFFERS_SECTION_ID, type Item, type Section } from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";

export type EntryAction = "duplicate" | "multiSection" | "delete";

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
}: {
  sections: Section[];
  sectionId: string;
  onSectionChange: (id: string) => void;
  entries: Item[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onAction: (action: EntryAction, item: Item) => void;
}) {
  const { t, dir } = useI18n();
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

  const actions: EntryAction[] = ["duplicate", "multiSection", "delete"];
  const isOffers = sectionId === OFFERS_SECTION_ID;

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
              {item.image ? (
                <img src={item.image} alt="" className="h-10 w-10 shrink-0 rounded-[8px] object-cover" />
              ) : (
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] bg-[#0d2b21] text-center font-serif text-[9px] leading-tight text-white/70"
                  aria-hidden
                >
                  ME
                  <br />
                  NU
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate text-[14px] font-medium text-[var(--octo-text-primary)]">
                  {item.name}
                </span>
                <span className="block text-[13px] font-semibold text-[var(--octo-accent)]">
                  SAR {item.pricing.price}
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
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-[10px] border border-dashed border-[var(--octo-accent)] bg-[var(--octo-selected)] px-3 py-2.5 text-[14px] font-medium text-[var(--octo-accent)]"
      >
        <Plus size={16} aria-hidden />
        {t(isOffers ? "menuWiz.item.addNew" : "menuWiz.item.addNew")}
      </button>

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
          className="fixed z-50 overflow-hidden rounded-[12px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] shadow-lg"
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
                "block w-full border-b border-[var(--octo-border-card)] px-4 py-3 text-start text-[14px] last:border-b-0 hover:bg-[var(--octo-hover)]",
                action === "delete"
                  ? "text-error hover:bg-error/10"
                  : "text-[var(--octo-text-primary)]"
              )}
            >
              {t(`menuWiz.item.action.${action}`)}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
