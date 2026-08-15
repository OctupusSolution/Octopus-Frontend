import type { HTMLAttributes } from "react";
import clsx from "clsx";

type Tone = "success" | "error" | "warning" | "info" | "neutral";

const TONE_CLASSES: Record<Tone, string> = {
  success: "bg-success/10 text-success",
  error: "bg-error/10 text-error",
  warning: "bg-warning/10 text-warning",
  info: "bg-info/10 text-info",
  neutral: "bg-[var(--octo-hover)] text-[var(--octo-text-secondary)]",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        TONE_CLASSES[tone],
        className
      )}
      {...props}
    />
  );
}
