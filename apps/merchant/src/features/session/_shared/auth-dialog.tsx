// The dialog shell the four auth modals share: centred title, the 3D artwork
// from apps/assets/login, a line of body copy, then whatever the step needs.
// Wraps the shared Modal primitive so Escape, the scrim click and the ARIA
// wiring stay in one place.
import type { ReactNode } from "react";
import { Modal } from "@ui/primitives";

export const VERIFY_ART_URL = new URL("../../../../../assets/login/verify.png", import.meta.url).href;
export const STAMP_ART_URL = new URL("../../../../../assets/login/stamp.gif", import.meta.url).href;

export function AuthDialog({
  open,
  onClose,
  title,
  art,
  artClassName,
  body,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  art: string;
  artClassName?: string;
  body?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      backdropClassName="bg-[#0B1B3F]/55 backdrop-blur-[2px]"
      className="!max-w-[560px] !rounded-[26px] !p-8 sm:!p-10"
    >
      {/* The success dialog leads with its artwork and titles itself below it,
          so an empty title means "no heading here" rather than an empty line. */}
      {title && (
        <h2 className="text-center text-[28px] font-bold leading-tight tracking-tight text-[var(--octo-text-primary)]">
          {title}
        </h2>
      )}

      <img src={art} alt="" className={artClassName ?? "mx-auto mt-6 h-[220px] w-auto object-contain"} />

      {body && (
        <p className="mt-6 text-center text-[15px] leading-relaxed text-[var(--octo-text-secondary)]">{body}</p>
      )}

      <div className="mt-6 flex flex-col gap-5">{children}</div>
    </Modal>
  );
}
