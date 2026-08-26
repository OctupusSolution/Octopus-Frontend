// The "Customize your public link" card at the bottom of step 8: which sections
// the public page shows, and in what order.
//
// `publicLink.sections` has always documented itself as "section ids in display
// order", but nothing could change that order and nothing read it, so the field
// was inert and the list beside it was a picture of a control. Both halves are
// wired up here: the list reorders, and public-link-step.tsx renders the preview
// from this array, so a section moved here moves in the preview immediately.
//
// Dragging is the affordance the design shows; it is not the only one. A drag is
// unusable from a keyboard, so the grip on each row is a real button — focus it
// and Arrow Up/Down move the section, which is also what a merchant on a touch
// screen gets when a drag does not start.
import { useState } from "react";
import { GripVertical, Plus, X } from "lucide-react";
import clsx from "clsx";
import { useI18n } from "@/app/providers/i18n-provider";
import type { StepProps } from "../_shared/steps";

/** Every section the public page can show, in the order they are offered back
 *  to a merchant who has removed one. `publicLink.sections` is a subset of
 *  these, in the merchant's own order. */
export const SECTION_IDS = ["hero", "offers", "menu", "bestSeller"] as const;

export const SECTION_LABELS: Record<string, string> = {
  hero: "onboarding.publicLink.section.hero",
  offers: "onboarding.publicLink.section.offers",
  menu: "onboarding.publicLink.section.menu",
  bestSeller: "onboarding.publicLink.section.bestSeller",
};

/** A draft written before an id was added — or after one was retired — can hold
 *  a section this build has no label for. Showing the raw id is ugly but honest,
 *  and beats rendering an empty row. */
export function sectionLabelKey(id: string): string {
  return SECTION_LABELS[id] ?? id;
}

function move(list: readonly string[], from: number, to: number): string[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function PublicLinkSections({ draft, dispatch }: StepProps) {
  const { t } = useI18n();
  const { sections } = draft.publicLink;

  // The id being dragged. Held in React state rather than read back out of
  // `dataTransfer`, because dataTransfer's contents are unreadable during
  // dragover in every browser — and dragover is where the drop target has to
  // decide whether it wants this particular drag at all.
  const [dragging, setDragging] = useState<string | null>(null);

  const parked = SECTION_IDS.filter((id) => !sections.includes(id));

  function setSections(next: string[]) {
    dispatch({ type: "patchPublicLink", patch: { sections: next } });
  }

  function moveTo(id: string, to: number) {
    const from = sections.indexOf(id);
    if (from === -1 || to < 0 || to >= sections.length || to === from) return;
    setSections(move(sections, from, to));
  }

  function remove(id: string) {
    setSections(sections.filter((s) => s !== id));
  }

  function add(id: string) {
    if (sections.includes(id)) return;
    setSections([...sections, id]);
  }

  function startDrag(event: React.DragEvent, id: string) {
    setDragging(id);
    event.dataTransfer.effectAllowed = "move";
    // Firefox refuses to start a drag at all unless some data is set.
    event.dataTransfer.setData("text/plain", id);
  }

  return (
    <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
      <h3 className="text-[13px] font-bold text-[var(--octo-text-primary)]">{t("onboarding.publicLink.customize")}</h3>
      <p className="mt-1 text-[11.5px] text-[var(--octo-text-muted)]">{t("onboarding.publicLink.customizeNote")}</p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <ul
          className="flex flex-col gap-1.5"
          // Dropping a parked section anywhere on the list appends it; dropping
          // it on a row (handled below) puts it at that row's position instead.
          onDragOver={(e) => {
            if (dragging && !sections.includes(dragging)) e.preventDefault();
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (dragging && !sections.includes(dragging)) add(dragging);
            setDragging(null);
          }}
        >
          {sections.map((id, index) => (
            <li
              key={id}
              draggable
              onDragStart={(e) => startDrag(e, id)}
              onDragEnd={() => setDragging(null)}
              onDragOver={(e) => {
                if (dragging && dragging !== id) e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!dragging || dragging === id) return;
                // A parked section dropped on a row lands at that row's index;
                // an active one is moved there from wherever it was.
                setSections(
                  sections.includes(dragging)
                    ? move(sections, sections.indexOf(dragging), index)
                    : [...sections.slice(0, index), dragging, ...sections.slice(index)]
                );
                setDragging(null);
              }}
              className={clsx(
                "flex items-center gap-2 rounded-[9px] border border-[var(--octo-border-input)] px-3 py-2 text-[11.5px] text-[var(--octo-text-secondary)] transition-opacity",
                dragging === id && "opacity-40"
              )}
            >
              <span className="min-w-0 flex-1 truncate">{t(sectionLabelKey(id))}</span>

              <button
                type="button"
                onClick={() => remove(id)}
                aria-label={`${t(sectionLabelKey(id))} — ${t("onboarding.publicLink.removeSection")}`}
                className="shrink-0 rounded p-0.5 text-[var(--octo-text-faint)] transition-colors hover:text-[#EF4444] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40"
              >
                <X size={12} />
              </button>

              {/* The drag affordance from the design, and the keyboard one: the
                  same glyph, but a real button so it can be focused and driven
                  with Arrow Up/Down. */}
              <button
                type="button"
                aria-label={`${t(sectionLabelKey(id))} — ${t("onboarding.publicLink.moveUp")} / ${t("onboarding.publicLink.moveDown")}`}
                onKeyDown={(e) => {
                  if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
                  e.preventDefault();
                  moveTo(id, index + (e.key === "ArrowUp" ? -1 : 1));
                }}
                className="shrink-0 cursor-grab rounded p-0.5 text-[var(--octo-text-faint)] transition-colors hover:text-[var(--octo-text-secondary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40 active:cursor-grabbing"
              >
                <GripVertical size={13} />
              </button>
            </li>
          ))}

          {sections.length === 0 && (
            <li className="rounded-[9px] border border-dashed border-[var(--octo-border-input)] px-3 py-6 text-center text-[11px] text-[var(--octo-text-faint)]">
              {t("onboarding.publicLink.noSections")}
            </li>
          )}
        </ul>

        {/* Where a section goes when it is off the page. Empty in the default
            draft — which is the state the design shows — and it fills up only
            with sections the merchant has actually removed. */}
        <div
          onDragOver={(e) => {
            if (dragging && sections.includes(dragging)) e.preventDefault();
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (dragging && sections.includes(dragging)) remove(dragging);
            setDragging(null);
          }}
          className={clsx(
            "flex min-h-[112px] flex-col items-center justify-center gap-2 rounded-[10px] border border-dashed p-3 transition-colors",
            dragging && sections.includes(dragging)
              ? "border-[#0D6EFD] bg-[#0D6EFD]/5"
              : "border-[var(--octo-border-input)]"
          )}
        >
          {parked.length === 0 ? (
            <>
              <Plus size={16} className="text-[var(--octo-text-faint)]" />
              <p className="text-center text-[11px] text-[var(--octo-text-faint)]">{t("onboarding.publicLink.dropHint")}</p>
            </>
          ) : (
            <ul className="flex w-full flex-wrap justify-center gap-1.5">
              {parked.map((id) => (
                <li key={id}>
                  <button
                    type="button"
                    draggable
                    onDragStart={(e) => startDrag(e, id)}
                    onDragEnd={() => setDragging(null)}
                    onClick={() => add(id)}
                    aria-label={`${t(sectionLabelKey(id))} — ${t("onboarding.publicLink.addSection")}`}
                    className={clsx(
                      "flex cursor-grab items-center gap-1 rounded-full border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-2.5 py-1 text-[11px] text-[var(--octo-text-secondary)] transition-colors hover:border-[#0D6EFD] hover:text-[#0D6EFD] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40 active:cursor-grabbing",
                      dragging === id && "opacity-40"
                    )}
                  >
                    <Plus size={11} className="shrink-0" />
                    {t(sectionLabelKey(id))}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
