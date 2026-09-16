// The pedestal-table glyph the frames use beside "Total Tables" and
// "Tables in plan" — lucide has no equivalent.
export function TableIcon({ size = 18, className, strokeWidth = 1.7 }: { size?: number; className?: string; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <ellipse cx="12" cy="7" rx="9" ry="3" />
      <path d="M12 10v9" />
      <path d="M8 20h8" />
    </svg>
  );
}
