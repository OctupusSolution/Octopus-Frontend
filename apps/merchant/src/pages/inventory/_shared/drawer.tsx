import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}

export function Drawer({ open, onClose, title, subtitle, children, footer }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <div
      className={`fixed inset-0 z-50 bg-black/30 transition-opacity duration-200 ${
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
      onClick={onClose}
      aria-hidden={!open}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        onClick={(event) => event.stopPropagation()}
        className={`octo-scroll absolute inset-y-0 end-0 flex h-full w-full flex-col overflow-y-auto bg-[var(--octo-card)] shadow-xl transition-transform duration-200 sm:w-[420px] ${
          open ? "translate-x-0" : "translate-x-full rtl:-translate-x-full"
        }`}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--octo-divider)] px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--octo-text-primary)]">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[11.5px] text-[var(--octo-text-muted)]">{subtitle}</p>}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-[8px] text-[var(--octo-text-muted)] transition-colors hover:bg-[var(--octo-hover)]"
          >
            <X size={14} />
          </button>
        </div>

        <div className="min-h-0 flex-1 px-5 py-4">{children}</div>

        {footer && (
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-[var(--octo-divider)] px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
