import { useState } from "react";
import { Gift, Sparkles, TrendingUp } from "lucide-react";
import { StatCard } from "@/widgets/sales-summary-chart";
import { Input, Select, Checkbox } from "@ui/primitives";
import {
  loyaltyKpis,
  loyaltyTiers,
  loyaltyRulesDefault,
  loyaltyPointsHistory,
  type LoyaltyRules,
} from "@/shared/api/mock-marketing";
import { useI18n } from "@/app/providers/i18n-provider";
import { labelKey } from "@/shared/lib/labels";

export function LoyaltyProgramPage() {
  const { t } = useI18n();
  const [rules, setRules] = useState<LoyaltyRules>(loyaltyRulesDefault);
  const [dirty, setDirty] = useState(false);

  function update<K extends keyof LoyaltyRules>(key: K, value: LoyaltyRules[K]) {
    setRules((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  function discard() {
    setRules(loyaltyRulesDefault);
    setDirty(false);
  }

  function save() {
    setDirty(false);
  }

  const maxPoint = Math.max(...loyaltyPointsHistory.map((p) => Math.max(p.issued, p.redeemed)));

  return (
    <div className="px-4 pb-24 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("marketing.loyalty.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">
            {t("marketing.loyalty.subtitle")}
          </p>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {loyaltyKpis.map((card) => (
          <StatCard key={card.id} data={card} />
        ))}
      </div>

      {/* tier config cards */}
      <section className="mt-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div className="flex items-center gap-2">
          <Gift size={15} className="text-[var(--octo-text-muted)]" />
          <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("marketing.loyalty.tiers.title")}</h2>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {loyaltyTiers.map((tier) => (
            <div
              key={tier.tier}
              className="flex flex-col gap-2 rounded-[10px] border border-[var(--octo-border-card)] px-3 py-3"
              style={{ borderTopWidth: 3, borderTopColor: tier.color }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{t(labelKey(tier.tier))}</span>
                <span
                  className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold text-white"
                  style={{ backgroundColor: tier.color }}
                >
                  {tier.multiplier}
                </span>
              </div>
              <p className="text-[11px] text-[var(--octo-text-muted)]">
                {t("marketing.loyalty.tiers.threshold").replace("{value}", `SAR ${tier.thresholdSar.toLocaleString()}`)}
              </p>
              <p className="text-[11.5px] text-[var(--octo-text-secondary)]">
                {t("marketing.membersCount").replace("{n}", tier.members.toLocaleString())}
              </p>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--octo-track)]">
                <div className="h-full rounded-full" style={{ width: `${tier.sharePercent}%`, backgroundColor: tier.color }} />
              </div>
              <span className="text-[10.5px] text-[var(--octo-text-faint)]">{tier.sharePercent}%</span>
            </div>
          ))}
        </div>
      </section>

      {/* earn & burn rules */}
      <section className="mt-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-[var(--octo-text-muted)]" />
          <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("marketing.loyalty.rules.title")}</h2>
        </div>
        <p className="mt-1 text-[11.5px] text-[var(--octo-text-muted)]">{t("marketing.loyalty.rules.description")}</p>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label={t("marketing.loyalty.rules.pointsPerSar")}
            type="number"
            min={0}
            value={rules.pointsPerSar}
            onChange={(e) => update("pointsPerSar", Number(e.target.value))}
          />
          <Input
            label={t("marketing.loyalty.rules.sarPerPoint")}
            type="number"
            step={0.01}
            min={0}
            value={rules.sarPerPointRedemption}
            onChange={(e) => update("sarPerPointRedemption", Number(e.target.value))}
          />
          <Select
            label={t("marketing.loyalty.rules.expiry")}
            value={rules.expiryMonths}
            onChange={(e) => update("expiryMonths", Number(e.target.value) as LoyaltyRules["expiryMonths"])}
          >
            <option value={12}>{t("marketing.loyalty.rules.months").replace("{n}", "12")}</option>
            <option value={24}>{t("marketing.loyalty.rules.months").replace("{n}", "24")}</option>
            <option value={36}>{t("marketing.loyalty.rules.months").replace("{n}", "36")}</option>
          </Select>
          <Input
            label={t("marketing.loyalty.rules.minRedemption")}
            type="number"
            min={0}
            value={rules.minRedemptionSar}
            onChange={(e) => update("minRedemptionSar", Number(e.target.value))}
          />
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-[var(--octo-divider)] pt-3 sm:flex-row sm:items-center sm:justify-between">
          <Checkbox
            label={t("marketing.loyalty.rules.birthdayBonus")}
            checked={rules.birthdayBonusEnabled}
            onChange={(e) => update("birthdayBonusEnabled", e.target.checked)}
          />
          <Input
            type="number"
            min={0}
            disabled={!rules.birthdayBonusEnabled}
            value={rules.birthdayBonusPoints}
            onChange={(e) => update("birthdayBonusPoints", Number(e.target.value))}
            className="sm:w-[140px]"
          />
        </div>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Checkbox
            label={t("marketing.loyalty.rules.referralBonus")}
            checked={rules.referralBonusEnabled}
            onChange={(e) => update("referralBonusEnabled", e.target.checked)}
          />
          <Input
            type="number"
            min={0}
            disabled={!rules.referralBonusEnabled}
            value={rules.referralBonusPoints}
            onChange={(e) => update("referralBonusPoints", Number(e.target.value))}
            className="sm:w-[140px]"
          />
        </div>
      </section>

      {/* points issued vs redeemed chart */}
      <section className="mt-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div className="flex items-center gap-2">
          <TrendingUp size={15} className="text-[var(--octo-text-muted)]" />
          <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("marketing.loyalty.chart.title")}</h2>
        </div>
        <div className="mt-4 flex items-end gap-3">
          {loyaltyPointsHistory.map((p) => (
            <div key={p.period} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-[120px] w-full items-end justify-center gap-1">
                <div
                  className="w-3 rounded-t-sm bg-[#0D6EFD]"
                  style={{ height: `${(p.issued / maxPoint) * 100}%` }}
                  title={`${t("marketing.loyalty.chart.issued")}: ${p.issued}K`}
                />
                <div
                  className="w-3 rounded-t-sm bg-[#a3e635]"
                  style={{ height: `${(p.redeemed / maxPoint) * 100}%` }}
                  title={`${t("marketing.loyalty.chart.redeemed")}: ${p.redeemed}K`}
                />
              </div>
              <span className="text-[10.5px] text-[var(--octo-text-faint)]">{p.period}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-4 text-[11px] text-[var(--octo-text-secondary)]">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[#0D6EFD]" />{t("marketing.loyalty.chart.issued")}</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[#a3e635]" />{t("marketing.loyalty.chart.redeemed")}</span>
        </div>
      </section>

      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-[var(--octo-border-card)] bg-[var(--octo-card)] px-4 py-3 shadow-[0_-2px_10px_rgba(0,0,0,0.06)] sm:px-[26px]">
          <span className="text-[12.5px] text-[var(--octo-text-secondary)]">{t("common.unsavedChanges")}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={discard}
              className="rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-[7px] text-[12px] font-medium text-[var(--octo-text-primary)] transition-colors hover:bg-[var(--octo-hover)]"
            >
              {t("common.discard")}
            </button>
            <button
              type="button"
              onClick={save}
              className="rounded-[9px] bg-[#0D6EFD] px-3 py-[7px] text-[12px] font-medium text-white transition-opacity hover:opacity-90"
            >
              {t("common.saveChanges")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
