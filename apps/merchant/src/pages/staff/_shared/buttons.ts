import clsx from "clsx";

// Button sizes and colours from the Staff frames. The console's Button
// primitive is sized for dense tables (12px text), which the frames outgrow.
const BASE =
  "inline-flex shrink-0 items-center justify-center whitespace-nowrap font-semibold transition-[background-color,filter,opacity] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40 disabled:cursor-not-allowed disabled:opacity-50";

// lg is the frames' 48px page / dialog action (18px bold); md the 40px card
// action (16px semibold); sm the 32px inline action (14px semibold).
const SIZES = {
  lg: "h-12 gap-1 rounded-[8px] px-3 text-[18px] font-bold leading-[18px]",
  md: "h-10 gap-1 rounded-[8px] px-3 text-[16px] leading-4",
  sm: "h-8 gap-1 rounded-[4px] px-2 text-[14px] leading-[14px]",
} as const;

const VARIANTS = {
  primary: "bg-[#0D6EFD] text-white hover:bg-[#0b5ed7] disabled:hover:bg-[#0D6EFD]",
  outline: "border border-[#0D6EFD] bg-[var(--octo-card)] text-[#0D6EFD] hover:bg-[var(--octo-selected)]",
  secondary:
    "border border-[#e2e8f0] bg-[var(--octo-card)] text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)] [[data-theme=dark]_&]:border-[var(--octo-border-input)]",
  danger: "bg-[#d30202] text-white hover:bg-[#b80202]",
  warningSoft: "bg-[#fff5e4] text-[#f59e0b] hover:brightness-95 [[data-theme=dark]_&]:bg-[#f59e0b]/15",
  successOutline: "border border-[#009a39] bg-[var(--octo-card)] text-[#009a39] hover:bg-[#dcffef] [[data-theme=dark]_&]:hover:bg-[#009a39]/20",
  successSoft: "bg-[#dcffef] text-[#009a39] hover:brightness-95 [[data-theme=dark]_&]:bg-[#009a39]/20 [[data-theme=dark]_&]:text-[#4ade80]",
  dangerSoft: "bg-[#fef0f0] text-[#d30202] hover:brightness-95 [[data-theme=dark]_&]:bg-[#d30202]/20 [[data-theme=dark]_&]:text-[#f87171]",
  infoSoft: "bg-[#f5f9ff] text-[#0D6EFD] hover:brightness-95 [[data-theme=dark]_&]:bg-[#0d6efd]/15",
  neutralSoft: "bg-[#f1f5f9] text-[var(--octo-text-primary)] hover:brightness-95 [[data-theme=dark]_&]:bg-[var(--octo-hover)]",
  ghost: "text-[var(--octo-text-secondary)] hover:bg-[var(--octo-hover)] hover:text-[var(--octo-text-primary)]",
} as const;

export function buttonClass(variant: keyof typeof VARIANTS, size: keyof typeof SIZES = "md", className?: string): string {
  return clsx(BASE, SIZES[size], VARIANTS[variant], className);
}
