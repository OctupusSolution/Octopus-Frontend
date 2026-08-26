import { Star } from "lucide-react";

export interface RatingStarsProps {
  value: number;
  /** Cards show one star beside the number; the product page shows five. */
  count?: 1 | 5;
  size?: number;
}

export function RatingStars({ value, count = 1, size = 13 }: RatingStarsProps) {
  const label = value.toFixed(1);
  return (
    <span className="inline-flex shrink-0 items-center gap-1" aria-label={`${label} / 5`}>
      {Array.from({ length: count }, (_, i) => (
        <Star key={i} size={size} className="fill-[#F59E0B] text-[#F59E0B]" aria-hidden="true" />
      ))}
      <span className="text-[11.5px] font-semibold text-[var(--octo-text-secondary)]">
        {count === 5 ? `(${label})` : label}
      </span>
    </span>
  );
}
