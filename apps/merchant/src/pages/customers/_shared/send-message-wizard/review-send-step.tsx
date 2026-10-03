// apps/merchant/src/pages/customers/_shared/send-message-wizard/review-send-step.tsx
import { useState } from "react";
import clsx from "clsx";
import { useI18n } from "@/app/providers/i18n-provider";
import { RadioDot, TEXT_INPUT_CLASS } from "../form-controls";
import { formatSar } from "../format";
import { ChannelIcon } from "./channel-icon";
import { estimatedCostSar } from "./audience";
import { BRAND_TEXT_CLASS, OUTLINE_CLASS, SECTION_LABEL_CLASS, SOFT_BLUE_BG_CLASS, STEP_SUBMIT_CLASS } from "./styles";
import type { CommunicationChannel } from "../types";

export type SendTiming = { kind: "now" } | { kind: "later"; at: string } | { kind: "batches"; batchSize: number };

const BATCH_SIZES = [100, 250, 500, 1000] as const;

export function ReviewSendStep({
  totalSelected,
  channels,
  onSend,
}: {
  totalSelected: number;
  channels: CommunicationChannel[];
  onSend: (timing: SendTiming) => void;
}) {
  const { t } = useI18n();
  const [kind, setKind] = useState<SendTiming["kind"]>("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [batchSize, setBatchSize] = useState<number>(BATCH_SIZES[1]);

  const canSend = totalSelected > 0 && (kind !== "later" || scheduledAt !== "");

  function send() {
    if (!canSend) return;
    if (kind === "later") onSend({ kind, at: scheduledAt });
    else if (kind === "batches") onSend({ kind, batchSize });
    else onSend({ kind: "now" });
  }

  const options = [
    { id: "now", label: t("customers.sendMessage.review.sendNow") },
    { id: "later", label: t("customers.sendMessage.review.scheduleLater") },
    { id: "batches", label: t("customers.sendMessage.review.sendBatches") },
  ] as const;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <p className={SECTION_LABEL_CLASS}>{t("customers.sendMessage.review.audienceOverview")}</p>
        <div className={clsx("flex flex-col gap-2 rounded-[8px] p-3", SOFT_BLUE_BG_CLASS)}>
          <div className="text-[14px] font-medium leading-[14px] text-[var(--octo-text-secondary)]">{t("customers.sendMessage.review.totalSelected")}</div>
          <div className={clsx("text-[16px] font-bold leading-4", BRAND_TEXT_CLASS)}>
            {totalSelected.toLocaleString("en-US")} {t("customers.sendMessage.review.customersSuffix")}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <p className={SECTION_LABEL_CLASS}>{t("customers.sendMessage.review.channelSummary")}</p>
        <div className="flex flex-col gap-2">
          {channels.map((channel) => (
            <div key={channel} className={clsx("flex flex-col gap-3 rounded-[12px] border p-3", OUTLINE_CLASS)}>
              <div className="flex items-center gap-2 text-[14px] font-bold leading-[14px] text-[var(--octo-text-primary)]">
                <ChannelIcon channel={channel} size={24} />
                {t(`customers.sendMessage.channel.${channel.toLowerCase()}`)}
              </div>
              <dl className="flex gap-8">
                <div className="flex flex-col gap-2">
                  <dt className="text-[12px] font-medium leading-3 text-[var(--octo-text-secondary)]">{t("customers.sendMessage.review.estMessages")}</dt>
                  <dd className="text-[14px] font-bold leading-[14px] text-[var(--octo-text-primary)]">{totalSelected.toLocaleString("en-US")}</dd>
                </div>
                <div className="flex flex-col gap-2">
                  <dt className="text-[12px] font-medium leading-3 text-[var(--octo-text-secondary)]">{t("customers.sendMessage.review.estCost")}</dt>
                  <dd className="text-[14px] font-bold leading-[14px] text-[var(--octo-text-primary)]">{formatSar(estimatedCostSar(channel, totalSelected))}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <p className={SECTION_LABEL_CLASS}>{t("customers.sendMessage.review.itemStatus")}</p>
        <div role="radiogroup" aria-label={t("customers.sendMessage.review.itemStatus")} className="flex flex-col gap-2">
          {options.map((option) => (
            <div key={option.id}>
              <button
                type="button"
                role="radio"
                aria-checked={kind === option.id}
                onClick={() => setKind(option.id)}
                className={clsx("flex min-h-6 items-center gap-2 text-[14px] font-medium leading-[14px]", kind === option.id ? BRAND_TEXT_CLASS : "text-[var(--octo-text-primary)]")}
              >
                <RadioDot checked={kind === option.id} />
                {option.label}
              </button>
              {option.id === "later" && kind === "later" && (
                <input
                  type="datetime-local"
                  aria-label={t("customers.sendMessage.review.scheduleAt")}
                  value={scheduledAt}
                  min={new Date().toISOString().slice(0, 16)}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className={clsx(TEXT_INPUT_CLASS, "ms-8 mt-2 max-w-[280px]")}
                />
              )}
              {option.id === "batches" && kind === "batches" && (
                <label className="ms-8 mt-2 flex items-center gap-2 text-[12px] font-medium text-[var(--octo-text-secondary)]">
                  {t("customers.sendMessage.review.batchSize")}
                  <select
                    value={batchSize}
                    onChange={(e) => setBatchSize(Number(e.target.value))}
                    className={clsx("h-10 rounded-[12px] border bg-[var(--octo-card)] px-2 text-[14px] text-[var(--octo-text-primary)]", OUTLINE_CLASS)}
                  >
                    {BATCH_SIZES.map((n) => <option key={n} value={n}>{n.toLocaleString("en-US")}</option>)}
                  </select>
                </label>
              )}
            </div>
          ))}
        </div>
      </div>

      <button type="button" onClick={send} disabled={!canSend} className={STEP_SUBMIT_CLASS}>
        {t("customers.sendMessage.send")}
      </button>
    </div>
  );
}
