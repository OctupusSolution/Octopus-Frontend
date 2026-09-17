// apps/merchant/src/pages/customers/_shared/send-message-wizard/review-send-step.tsx
import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import type { CommunicationChannel } from "../types";

type SendTiming = "now" | "later" | "batches";
const COST_PER_MESSAGE_SAR = 0.125;

export function ReviewSendStep({
  totalSelected,
  channels,
  onBack,
  onSend,
}: {
  totalSelected: number;
  channels: CommunicationChannel[];
  onBack: () => void;
  onSend: () => void;
}) {
  const { t } = useI18n();
  const [timing, setTiming] = useState<SendTiming>("now");
  const estimatedCost = (totalSelected * COST_PER_MESSAGE_SAR).toFixed(2);

  return (
    <div>
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{t("customers.sendMessage.review.audienceOverview")}</p>
      <div className="mt-1.5 rounded-[9px] bg-[var(--octo-track)] px-3 py-2.5">
        <div className="text-[11px] text-[var(--octo-text-muted)]">{t("customers.sendMessage.review.totalSelected")}</div>
        <div className="text-[15px] font-bold text-[#0D6EFD]">{totalSelected.toLocaleString()} {t("customers.sendMessage.review.customersSuffix")}</div>
      </div>

      <p className="mt-4 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{t("customers.sendMessage.review.channelSummary")}</p>
      <div className="mt-1.5 flex flex-col gap-2">
        {channels.map((channel) => (
          <div key={channel} className="flex items-center justify-between rounded-[9px] border border-[var(--octo-divider)] px-3 py-2.5">
            <span className="flex items-center gap-2 text-[12.5px] font-semibold text-[var(--octo-text-primary)]">
              <MessageCircle size={15} className="text-[#25D366]" /> {channel}
            </span>
            <span className="text-end text-[11.5px] text-[var(--octo-text-muted)]">
              {t("customers.sendMessage.review.estMessages")}: {totalSelected} · {t("customers.sendMessage.review.estCost")}: SAR {estimatedCost}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-4 text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{t("customers.sendMessage.review.itemStatus")}</p>
      <div className="mt-1.5 flex flex-col gap-1.5">
        {(
          [
            { id: "now", label: t("customers.sendMessage.review.sendNow") },
            { id: "later", label: t("customers.sendMessage.review.scheduleLater") },
            { id: "batches", label: t("customers.sendMessage.review.sendBatches") },
          ] as const
        ).map((option) => (
          <label key={option.id} className="flex items-center gap-2 text-[12.5px] text-[var(--octo-text-primary)]">
            <input type="radio" name="send-timing" checked={timing === option.id} onChange={() => setTiming(option.id)} />
            {option.label}
          </label>
        ))}
      </div>

      <div className="mt-6 flex gap-2">
        <Button variant="secondary" onClick={onBack} className="flex-1">{t("customers.sendMessage.back")}</Button>
        <Button variant="primary" onClick={onSend} className="flex-1">{t("customers.sendMessage.send")}</Button>
      </div>
    </div>
  );
}
