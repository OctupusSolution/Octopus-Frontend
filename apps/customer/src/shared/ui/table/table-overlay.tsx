"use client";

import { useEffect, type ReactNode } from "react";

interface OverlayProps {
  open: boolean;
  /** Omitted when the overlay must be answered rather than dismissed. */
  onClose?: () => void;
  label: string;
  /** The pickup frames lay their overlays on a deeper scrim than the table ones. */
  dim?: boolean;
  children: ReactNode;
}

const scrim = (dim?: boolean): string => `absolute inset-0 ${dim ? "bg-black/60" : "bg-black/30"}`;

function useOverlay(open: boolean, onClose?: () => void) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
}

/** A panel rising from the bottom edge: the filter, bill and tip choices. */
export function TableSheet({ open, onClose, label, dim, children }: OverlayProps) {
  useOverlay(open, onClose);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className={scrim(dim)} aria-hidden="true" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="relative max-h-[calc(100dvh-24px)] w-full max-w-[480px] overflow-y-auto rounded-t-[24px] bg-white p-4"
      >
        {children}
      </div>
    </div>
  );
}

/** A centred card over the page: the payment confirmations. */
export function TableModal({ open, onClose, label, dim, children }: OverlayProps) {
  useOverlay(open, onClose);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <div className={scrim(dim)} aria-hidden="true" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="relative max-h-full w-full max-w-[448px] overflow-y-auto rounded-[32px] bg-white p-3"
      >
        {children}
      </div>
    </div>
  );
}
