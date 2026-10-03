// "Build Your Sections" — the step's start column.
//
// Reordering is native HTML5 drag and drop rather than a library: the list is
// short, the rows are large, and the whole interaction is a handful of
// handlers. Drag has no keyboard path, so the grip is also a button that moves
// its row with Alt+ArrowUp/Down. The offers row is exempt from both — it is
// part of the menu's shape, so it neither moves nor offers Delete.
import { useEffect, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import { Eye, EyeOff, GripVertical, MoreVertical, Plus } from "lucide-react";
import { OFFERS_SECTION_ID, type Section } from "@/entities/menu";
import { MediaTile } from "@/shared/ui/media-tile";
import { useI18n } from "@/app/providers/i18n-provider";
import { SectionRowMenu } from "./section-row-menu";

export function SectionList({
  header,
  sections,
  selectedId,
  onSelect,
  onToggleVisibility,
  onReorder,
  onAdd,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
}: {
  /** Rendered under the card title — the step puts the menu-name field here. */
  header?: ReactNode;
  sections: Section[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onReorder: (from: number, to: number) => void;
  onAdd: () => void;
  onEdit: (section: Section) => void;
  onArchive: (section: Section) => void;
  onRestore: (section: Section) => void;
  onDelete: (section: Section) => void;
}) {
  const { t } = useI18n();
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [menuFor, setMenuFor] = useState<{ section: Section; anchor: DOMRect } | null>(null);

  // A keyboard move re-renders the list in a new order; focus follows the row
  // that moved so the merchant can keep pressing the arrow.
  const grips = useRef(new Map<string, HTMLButtonElement>());
  const [refocus, setRefocus] = useState<string | null>(null);
  useEffect(() => {
    if (!refocus) return;
    grips.current.get(refocus)?.focus();
    setRefocus(null);
  }, [refocus, sections]);

  // Offers always sorts last, so the movable rows are everything before it.
  const offersAt = sections.findIndex((s) => s.id === OFFERS_SECTION_ID);
  const lastMovable = offersAt === -1 ? sections.length - 1 : offersAt - 1;

  function endDrag() {
    setDragFrom(null);
    setDragOver(null);
  }

  return (
    <section className="rounded-[14px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
      <h2 className="text-[18px] font-semibold text-[var(--octo-text-primary)]">
        {t("menuWiz.sec.buildTitle")}
      </h2>
      <p className="mt-1 text-[14px] text-[var(--octo-text-secondary)]">
        {t("menuWiz.sec.buildHint")}
      </p>
      {header && <div className="mt-3">{header}</div>}

      <ul className="mt-3 divide-y divide-[var(--octo-border-card)] border-y border-[var(--octo-border-card)]">
        {sections.map((section, index) => {
          const fixed = section.id === OFFERS_SECTION_ID;
          const archived = section.visibility === "archived";
          const visible = section.visibility === "visible";
          const showIndicator =
            dragFrom !== null && dragOver === index && dragOver !== dragFrom;

          return (
            <li
              key={section.id}
              draggable={!fixed}
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                // Firefox refuses to start a drag that carries no data.
                e.dataTransfer.setData("text/plain", section.id);
                setDragFrom(index);
              }}
              onDragOver={(e) => {
                if (dragFrom === null || fixed) return;
                e.preventDefault();
                if (dragOver !== index) setDragOver(index);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragFrom !== null && dragFrom !== index && !fixed) onReorder(dragFrom, index);
                endDrag();
              }}
              onDragEnd={endDrag}
              className={clsx(
                "relative flex items-center gap-3 px-1.5 py-2.5",
                selectedId === section.id && "bg-[var(--octo-hover)]",
                dragFrom === index && "opacity-50"
              )}
            >
              {showIndicator && (
                <span
                  aria-hidden
                  className={clsx(
                    "pointer-events-none absolute inset-x-0 h-[3px] rounded-full bg-[var(--octo-accent)]",
                    dragFrom < index ? "-bottom-[2px]" : "-top-[2px]"
                  )}
                />
              )}

              {fixed ? (
                <span className="w-[22px] shrink-0" aria-hidden />
              ) : (
                <button
                  type="button"
                  ref={(el) => {
                    if (el) grips.current.set(section.id, el);
                    else grips.current.delete(section.id);
                  }}
                  aria-label={t("menuWiz.sec.reorderHint").replace("{name}", section.name)}
                  onKeyDown={(e) => {
                    if (!e.altKey) return;
                    const to =
                      e.key === "ArrowUp" ? index - 1 : e.key === "ArrowDown" ? index + 1 : null;
                    if (to === null) return;
                    e.preventDefault();
                    if (to < 0 || to > lastMovable) return;
                    onReorder(index, to);
                    setRefocus(section.id);
                  }}
                  className="shrink-0 cursor-grab rounded-[6px] text-[var(--octo-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--octo-accent)]"
                >
                  <GripVertical size={22} aria-hidden />
                </button>
              )}

              <button
                type="button"
                onClick={() => onSelect(section.id)}
                className={clsx(
                  "flex min-w-0 flex-1 items-center gap-3 text-start",
                  archived && "opacity-55"
                )}
              >
                <span className="h-[54px] w-[54px] shrink-0 overflow-hidden rounded-[8px]">
                  <MediaTile src={section.image} rounded="rounded-[8px]" />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[16px] font-medium text-[var(--octo-text-primary)]">
                      {section.name}
                    </span>
                    {archived && (
                      <span className="shrink-0 rounded-full bg-[var(--octo-hover)] px-2 py-0.5 text-[12px] font-medium text-[var(--octo-text-secondary)]">
                        {t("menuWiz.sec.archivedTag")}
                      </span>
                    )}
                  </span>
                  <span className="block text-[14px] text-[var(--octo-text-secondary)]">
                    {t("menuWiz.sec.itemCount").replace("{n}", String(section.entries.length))}
                  </span>
                </span>
              </button>

              {/* Locked while archived: Restore is the one way back, so the eye
                  cannot quietly republish a parked section. */}
              <button
                type="button"
                aria-label={`${t("menuWiz.sec.visibility")}: ${section.name}`}
                aria-pressed={visible}
                disabled={archived}
                onClick={() => onToggleVisibility(section.id)}
                className="shrink-0 rounded-[8px] p-1 text-[var(--octo-accent)] hover:bg-[var(--octo-hover)] disabled:cursor-not-allowed disabled:text-[var(--octo-text-faint)] disabled:hover:bg-transparent"
              >
                {visible ? <Eye size={22} /> : <EyeOff size={22} />}
              </button>

              <button
                type="button"
                aria-label={`${section.name} actions`}
                aria-haspopup="menu"
                onClick={(e) =>
                  setMenuFor({ section, anchor: e.currentTarget.getBoundingClientRect() })
                }
                className="shrink-0 rounded-[8px] p-1 text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]"
              >
                <MoreVertical size={22} />
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={onAdd}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-[6px] border border-[var(--octo-accent)] bg-transparent px-3 py-3 text-[16px] font-medium text-[var(--octo-accent)] hover:bg-[var(--octo-hover)]"
      >
        <Plus size={20} aria-hidden />
        {t("menuWiz.sec.addNew")}
      </button>

      <SectionRowMenu
        section={menuFor?.section ?? null}
        anchor={menuFor?.anchor ?? null}
        onClose={() => setMenuFor(null)}
        onPick={(action) => {
          const section = menuFor?.section;
          setMenuFor(null);
          if (!section) return;
          if (action === "edit") onEdit(section);
          if (action === "archive") onArchive(section);
          if (action === "restore") onRestore(section);
          if (action === "delete") onDelete(section);
        }}
      />
    </section>
  );
}
