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
}

export function Modal({ open, onClose, title, children, footer, className }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  // `max-w-lg` used to live in this base class list alongside every other
  // style, but Tailwind emits utilities in theme-key order (not source
  // order), so `.max-w-lg` always won the cascade over a narrower
  // caller-supplied class like `max-w-md` regardless of where it appeared
  // in the string. Only fall back to the default width when the caller
  // hasn't specified one of its own, so at most one `max-w-*` utility is
  // ever emitted for a given modal and there's no ordering conflict.
  const hasWidthClass = className?.includes("max-w-") ?? false;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        onClick={(event) => event.stopPropagation()}
        className={clsx("w-full rounded-xl bg-[var(--octo-card)] p-5 shadow-xl", !hasWidthClass && "max-w-lg", className)}
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
