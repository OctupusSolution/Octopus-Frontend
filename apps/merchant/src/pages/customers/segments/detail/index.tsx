import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, TrendingUp, TrendingDown, Layers, X, Users } from "lucide-react";
import { Button, EmptyState, Input, Select } from "@ui/primitives";
import {
  customerSegments,
  customerRows,
  segmentRuleFields,
  segmentRuleOperators,
} from "@/shared/api/mock-customers";
import { sparklinePaths } from "@/shared/lib/sparkline";
import { useI18n } from "@/app/providers/i18n-provider";
import { labelKey } from "@/shared/lib/labels";

const RULE_KEY: Record<string, string> = {
  "seg-vip": "customers.segments.rules.vip",
  "seg-regular": "customers.segments.rules.regular",
  "seg-new": "customers.segments.rules.new",
  "seg-at-risk": "customers.segments.rules.atRisk",
  "seg-churned": "customers.segments.rules.churned",
  "seg-big-spenders": "customers.segments.rules.bigSpenders",
  "seg-ramadan-only": "customers.segments.rules.ramadanOnly",
  "seg-delivery-only": "customers.segments.rules.deliveryOnly",
};

function formatNumber(n: number, locale: string): string {
  return new Intl.NumberFormat(locale, { numberingSystem: "latn" }).format(n);
}

interface RuleCondition {
  id: number;
  field: string;
  operator: string;
  value: string;
}

let conditionSeq = 1;

function newCondition(): RuleCondition {
  return { id: conditionSeq++, field: segmentRuleFields[0], operator: segmentRuleOperators[0], value: "" };
}

export function CustomerSegmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const segment = customerSegments.find((s) => s.id === id);
  const [conditions, setConditions] = useState<RuleCondition[]>([newCondition()]);
  const [saved, setSaved] = useState(false);

  const { line, area } = sparklinePaths(segment?.membershipTrend ?? [], 600, 120);

  const preview = useMemo(() => customerRows.slice(0, 5), []);

  const back = (
    <Button
      variant="ghost"
      size="sm"
      icon={<ArrowLeft size={13} className="rtl:rotate-180" />}
      onClick={() => navigate("/customers/segments")}
    >
      {t("customers.segments.detail.back")}
    </Button>
  );

  if (!segment) {
    return (
      <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
        {back}
        <EmptyState
          className="mt-4 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)]"
          icon={<Users size={18} />}
          title={t("customers.segments.detail.notFound")}
        />
      </div>
    );
  }

  const positive = segment.growth >= 0;

  const updateCondition = (cid: number, patch: Partial<RuleCondition>) => {
    setSaved(false);
    setConditions((prev) => prev.map((c) => (c.id === cid ? { ...c, ...patch } : c)));
  };

  const removeCondition = (cid: number) => {
    setSaved(false);
    setConditions((prev) => (prev.length === 1 ? prev : prev.filter((c) => c.id !== cid)));
  };

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      {back}

      <header className="mt-3 flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t(labelKey(segment.name))}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)]">
            {formatNumber(segment.memberCount, locale)} {t("customers.segments.members")} · {segment.percentOfBase.toFixed(1)}% {t("customers.segments.ofBase")}
          </p>
        </div>
        <div className={`flex items-center gap-1 text-[13px] font-semibold ${positive ? "text-[#16a34a]" : "text-[#dc2626]"}`}>
          {positive ? <TrendingUp size={15} strokeWidth={2.5} /> : <TrendingDown size={15} strokeWidth={2.5} />}
          {positive ? "+" : ""}{segment.growth.toFixed(1)}%
        </div>
      </header>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_320px]">
        <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
          <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
            {t("customers.segments.detail.trend")}
          </h2>
          <svg viewBox="0 0 600 120" preserveAspectRatio="none" className="mt-2 h-[120px] w-full" aria-hidden="true">
            <defs>
              <linearGradient id="segment-detail-spark" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0D6EFD" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#0D6EFD" stopOpacity={0} />
              </linearGradient>
            </defs>
            <path d={area} fill="url(#segment-detail-spark)" />
            <path d={line} fill="none" stroke="#0D6EFD" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          </svg>

          <div className="mt-4 grid grid-cols-2 gap-2 rounded-[9px] border border-[var(--octo-divider)] p-3 sm:grid-cols-3">
            <div>
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{t("customers.segments.avgSpend")}</div>
              <div className="mt-0.5 text-[15px] font-semibold text-[var(--octo-text-primary)]">{segment.avgSpend}</div>
            </div>
            <div>
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{t("customers.segments.members")}</div>
              <div className="mt-0.5 text-[15px] font-semibold text-[var(--octo-text-primary)]">{formatNumber(segment.memberCount, locale)}</div>
            </div>
            <div>
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{t("customers.segments.ofBase")}</div>
              <div className="mt-0.5 text-[15px] font-semibold text-[var(--octo-text-primary)]">{segment.percentOfBase.toFixed(1)}%</div>
            </div>
          </div>

          <h2 className="mt-5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
            {t("customers.segments.detail.previewMembers")}
          </h2>
          <div className="octo-scroll mt-2 overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse text-[12.5px]">
              <thead>
                <tr className="border-b border-[var(--octo-divider)] text-start">
                  <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("customers.col.customer")}</th>
                  <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("customers.col.visits")}</th>
                  <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("customers.col.totalSpent")}</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row) => (
                  <tr key={row.id} className="border-b border-[var(--octo-row-border)] last:border-0">
                    <td className="whitespace-nowrap px-2 py-2.5 font-medium text-[var(--octo-text-primary)]">{row.name}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{row.visits}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{row.totalSpent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
          <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
            {t("customers.segments.modal.conditions")}
          </h2>
          <p className="mt-1 text-[11px] text-[var(--octo-text-muted)]">{t(RULE_KEY[segment.id])}</p>

          <div className="mt-3 flex flex-col gap-2">
            {conditions.map((condition) => (
              <div key={condition.id} className="flex flex-col gap-1.5 rounded-[9px] border border-[var(--octo-divider)] p-2">
                <div className="flex items-center gap-1.5">
                  <Select
                    className="flex-1"
                    value={condition.field}
                    onChange={(event) => updateCondition(condition.id, { field: event.target.value })}
                  >
                    {segmentRuleFields.map((field) => (
                      <option key={field} value={field}>{t(labelKey(field))}</option>
                    ))}
                  </Select>
                  <button
                    type="button"
                    aria-label={t("common.cancel")}
                    onClick={() => removeCondition(condition.id)}
                    disabled={conditions.length === 1}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] text-[var(--octo-text-muted)] hover:bg-[var(--octo-hover)] disabled:opacity-30"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <Select
                    className="w-[90px] flex-none"
                    value={condition.operator}
                    onChange={(event) => updateCondition(condition.id, { operator: event.target.value })}
                  >
                    {segmentRuleOperators.map((op) => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </Select>
                  <Input
                    className="flex-1"
                    placeholder={t("customers.segments.modal.valuePlaceholder")}
                    value={condition.value}
                    onChange={(event) => updateCondition(condition.id, { value: event.target.value })}
                  />
                </div>
              </div>
            ))}
          </div>

          <Button
            variant="secondary"
            size="sm"
            icon={<Plus size={13} />}
            className="mt-2"
            onClick={() => setConditions((prev) => [...prev, newCondition()])}
          >
            {t("customers.segments.modal.addCondition")}
          </Button>

          <div className="mt-3 flex items-center gap-2 rounded-[9px] bg-info/10 px-3 py-2.5 text-[12px] text-[#0D6EFD]">
            <Layers size={14} />
            {t("customers.segments.detail.estimateNote")}
          </div>

          <Button className="mt-3 w-full" onClick={() => setSaved(true)}>
            {t("common.save")}
          </Button>

          {saved && (
            <div className="mt-2 rounded-[9px] bg-[#22C55E]/10 px-3 py-2 text-center text-[11.5px] font-medium text-[#16a34a]">
              {t("customers.segments.detail.saved")}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
