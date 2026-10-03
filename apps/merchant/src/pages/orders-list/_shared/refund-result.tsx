// apps/merchant/src/pages/orders-list/_shared/refund-result.tsx
//
// The Refund flow's terminal screens (gateway spinner / processing /
// successful / failed / cash recorded). They share one layout the shared
// ResultModal cannot express: a 218px artwork, a toned one-line info bar with
// an optional chip, and an optional primary button.
import { useState, type ReactNode } from "react";
import { Modal } from "@ui/primitives";
import { ShellIcon } from "@/shared/ui/shell-icon";
import { REFUND_BACKDROP_CLASS, REFUND_MODAL_CLASS, REFUND_SUBMIT_CLASS } from "./refund-controls";

const ART = {
  success: new URL("../../../../../assets/login/stamp.gif", import.meta.url).href,
  processing: new URL("../../../../../assets/Dashboard/ord-refund-processing.gif", import.meta.url).href,
  failed: new URL("../../../../../assets/Dashboard/ord-refund-failed.gif", import.meta.url).href,
  loading: new URL("../../../../../assets/Dashboard/ord-refund-loading.gif", import.meta.url).href,
} as const;

export type RefundArt = keyof typeof ART;
export type RefundNoteTone = "success" | "warning" | "error";

// Sampled from the frames; none of these tints has a token, so dark mode uses
// a translucent wash of the same hue instead of the near-white fill.
const NOTE_TONE: Record<RefundNoteTone, string> = {
  success: "bg-[#f7fffa] text-[#009a39] [[data-theme=dark]_&]:bg-[#009a39]/15 [[data-theme=dark]_&]:text-[#34d27b]",
  warning: "bg-[#fff5e4] text-[#dc9410] [[data-theme=dark]_&]:bg-[#dc9410]/15",
  error: "bg-[#fef0f0] text-[#d30202] [[data-theme=dark]_&]:bg-[#d30202]/15 [[data-theme=dark]_&]:text-[#ff6b6b]",
};

export function RefundResultModal({
  onClose,
  dismissible = true,
  art,
  title,
  subtitle,
  note,
  noteTone = "success",
  noteChip,
  primaryLabel,
  onPrimary,
}: {
  onClose: () => void;
  dismissible?: boolean;
  art: RefundArt;
  title: string;
  subtitle: string;
  note?: ReactNode;
  noteTone?: RefundNoteTone;
  noteChip?: string;
  primaryLabel?: string;
  onPrimary?: () => void;
}) {
  // The stamp plays once; a per-mount query string makes the browser start it
  // from the first frame again instead of showing the cached last frame.
  const [play] = useState(() => Date.now());

  return (
    <Modal
      open
      onClose={onClose}
      dismissible={dismissible}
      className={`${REFUND_MODAL_CLASS} text-center`}
      backdropClassName={REFUND_BACKDROP_CLASS}
    >
      <div className="flex flex-col items-center gap-4">
        {/* The artwork is black line-art on transparency: inverting it and
            rotating the hue back keeps its accent colour on a dark card. */}
        <img
          src={`${ART[art]}?play=${play}`}
          alt=""
          className="aspect-square h-auto w-[218px] max-w-full shrink-0 object-contain [[data-theme=dark]_&]:hue-rotate-180 [[data-theme=dark]_&]:invert [@media(max-height:560px)]:w-[120px]"
        />
        <div className="flex w-full flex-col gap-3">
          <h2 className="text-[24px] font-semibold leading-6 text-[var(--octo-text-primary)]">{title}</h2>
          <p className="-my-0.5 text-[14px] font-medium leading-[18px] text-[var(--octo-text-secondary)]">{subtitle}</p>
        </div>
        {note && (
          <div className={`flex w-full items-center gap-1 rounded-[8px] p-3 text-start ${NOTE_TONE[noteTone]}`}>
            <ShellIcon name="ord-refund-info-circle.svg" size={24} />
            <span className="min-w-0 text-[14px] font-medium leading-[18px]">{note}</span>
            {noteChip && (
              <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[12px] font-medium leading-3 [[data-theme=dark]_&]:bg-[var(--octo-card)]">
                {noteChip}
              </span>
            )}
          </div>
        )}
        {primaryLabel && onPrimary && (
          <button type="button" onClick={onPrimary} className={`${REFUND_SUBMIT_CLASS} -mt-1`}>
            {primaryLabel}
          </button>
        )}
      </div>
    </Modal>
  );
}
