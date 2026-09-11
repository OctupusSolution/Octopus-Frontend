// The card kebab. Held menus offer Resume where active ones offer Hold — the
// same slot, because they are the same decision in two directions.
//
// Anchored to the button that opened it, not centred on the screen: the frame
// draws it hanging off its own card's kebab, and a centred sheet loses the one
// thing the merchant needs to know — which of nine identical-looking cards they
// are about to archive.
import { useEffect, useRef } from "react";
import type { Menu } from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";
import type { CardAction } from "./menu-card";

const MENU_WIDTH = 180;
const ROW_HEIGHT = 48;
const GAP = 6;
const VIEWPORT_MARGIN = 8;

export function ActionsMenu({
  menu,
  anchor,
  onClose,
  onPick,
}: {
  menu: Menu | null;
  anchor: DOMRect | null;
  onClose: () => void;
  onPick: (action: CardAction) => void;
}) {
  const { t, dir } = useI18n();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    function onDocClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    // Scrolling would leave the popover behind, pinned to coordinates its
    // card no longer occupies. Closing is truer than chasing.
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
  }, [menu, onClose]);

  if (!menu || !anchor) return null;

  const held = menu.status === "on-hold";
  const actions: CardAction[] = [
    "edit",
    "schedule",
    held ? "resume" : "hold",
    "duplicate",
    "archive",
    "delete",
  ];

  // Flip above the button when there is not enough room below it, so the last
  // row is never the one cut off by the viewport.
  const height = actions.length * ROW_HEIGHT + 8;
  const below = anchor.bottom + GAP;
  const flip = below + height > window.innerHeight - VIEWPORT_MARGIN;
  const top = flip ? Math.max(VIEWPORT_MARGIN, anchor.top - GAP - height) : below;

  // The menu hangs from the kebab's outer edge, which mirrors with the page.
  const rawLeft = dir === "rtl" ? anchor.left : anchor.right - MENU_WIDTH;
  const left = Math.min(
    Math.max(VIEWPORT_MARGIN, rawLeft),
    window.innerWidth - MENU_WIDTH - VIEWPORT_MARGIN
  );

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={menu.name}
      style={{ top, left, width: MENU_WIDTH }}
      className="fixed z-50 space-y-2 rounded-[12px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-2 shadow-lg"
    >
      {/* Each choice is its own soft tile, as the frame draws them — no
          dividers, and Delete on a red wash so it never reads as a sibling. */}
      {actions.map((action) => (
        <button
          key={action}
          type="button"
          role="menuitem"
          onClick={() => onPick(action)}
          className={`block h-10 w-full rounded-[8px] px-3 text-start text-[14px] ${
            action === "delete"
              ? "bg-error/10 text-error hover:bg-error/20"
              : "bg-[var(--octo-hover)] text-[var(--octo-text-primary)] hover:bg-[var(--octo-selected)]"
          }`}
        >
          {t(`menuLib.action.${action}`)}
        </button>
      ))}
    </div>
  );
}
