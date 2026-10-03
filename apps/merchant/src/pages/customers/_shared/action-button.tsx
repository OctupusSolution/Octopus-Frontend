// apps/merchant/src/pages/customers/_shared/action-button.tsx
import type { ReactNode } from "react";
import clsx from "clsx";
import type { ActionTint } from "./theme";

/** Tinted (or neutral outlined, when `tint` is omitted) button with a
 *  leading icon — the one shape behind the row quick actions, the bulk bar
 *  and the detail page's action bar. */
export function ActionButton({
  icon,
  label,
  tint,
  onClick,
  size = "sm",
  className,
}: {
  icon: ReactNode;
  label: string;
  tint?: ActionTint;
  onClick: () => void;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "inline-flex shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-[8px] border text-[14px] font-medium leading-[14px] transition-[filter,background-color] hover:brightness-[0.97]",
        size === "md" ? "h-10 px-3" : "h-8 px-2",
        !tint &&
          "border-[#e2e8f0] bg-[var(--octo-card)] text-[var(--octo-text-secondary)] hover:bg-[var(--octo-hover)] [[data-theme=dark]_&]:border-[var(--octo-border-input)]",
        className
      )}
      style={tint ? { color: tint.text, backgroundColor: tint.bg, borderColor: tint.border } : undefined}
    >
      {icon}
      {label}
    </button>
  );
}

/** Title sizing for this module's modals — the frames use a ~22px bold
 *  heading, larger than the shared Modal's default 15px. */
export const CRM_MODAL_CLASS = "[&>h2]:text-[22px] [&>h2]:font-bold [&>h2]:leading-tight sm:p-6";
