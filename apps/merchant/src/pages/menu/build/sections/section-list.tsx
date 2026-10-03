// "Build Your Sections" — the step's start column.
//
// Reordering is native HTML5 drag and drop rather than a library: the list is
// short, the rows are large, and the whole interaction is a handful of
// handlers. Drag has no keyboard path, so the grip is also a button that moves
// its row with Alt+ArrowUp/Down. The offers row is exempt from both — it is
// part of the menu's shape, so it neither moves nor offers Delete.
import { useEffect, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import { EyeOff } from "lucide-react";
import { OFFERS_SECTION_ID, type Section } from "@/entities/menu";
import { MediaTile } from "@/shared/ui/media-tile";
import { useI18n } from "@/app/providers/i18n-provider";
import { StatusPill } from "../../_shared/controls";
import { MenuIcon } from "../../_shared/menu-icon";
import { LINE, PANEL, SURFACE_BLUE, TEXT, TEXT_GRAY, TEXT_SECONDARY } from "../../_shared/theme";
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
  /** Rendered under the card title. The frames put nothing here. */
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
    <section className={clsx("flex flex-col gap-4", PANEL)}>
      <div className={clsx("flex flex-col gap-3 border-b pb-2", LINE)}>
        <h2 className={clsx("text-[18px] font-bold leading-[18px]", TEXT)}>{t("menuWiz.sec.buildTitle")}</h2>
        <p className={clsx("text-[14px] font-medium leading-[14px]", TEXT_SECONDARY)}>{t("menuWiz.sec.buildHint")}</p>
      </div>
      {header}

      <ul className={clsx("border-b", LINE)}>
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
                "relative flex items-center justify-between gap-2 border-t p-2",
                LINE,
                selectedId === section.id && SURFACE_BLUE,
                dragFrom === index && "opacity-50"
              )}
            >
              {showIndicator && (
                <span
                  aria-hidden
                  className={clsx(
                    "pointer-events-none absolute inset-x-0 h-[3px] rounded-full bg-[#0D6EFD]",
                    dragFrom < index ? "-bottom-[2px]" : "-top-[2px]"
                  )}
                />
              )}

              <div className="flex min-w-0 flex-1 items-center gap-2">
                {fixed ? (
                  <span className="size-6 shrink-0" aria-hidden />
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
                    className="grid size-6 shrink-0 cursor-grab place-items-center rounded-[4px] text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0D6EFD] [[data-theme=dark]_&]:text-[var(--octo-text-primary)]"
                  >
                    <MenuIcon name="menu-drag.svg" size={12} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onSelect(section.id)}
                  aria-current={selectedId === section.id ? "true" : undefined}
                  className={clsx("flex min-w-0 flex-1 items-center gap-2 text-start", archived && "opacity-55")}
                >
                  <span className="size-12 shrink-0 overflow-hidden rounded-[4px]">
                    <MediaTile src={section.image} rounded="rounded-[4px]" />
                  </span>
                  <span className="flex min-w-0 flex-col gap-2">
                    <span className="flex items-center gap-2">
                      <span className={clsx("truncate text-[14px] font-medium leading-[14px]", TEXT)}>{section.name}</span>
                      {archived && <StatusPill tone="slate">{t("menuWiz.sec.archivedTag")}</StatusPill>}
                    </span>
                    <span className={clsx("text-[12px] font-medium leading-3", TEXT_GRAY)}>
                      {t("menuWiz.sec.itemCount").replace("{n}", String(section.entries.length))}
                    </span>
                  </span>
                </button>
              </div>

              <div className="flex shrink-0 items-center gap-6">
                {/* Locked while archived: Restore is the one way back, so the
                    eye cannot quietly republish a parked section. */}
                <button
                  type="button"
                  aria-label={`${t("menuWiz.sec.visibility")}: ${section.name}`}
                  aria-pressed={visible}
                  disabled={archived}
                  onClick={() => onToggleVisibility(section.id)}
                  className="grid size-6 place-items-center rounded-[4px] text-[#0D6EFD] disabled:cursor-not-allowed disabled:text-[#cbd5e1]"
                >
                  {/* The frames draw only the open eye; the closed one has no
                      frame glyph to take. */}
                  {visible ? <MenuIcon name="menu-eye.svg" size={24} /> : <EyeOff size={24} strokeWidth={1.5} aria-hidden />}
                </button>

                <button
                  type="button"
                  aria-label={t("menuWiz.sec.actionsFor").replace("{name}", section.name)}
                  aria-haspopup="menu"
                  onClick={(e) => setMenuFor({ section, anchor: e.currentTarget.getBoundingClientRect() })}
                  className={clsx("grid size-6 place-items-center rounded-[4px] hover:bg-[var(--octo-hover)]", TEXT)}
                >
                  <MenuIcon name="menu-more-vertical-fill.svg" size={24} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={onAdd}
        className={clsx(
          "flex h-[42px] w-full items-center justify-center gap-3 rounded-[4px] border border-[#0D6EFD] p-2 text-[14px] font-semibold leading-[14px] text-[#0D6EFD] hover:brightness-95",
          SURFACE_BLUE
        )}
      >
        <MenuIcon name="menu-plus-line.svg" size={24} />
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
