// apps/merchant/src/pages/orders-list/_shared/empty-orders-art.tsx
// The "No Orders Yet!" line-art from orders.png: a struck-through order
// bubble tethered to an empty tray, drawn in one flat outline colour so it
// reads the same on any surface.
export function EmptyOrdersArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 280 240"
      fill="none"
      stroke="currentColor"
      strokeWidth="6"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="presentation"
      aria-hidden="true"
      className={className}
    >
      {/* struck-through order bubble */}
      <path d="M38 28h74a18 18 0 0 1 18 18v38a18 18 0 0 1-18 18H70l-20 18V102h-12a18 18 0 0 1-18-18V46a18 18 0 0 1 18-18Z" />
      <path d="M60 50l30 30M90 50 60 80" />

      {/* tether to the tray */}
      <circle cx="152" cy="92" r="7" />
      <circle cx="178" cy="74" r="9" />

      {/* empty tray */}
      <path d="M96 156h160l24 56H72l24-56Z" />
      <path d="M196 74h56v138" />
      <path d="M120 186h44" />
      <path d="M132 170h18" />

      {/* sparkles */}
      <path d="M156 34l12 12M168 34l-12 12" opacity="0.65" />
      <path d="M40 130l10 10M50 130l-10 10" opacity="0.65" />
      <circle cx="206" cy="40" r="5" opacity="0.65" />
    </svg>
  );
}
