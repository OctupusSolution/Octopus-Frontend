// The AI Insights panel beside the Business Profile step. Everything in it is
// derived from the draft — change the vertical or the type and the list
// changes with it, so it is a recommendation rather than a screenshot.
import { Check, Sparkles } from "lucide-react";
import { useI18n } from "@/app/providers/i18n-provider";
import { CatalogIcon } from "@/shared/lib/catalog-icon";
import { insightsFor } from "../_shared/ai-insights";
import type { StepProps } from "../_shared/steps";

export function InsightsAside({ draft }: StepProps) {
  const { t } = useI18n();
  const rows = insightsFor(draft.vertical, draft.type);
  if (rows.length === 0) return null;

  return (
    <section className="rounded-[20px] bg-[linear-gradient(180deg,#e8f0ff_0%,#f2f7ff_55%,#eef4ff_100%)] p-6">
      <h3 className="flex items-center gap-2 text-[15px] font-bold text-[var(--octo-text-primary)]">
        <Sparkles size={17} className="text-[#6C4DFF]" />
        {t("onboarding.aside.insights.title")}
      </h3>
      <p className="mt-4 text-[21px] font-bold leading-[1.25] tracking-tight text-[var(--octo-text-primary)]">
        {t("onboarding.aside.insights.lead")}{" "}
        <span className="text-[#0D6EFD]">{t("onboarding.aside.insights.leadBrand")}</span>{" "}
        {t("onboarding.aside.insights.leadTail")}
      </p>
      <p className="mt-3 text-[13px] leading-relaxed text-[var(--octo-text-secondary)]">
        {t("onboarding.aside.insights.note")}
      </p>

      <ul className="mt-5 flex flex-col gap-2.5">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex items-center gap-3 rounded-[12px] bg-[var(--octo-card)] px-3.5 py-3"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[var(--octo-selected)] text-[#0D6EFD]">
              <CatalogIcon name={row.icon} size={17} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] font-bold leading-tight text-[var(--octo-text-primary)]">
                {t(row.nameKey)}
              </span>
              <span className="mt-0.5 block text-[12px] leading-snug text-[var(--octo-text-muted)]">{t(row.descKey)}</span>
            </span>
            <span className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-[#0D6EFD] text-white">
              <Check size={12} strokeWidth={3} />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
