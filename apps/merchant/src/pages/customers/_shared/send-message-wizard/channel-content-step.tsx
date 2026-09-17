// apps/merchant/src/pages/customers/_shared/send-message-wizard/channel-content-step.tsx
import clsx from "clsx";
import { Button } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import type { CommunicationChannel } from "../types";

export function ChannelContentStep({
  channels,
  onChannelsChange,
  message,
  onMessageChange,
  onBack,
  onNext,
}: {
  channels: CommunicationChannel[];
  onChannelsChange: (next: CommunicationChannel[]) => void;
  message: string;
  onMessageChange: (next: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const { t } = useI18n();
  const options: CommunicationChannel[] = ["WhatsApp", "SMS", "Email"];

  function toggle(channel: CommunicationChannel) {
    onChannelsChange(channels.includes(channel) ? channels.filter((c) => c !== channel) : [...channels, channel]);
  }

  return (
    <div>
      <p className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{t("customers.sendMessage.channel.title")}</p>
      <div className="mt-1.5 flex gap-2">
        {options.map((channel) => (
          <button
            key={channel}
            type="button"
            onClick={() => toggle(channel)}
            className={clsx(
              "flex-1 rounded-[9px] border px-3 py-2 text-[12.5px] font-medium transition-colors",
              channels.includes(channel) ? "border-[#0D6EFD] bg-[#0D6EFD]/5 text-[#0D6EFD]" : "border-[var(--octo-border-input)] text-[var(--octo-text-primary)]"
            )}
          >
            {t(`customers.sendMessage.channel.${channel.toLowerCase()}`)}
          </button>
        ))}
      </div>

      <label className="mt-4 flex flex-col gap-1.5">
        <span className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{t("customers.sendMessage.content.title")}</span>
        <textarea
          value={message}
          onChange={(event) => onMessageChange(event.target.value)}
          placeholder={t("customers.sendMessage.content.placeholder")}
          rows={5}
          className="w-full rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-2 text-[12.5px] text-[var(--octo-text-primary)] outline-none placeholder:text-[var(--octo-text-faint)] focus:border-[#0D6EFD] focus:ring-2 focus:ring-[#0D6EFD]/30"
        />
        <span className="text-end text-[11px] text-[var(--octo-text-faint)]">{t("customers.sendMessage.content.charCount").replace("{count}", String(message.length))}</span>
      </label>

      <div className="mt-6 flex gap-2">
        <Button variant="secondary" onClick={onBack} className="flex-1">{t("customers.sendMessage.back")}</Button>
        <Button variant="primary" onClick={onNext} disabled={channels.length === 0 || message.trim() === ""} className="flex-1">
          {t("customers.sendMessage.next")}
        </Button>
      </div>
    </div>
  );
}
