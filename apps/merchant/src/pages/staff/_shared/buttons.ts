import clsx from "clsx";

// Button sizes and colours from the Staff designs. The console's Button
// primitive is sized for dense tables (12px text), which the designs outgrow.
const BASE =
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[10px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40 disabled:cursor-not-allowed disabled:opacity-50";

const SIZES = {
  lg: "h-11 px-4 text-[15px]",
  md: "h-10 px-3.5 text-[14px]",
  sm: "h-9 px-3 text-[13px]",
} as const;

const VARIANTS = {
  primary: "bg-[#0D6EFD] text-white hover:bg-[#0b5ed7]",
  outline: "border border-[#0D6EFD] bg-[var(--octo-card)] text-[#0D6EFD] hover:bg-[var(--octo-selected)]",
  secondary: "border border-[var(--octo-border-input)] bg-[var(--octo-card)] text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]",
  danger: "bg-[#DC2626] text-white hover:bg-[#b91c1c]",
  warningSoft: "bg-[var(--octo-tone-warning-bg)] text-[var(--octo-tone-warning-text)] hover:brightness-95",
  successOutline: "border border-[#16A34A] bg-[var(--octo-card)] text-[var(--octo-tone-success-text)] hover:bg-[var(--octo-tone-success-bg)]",
  ghost: "text-[var(--octo-text-secondary)] hover:bg-[var(--octo-hover)] hover:text-[var(--octo-text-primary)]",
} as const;

export function buttonClass(variant: keyof typeof VARIANTS, size: keyof typeof SIZES = "md", className?: string): string {
  return clsx(BASE, SIZES[size], VARIANTS[variant], className);
}
