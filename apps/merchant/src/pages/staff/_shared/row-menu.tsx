import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { MoreVertical } from "lucide-react";
import clsx from "clsx";
import { useDismiss } from "./use-dismiss";

export interface RowMenuItem {
  key: string;
  label: string;
  onSelect: () => void;
  tone?: "default" | "warning" | "danger";
}

// Menu items are tinted pills, per the Staff designs: neutral actions sit on the
// selection tint, Deactivate on the warning tint, Delete on the danger tint.
const TONE_CLASSES: Record<NonNullable<RowMenuItem["tone"]>, string> = {
  default: "bg-[var(--octo-selected)] text-[var(--octo-text-primary)]",
  warning: "bg-[var(--octo-tone-warning-bg)] text-[var(--octo-tone-warning-text)]",
  danger: "bg-[var(--octo-tone-danger-bg)] text-[var(--octo-tone-danger-text)]",
};

const GAP = 4;
const ESTIMATED_ITEM_HEIGHT = 42;

export function RowMenu({
  items,
  open,
  onOpenChange,
  ariaLabel,
}: {
  items: RowMenuItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ariaLabel: string;
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
    const height = items.length * ESTIMATED_ITEM_HEIGHT + 16;
    const below = rect.bottom + GAP + height <= window.innerHeight;
    setStyle({
      position: "fixed",
      ...(below ? { top: rect.bottom + GAP } : { bottom: window.innerHeight - rect.top + GAP }),
      ...(rtl ? { left: rect.left } : { right: window.innerWidth - rect.right }),
    });
  }, [open, items.length]);

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
    <div ref={ref} className="relative shrink-0">
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
        className={clsx(
          "grid h-7 w-7 place-items-center rounded-[7px] text-[var(--octo-text-primary)] transition-colors hover:bg-[var(--octo-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40",
          open && "bg-[var(--octo-hover)]"
        )}
      >
        <MoreVertical size={16} />
      </button>

      {open && (
        <div
          role="menu"
          style={style}
          onClick={(e) => e.stopPropagation()}
          className="z-50 flex min-w-[176px] flex-col gap-1.5 rounded-[12px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-2 shadow-[0_12px_32px_rgba(16,24,40,0.16)]"
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
                "flex w-full items-center whitespace-nowrap rounded-[8px] px-3 py-2 text-start text-[14px] font-medium transition-[filter] hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40",
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
