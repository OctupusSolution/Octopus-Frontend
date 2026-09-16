// The AI Summary panel beside the Modules step. The count is the merchant's
// actual selection, so it moves as they toggle — it is a readout, not a boast.
import { Check, Sparkles } from "lucide-react";
import { useI18n } from "@/app/providers/i18n-provider";
import { SETUP_HERO_URL } from "../_shared/assets";
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
    <section className="rounded-[20px] bg-[linear-gradient(180deg,#e8f0ff_0%,#f2f7ff_55%,#eef4ff_100%)] p-6">
      <h3 className="flex items-center gap-2 text-[15px] font-bold text-[var(--octo-text-primary)]">
        <Sparkles size={17} className="text-[#6C4DFF]" />
        {t("onboarding.aside.summary.title")}
      </h3>

      <p className="mt-4 text-[21px] font-bold leading-[1.3] tracking-tight text-[var(--octo-text-primary)]">
        {t("onboarding.aside.summary.lead")}
        <br />
        {t("onboarding.aside.summary.count").replace("{n}", String(draft.enabled.length))}
      </p>

      <img src={SETUP_HERO_URL} alt="" className="mx-auto my-6 w-full max-w-[240px] object-contain" />

      <p className="rounded-[12px] bg-[#dfeaff]/70 px-4 py-3 text-[13px] font-semibold leading-relaxed text-[#0D6EFD]">
        {t("onboarding.aside.summary.note")}
      </p>

      <div className="mt-4 rounded-[12px] bg-[var(--octo-card)] px-4 py-4">
        <p className="text-[13.5px] font-bold text-[var(--octo-text-primary)]">
          {t("onboarding.aside.summary.youGet")}
        </p>
        <ul className="mt-3 flex flex-col gap-2.5">
          {BENEFITS.map((key) => (
            <li key={key} className="flex items-start gap-2.5 text-[13px] text-[var(--octo-text-secondary)]">
              <span className="mt-px grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-[1.5px] border-[#0D6EFD] text-[#0D6EFD]">
                <Check size={10} strokeWidth={3.5} />
              </span>
              {t(key)}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
