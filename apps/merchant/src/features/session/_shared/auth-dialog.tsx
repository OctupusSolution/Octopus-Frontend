// The dialog shell the four auth modals share: centred title, the 3D artwork
// from apps/assets/login, a line of body copy, then whatever the step needs.
// Wraps the shared Modal primitive so the ARIA wiring stays in one place. These
// dialogs close only through their own X button, never the scrim or Escape.
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Modal } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";

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
  const { locale } = useI18n();
  return (
    <Modal
      open={open}
      onClose={onClose}
      // A stray click on the scrim or Escape used to throw away a half-typed
      // code; only the X below closes these now.
      dismissible={false}
      backdropClassName="bg-[#0B1B3F]/55 backdrop-blur-[2px]"
      className="relative !max-w-[560px] !rounded-[26px] !p-8 sm:!p-10"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={locale === "ar" ? "إغلاق" : "Close"}
        className="absolute end-4 top-4 grid h-9 w-9 place-items-center rounded-full text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)] hover:text-[var(--octo-text-primary)]"
      >
        <X size={20} />
      </button>

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
