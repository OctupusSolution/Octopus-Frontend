import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, TrendingUp, TrendingDown, Layers, X } from "lucide-react";
import { Button, Modal, Select, Input, Segmented } from "@ui/primitives";
import {
  customerSegments,
  segmentRuleFields,
  segmentRuleOperators,
  customerStats,
} from "@/shared/api/mock-customers";
import { sparklinePaths } from "@/shared/lib/sparkline";
import { useI18n } from "@/app/providers/i18n-provider";
import { labelKey } from "@/shared/lib/labels";

const TOTAL_CUSTOMERS = Number(customerStats[0].value.replace(/,/g, ""));

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

export function CustomerSegmentsPage() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [joiner, setJoiner] = useState<"AND" | "OR">("AND");
  const [conditions, setConditions] = useState<RuleCondition[]>([newCondition()]);

  const estimatedMatches = useMemo(() => {
    const filled = conditions.filter((c) => c.value.trim().length > 0);
    if (filled.length === 0) return TOTAL_CUSTOMERS;
    const narrowFactor = joiner === "AND" ? 0.42 : 0.68;
    const raw = TOTAL_CUSTOMERS * Math.pow(narrowFactor, filled.length);
    return Math.max(1, Math.round(raw));
  }, [conditions, joiner]);

  const openModal = () => {
    setName("");
    setJoiner("AND");
    setConditions([newCondition()]);
    setModalOpen(true);
  };

  const updateCondition = (id: number, patch: Partial<RuleCondition>) => {
    setConditions((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const removeCondition = (id: number) => {
    setConditions((prev) => (prev.length === 1 ? prev : prev.filter((c) => c.id !== id)));
  };

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("customers.segments.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">
            {t("customers.segments.subtitle")}
          </p>
        </div>
        <Button icon={<Plus size={13} />} onClick={openModal}>
          {t("customers.segments.createSegment")}
        </Button>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {customerSegments.map((segment) => {
          const { line, area } = sparklinePaths(segment.membershipTrend, 240, 40);
          const gradientId = `seg-spark-${segment.id}`;
          const positive = segment.growth >= 0;
          return (
            <article
              key={segment.id}
              onClick={() => navigate(`/customers/segments/${segment.id}`)}
              className="flex cursor-pointer flex-col rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px] transition-colors hover:border-[#0D6EFD]/30"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t(labelKey(segment.name))}</h2>
                  <p className="mt-0.5 text-[11px] text-[var(--octo-text-muted)]">
                    {formatNumber(segment.memberCount, locale)} {t("customers.segments.members")} · {segment.percentOfBase.toFixed(1)}% {t("customers.segments.ofBase")}
                  </p>
                </div>
                <div className={`flex items-center gap-1 text-[11.5px] font-semibold ${positive ? "text-[#16a34a]" : "text-[#dc2626]"}`}>
                  {positive ? <TrendingUp size={13} strokeWidth={2.5} /> : <TrendingDown size={13} strokeWidth={2.5} />}
                  {positive ? "+" : ""}{segment.growth.toFixed(1)}%
                </div>
              </div>

              <p className="mt-2.5 rounded-[9px] bg-[var(--octo-hover)] px-2.5 py-2 text-[11px] text-[var(--octo-text-secondary)]">
                {t(RULE_KEY[segment.id])}
              </p>

              <div className="mt-2.5 flex items-center justify-between gap-2">
                <span className="text-[11px] text-[var(--octo-text-muted)]">
                  {t("customers.segments.avgSpend")}: <span className="font-semibold text-[var(--octo-text-primary)]">{segment.avgSpend}</span>
                </span>
                <svg viewBox="0 0 240 40" preserveAspectRatio="none" className="h-8 w-24" aria-hidden="true">
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0D6EFD" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#0D6EFD" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <path d={area} fill={`url(#${gradientId})`} />
                  <path d={line} fill="none" stroke="#0D6EFD" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
                </svg>
              </div>

              <div className="mt-3 flex items-center gap-2 border-t border-[var(--octo-divider)] pt-3">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={(event) => { event.stopPropagation(); navigate(`/customers/segments/${segment.id}`); }}
                >
                  {t("customers.segments.editRules")}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={(event) => event.stopPropagation()}
                >
                  {t("customers.segments.createCampaign")}
                </Button>
              </div>
            </article>
          );
        })}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t("customers.segments.modal.title")}
        className="max-w-xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={() => setModalOpen(false)}>
              {t("customers.segments.modal.create")}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Input
            label={t("customers.segments.modal.nameLabel")}
            placeholder={t("customers.segments.modal.namePlaceholder")}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />

          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
              {t("customers.segments.modal.conditions")}
            </span>
            {conditions.length > 1 && (
              <Segmented
                options={[
                  { id: "AND", label: "AND" },
                  { id: "OR", label: "OR" },
                ]}
                value={joiner}
                onChange={(id) => setJoiner(id as "AND" | "OR")}
              />
            )}
          </div>

          <div className="flex flex-col gap-2">
            {conditions.map((condition) => (
              <div key={condition.id} className="flex items-center gap-1.5">
                <Select
                  className="flex-1"
                  value={condition.field}
                  onChange={(event) => updateCondition(condition.id, { field: event.target.value })}
                >
                  {segmentRuleFields.map((field) => (
                    <option key={field} value={field}>{t(labelKey(field))}</option>
                  ))}
                </Select>
                <Select
                  className="w-[80px] flex-none"
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
            ))}
          </div>

          <Button
            variant="secondary"
            size="sm"
            icon={<Plus size={13} />}
            className="self-start"
            onClick={() => setConditions((prev) => [...prev, newCondition()])}
          >
            {t("customers.segments.modal.addCondition")}
          </Button>

          <div className="flex items-center gap-2 rounded-[9px] bg-info/10 px-3 py-2.5 text-[12.5px] text-[#0D6EFD]">
            <Layers size={14} />
            <span className="font-semibold">{formatNumber(estimatedMatches, locale)}</span>
            {t("customers.segments.modal.estimatedMatches")}
          </div>
        </div>
      </Modal>
    </div>
  );
}
