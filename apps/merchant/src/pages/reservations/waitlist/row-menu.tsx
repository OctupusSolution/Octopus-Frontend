import { useLayoutEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";
import { useI18n } from "@/app/providers/i18n-provider";
import { useDismiss } from "@/pages/reservations/_shared/use-dismiss";

const ITEM =
  "flex w-full items-center rounded-md bg-[color-mix(in_srgb,#0D6EFD_4%,var(--octo-card))] px-2.5 py-2 text-start text-[14px] text-[var(--octo-text-primary)] transition-colors hover:bg-[var(--octo-tone-info-bg)] disabled:cursor-not-allowed disabled:opacity-45";
const MENU_W = 150;
const MENU_H = 150;

export function WaitlistRowMenu({
  open,
  onOpenChange,
  onEdit,
  onMoveUp,
  onViewHistory,
  canEdit,
  canMoveUp,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onMoveUp: () => void;
  onViewHistory: () => void;
  canEdit: boolean;
  canMoveUp: boolean;
}) {
  const { t, dir } = useI18n();
  const ref = useDismiss(open, () => onOpenChange(false));
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  // The table scrolls sideways, which would clip an absolutely placed menu,
  // so it is pinned to the viewport and flips above the button near the bottom.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const below = rect.bottom + 8;
      const top = below + MENU_H > window.innerHeight ? rect.top - 8 - MENU_H : below;
      const left = dir === "rtl" ? rect.left : rect.right - MENU_W;
      setPos({ top, left: Math.max(8, Math.min(left, window.innerWidth - MENU_W - 8)) });
    };
    place();
    const close = () => onOpenChangeRef.current(false);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open, dir]);

  const run = (action: () => void) => () => {
    onOpenChange(false);
    action();
  };

  return (
    <div ref={ref} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("waitlist.action.more")}
        title={t("waitlist.action.more")}
        onClick={() => onOpenChange(!open)}
        className="grid h-8 w-10 place-items-center rounded-lg bg-[var(--octo-track)] text-[var(--octo-text-primary)] transition-colors hover:bg-[var(--octo-border-input)]"
      >
        <MoreVertical size={17} />
      </button>
      {open && pos && (
        <div
          role="menu"
          style={{ top: pos.top, left: pos.left, width: MENU_W }}
          className="fixed z-50 flex flex-col gap-2 rounded-2xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-2.5 shadow-[0_10px_30px_rgba(15,23,42,0.16)]"
        >
          <button type="button" role="menuitem" disabled={!canEdit} onClick={run(onEdit)} className={ITEM}>
            {t("waitlist.action.edit")}
          </button>
          <button type="button" role="menuitem" disabled={!canMoveUp} onClick={run(onMoveUp)} className={ITEM}>
            {t("waitlist.action.moveUp")}
          </button>
          <button type="button" role="menuitem" onClick={run(onViewHistory)} className={ITEM}>
            {t("waitlist.action.viewHistory")}
          </button>
        </div>
      )}
    </div>
  );
}
