// apps/merchant/src/pages/customers/_shared/send-message-wizard/review-send-step.tsx
import { useState } from "react";
import clsx from "clsx";
import { useI18n } from "@/app/providers/i18n-provider";
import { PRIMARY_SUBMIT_CLASS, RadioDot, TEXT_INPUT_CLASS } from "../form-controls";
import { formatSar } from "../format";
import { ChannelIcon } from "./channel-icon";
import { estimatedCostSar } from "./audience";
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
    <div className="mt-3">
      <p className="text-[16px] text-[var(--octo-text-primary)]">{t("customers.sendMessage.review.audienceOverview")}</p>
      <div className="mt-2 rounded-[8px] bg-[#3B82F6]/[0.05] px-4 py-3">
        <div className="text-[14px] text-[var(--octo-text-secondary)]">{t("customers.sendMessage.review.totalSelected")}</div>
        <div className="mt-0.5 text-[18px] font-semibold text-[#0D6EFD]">
          {totalSelected.toLocaleString("en-US")} {t("customers.sendMessage.review.customersSuffix")}
        </div>
      </div>

      <p className="mt-4 text-[16px] text-[var(--octo-text-primary)]">{t("customers.sendMessage.review.channelSummary")}</p>
      <div className="mt-2 flex flex-col gap-2">
        {channels.map((channel) => (
          <div key={channel} className="rounded-[8px] border border-[var(--octo-border-input)] px-3 py-2.5">
            <div className="flex items-center gap-2 text-[15px] font-semibold text-[var(--octo-text-primary)]">
              <ChannelIcon channel={channel} size={24} />
              {t(`customers.sendMessage.channel.${channel.toLowerCase()}`)}
            </div>
            <dl className="mt-2 flex gap-8">
              <div>
                <dt className="text-[14px] text-[var(--octo-text-secondary)]">{t("customers.sendMessage.review.estMessages")}</dt>
                <dd className="mt-0.5 text-[16px] font-semibold text-[var(--octo-text-primary)]">{totalSelected.toLocaleString("en-US")}</dd>
              </div>
              <div>
                <dt className="text-[14px] text-[var(--octo-text-secondary)]">{t("customers.sendMessage.review.estCost")}</dt>
                <dd className="mt-0.5 text-[16px] font-semibold text-[var(--octo-text-primary)]">{formatSar(estimatedCostSar(channel, totalSelected))}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>

      <p className="mt-4 text-[16px] text-[var(--octo-text-primary)]">{t("customers.sendMessage.review.itemStatus")}</p>
      <div role="radiogroup" aria-label={t("customers.sendMessage.review.itemStatus")} className="mt-2 flex flex-col gap-3">
        {options.map((option) => (
          <div key={option.id}>
            <button
              type="button"
              role="radio"
              aria-checked={kind === option.id}
              onClick={() => setKind(option.id)}
              className={clsx("flex items-center gap-2.5 ps-0.5 text-[15px]", kind === option.id ? "text-[#0D6EFD]" : "text-[var(--octo-text-primary)]")}
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
              <label className="ms-8 mt-2 flex items-center gap-2 text-[13px] text-[var(--octo-text-secondary)]">
                {t("customers.sendMessage.review.batchSize")}
                <select
                  value={batchSize}
                  onChange={(e) => setBatchSize(Number(e.target.value))}
                  className="h-9 rounded-[8px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-2 text-[14px] text-[var(--octo-text-primary)]"
                >
                  {BATCH_SIZES.map((n) => <option key={n} value={n}>{n.toLocaleString("en-US")}</option>)}
                </select>
              </label>
            )}
          </div>
        ))}
      </div>

      <button type="button" onClick={send} disabled={!canSend} className={PRIMARY_SUBMIT_CLASS}>
        {t("customers.sendMessage.send")}
      </button>
    </div>
  );
}
