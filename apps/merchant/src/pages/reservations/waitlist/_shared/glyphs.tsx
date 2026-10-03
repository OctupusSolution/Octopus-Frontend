import type { ContactChannel } from "@/entities/waitlist-entry";
import { WaitlistIcon, WaitlistImg, waitlistAssetUrl } from "./waitlist-icon";

export function WhatsAppGlyph({ size = 16 }: { size?: number }) {
  return <WaitlistImg name="whatsapp.svg" size={size} />;
}

/** The contact channel the guest chose, beside their number. */
export function ChannelGlyph({ channel, size = 16 }: { channel: ContactChannel; size?: number }) {
  if (channel === "whatsapp") return <WhatsAppGlyph size={size} />;
  return <WaitlistIcon name={channel === "call" ? "call-16.svg" : "message.svg"} size={size} />;
}

export function SaudiFlag({ size = 24 }: { size?: number }) {
  return <WaitlistImg name="flag-sa.png" size={size} className="object-cover" />;
}

/** The empty-state drawing: a row of waiting chairs under a crossed-out badge.
 *  Its ink is the frame's near-black, so dark mode inverts it. */
export function EmptyWaitlistIllustration({ className }: { className?: string }) {
  return <img src={waitlistAssetUrl("empty-waitlist.svg")} alt="" aria-hidden width={255} height={255} className={`block h-[255px] w-[255px] [[data-theme=dark]_&]:invert${className ? ` ${className}` : ""}`} />;
}
