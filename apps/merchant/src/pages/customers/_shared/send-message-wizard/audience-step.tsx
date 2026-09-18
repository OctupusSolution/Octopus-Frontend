// apps/merchant/src/pages/customers/_shared/send-message-wizard/audience-step.tsx
import { useState, type ReactNode } from "react";
import clsx from "clsx";
import { Bookmark, Check, X } from "lucide-react";
import { useI18n } from "@/app/providers/i18n-provider";
import type { SavedSegment } from "../customer-store";
import { DateField, PRIMARY_SUBMIT_CLASS, RadioBox, SelectBox } from "../form-controls";
import { useTagLabel } from "../tag-chips";
import { ALL_TAGS } from "../types";
import { AGE_RANGES, EMPTY_AUDIENCE_FILTERS, VISIT_FREQUENCIES, type AudienceFilters } from "./audience";

type Tab = "filters" | "segments" | "savedAudiences";

export function AudienceStep({
  value,
  segments,
  totalSelected,
  onChange,
  onNext,
}: {
  value: AudienceFilters;
  segments: readonly SavedSegment[];
  totalSelected: number;
  onChange: (next: AudienceFilters) => void;
  onNext: () => void;
}) {
  const { t } = useI18n();
  const tagLabel = useTagLabel();
  const [tab, setTab] = useState<Tab>("filters");

  function set<K extends keyof AudienceFilters>(key: K, val: AudienceFilters[K]) {
    onChange({ ...value, [key]: val });
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "filters", label: t("customers.sendMessage.tab.filters") },
    { id: "segments", label: t("customers.sendMessage.tab.segments") },
    { id: "savedAudiences", label: t("customers.sendMessage.tab.savedAudiences") },
  ];

  return (
    <div>
      <div role="tablist" className="inline-flex gap-[46px] border-b border-[var(--octo-divider)]">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={clsx(
              "-mb-px border-b-2 pb-2 text-[17px] transition-colors",
              tab === item.id ? "border-[#0D6EFD] text-[#0D6EFD]" : "border-transparent text-[var(--octo-text-secondary)] hover:text-[var(--octo-text-primary)]"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {value.segment && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-[8px] bg-[#0D6EFD]/[0.06] px-3 py-2 text-[13px] text-[#0D6EFD]">
          <span className="inline-flex items-center gap-1.5">
            <Bookmark size={15} /> {t("customers.sendMessage.usingAudience").replace("{name}", value.segment.name)}
          </span>
          <button type="button" onClick={() => set("segment", null)} aria-label={t("customers.sendMessage.clearAudience")} className="rounded p-0.5 hover:bg-[#0D6EFD]/10">
            <X size={15} />
          </button>
        </div>
      )}

      {tab === "filters" && (
        <div className="mt-4 flex flex-col gap-3.5">
          <Group label={t("customers.sendMessage.filter.tags")}>
            <SelectBox value={value.tag} onChange={(v) => set("tag", v)} placeholderShown={value.tag === ""} ariaLabel={t("customers.sendMessage.filter.tags")}>
              <option value="">{t("customers.sendMessage.filter.tagsPlaceholder")}</option>
              {ALL_TAGS.map((tag) => <option key={tag} value={tag}>{tagLabel(tag)}</option>)}
            </SelectBox>
          </Group>
          <Group label={t("customers.sendMessage.filter.visitFrequency")}>
            <SelectBox
              value={value.visitFrequency}
              onChange={(v) => set("visitFrequency", v as AudienceFilters["visitFrequency"])}
              placeholderShown={value.visitFrequency === ""}
              ariaLabel={t("customers.sendMessage.filter.visitFrequency")}
            >
              <option value="">{t("customers.sendMessage.filter.visitFrequencyPlaceholder")}</option>
              {VISIT_FREQUENCIES.map((f) => <option key={f} value={f}>{t(`customers.sendMessage.frequency.${f}`)}</option>)}
            </SelectBox>
          </Group>
          <RangeRow label={t("customers.sendMessage.filter.totalSpend")}>
            {(["totalSpendFrom", "totalSpendTo"] as const).map((key, i) => (
              <SubField key={key} label={t(i === 0 ? "customers.filter.from" : "customers.filter.to")}>
                <div className="flex h-10 items-center gap-3 rounded-[8px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 focus-within:border-[#0D6EFD] focus-within:ring-2 focus-within:ring-[#0D6EFD]/25">
                  <span className="text-[14px] text-[var(--octo-text-primary)]">SAR</span>
                  <input
                    value={value[key]}
                    inputMode="decimal"
                    aria-label={`${t("customers.sendMessage.filter.totalSpend")} ${t(i === 0 ? "customers.filter.from" : "customers.filter.to")}`}
                    onChange={(e) => set(key, e.target.value.replace(/[^\d.]/g, ""))}
                    placeholder={t("customers.sendMessage.filter.enterAmount")}
                    className="h-full w-full flex-1 bg-transparent text-[14px] text-[var(--octo-text-primary)] outline-none placeholder:text-[var(--octo-text-muted)]"
                  />
                </div>
              </SubField>
            ))}
          </RangeRow>
          <DateRange label={t("customers.sendMessage.filter.lastVisit")} from={value.lastVisitFrom} to={value.lastVisitTo} onFrom={(v) => set("lastVisitFrom", v)} onTo={(v) => set("lastVisitTo", v)} />
          <DateRange label={t("customers.sendMessage.filter.customerSince")} from={value.customerSinceFrom} to={value.customerSinceTo} onFrom={(v) => set("customerSinceFrom", v)} onTo={(v) => set("customerSinceTo", v)} />

          <Group label={t("customers.sendMessage.filter.gender")} indent>
            <div role="radiogroup" aria-label={t("customers.sendMessage.filter.gender")} className="grid grid-cols-2 gap-6">
              {(["Male", "Female"] as const).map((g) => (
                <RadioBox
                  key={g}
                  label={t(g === "Male" ? "customers.addCustomer.male" : "customers.addCustomer.female")}
                  checked={value.gender === g}
                  onClick={() => set("gender", value.gender === g ? "" : g)}
                />
              ))}
            </div>
          </Group>

          <Group label={t("customers.sendMessage.filter.ageRange")}>
            <SelectBox value={value.ageRange} onChange={(v) => set("ageRange", v as AudienceFilters["ageRange"])} placeholderShown={value.ageRange === ""} ariaLabel={t("customers.sendMessage.filter.ageRange")}>
              <option value="">{t("customers.sendMessage.filter.ageRangePlaceholder")}</option>
              {AGE_RANGES.map((r) => <option key={r} value={r}>{t(`customers.sendMessage.age.${r}`)}</option>)}
            </SelectBox>
          </Group>
        </div>
      )}

      {tab === "segments" && (
        <div className="mt-4 flex flex-col gap-2">
          <p className="text-[13px] text-[var(--octo-text-muted)]">{t("customers.sendMessage.segmentsHint")}</p>
          {ALL_TAGS.map((tag) => (
            <ChoiceRow
              key={tag}
              label={tagLabel(tag)}
              selected={value.tag === tag && !value.segment}
              onClick={() => onChange({ ...EMPTY_AUDIENCE_FILTERS, tag })}
            />
          ))}
        </div>
      )}

      {tab === "savedAudiences" && (
        <div className="mt-4 flex flex-col gap-2">
          {segments.length === 0 ? (
            <p className="text-[13px] text-[var(--octo-text-muted)]">{t("customers.sendMessage.savedAudiencesEmpty")}</p>
          ) : (
            segments.map((segment) => (
              <ChoiceRow
                key={segment.id}
                label={segment.name}
                selected={value.segment?.id === segment.id}
                onClick={() => onChange({ ...EMPTY_AUDIENCE_FILTERS, segment: { id: segment.id, name: segment.name, filters: segment.filters } })}
              />
            ))
          )}
        </div>
      )}

      <button
        type="button"
        onClick={onNext}
        title={t("customers.sendMessage.matchCount").replace("{count}", totalSelected.toLocaleString("en-US"))}
        className={clsx(PRIMARY_SUBMIT_CLASS, "!mt-5")}
      >
        {t("customers.sendMessage.next")}
      </button>
    </div>
  );
}

function Group({ label, indent, children }: { label: string; indent?: boolean; children: ReactNode }) {
  return (
    <div>
      <p className={clsx("mb-2 text-[16px] text-[var(--octo-text-primary)]", indent && "px-2.5")}>{label}</p>
      {children}
    </div>
  );
}

function RangeRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[16px] text-[var(--octo-text-primary)]">{label}</p>
      <div className="mt-1 grid grid-cols-2 gap-6">{children}</div>
    </div>
  );
}

function SubField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12.5px] text-[var(--octo-text-primary)]">{label}</span>
      {children}
    </div>
  );
}

function DateRange({ label, from, to, onFrom, onTo }: { label: string; from: string; to: string; onFrom: (v: string) => void; onTo: (v: string) => void }) {
  const { t } = useI18n();
  return (
    <RangeRow label={label}>
      <SubField label={t("customers.filter.from")}>
        <DateField value={from} onChange={onFrom} placeholder={t("customers.sendMessage.filter.selectDate")} ariaLabel={`${label} ${t("customers.filter.from")}`} />
      </SubField>
      <SubField label={t("customers.filter.to")}>
        <DateField value={to} onChange={onTo} placeholder={t("customers.sendMessage.filter.selectDate")} ariaLabel={`${label} ${t("customers.filter.to")}`} />
      </SubField>
    </RangeRow>
  );
}

function ChoiceRow({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={clsx(
        "flex h-11 items-center justify-between rounded-[8px] border px-3 text-start text-[14px] transition-colors",
        selected ? "border-[#0D6EFD] bg-[#0D6EFD]/[0.04] text-[#0D6EFD]" : "border-[var(--octo-border-input)] text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]"
      )}
    >
      {label}
      {selected && <Check size={16} />}
    </button>
  );
}
