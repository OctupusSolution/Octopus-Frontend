// "Build Your Sections" — the step's start column.
//
// Reordering is native HTML5 drag and drop rather than a library: the list is
// short, the rows are large, and the whole interaction is four handlers. The
// offers row is exempt — it is part of the menu's shape, so it neither drags
// nor offers Delete.
import { useState } from "react";
import clsx from "clsx";
import { Eye, EyeOff, GripVertical, MoreVertical, Plus } from "lucide-react";
import { OFFERS_SECTION_ID, type Section } from "@/entities/menu";
import { MediaTile } from "@/shared/ui/media-tile";
import { useI18n } from "@/app/providers/i18n-provider";
import { SectionRowMenu } from "./section-row-menu";

export function SectionList({
  sections,
  selectedId,
  onSelect,
  onToggleVisibility,
  onReorder,
  onAdd,
  onEdit,
  onArchive,
  onDelete,
}: {
  sections: Section[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onReorder: (from: number, to: number) => void;
  onAdd: () => void;
  onEdit: (section: Section) => void;
  onArchive: (section: Section) => void;
  onDelete: (section: Section) => void;
}) {
  const { t } = useI18n();
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [menuFor, setMenuFor] = useState<{ section: Section; anchor: DOMRect } | null>(null);

  return (
    <section className="rounded-[14px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
      <h2 className="text-[16px] font-semibold text-[var(--octo-text-primary)]">
        {t("menuWiz.sec.buildTitle")}
      </h2>
      <p className="mt-1 text-[13px] text-[var(--octo-text-secondary)]">
        {t("menuWiz.sec.buildHint")}
      </p>

      <ul className="mt-3 divide-y divide-[var(--octo-border-card)] border-y border-[var(--octo-border-card)]">
        {sections.map((section, index) => {
          const fixed = section.id === OFFERS_SECTION_ID;
          const visible = section.visibility === "visible";

          return (
            <li
              key={section.id}
              draggable={!fixed}
              onDragStart={() => setDragFrom(index)}
              onDragOver={(e) => {
                if (dragFrom !== null && !fixed) e.preventDefault();
              }}
              onDrop={() => {
                if (dragFrom !== null && dragFrom !== index && !fixed) onReorder(dragFrom, index);
                setDragFrom(null);
              }}
              onDragEnd={() => setDragFrom(null)}
              className={clsx(
                "flex items-center gap-2.5 px-1 py-2.5",
                selectedId === section.id && "bg-[var(--octo-selected)]"
              )}
            >
              <span
                className={clsx(
                  "text-[var(--octo-text-faint)]",
                  fixed ? "opacity-0" : "cursor-grab"
                )}
                aria-hidden
              >
                <GripVertical size={16} />
              </span>

              <button
                type="button"
                onClick={() => onSelect(section.id)}
                className="flex min-w-0 flex-1 items-center gap-2.5 text-start"
              >
                <span className="h-12 w-12 shrink-0 overflow-hidden rounded-[8px]">
                  <MediaTile src={section.image} rounded="rounded-[8px]" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-medium text-[var(--octo-text-primary)]">
                    {section.name}
                  </span>
                  <span className="block text-[12.5px] text-[var(--octo-text-secondary)]">
                    {t("menuWiz.sec.itemCount").replace("{n}", String(section.entries.length))}
                  </span>
                </span>
              </button>

              <button
                type="button"
                aria-label={section.name}
                aria-pressed={visible}
                onClick={() => onToggleVisibility(section.id)}
                className="shrink-0 rounded-[8px] p-1.5 text-[var(--octo-accent)] hover:bg-[var(--octo-hover)]"
              >
                {visible ? <Eye size={17} /> : <EyeOff size={17} />}
              </button>

              <button
                type="button"
                aria-label={`${section.name} actions`}
                onClick={(e) =>
                  setMenuFor({ section, anchor: e.currentTarget.getBoundingClientRect() })
                }
                className="shrink-0 rounded-[8px] p-1.5 text-[var(--octo-text-secondary)] hover:bg-[var(--octo-hover)]"
              >
                <MoreVertical size={17} />
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={onAdd}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-[10px] border border-dashed border-[var(--octo-accent)] bg-[var(--octo-selected)] px-3 py-2.5 text-[14px] font-medium text-[var(--octo-accent)]"
      >
        <Plus size={16} aria-hidden />
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
          if (action === "delete") onDelete(section);
        }}
      />
    </section>
  );
}
