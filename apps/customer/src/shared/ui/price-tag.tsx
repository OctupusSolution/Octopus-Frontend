import clsx from "clsx";
import { formatSar } from "@/shared/lib/pricing";

export interface PriceTagProps {
  amountSar: number;
  className?: string;
}

export function PriceTag({ amountSar, className }: PriceTagProps) {
  return <span className={clsx("font-semibold text-[var(--octo-text-primary)]", className)}>{formatSar(amountSar)}</span>;
}
