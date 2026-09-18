// apps/merchant/src/pages/customers/_shared/send-message-wizard/channel-icon.tsx
import { Mail, MessageSquareText } from "lucide-react";
import { WhatsAppGlyph } from "../whatsapp-glyph";
import type { CommunicationChannel } from "../types";

export function ChannelIcon({ channel, size = 20 }: { channel: CommunicationChannel; size?: number }) {
  if (channel === "WhatsApp") return <WhatsAppGlyph size={size} />;
  if (channel === "SMS") return <MessageSquareText size={size} strokeWidth={1.75} className="shrink-0 text-[#0D6EFD]" />;
  return <Mail size={size} strokeWidth={1.75} className="shrink-0 text-[#EA580C]" />;
}
