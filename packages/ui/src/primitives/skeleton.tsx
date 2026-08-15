import type { HTMLAttributes } from "react";
import clsx from "clsx";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("animate-pulse rounded bg-[var(--octo-track)]", className)} {...props} />;
}
