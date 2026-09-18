// apps/merchant/src/pages/customers/_shared/send-message-wizard/channel-content-step.tsx
// No frame exists for this step; it reuses step 1/3's type scale, the Add
// Customer channel pills and the full-width primary button.
import { useI18n } from "@/app/providers/i18n-provider";
import { CheckboxPill, PRIMARY_SUBMIT_CLASS, TEXTAREA_CLASS } from "../form-controls";
import { ChannelIcon } from "./channel-icon";
import type { CommunicationChannel } from "../types";

const OPTIONS: readonly CommunicationChannel[] = ["WhatsApp", "SMS", "Email"];
export const MESSAGE_MAX_LENGTH = 1000;

export function ChannelContentStep({
  channels,
  onChannelsChange,
  message,
  onMessageChange,
  onNext,
}: {
  channels: CommunicationChannel[];
  onChannelsChange: (next: CommunicationChannel[]) => void;
  message: string;
  onMessageChange: (next: string) => void;
  onNext: () => void;
}) {
  const { t } = useI18n();

  function toggle(channel: CommunicationChannel) {
    onChannelsChange(channels.includes(channel) ? channels.filter((c) => c !== channel) : [...channels, channel]);
  }

  return (
    <div className="mt-4">
      <p className="text-[16px] text-[var(--octo-text-primary)]">{t("customers.sendMessage.channel.title")}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {OPTIONS.map((channel) => (
          <CheckboxPill
            key={channel}
            label={t(`customers.sendMessage.channel.${channel.toLowerCase()}`)}
            icon={<ChannelIcon channel={channel} size={18} />}
            checked={channels.includes(channel)}
            onClick={() => toggle(channel)}
          />
        ))}
      </div>

      <label className="mt-5 flex flex-col gap-2">
        <span className="text-[16px] text-[var(--octo-text-primary)]">{t("customers.sendMessage.content.title")}</span>
        <textarea
          value={message}
          maxLength={MESSAGE_MAX_LENGTH}
          onChange={(event) => onMessageChange(event.target.value)}
          placeholder={t("customers.sendMessage.content.placeholder")}
          rows={7}
          className={TEXTAREA_CLASS}
        />
        <span className="text-end text-[12px] text-[var(--octo-text-muted)]">
          {t("customers.sendMessage.content.charCount").replace("{count}", `${message.length}/${MESSAGE_MAX_LENGTH}`)}
        </span>
      </label>

      <button type="button" onClick={onNext} disabled={channels.length === 0 || message.trim() === ""} className={PRIMARY_SUBMIT_CLASS}>
        {t("customers.sendMessage.next")}
      </button>
    </div>
  );
}
