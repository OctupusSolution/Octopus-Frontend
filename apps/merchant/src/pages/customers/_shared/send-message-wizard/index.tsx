// apps/merchant/src/pages/customers/_shared/send-message-wizard/index.tsx
import { useMemo, useState } from "react";
import clsx from "clsx";
import { Modal } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { CRM_MODAL_CLASS } from "../action-button";
import type { SavedSegment } from "../customer-store";
import { AudienceStep } from "./audience-step";
import { ChannelContentStep } from "./channel-content-step";
import { ReviewSendStep, type SendTiming } from "./review-send-step";
import { EMPTY_AUDIENCE_FILTERS, audienceOf, type AudienceFilters } from "./audience";
import type { CommunicationChannel, CustomerRecord } from "../types";

type Step = 1 | 2 | 3;

export function SendMessageWizard({
  open,
  customers,
  segments,
  onClose,
  onSent,
}: {
  open: boolean;
  customers: readonly CustomerRecord[];
  segments: readonly SavedSegment[];
  onClose: () => void;
  onSent: (count: number, timing: SendTiming) => void;
}) {
  const { t } = useI18n();
  const [step, setStep] = useState<Step>(1);
  const [filters, setFilters] = useState<AudienceFilters>(EMPTY_AUDIENCE_FILTERS);
  const [channels, setChannels] = useState<CommunicationChannel[]>(["WhatsApp"]);
  const [message, setMessage] = useState("");

  const totalSelected = useMemo(() => audienceOf(customers, filters).length, [customers, filters]);

  function reset() {
    setStep(1);
    setFilters(EMPTY_AUDIENCE_FILTERS);
    setChannels(["WhatsApp"]);
    setMessage("");
  }

  function close() {
    reset();
    onClose();
  }

  const STEPS: { id: Step; label: string }[] = [
    { id: 1, label: t("customers.sendMessage.step.audience") },
    { id: 2, label: t("customers.sendMessage.step.channelContent") },
    { id: 3, label: t("customers.sendMessage.step.reviewSend") },
  ];
  // Blue progress runs from step 1 to the next step (send message.png shows
  // 1→2 blue while on step 1; send message (1).png is fully blue on step 3).
  const progress = step === 1 ? "50%" : "100%";

  return (
    <Modal open={open} onClose={close} title={t("customers.sendMessage.title")} className={`max-w-[760px] max-h-[94vh] overflow-y-auto octo-scroll ${CRM_MODAL_CLASS}`}>
      <nav aria-label={t("customers.sendMessage.stepsLabel")} className="relative mt-1">
        <div className="absolute inset-x-[64px] top-[14px] h-[3px] rounded-full bg-[var(--octo-track)]" aria-hidden="true">
          <div className="h-full rounded-full bg-[#0D6EFD] transition-[width]" style={{ width: progress }} />
        </div>
        <ol className="relative flex items-start justify-between">
          {STEPS.map((s) => {
            const done = step > s.id;
            const current = step === s.id;
            const reachable = s.id < step;
            return (
              <li key={s.id} className="flex w-[128px] flex-col items-center">
                <button
                  type="button"
                  disabled={!reachable}
                  onClick={() => setStep(s.id)}
                  aria-current={current ? "step" : undefined}
                  className={clsx(
                    "grid h-[30px] w-[30px] place-items-center rounded-full text-[13px] font-medium",
                    done && "bg-[#0D6EFD] text-white",
                    current && "border-2 border-[#0D6EFD] bg-[var(--octo-card)] text-[#0D6EFD]",
                    !done && !current && "bg-[var(--octo-track)] text-[var(--octo-text-secondary)]",
                    reachable && "cursor-pointer hover:opacity-90"
                  )}
                >
                  {s.id}
                </button>
                <span className={clsx("mt-2 whitespace-nowrap text-[15px]", done || current ? "text-[#0D6EFD]" : "text-[var(--octo-text-secondary)]")}>{s.label}</span>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="mt-3">
        {step === 1 && <AudienceStep value={filters} segments={segments} totalSelected={totalSelected} onChange={setFilters} onNext={() => setStep(2)} />}
        {step === 2 && (
          <ChannelContentStep
            channels={channels}
            onChannelsChange={setChannels}
            message={message}
            onMessageChange={setMessage}
            onNext={() => setStep(3)}
          />
        )}
        {step === 3 && (
          <ReviewSendStep
            totalSelected={totalSelected}
            channels={channels}
            onSend={(timing) => { onSent(totalSelected, timing); close(); }}
          />
        )}
      </div>
    </Modal>
  );
}
