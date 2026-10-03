import { useLayoutEffect, useRef, useState } from "react";
import { useI18n } from "@/app/providers/i18n-provider";
import { useDismiss } from "@/pages/reservations/_shared/use-dismiss";
import { WaitlistIcon } from "./_shared/waitlist-icon";

const ITEM =
  "flex h-8 w-full items-center rounded-[4px] bg-[#F5F9FF] px-2 py-1 text-start text-[14px] font-medium leading-[14px] text-[#0F172A] transition-colors hover:bg-[#E6F0FF] disabled:cursor-not-allowed disabled:opacity-45 [[data-theme=dark]_&]:bg-[color-mix(in_srgb,#0D6EFD_8%,var(--octo-card))] [[data-theme=dark]_&]:text-[var(--octo-text-primary)] [[data-theme=dark]_&]:hover:bg-[var(--octo-tone-info-bg)]";
// The frame's popover: 146 wide, 12px padding, 32px rows 8px apart.
const MENU_W = 146;
const MENU_H = 136;
const ITEM_H = 40;

export function WaitlistRowMenu({
  open,
  onOpenChange,
  onEdit,
  onMoveUp,
  onViewHistory,
  canEdit,
  canMoveUp,
  extraItems = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onMoveUp: () => void;
  onViewHistory: () => void;
  canEdit: boolean;
  canMoveUp: boolean;
  /** Status-dependent actions (revert ready, reinstate), shown only when given. */
  extraItems?: readonly { label: string; onSelect: () => void }[];
}) {
  const { t, dir } = useI18n();
  const menuH = MENU_H + extraItems.length * ITEM_H;
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
      const top = below + menuH > window.innerHeight ? rect.top - 8 - menuH : below;
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
  }, [open, dir, menuH]);

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
        className="grid h-8 w-10 place-items-center rounded-[8px] bg-[#F2F2F2] text-[#0F172A] transition-colors hover:bg-[#E6E6E6] [[data-theme=dark]_&]:bg-[var(--octo-track)] [[data-theme=dark]_&]:text-[var(--octo-text-primary)] [[data-theme=dark]_&]:hover:bg-[var(--octo-border-input)]"
      >
        <WaitlistIcon name="more.svg" />
      </button>
      {open && pos && (
        <div
          role="menu"
          style={{ top: pos.top, left: pos.left, width: MENU_W }}
          className="fixed z-50 flex flex-col gap-2 rounded-[16px] bg-white p-3 shadow-[0px_0px_12px_0px_rgba(0,0,0,0.12)] [[data-theme=dark]_&]:bg-[var(--octo-card)]"
        >
          <button type="button" role="menuitem" disabled={!canEdit} onClick={run(onEdit)} className={ITEM}>
            {t("waitlist.action.edit")}
          </button>
          <button type="button" role="menuitem" disabled={!canMoveUp} onClick={run(onMoveUp)} className={ITEM}>
            {t("waitlist.action.moveUp")}
          </button>
          {extraItems.map((item) => (
            <button key={item.label} type="button" role="menuitem" onClick={run(item.onSelect)} className={ITEM}>
              {item.label}
            </button>
          ))}
          <button type="button" role="menuitem" onClick={run(onViewHistory)} className={ITEM}>
            {t("waitlist.action.viewHistory")}
          </button>
        </div>
      )}
    </div>
  );
}
