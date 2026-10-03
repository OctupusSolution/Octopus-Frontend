// apps/merchant/src/pages/customers/_shared/send-message-wizard/channel-content-step.tsx
import clsx from "clsx";
import { useI18n } from "@/app/providers/i18n-provider";
import { TEXTAREA_CLASS } from "../form-controls";
import { ChannelIcon } from "./channel-icon";
import { OUTLINE_CLASS, SECTION_LABEL_CLASS, SELECTED_SURFACE_CLASS, STEP_SUBMIT_CLASS } from "./styles";
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <p className={SECTION_LABEL_CLASS}>{t("customers.sendMessage.channel.title")}</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {OPTIONS.map((channel) => {
            const checked = channels.includes(channel);
            return (
              <button
                key={channel}
                type="button"
                role="checkbox"
                aria-checked={checked}
                onClick={() => toggle(channel)}
                className={clsx(
                  "flex items-center gap-2 rounded-[12px] border p-2 text-start text-[14px] font-bold leading-[14px] text-[var(--octo-text-primary)] transition-colors",
                  checked ? SELECTED_SURFACE_CLASS : clsx(OUTLINE_CLASS, "hover:bg-[var(--octo-hover)]")
                )}
              >
                <ChannelIcon channel={channel} size={24} />
                <span className="flex min-w-0 flex-col gap-1">
                  <span>{t(`customers.sendMessage.channel.${channel.toLowerCase()}`)}</span>
                  <span className="text-[12px] font-normal leading-[12px] text-[var(--octo-text-secondary)]">
                    {t(`customers.sendMessage.channel.${channel.toLowerCase()}.hint`)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <label className="flex flex-col gap-3">
        <span className={clsx(SECTION_LABEL_CLASS, "px-2")}>{t("customers.sendMessage.content.title")}</span>
        <textarea
          value={message}
          maxLength={MESSAGE_MAX_LENGTH}
          onChange={(event) => onMessageChange(event.target.value)}
          placeholder={t("customers.sendMessage.content.placeholder")}
          rows={7}
          className={TEXTAREA_CLASS}
        />
        <span className="-mt-1 text-end text-[12px] leading-3 text-[var(--octo-text-secondary)]">
          {t("customers.sendMessage.content.charCount").replace("{count}", `${message.length}/${MESSAGE_MAX_LENGTH}`)}
        </span>
      </label>

      <button type="button" onClick={onNext} disabled={channels.length === 0 || message.trim() === ""} className={STEP_SUBMIT_CLASS}>
        {t("customers.sendMessage.next")}
      </button>
    </div>
  );
}
