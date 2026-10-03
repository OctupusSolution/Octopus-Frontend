// The section row's kebab: Edit / Archived (or Restore) / Delete.
//
// Same anchored-popover shape as the library card's actions menu, and anchored
// for the same reason — a centred sheet over a list of six near-identical rows
// loses which row you were on. The built-in offers section offers no Delete.
import { useEffect, useRef } from "react";
import clsx from "clsx";
import { OFFERS_SECTION_ID, type Section } from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";

export type SectionAction = "edit" | "archive" | "restore" | "delete";

const MENU_WIDTH = 200;
const ROW_HEIGHT = 44;
const ROW_GAP = 6;
const PADDING = 8;
const GAP = 6;
const VIEWPORT_MARGIN = 8;

export function SectionRowMenu({
  section,
  anchor,
  onClose,
  onPick,
}: {
  section: Section | null;
  anchor: DOMRect | null;
  onClose: () => void;
  onPick: (action: SectionAction) => void;
}) {
  const { t, dir } = useI18n();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!section) return;
    function onDocClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onClose, true);
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("resize", onClose);
    };
  }, [section, onClose]);

  if (!section || !anchor) return null;

  // An archived row swaps Archived for Restore; archiving it twice means nothing.
  const actions: SectionAction[] = [
    "edit",
    section.visibility === "archived" ? "restore" : "archive",
    ...(section.id === OFFERS_SECTION_ID ? [] : (["delete"] as const)),
  ];

  const height = actions.length * ROW_HEIGHT + (actions.length - 1) * ROW_GAP + PADDING * 2;
  const below = anchor.bottom + GAP;
  const flip = below + height > window.innerHeight - VIEWPORT_MARGIN;
  const top = flip ? Math.max(VIEWPORT_MARGIN, anchor.top - GAP - height) : below;

  const rawLeft = dir === "rtl" ? anchor.left : anchor.right - MENU_WIDTH;
  const left = Math.min(
    Math.max(VIEWPORT_MARGIN, rawLeft),
    window.innerWidth - MENU_WIDTH - VIEWPORT_MARGIN
  );

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={section.name}
      style={{ top, left, width: MENU_WIDTH }}
      className="fixed z-50 flex flex-col gap-1.5 rounded-[12px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-2 shadow-lg"
    >
      {actions.map((action) => (
        <button
          key={action}
          type="button"
          role="menuitem"
          onClick={() => onPick(action)}
          className={clsx(
            "block h-11 w-full rounded-[8px] px-3 text-start text-[15px]",
            action === "delete"
              ? "bg-error/10 text-error hover:bg-error/15"
              : "bg-[var(--octo-selected)] text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]"
          )}
        >
          {t(`menuWiz.sec.action.${action}`)}
        </button>
      ))}
    </div>
  );
}
