import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import clsx from "clsx";
import { StaffIcon } from "./icon";
import { useDismiss } from "./use-dismiss";

export interface RowMenuItem {
  key: string;
  label: string;
  onSelect: () => void;
  tone?: "default" | "warning" | "danger";
}

// Menu items are tinted 32px slots, per the Staff frames: neutral actions sit
// on the pale blue, Deactivate on the amber tint, Delete on the red tint.
const TONE_CLASSES: Record<NonNullable<RowMenuItem["tone"]>, string> = {
  default: "bg-[#f5f9ff] text-[#0f172a] [[data-theme=dark]_&]:bg-[#0d6efd]/15 [[data-theme=dark]_&]:text-[var(--octo-text-primary)]",
  warning: "bg-[#fff5e4] text-[#f59e0b] [[data-theme=dark]_&]:bg-[#f59e0b]/15",
  danger: "bg-[#fef0f0] text-[#d30202] [[data-theme=dark]_&]:bg-[#d30202]/20 [[data-theme=dark]_&]:text-[#f87171]",
};

const GAP = 3;
// The frames hang the menu 12px past the trigger's outer edge, flush with the
// edge of the card the trigger sits in.
const OVERHANG = 12;
const ITEM_HEIGHT = 40;
const MENU_PADDING = 24;

export function RowMenu({
  items,
  open,
  onOpenChange,
  ariaLabel,
  iconSize = 16,
  align = "end",
}: {
  items: RowMenuItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ariaLabel: string;
  /** 16 on staff cards and schedule rows, 24 in the roles list. */
  iconSize?: 16 | 24;
  /** Which edge of the trigger the menu lines up with: "end" opens back over
   *  the card, "start" opens away from a trigger at the start of a row. */
  align?: "start" | "end";
}) {
  const ref = useDismiss(open, () => onOpenChange(false));
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [style, setStyle] = useState<CSSProperties>({});

  // The menu is `position: fixed` so it escapes the scrolling schedule table
  // and card grids that would otherwise clip it; it flips above the trigger
  // when there's no room below.
  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const rtl = document.documentElement.dir === "rtl";
    const height = items.length * ITEM_HEIGHT - 8 + MENU_PADDING;
    const below = rect.bottom + GAP + height <= window.innerHeight;
    const anchorRight = (align === "end") !== rtl;
    setStyle({
      position: "fixed",
      ...(below ? { top: rect.bottom + GAP } : { bottom: window.innerHeight - rect.top + GAP }),
      ...(anchorRight
        ? { right: Math.max(8, window.innerWidth - rect.right - OVERHANG) }
        : { left: Math.max(8, rect.left - OVERHANG) }),
    });
  }, [open, items.length, align]);

  useEffect(() => {
    if (!open) return;
    const close = () => onOpenChange(false);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open, onOpenChange]);

  return (
    <div ref={ref} className="relative flex shrink-0">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={(e) => {
          e.stopPropagation();
          onOpenChange(!open);
        }}
        onKeyDown={(e) => e.stopPropagation()}
        className="grid place-items-center rounded-[4px] text-black transition-colors hover:bg-[var(--octo-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40 [[data-theme=dark]_&]:text-[var(--octo-text-primary)]"
      >
        <StaffIcon name={iconSize === 24 ? "crm-more.svg" : "staff-more.svg"} size={iconSize} />
      </button>

      {open && (
        <div
          role="menu"
          style={style}
          onClick={(e) => e.stopPropagation()}
          className="z-50 flex flex-col gap-2 rounded-[16px] bg-[var(--octo-card)] p-3 shadow-[0px_0px_12px_0px_rgba(0,0,0,0.12)] [[data-theme=dark]_&]:border [[data-theme=dark]_&]:border-[var(--octo-border-card)]"
        >
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                onOpenChange(false);
                item.onSelect();
              }}
              className={clsx(
                "flex h-8 w-full items-center whitespace-nowrap rounded-[4px] px-2 text-start text-[14px] font-medium leading-[14px] transition-[filter] hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40",
                TONE_CLASSES[item.tone ?? "default"]
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
