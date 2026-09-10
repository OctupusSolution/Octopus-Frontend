// The section row's kebab: Edit / Archived / Delete.
//
// Same anchored-popover shape as the library card's actions menu, and anchored
// for the same reason — a centred sheet over a list of six near-identical rows
// loses which row you were on. The built-in offers section offers no Delete.
import { useEffect, useRef } from "react";
import { OFFERS_SECTION_ID, type Section } from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";

export type SectionAction = "edit" | "archive" | "delete";

const MENU_WIDTH = 200;
const ROW_HEIGHT = 46;
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

  const actions: SectionAction[] =
    section.id === OFFERS_SECTION_ID ? ["edit", "archive"] : ["edit", "archive", "delete"];

  const height = actions.length * ROW_HEIGHT;
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
      className="fixed z-50 overflow-hidden rounded-[12px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] shadow-lg"
    >
      {actions.map((action) => (
        <button
          key={action}
          type="button"
          role="menuitem"
          onClick={() => onPick(action)}
          className={`block w-full border-b border-[var(--octo-border-card)] px-4 py-3 text-start text-[14px] last:border-b-0 hover:bg-[var(--octo-hover)] ${
            action === "delete"
              ? "text-error hover:bg-error/10"
              : "text-[var(--octo-text-primary)]"
          }`}
        >
          {t(`menuWiz.sec.action.${action}`)}
        </button>
      ))}
    </div>
  );
}
