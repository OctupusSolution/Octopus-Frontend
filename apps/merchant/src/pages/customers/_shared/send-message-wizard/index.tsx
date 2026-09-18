// apps/merchant/src/pages/customers/_shared/send-message-wizard/index.tsx
import { useMemo, useState } from "react";
import { Modal } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { AudienceStep, EMPTY_AUDIENCE_FILTERS, type AudienceFilters } from "./audience-step";
import { ChannelContentStep } from "./channel-content-step";
import { ReviewSendStep } from "./review-send-step";
import type { CommunicationChannel } from "../types";
import type { CustomerRecord } from "../types";

type Step = 1 | 2 | 3;

function matchesAudience(customer: CustomerRecord, filters: AudienceFilters): boolean {
  if (filters.totalSpendFrom && customer.totalSpendSar < Number(filters.totalSpendFrom)) return false;
  if (filters.totalSpendTo && customer.totalSpendSar > Number(filters.totalSpendTo)) return false;
  if (filters.lastVisitFrom && customer.lastVisit < filters.lastVisitFrom) return false;
  if (filters.lastVisitTo && customer.lastVisit > filters.lastVisitTo) return false;
  if (filters.customerSinceFrom && customer.customerSince < filters.customerSinceFrom) return false;
  if (filters.customerSinceTo && customer.customerSince > filters.customerSinceTo) return false;
  if (filters.gender && customer.gender !== filters.gender) return false;
  if (filters.tag && !customer.tags.includes(filters.tag)) return false;
  return true;
}

export function SendMessageWizard({
  open,
  customers,
  onClose,
  onSent,
}: {
  open: boolean;
  customers: readonly CustomerRecord[];
  onClose: () => void;
  onSent: (count: number) => void;
}) {
  const { t } = useI18n();
  const [step, setStep] = useState<Step>(1);
  const [filters, setFilters] = useState<AudienceFilters>(EMPTY_AUDIENCE_FILTERS);
  const [channels, setChannels] = useState<CommunicationChannel[]>(["WhatsApp"]);
  const [message, setMessage] = useState("");

  const totalSelected = useMemo(() => customers.filter((c) => matchesAudience(c, filters)).length, [customers, filters]);

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

  return (
    <Modal open={open} onClose={close} title={t("customers.sendMessage.title")} className="max-w-[560px] max-h-[85vh] overflow-y-auto octo-scroll">
      <div className="flex items-center gap-2">
        {STEPS.map((s, index) => (
          <div key={s.id} className="flex flex-1 items-center gap-2">
            <span
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${
                step >= s.id ? "bg-[#0D6EFD] text-white" : "bg-[var(--octo-track)] text-[var(--octo-text-muted)]"
              }`}
            >
              {s.id}
            </span>
            <span className={`text-[11.5px] font-medium ${step === s.id ? "text-[var(--octo-text-primary)]" : "text-[var(--octo-text-muted)]"}`}>{s.label}</span>
            {index < STEPS.length - 1 && <span className={`h-px flex-1 ${step > s.id ? "bg-[#0D6EFD]" : "bg-[var(--octo-divider)]"}`} />}
          </div>
        ))}
      </div>

      <div className="mt-5">
        {step === 1 && <AudienceStep value={filters} onChange={setFilters} onNext={() => setStep(2)} />}
        {step === 2 && (
          <ChannelContentStep
            channels={channels}
            onChannelsChange={setChannels}
            message={message}
            onMessageChange={setMessage}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}
        {step === 3 && (
          <ReviewSendStep
            totalSelected={totalSelected}
            channels={channels}
            onBack={() => setStep(2)}
            onSend={() => { onSent(totalSelected); close(); }}
          />
        )}
      </div>
    </Modal>
  );
}
