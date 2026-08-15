import type { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-[#0D6EFD] text-white hover:opacity-90",
  secondary: "border border-[var(--octo-border-input)] bg-[var(--octo-card)] text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]",
  ghost: "text-[var(--octo-text-secondary)] hover:bg-[var(--octo-hover)]",
  danger: "bg-[#EF4444] text-white hover:opacity-90",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "px-2.5 py-[5px] text-[11.5px]",
  md: "px-3 py-[7px] text-[12px]",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  icon,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-[9px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
