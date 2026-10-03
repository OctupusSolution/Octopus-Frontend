// apps/merchant/src/pages/customers/_shared/send-message-wizard/channel-icon.tsx
import { MessageSquareText } from "lucide-react";
import { ShellIcon } from "@/shared/ui/shell-icon";
import { WhatsAppGlyph } from "../whatsapp-glyph";
import type { CommunicationChannel } from "../types";

export function ChannelIcon({ channel, size = 24 }: { channel: CommunicationChannel; size?: number }) {
  if (channel === "WhatsApp") return <WhatsAppGlyph size={size} />;
  // The frames have no SMS channel, so it keeps a stock glyph in the same ink.
  if (channel === "SMS") return <MessageSquareText size={size} strokeWidth={1.5} className="shrink-0 text-[var(--octo-text-primary)]" />;
  return <ShellIcon name="crm-msg-sms.svg" size={size} className="text-[var(--octo-text-primary)]" />;
}
