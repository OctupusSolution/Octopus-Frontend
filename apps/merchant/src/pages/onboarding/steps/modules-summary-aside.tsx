// The panel beside step 5. The count is the merchant's actual selection, so it
// moves as they toggle — it is a readout, not a boast.
import { Check, Sparkles } from "lucide-react";
import { useI18n } from "@/app/providers/i18n-provider";
import { HERO_URL } from "../_shared/assets";
import type { StepProps } from "../_shared/steps";

const BENEFITS = [
  "onboarding.aside.summary.roleDashboards",
  "onboarding.aside.summary.realtime",
  "onboarding.aside.summary.automations",
  "onboarding.aside.summary.mobile",
];

export function ModulesSummaryAside({ draft }: StepProps) {
  const { t } = useI18n();

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-hover)] p-4">
      <h3 className="flex items-center gap-1.5 text-[11px] font-semibold text-[#0D6EFD]">
        <Sparkles size={12} />
        {t("onboarding.aside.summary.title")}
      </h3>
      <p className="text-[14px] font-bold text-[var(--octo-text-primary)]">{t("onboarding.aside.summary.lead")}</p>
      <p className="text-[12px] text-[var(--octo-text-secondary)]">
        {t("onboarding.aside.summary.count").replace("{n}", String(draft.enabled.length))}
      </p>
      <p className="text-[11px] leading-relaxed text-[#0D6EFD]">{t("onboarding.aside.summary.note")}</p>

      <img src={HERO_URL} alt="" className="mx-auto w-full max-w-[180px] object-contain" />

      <p className="text-[11px] font-semibold text-[var(--octo-text-primary)]">{t("onboarding.aside.summary.youGet")}</p>
      <ul className="flex flex-col gap-1.5">
        {BENEFITS.map((key) => (
          <li key={key} className="flex items-start gap-2 text-[11px] text-[var(--octo-text-secondary)]">
            <Check size={12} strokeWidth={3} className="mt-0.5 shrink-0 text-[#0D6EFD]" />
            {t(key)}
          </li>
        ))}
      </ul>
    </section>
  );
}
