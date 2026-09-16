// apps/merchant/src/pages/orders-list/_shared/result-modal.tsx
import type { ReactNode } from "react";
import { Modal } from "@ui/primitives";

export function ResultModal({
  open,
  onClose,
  icon,
  title,
  subtitle,
  noteLines,
  noteClassName,
  noteIcon,
  primaryLabel,
  onPrimary,
}: {
  open: boolean;
  onClose: () => void;
  /** Cancel/Void/Wastage results show no icon in any mockup frame — only
   *  the Refund flow's terminal screens (Cash Recorded / Processing /
   *  Successful / Failed) have one. */
  icon?: ReactNode;
  title: string;
  subtitle: string;
  noteLines: readonly string[];
  noteClassName: string;
  /** A small leading glyph inside the note box — only the Refund flow's
   *  audit-line boxes (pending/success/cash-recorded) show one in the
   *  mockups; Cancel/Void/Wastage's note boxes never do. */
  noteIcon?: ReactNode;
  /** Omitted on the refund flow's success screens, which the frames close
   *  by dismissing the modal rather than with a button of their own. */
  primaryLabel?: string;
  onPrimary?: () => void;
}) {
  if (!open) return null;

  return (
    <Modal open onClose={onClose} className="max-w-[720px] text-center">
      {icon && <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center">{icon}</div>}
      <h2 className="text-[22px] font-bold text-[var(--octo-text-primary)]">{title}</h2>
      <p className="mt-2 text-[14px] text-[var(--octo-text-secondary)]">{subtitle}</p>

      {noteLines.length > 0 && (
        <div className={`mt-5 flex items-start gap-2 rounded-[10px] p-3.5 text-start text-[13.5px] ${noteClassName}`}>
          {noteIcon && <span className="mt-px shrink-0">{noteIcon}</span>}
          <div className="flex flex-col gap-0.5">
            {noteLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>
      )}

      {primaryLabel && onPrimary && (
        <button
          type="button"
          onClick={onPrimary}
          className="mt-6 w-full rounded-[10px] bg-[#0D6EFD] py-3.5 text-[15px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          {primaryLabel}
        </button>
      )}
    </Modal>
  );
}
