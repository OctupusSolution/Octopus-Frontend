import type { ReactNode } from "react";
import clsx from "clsx";
import { Modal } from "@ui/primitives";
import { buttonClass } from "./buttons";

// The Staff frames' dialog: 738px wide on a 60% scrim, 24px padding, a 12px
// radius, a 24px semibold title, 24px between title, body and the single
// full-width 48px action. Long bodies scroll inside the dialog so the action
// stays reachable on short screens.
const SHELL =
  "max-w-[738px] flex max-h-[calc(100dvh-2rem)] flex-col rounded-[12px] p-6 sm:p-6 " +
  "[&>h2]:shrink-0 [&>h2]:text-[24px] [&>h2]:font-semibold [&>h2]:leading-6 [&>h2]:text-[#0e0e0e] [[data-theme=dark]_&>h2]:text-[var(--octo-text-primary)] " +
  "[&>h2+div]:mt-6 [&>div]:-mx-1 [&>div]:flex [&>div]:min-h-0 [&>div]:flex-1 [&>div]:flex-col [&>div]:overflow-y-auto [&>div]:px-1 [&>div]:[scrollbar-width:none] [&>div::-webkit-scrollbar]:hidden";

export function StaffModal({
  open,
  onClose,
  title,
  children,
  submitLabel,
  onSubmit,
  submitDisabled,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** The dialog's single full-width action. Omit both this and `footer` for a body-only dialog. */
  submitLabel?: string;
  onSubmit?: () => void;
  submitDisabled?: boolean;
  /** Replaces the single action where a dialog needs something else below the body. */
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} className={clsx(SHELL, className)} backdropClassName="bg-black/60">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!submitDisabled) onSubmit?.();
        }}
        className="flex flex-col gap-6"
      >
        {children}
        {footer ??
          (submitLabel && (
            <button type="submit" disabled={submitDisabled} className={buttonClass("primary", "lg", "w-full")}>
              {submitLabel}
            </button>
          ))}
      </form>
    </Modal>
  );
}
