// apps/merchant/src/pages/orders-list/_shared/result-modal.tsx
import { useState, type ReactNode } from "react";
import { Modal } from "@ui/primitives";
import { FLOW_BACKDROP_CLASS, FLOW_MODAL_CLASS, PrimaryButton } from "./form-bits";

const STAMP_ART_URL = new URL("../../../../../assets/login/stamp.gif", import.meta.url).href;

/** The 218px stamp the Cancel / Void / Wastage result frames open with. It is
 *  a play-once GIF, and a finished GIF stays finished for its URL — so each
 *  mount gets a fresh query and the stamp animates every time a result shows. */
export function StampArt() {
  const [play] = useState(() => Date.now());
  return <img src={`${STAMP_ART_URL}?play=${play}`} alt="" width={218} height={218} className="h-[218px] w-[218px] max-w-full object-cover" />;
}

export function ResultModal({
  open,
  onClose,
  icon,
  artwork,
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
  /** A small (80px) glyph above the title — the Refund flow's terminal
   *  screens (Cash Recorded / Processing / Successful / Failed). */
  icon?: ReactNode;
  /** Full-size artwork that sits flush above the title — the stamp on the
   *  Cancel / Void / Wastage result frames (see `StampArt`). */
  artwork?: ReactNode;
  title: string;
  subtitle: string;
  noteLines: readonly string[];
  noteClassName: string;
  /** A small leading glyph inside the note box — only the Refund flow's
   *  audit-line boxes (pending/success/cash-recorded) show one in the
   *  mockups. */
  noteIcon?: ReactNode;
  /** Omitted on the refund flow's success screens, which the frames close
   *  by dismissing the modal rather than with a button of their own. */
  primaryLabel?: string;
  onPrimary?: () => void;
}) {
  if (!open) return null;

  return (
    <Modal open onClose={onClose} className={`${FLOW_MODAL_CLASS} text-center`} backdropClassName={FLOW_BACKDROP_CLASS}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center">
          {artwork}
          {icon && <div className="mb-5 flex h-20 w-20 items-center justify-center">{icon}</div>}
          <h2 className="w-full text-[24px] font-semibold leading-6 text-[var(--octo-text-primary)]">{title}</h2>
          <p className="-mb-0.5 mt-2.5 w-full text-[14px] font-medium leading-[18px] text-[var(--octo-text-secondary)]">{subtitle}</p>

          {noteLines.length > 0 && (
            <div className={`mt-4 flex w-full items-start gap-2 rounded-[8px] p-3 text-start text-[14px] leading-[1.4] ${noteClassName}`}>
              {noteIcon && <span className="mt-px shrink-0">{noteIcon}</span>}
              <div className="flex flex-col gap-0.5">
                {noteLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </div>
          )}
        </div>

        {primaryLabel && onPrimary && <PrimaryButton label={primaryLabel} onClick={onPrimary} />}
      </div>
    </Modal>
  );
}
