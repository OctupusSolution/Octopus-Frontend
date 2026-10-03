// apps/merchant/src/pages/customers/_shared/send-message-wizard/index.tsx
import { useEffect, useMemo, useState } from "react";
import { Modal } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { customerActions, type SavedSegment } from "../customer-store";
import { AudienceStep } from "./audience-step";
import { ChannelContentStep } from "./channel-content-step";
import { ReviewSendStep, type SendTiming } from "./review-send-step";
import { StepRail } from "./step-rail";
import { EMPTY_AUDIENCE_FILTERS, audienceOf, type AudienceFilters } from "./audience";
import type { CommunicationChannel, CustomerRecord } from "../types";

type Step = 1 | 2 | 3;

// The frame's 738px card: 24px padding, a 24px semibold title and 16px between
// the title and the body. The child selectors outrank the primitive's own
// title and body classes.
const MODAL_CLASS =
  "max-w-[738px] flex max-h-[calc(100dvh-2rem)] flex-col [&>div]:-mx-1 [&>div]:min-h-0 [&>div]:flex-1 [&>div]:overflow-y-auto [&>div]:px-1 [&>div]:[scrollbar-width:none] [&>div::-webkit-scrollbar]:hidden p-6 [&>h2]:text-[24px] [&>h2]:font-semibold [&>h2]:leading-6 [&>h2+div]:mt-4";

export function SendMessageWizard({
  open,
  customers,
  segments,
  onClose,
  onSent,
  onError,
}: {
  open: boolean;
  customers: readonly CustomerRecord[];
  segments: readonly SavedSegment[];
  onClose: () => void;
  onSent: (count: number, timing: SendTiming) => void;
  /** The server refused the audience or the send; the wizard stays open. */
  onError: (err: unknown) => void;
}) {
  const { t, locale } = useI18n();
  const [step, setStep] = useState<Step>(1);
  const [filters, setFilters] = useState<AudienceFilters>(EMPTY_AUDIENCE_FILTERS);
  const [channels, setChannels] = useState<CommunicationChannel[]>(["WhatsApp"]);
  const [message, setMessage] = useState("");

  const [sending, setSending] = useState(false);
  // On real data the audience is the server's count, asked again shortly after
  // the filters settle; until it answers (and on the mock data) the loaded
  // customers are counted here.
  const [serverCount, setServerCount] = useState<number | null>(null);
  const localCount = useMemo(() => audienceOf(customers, filters).length, [customers, filters]);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      customerActions.estimateAudience(filters).then(
        (count) => !cancelled && setServerCount(count),
        (err: unknown) => {
          if (cancelled) return;
          setServerCount(null);
          onError(err);
        }
      );
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, filters]);
  const totalSelected = serverCount ?? localCount;

  function send(timing: SendTiming) {
    if (sending) return;
    setSending(true);
    customerActions
      .sendMessage({ filters, channels, message, timing, language: locale === "ar" ? "ar" : "en" })
      .then(
        () => {
          onSent(totalSelected, timing);
          close();
        },
        (err: unknown) => onError(err)
      )
      .finally(() => setSending(false));
  }

  function reset() {
    setStep(1);
    setFilters(EMPTY_AUDIENCE_FILTERS);
    setChannels(["WhatsApp"]);
    setMessage("");
    setServerCount(null);
  }

  function close() {
    reset();
    onClose();
  }

  const labels = [
    t("customers.sendMessage.step.audience"),
    t("customers.sendMessage.step.channelContent"),
    t("customers.sendMessage.step.reviewSend"),
  ];

  return (
    <Modal open={open} onClose={close} title={t("customers.sendMessage.title")} className={MODAL_CLASS}>
      <div className="flex flex-col gap-4">
        <StepRail step={step} labels={labels} ariaLabel={t("customers.sendMessage.stepsLabel")} onStepClick={(n) => setStep(n as Step)} />
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
            onSend={send}
          />
        )}
      </div>
    </Modal>
  );
}
