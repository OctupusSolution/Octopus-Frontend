// A generic drag-and-keyboard reorder list. The drag mechanics are lifted
// verbatim from `pages/onboarding/steps/public-link-sections.tsx`, which
// proved them against real browser behaviour; several steps of this builder
// need the same reordering, so it lives once here rather than as repeated
// near-identical copies.
//
// `renderRow` gets handed the grip as its third argument instead of this
// component drawing it inline, because the Pages step needs the grip sitting
// in its own `<td>` beside plain table cells — a `<table>` with `<th
// scope="col">` headers is what that step's row of toggles needs to stay
// labelled, and a flex div wrapping <td>s is not valid HTML.
import { useState, type ReactNode } from "react";
import { GripVertical } from "lucide-react";
import clsx from "clsx";
import { useI18n } from "@/app/providers/i18n-provider";

export interface ReorderListProps<T> {
  items: readonly T[];
  getId: (item: T) => string;
  onReorder: (next: T[]) => void;
  renderRow: (item: T, index: number, grip: ReactNode) => ReactNode;
  /** Optional per-item name folded into the grip's accessible name, so
   *  "Move up / Move down" says whose row it moves. */
  getLabel?: (item: T) => string;
  className?: string;
  /** "list" (default) renders a plain `<ul>`/`<li>`. "table" renders a
   *  `<tbody>`/`<tr>` so the caller can lay out real `<td>` cells. */
  as?: "list" | "table";
}

function move<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function ReorderList<T>({ items, getId, onReorder, renderRow, getLabel, className, as = "list" }: ReorderListProps<T>) {
  const { t } = useI18n();

  // The id being dragged. Held in React state rather than read back out of
  // `dataTransfer`, because dataTransfer's contents are unreadable during
  // dragover in every browser — and dragover is exactly where a drop target
  // has to decide whether it wants this particular drag at all.
  const [dragging, setDragging] = useState<string | null>(null);

  function moveTo(id: string, to: number) {
    const from = items.findIndex((item) => getId(item) === id);
    if (from === -1 || to < 0 || to >= items.length || to === from) return;
    onReorder(move(items, from, to));
  }

  function startDrag(event: React.DragEvent, id: string) {
    setDragging(id);
    event.dataTransfer.effectAllowed = "move";
    // Firefox refuses to start a drag at all unless some data is set.
    event.dataTransfer.setData("text/plain", id);
  }

  const rows = items.map((item, index) => {
    const id = getId(item);
    const moveLabel = getLabel ? `${getLabel(item)} — ${t("publicLink.reorder.move")}` : t("publicLink.reorder.move");

    // The drag affordance from the design, and the keyboard one: a real
    // button so it can be focused and driven with Arrow Up/Down — a drag is
    // unusable from a keyboard and on a touch screen where a drag never
    // starts.
    const grip = (
      <button
        type="button"
        aria-label={moveLabel}
        onKeyDown={(e) => {
          if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
          e.preventDefault();
          moveTo(id, index + (e.key === "ArrowUp" ? -1 : 1));
        }}
        className="shrink-0 cursor-grab rounded p-0.5 text-[var(--octo-text-faint)] transition-colors hover:text-[var(--octo-text-secondary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40 active:cursor-grabbing"
      >
        <GripVertical size={13} />
      </button>
    );

    const dragProps = {
      draggable: true,
      onDragStart: (e: React.DragEvent) => startDrag(e, id),
      onDragEnd: () => setDragging(null),
      onDragOver: (e: React.DragEvent) => {
        if (dragging && dragging !== id) e.preventDefault();
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!dragging || dragging === id) return;
        moveTo(dragging, index);
        setDragging(null);
      },
    };

    return { id, dragProps, content: renderRow(item, index, grip), dimmed: dragging === id };
  });

  if (as === "table") {
    return (
      <tbody className={className}>
        {rows.map((row) => (
          <tr key={row.id} {...row.dragProps} className={clsx("transition-opacity", row.dimmed && "opacity-40")}>
            {row.content}
          </tr>
        ))}
      </tbody>
    );
  }

  return (
    <ul className={clsx("flex flex-col gap-1.5", className)}>
      {rows.map((row) => (
        <li key={row.id} {...row.dragProps} className={clsx("flex items-center gap-2 transition-opacity", row.dimmed && "opacity-40")}>
          {row.content}
        </li>
      ))}
    </ul>
  );
}
