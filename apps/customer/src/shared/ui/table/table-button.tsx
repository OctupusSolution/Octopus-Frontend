import Link from "next/link";
import type { ReactNode } from "react";

const VARIANTS = {
  primary: "bg-ocean-blue text-white",
  outline: "border border-gray-300 text-gray-900",
  outlineBrand: "border border-ocean-blue text-[var(--octo-store-select-text)]",
  ghost: "text-gray-900",
} as const;

export interface TableButtonProps {
  children: ReactNode;
  variant?: keyof typeof VARIANTS;
  /** 16px on most actions; the sheet and product actions are set at 18px. */
  size?: "md" | "lg";
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}

/** The dine-in flow's full-width pill action. */
export function TableButton({
  children, variant = "primary", size = "md", href, onClick, disabled, type = "button", className,
}: TableButtonProps) {
  const classes = `flex h-12 w-full items-center justify-center rounded-[24px] px-2 text-center font-bold leading-none transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${
    size === "lg" ? "text-[18px]" : "text-[16px]"
  } ${VARIANTS[variant]} ${className ?? ""}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={classes}>
      {children}
    </button>
  );
}
