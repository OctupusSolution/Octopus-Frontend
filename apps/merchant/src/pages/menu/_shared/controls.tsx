// The small controls every Menu frame repeats: the status pill, the labelled
// field with its error line, the 40px select and the kebab popover. Sizes are
// the frames' own; see theme.ts for the colours.
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import clsx from "clsx";
import { MenuIcon } from "./menu-icon";
import { FIELD_BORDER, FIELD_INVALID, FOCUS, PILL_TONE, TEXT, TEXT_SECONDARY, type PillTone } from "./theme";

export function StatusPill({ tone, children, className }: { tone: PillTone; children: ReactNode; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-1 text-[12px] font-medium leading-[12px]",
        PILL_TONE[tone],
        className
      )}
    >
      <span className="size-[5px] rounded-full bg-current" aria-hidden />
      {children}
    </span>
  );
}

/** A labelled form field. `error` is only ever passed once the field has been
 *  touched or a save was attempted, so an untouched form never opens red. */
export function Field({
  label,
  required,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  /** The small grey aside after a label: "(Optional)", "(For POS)". */
  hint?: string;
  error?: string | null;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={clsx("flex flex-col gap-3", className)}>
      <span className={clsx("px-2 text-[16px] font-medium leading-4", TEXT)}>
        {label}
        {hint && <span className={clsx("ms-1 text-[12px] font-normal", TEXT_SECONDARY)}>{hint}</span>}
        {required && <span className="text-[#d30202]"> *</span>}
      </span>
      {children}
      {error && (
        <span role="alert" className="-mt-1 px-2 text-[12px] leading-[14px] text-[#d30202]">
          {error}
        </span>
      )}
    </div>
  );
}

/** A native select styled like the frames' 40px dropdowns. */
export function SelectBox({
  value,
  onChange,
  onBlur,
  children,
  ariaLabel,
  placeholderShown,
  invalid,
  disabled,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  children: ReactNode;
  ariaLabel?: string;
  /** True while the empty option is selected, so it reads as a placeholder. */
  placeholderShown?: boolean;
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={clsx("relative w-full", className)}>
      <select
        value={value}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
        className={clsx(
          `h-10 w-full appearance-none rounded-[12px] ${FIELD_BORDER} bg-[var(--octo-card)] pe-10 ps-2 text-[14px] ${FOCUS} disabled:cursor-not-allowed disabled:opacity-60`,
          placeholderShown ? TEXT_SECONDARY : TEXT,
          invalid && FIELD_INVALID
        )}
      >
        {children}
      </select>
      <MenuIcon
        name="menu-arrow-down.svg"
        size={24}
        className={clsx("pointer-events-none absolute end-2 top-1/2 -translate-y-1/2", TEXT_SECONDARY)}
      />
    </div>
  );
}

export interface PopoverItem<Id extends string> {
  id: Id;
  label: string;
  danger?: boolean;
}

const POPOVER_GAP = 4;
const POPOVER_ROW = 40;
const VIEWPORT_MARGIN = 8;

/**
 * The kebab popover the frames hang off a card, a section row and an item
 * row: white, 16px radius, 12px padding, 32px pale-blue rows with the
 * destructive one in pale red.
 *
 * `position: fixed` so it escapes any scrolling panel; it aligns its end edge
 * to the trigger's, flips above when there is no room below, and closes on
 * scroll or resize rather than chase a trigger that has moved.
 */
export function PopoverMenu<Id extends string>({
  anchor,
  items,
  onPick,
  onClose,
  minWidth = 146,
}: {
  anchor: DOMRect | null;
  items: PopoverItem<Id>[];
  onPick: (id: Id) => void;
  onClose: () => void;
  minWidth?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>({ visibility: "hidden" });

  useEffect(() => {
    if (!anchor) return;
    const onPointer = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onClose, true);
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("resize", onClose);
    };
  }, [anchor, onClose]);

  useLayoutEffect(() => {
    if (!anchor) return;
    const rtl = document.documentElement.dir === "rtl";
    const height = ref.current?.offsetHeight ?? items.length * POPOVER_ROW + 16;
    const width = ref.current?.offsetWidth ?? minWidth;
    const below = anchor.bottom + POPOVER_GAP + height <= window.innerHeight - VIEWPORT_MARGIN;
    const top = below ? anchor.bottom + POPOVER_GAP : Math.max(VIEWPORT_MARGIN, anchor.top - POPOVER_GAP - height);
    const wanted = rtl ? anchor.left : anchor.right - width;
    const left = Math.min(Math.max(VIEWPORT_MARGIN, wanted), window.innerWidth - width - VIEWPORT_MARGIN);
    setStyle({ top, left, minWidth });
  }, [anchor, items.length, minWidth]);

  if (!anchor) return null;

  return (
    <div
      ref={ref}
      role="menu"
      style={style}
      className="fixed z-50 flex flex-col gap-2 rounded-[16px] bg-[var(--octo-card)] p-3 shadow-[0px_0px_12px_0px_rgba(0,0,0,0.12)]"
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="menuitem"
          onClick={() => onPick(item.id)}
          className={clsx(
            "flex h-8 w-full items-center whitespace-nowrap rounded-[4px] px-2 text-start text-[14px] font-medium leading-[14px] transition-[filter] hover:brightness-95",
            item.danger
              ? "bg-[#fef0f0] text-[#d30202] [[data-theme=dark]_&]:bg-[#d30202]/15 [[data-theme=dark]_&]:text-[#ff6b6b]"
              : `bg-[#f5f9ff] ${TEXT} [[data-theme=dark]_&]:bg-[var(--octo-hover)]`
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

/** The 16px three-dot trigger that opens a PopoverMenu. */
export function KebabButton({ label, onOpen, className }: { label: string; onOpen: (anchor: DOMRect) => void; className?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-haspopup="menu"
      onClick={(event) => {
        event.stopPropagation();
        onOpen(event.currentTarget.getBoundingClientRect());
      }}
      className={clsx("grid shrink-0 place-items-center rounded-[4px] hover:bg-[var(--octo-hover)]", TEXT, className)}
    >
      <MenuIcon name="menu-more-vertical.svg" size={16} />
    </button>
  );
}

/** The frames' 32×18 switch with its 14px knob (same drawing as the
 *  customers module's, which a page here may not import). */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        "relative inline-flex h-[18px] w-[32px] shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40 disabled:cursor-not-allowed disabled:opacity-60",
        checked ? "bg-[#0D6EFD]" : "bg-[var(--octo-switch-off)]"
      )}
    >
      <span
        className={clsx(
          "inline-block size-[14px] rounded-full bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)] transition-transform",
          checked ? "translate-x-[15px] rtl:-translate-x-[15px]" : "translate-x-[3px] rtl:-translate-x-[3px]"
        )}
      />
    </button>
  );
}

/** The frames' 24px checkbox glyph with its 12px medium label. The native
 *  input stays in the tree (visually hidden) so it keeps keyboard and
 *  screen-reader behaviour. */
export function CheckBox({
  checked,
  onChange,
  label,
  disabled,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label
      className={clsx(
        "inline-flex cursor-pointer items-center gap-2 text-[12px] font-medium leading-3",
        TEXT,
        disabled && "cursor-not-allowed opacity-60",
        className
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span className="inline-flex rounded-[4px] peer-focus-visible:ring-2 peer-focus-visible:ring-[#0D6EFD]/40">
        <MenuIcon
          name={checked ? "menu-checkbox-on.svg" : "menu-checkbox-off.svg"}
          size={24}
          className={checked ? "text-[#0D6EFD]" : "text-[#cbd5e1] [[data-theme=dark]_&]:text-[var(--octo-border-input)]"}
        />
      </span>
      {label}
    </label>
  );
}
