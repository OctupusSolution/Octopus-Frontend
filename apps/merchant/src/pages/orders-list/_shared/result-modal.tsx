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
  primaryLabel: string;
  onPrimary: () => void;
}) {
  if (!open) return null;

  return (
    <Modal open onClose={onClose} className="max-w-md text-center">
      {icon && <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center">{icon}</div>}
      <h2 className="text-[19px] font-bold text-[var(--octo-text-primary)]">{title}</h2>
      <p className="mt-2 text-[13px] text-[var(--octo-text-secondary)]">{subtitle}</p>

      {noteLines.length > 0 && (
        <div className={`mt-4 flex items-start gap-1.5 rounded-[10px] p-3 text-start text-[12.5px] ${noteClassName}`}>
          {noteIcon && <span className="mt-px shrink-0">{noteIcon}</span>}
          <div>
            {noteLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onPrimary}
        className="mt-5 w-full rounded-[9px] bg-[#0D6EFD] py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
      >
        {primaryLabel}
      </button>
    </Modal>
  );
}
