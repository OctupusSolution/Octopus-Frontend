// apps/merchant/src/pages/customers/_shared/whatsapp-glyph.tsx
// Copied verbatim from apps/merchant/src/pages/reservations/waitlist/_shared/glyphs.tsx
// (lines 4-14) — same page-isolation convention as everywhere else in this plan.
export function WhatsAppGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <path fill="#25D366" d="M12 1.5a10.5 10.5 0 0 0-9.1 15.7L1.5 22.5l5.4-1.4A10.5 10.5 0 1 0 12 1.5Z" />
      <path
        fill="#fff"
        d="M17.3 14.6c-.3-.1-1.7-.8-1.9-.9-.3-.1-.5-.1-.7.1l-.9 1.1c-.2.2-.3.2-.6.1a7.6 7.6 0 0 1-3.8-3.3c-.3-.5.3-.5.8-1.5.1-.2 0-.3 0-.5l-.9-2.1c-.2-.5-.5-.5-.7-.5h-.6a1.1 1.1 0 0 0-.8.4 3.4 3.4 0 0 0-1.1 2.5 5.9 5.9 0 0 0 1.2 3.1 13.4 13.4 0 0 0 5.2 4.6c1.9.8 2.7.9 3.6.7a3.1 3.1 0 0 0 2-1.4 2.5 2.5 0 0 0 .2-1.4c-.1-.1-.3-.2-.6-.3Z"
      />
    </svg>
  );
}
