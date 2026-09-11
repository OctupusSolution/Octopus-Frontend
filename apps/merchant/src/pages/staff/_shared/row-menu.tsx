import { MoreVertical } from "lucide-react";
import clsx from "clsx";
import { useDismiss } from "./use-dismiss";

export interface RowMenuItem {
  key: string;
  label: string;
  onSelect: () => void;
  tone?: "default" | "warning" | "danger";
}

const TONE_CLASSES: Record<NonNullable<RowMenuItem["tone"]>, string> = {
  default: "text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]",
  warning: "text-[#B54708] hover:bg-[#FFFAEB]",
  danger: "text-[#EF4444] hover:bg-[#FEF2F2]",
};

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

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={(e) => {
          e.stopPropagation();
          onOpenChange(!open);
        }}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-[7px] text-[var(--octo-text-muted)] transition-colors hover:bg-[var(--octo-hover)]"
      >
        <MoreVertical size={15} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute end-0 z-20 mt-1 w-48 rounded-[10px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-1 shadow-lg"
        >
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                item.onSelect();
                onOpenChange(false);
              }}
              className={clsx(
                "flex w-full items-center rounded-[9px] px-2.5 py-1.5 text-start text-[12px] transition-colors",
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
