"use client";

import { useEffect, type ReactNode } from "react";
import clsx from "clsx";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  /** Overrides the scrim. Console dialogs keep the default light wash; the
   *  auth screens sit on a photograph-like page and need a much darker one. */
  backdropClassName?: string;
}

export function Modal({ open, onClose, title, children, footer, className, backdropClassName }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={clsx("fixed inset-0 z-50 flex items-center justify-center p-4", backdropClassName ?? "bg-black/30")}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        onClick={(event) => event.stopPropagation()}
        className={clsx("w-full max-w-lg rounded-xl bg-[var(--octo-card)] p-5 shadow-xl", className)}
      >
        {title && (
          <h2 className="text-[15px] font-semibold text-[var(--octo-text-primary)]">{title}</h2>
        )}
        <div className={clsx(title && "mt-3")}>{children}</div>
        {footer && <div className="mt-5 flex items-center justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
