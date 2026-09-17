// apps/merchant/src/pages/customers/_shared/send-message-wizard/audience-step.tsx
import { useState } from "react";
import { Tabs } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";

export interface AudienceFilters {
  totalSpendFrom: string;
  totalSpendTo: string;
  lastVisitFrom: string;
  lastVisitTo: string;
  customerSinceFrom: string;
  customerSinceTo: string;
  gender: "" | "Male" | "Female";
}

export const EMPTY_AUDIENCE_FILTERS: AudienceFilters = {
  totalSpendFrom: "", totalSpendTo: "", lastVisitFrom: "", lastVisitTo: "", customerSinceFrom: "", customerSinceTo: "", gender: "",
};

export function AudienceStep({ value, onChange, onNext }: { value: AudienceFilters; onChange: (next: AudienceFilters) => void; onNext: () => void }) {
  const { t } = useI18n();
  const [tab, setTab] = useState("filters");

  function set<K extends keyof AudienceFilters>(key: K, val: AudienceFilters[K]) {
    onChange({ ...value, [key]: val });
  }

  return (
    <div>
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: "filters", label: t("customers.sendMessage.tab.filters") },
          { id: "segments", label: t("customers.sendMessage.tab.segments") },
          { id: "savedAudiences", label: t("customers.sendMessage.tab.savedAudiences") },
        ]}
      />

      {tab === "filters" && (
        <div className="mt-4 flex flex-col gap-4">
          <RangeRow label={t("customers.sendMessage.filter.totalSpend")} from={value.totalSpendFrom} to={value.totalSpendTo} onFrom={(v) => set("totalSpendFrom", v)} onTo={(v) => set("totalSpendTo", v)} type="text" prefix="SAR" />
          <RangeRow label={t("customers.sendMessage.filter.lastVisit")} from={value.lastVisitFrom} to={value.lastVisitTo} onFrom={(v) => set("lastVisitFrom", v)} onTo={(v) => set("lastVisitTo", v)} type="date" />
          <RangeRow label={t("customers.sendMessage.filter.customerSince")} from={value.customerSinceFrom} to={value.customerSinceTo} onFrom={(v) => set("customerSinceFrom", v)} onTo={(v) => set("customerSinceTo", v)} type="date" />

          <div>
            <p className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{t("customers.sendMessage.filter.gender")}</p>
            <div className="mt-1.5 flex gap-2">
              {(["Male", "Female"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => set("gender", value.gender === g ? "" : g)}
                  className={`flex-1 rounded-[9px] border px-3 py-2 text-[12.5px] ${value.gender === g ? "border-[#0D6EFD] text-[#0D6EFD]" : "border-[var(--octo-border-input)] text-[var(--octo-text-primary)]"}`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "segments" && <p className="mt-4 text-[12.5px] text-[var(--octo-text-muted)]">{t("customers.sendMessage.segmentsEmpty")}</p>}
      {tab === "savedAudiences" && <p className="mt-4 text-[12.5px] text-[var(--octo-text-muted)]">{t("customers.sendMessage.savedAudiencesEmpty")}</p>}

      <button type="button" onClick={onNext} className="mt-6 w-full rounded-[10px] bg-[#0D6EFD] py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90">
        {t("customers.sendMessage.next")}
      </button>
    </div>
  );
}

function RangeRow({
  label, from, to, onFrom, onTo, type, prefix,
}: { label: string; from: string; to: string; onFrom: (v: string) => void; onTo: (v: string) => void; type: "text" | "date"; prefix?: string }) {
  const { t } = useI18n();
  return (
    <div>
      <p className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{label}</p>
      <div className="mt-1.5 grid grid-cols-2 gap-2">
        {[{ label: t("customers.filter.from"), value: from, onChange: onFrom }, { label: t("customers.filter.to"), value: to, onChange: onTo }].map((field) => (
          <label key={field.label} className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
            {field.label}
            <span className="flex items-stretch rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)]">
              {prefix && <span className="flex items-center px-2 text-[12px] normal-case text-[var(--octo-text-muted)]">{prefix}</span>}
              <input
                type={type}
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                placeholder={prefix ? t("customers.sendMessage.filter.enterAmount") : undefined}
                className="w-full flex-1 rounded-e-[9px] bg-transparent px-2.5 py-1.5 text-[12.5px] normal-case text-[var(--octo-text-primary)] outline-none"
              />
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
