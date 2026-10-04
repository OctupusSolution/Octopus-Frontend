import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import clsx from "clsx";
import { ShellIcon } from "@/shared/ui/shell-icon";

export function Dropdown({
  label,
  icon,
  children,
  align = "end",
  buttonClassName,
  panelClassName,
  ariaLabel,
}: {
  label: ReactNode;
  icon?: ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "start" | "end";
  buttonClassName?: string;
  panelClassName?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          "flex h-10 items-center justify-between gap-2 rounded-[12px] border border-[#cbd5e1] bg-white px-2 text-[14px] text-[#0f172a] transition-colors hover:bg-[#f5f9ff] [[data-theme=dark]_&]:border-[var(--octo-border-input)] [[data-theme=dark]_&]:bg-[var(--octo-card)] [[data-theme=dark]_&]:text-[var(--octo-text-primary)] [[data-theme=dark]_&]:hover:bg-[var(--octo-hover)]",
          buttonClassName
        )}
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          {icon}
          {label}
        </span>
        <ShellIcon name="fp-builder-arrow-down.svg" size={20} className={clsx("text-[#58606c] transition-transform [[data-theme=dark]_&]:text-[var(--octo-text-secondary)]", open && "rotate-180")} />
      </button>
      {open && (
        <div
          role="menu"
          className={clsx(
            "absolute top-full z-40 mt-1.5 min-w-full rounded-[12px] border border-[#cbd5e1] bg-white p-1.5 [[data-theme=dark]_&]:border-[var(--octo-border-card)] [[data-theme=dark]_&]:bg-[var(--octo-card)] shadow-[0_12px_32px_rgba(15,23,42,0.14)]",
            align === "end" ? "end-0" : "start-0",
            panelClassName
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  icon,
  label,
  description,
  onClick,
  selected,
  disabled,
}: {
  icon?: ReactNode;
  label: string;
  description?: string;
  onClick: () => void;
  selected?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        "flex w-full items-start gap-2.5 whitespace-nowrap rounded-lg px-2.5 py-2 text-start text-[13.5px] transition-colors hover:bg-[var(--octo-hover)] disabled:cursor-not-allowed disabled:opacity-50",
        selected ? "font-semibold text-[#0D6EFD]" : "text-[var(--octo-text-primary)]"
      )}
    >
      {icon && <span className="mt-0.5 shrink-0 text-[var(--octo-text-secondary)]">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block">{label}</span>
        {description && <span className="mt-0.5 block whitespace-normal text-[12px] font-normal text-[var(--octo-text-muted)]">{description}</span>}
      </span>
      {selected && <Check size={15} className="mt-0.5 shrink-0" />}
    </button>
  );
}
