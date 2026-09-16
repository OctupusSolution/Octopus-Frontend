import { MessageCircleMore, Phone } from "lucide-react";
import type { ContactChannel } from "@/entities/waitlist-entry";

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

/** The contact channel the guest chose, beside their number. */
export function ChannelGlyph({ channel, size = 16 }: { channel: ContactChannel; size?: number }) {
  if (channel === "whatsapp") return <WhatsAppGlyph size={size} />;
  if (channel === "call") return <Phone size={size - 2} className="shrink-0 text-[var(--octo-tone-info-text)]" />;
  return <MessageCircleMore size={size - 2} className="shrink-0 text-[var(--octo-text-secondary)]" />;
}

export function SaudiFlag({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <circle cx="12" cy="12" r="12" fill="#006C35" />
      <path d="M6 9.2h12M6.8 11h10.4" stroke="#fff" strokeWidth="1.1" strokeLinecap="round" strokeDasharray="1.6 1" />
      <path d="M7 14.6h9.6l1.2-.8" stroke="#fff" strokeWidth="1" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/** The empty-state drawing: a row of waiting chairs under a crossed-out badge. */
export function EmptyWaitlistIllustration({ className }: { className?: string }) {
  const chair = (x: number) => (
    <g key={x} transform={`translate(${x} 0)`}>
      <path d="M4 58c0-14 8-22 20-22s20 8 20 22v4H4Z" />
      <path d="M2 70h44v10H2Z" />
      <path d="M20 62v8M28 62v8" />
      <path d="M19 80c-1 8-1 14 0 21h10c1-7 1-13 0-21" />
    </g>
  );
  return (
    <svg viewBox="0 0 160 118" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="80" cy="17" r="13" />
      <path d="M74 11l12 12M86 11l-12 12" />
      <path d="M58 13c-9 0-14 6-14 14M102 13c9 0 14 6 14 14" />
      {chair(6)}
      {chair(56)}
      {chair(106)}
      <path d="M50 75h6M104 75h2" />
      <path d="M6 101h40M62 101h92v12H6v-12" />
    </svg>
  );
}
