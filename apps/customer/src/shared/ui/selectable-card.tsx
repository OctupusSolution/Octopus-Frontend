"use client";

import type { ReactNode } from "react";

export interface SelectableCardProps {
  children: ReactNode;
  /** Given, the card becomes a button. Without it it is a plain container —
   *  the tip and table panels use the same frame without being clickable. */
  onClick?: () => void;
  className?: string;
}

// The dashed blue frame shared by every choice surface in the fulfillment flow.
const FRAME =
  "rounded-[24px] border-4 border-dashed border-[var(--octo-store-select-border)] bg-[var(--octo-store-select)]";

export function SelectableCard({ children, onClick, className = "" }: SelectableCardProps) {
  if (!onClick) return <div className={`${FRAME} ${className}`}>{children}</div>;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${FRAME} text-start transition-colors hover:border-[var(--color-ocean-blue)] ${className}`}
    >
      {children}
    </button>
  );
}
