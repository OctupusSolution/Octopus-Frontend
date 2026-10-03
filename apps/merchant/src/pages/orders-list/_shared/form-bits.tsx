// apps/merchant/src/pages/orders-list/_shared/form-bits.tsx
import type { CSSProperties, ReactNode } from "react";
import clsx from "clsx";
import { ShellIcon } from "@/shared/ui/shell-icon";

// The frames' field outline (#cbd5e1) has no token, so dark mode falls back to
// the input-border token. The dark rule outranks a plain `focus:` utility,
// hence the explicit dark focus variant.
export const FLOW_FIELD_BORDER = "border border-[#cbd5e1] [[data-theme=dark]_&]:border-[var(--octo-border-input)]";

const FLOW_FOCUS =
  "transition-colors focus:border-[#0D6EFD] focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/25 [[data-theme=dark]_&]:focus:border-[#0D6EFD]";

/** The action dialogs' frame: 738px wide, 24px padding, a 24px semibold title
 *  and 24px between the title and the body. The dialog never outgrows the
 *  viewport — the title stays put and the body scrolls (scrollbar hidden)
 *  under a sticky primary button. */
export const FLOW_MODAL_CLASS =
  "max-w-[738px] flex max-h-[calc(100dvh-2rem)] flex-col [&>div]:-mx-1 [&>div]:min-h-0 [&>div]:flex-1 [&>div]:overflow-y-auto [&>div]:px-1 [&>div]:[scrollbar-width:none] [&>div::-webkit-scrollbar]:hidden sm:p-6 [&>h2]:text-[24px] [&>h2]:font-semibold [&>h2]:leading-6 [&>h2+div]:mt-6";

export const FLOW_BACKDROP_CLASS = "bg-black/60";

/** The action modals label their fields in plain sentence case at body size —
 *  not the tiny uppercase treatment `@ui/primitives` puts on its own `label`
 *  prop — so the fields here take this instead of that prop. */
export function FieldLabel({ children, className, required }: { children: ReactNode; className?: string; required?: boolean }) {
  return (
    <p className={clsx("mb-2 text-[14px] font-medium leading-[14px] text-[var(--octo-text-primary)]", className)}>
      {children}
      {required && (
        <span aria-hidden="true" className="text-[#d30202]">
          {" *"}
        </span>
      )}
    </p>
  );
}

/** A native select drawn like the frames' 40px dropdowns. */
export function FlowSelect({
  value,
  onChange,
  ariaLabel,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="relative w-full">
      <select
        value={value}
        aria-label={ariaLabel}
        onChange={(event) => onChange(event.target.value)}
        className={clsx(
          `h-10 w-full appearance-none rounded-[12px] ${FLOW_FIELD_BORDER} bg-[var(--octo-card)] pe-10 ps-2 text-[14px] ${FLOW_FOCUS}`,
          value ? "text-[var(--octo-text-primary)]" : "text-[var(--octo-text-secondary)]"
        )}
      >
        {children}
      </select>
      <ShellIcon
        name="ord-flow-arrow-thin.svg"
        size={24}
        className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 text-[var(--octo-text-primary)]"
      />
    </div>
  );
}

export const FLOW_TEXTAREA_CLASS = `block h-[103px] w-full resize-none rounded-[12px] ${FLOW_FIELD_BORDER} bg-[var(--octo-card)] px-3 py-2 text-[12px] font-medium leading-[1.4] text-[var(--octo-text-primary)] placeholder:font-normal placeholder:text-[var(--octo-text-secondary)] ${FLOW_FOCUS}`;

/** The tinted "Refund Amount: SAR 186.00" strip the refund frames use, above
 *  the amount field for cash and below the note for everything else. */
export function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[8px] bg-[#f5f9ff] px-3 py-3 text-[14px] [[data-theme=dark]_&]:bg-[#0d6efd]/15">
      <span className="text-[var(--octo-text-secondary)]">{label}</span>
      <span className="text-[16px] font-bold text-[#0D6EFD]">{value}</span>
    </div>
  );
}

/** Every action modal's primary CTA is the same full-width 48px button. It is
 *  blue on the form and result steps; the PIN step passes that action's own
 *  `accent`. It sticks to the bottom of a scrolling dialog body, so its
 *  backing (the two card-coloured shadows) and its disabled state are solid
 *  rather than translucent — nothing shows through as the body scrolls. */
export function PrimaryButton({
  label,
  disabled,
  onClick,
  className,
  accent,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
  accent?: string;
}) {
  const style: CSSProperties | undefined = accent
    ? { backgroundColor: disabled ? `color-mix(in srgb, ${accent} 50%, var(--octo-card))` : accent }
    : undefined;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={style}
      className={clsx(
        "sticky bottom-0 z-[1] h-12 w-full shrink-0 rounded-[8px] bg-[#0D6EFD] px-3 text-[18px] font-bold leading-[18px] text-white shadow-[0_-12px_0_0_var(--octo-card),0_8px_0_0_var(--octo-card)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-[#86b7fe] disabled:hover:opacity-100 [[data-theme=dark]_&]:disabled:bg-[#1f4a94]",
        className
      )}
    >
      {label}
    </button>
  );
}
