// apps/merchant/src/pages/customers/segments/index.tsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { CrmCustomerCriteriaDto } from "@octopus/api-client";
import { useI18n } from "@/app/providers/i18n-provider";
import { ShellIcon } from "@/shared/ui/shell-icon";
import { actionErrorKey } from "../_shared/crm-api";
import { useCustomerSync, useCustomers, type SavedSegment } from "../_shared/customer-store";
import { EMPTY_LIST_FILTERS } from "../_shared/list-filter";
import { SendMessageWizard } from "../_shared/send-message-wizard";
import { Toast, useToast } from "../_shared/toast";
import { CreateSegmentModal } from "./create-segment-modal";
import { SegmentCard } from "./segment-card";
import { segmentActions, useSegments } from "./segments-store";

export function SegmentsPage() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const { segments } = useSegments();
  // The campaign wizard counts and messages the CRM's customers, so they are loaded here too.
  useCustomerSync();
  const customers = useCustomers();
  const [createOpen, setCreateOpen] = useState(false);
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [toast, showToast, toastTone] = useToast();

  // The wizard lists segments in the customer store's shape.
  const wizardSegments = useMemo<SavedSegment[]>(
    () => (segments ?? []).map((s) => ({ id: s.id, name: s.name, filters: EMPTY_LIST_FILTERS, criteria: s.criteria, createdAt: "" })),
    [segments]
  );

  const create = async (name: string, criteria: CrmCustomerCriteriaDto) => {
    try {
      await segmentActions.create(name, criteria);
      showToast(t("customers.segments.create.created").replace("{name}", name));
    } catch (err) {
      showToast(t(actionErrorKey(err)), "error");
      throw err;
    }
  };

  return (
    <div className="px-4 pb-10 pt-6 sm:px-6 lg:ps-12 lg:pt-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-3">
          <h1 className="text-[24px] font-bold leading-[24px] text-[var(--octo-text-primary)]">{t("customers.segments.title")}</h1>
          <p className="text-[14px] font-medium leading-[14px] text-[var(--octo-text-secondary)]">{t("customers.segments.subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="flex h-12 items-center gap-1 rounded-[8px] bg-[#0d6efd] px-3 py-2 text-[18px] font-bold leading-[18px] text-white transition-opacity hover:opacity-90"
        >
          <ShellIcon name="crm-seg-plus.svg" />
          {t("customers.segments.add")}
        </button>
      </header>

      {segments === null ? (
        <p className="mt-8 text-[14px] text-[var(--octo-text-secondary)]">{t("common.loading")}</p>
      ) : segments.length === 0 ? (
        <p className="mt-8 text-[14px] text-[var(--octo-text-secondary)]">{t("customers.segments.empty")}</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-8 md:grid-cols-2 xl:grid-cols-3">
          {segments.map((segment) => (
            <SegmentCard
              key={segment.id}
              segment={segment}
              onEditRules={() => navigate(`/customers/segments/${encodeURIComponent(segment.id)}`)}
              onCreateCampaign={() => setCampaignOpen(true)}
            />
          ))}
        </div>
      )}

      <CreateSegmentModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={create} />

      <SendMessageWizard
        open={campaignOpen}
        customers={customers}
        segments={wizardSegments}
        onClose={() => setCampaignOpen(false)}
        onError={(err) => showToast(t(actionErrorKey(err)), "error")}
        onSent={(count, timing) => {
          const n = count.toLocaleString("en-US");
          if (timing.kind === "later") {
            const at = new Date(timing.at).toLocaleString(locale === "ar" ? "ar-SA" : "en-GB", { dateStyle: "medium", timeStyle: "short" });
            showToast(t("customers.sendMessage.scheduledConfirm").replace("{count}", n).replace("{at}", at));
          } else if (timing.kind === "batches") {
            showToast(t("customers.sendMessage.batchedConfirm").replace("{count}", n).replace("{size}", String(timing.batchSize)));
          } else {
            showToast(t("customers.sendMessage.sentConfirm").replace("{count}", n));
          }
        }}
      />

      <Toast message={toast} tone={toastTone} />
    </div>
  );
}
