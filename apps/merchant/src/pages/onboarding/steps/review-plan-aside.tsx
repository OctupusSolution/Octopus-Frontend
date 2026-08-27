// The plan beside step 7. Lives in the registry's `Aside` slot like the panels
// on steps 2, 4 and 5 rather than as a second column hand-rolled inside the
// step, so every side panel in the flow is one width and one treatment.
import { useI18n } from "@/app/providers/i18n-provider";
import { formatSar } from "@/shared/catalog";
import { INTEGRATIONS } from "../_shared/extras-catalog";
import { priceFor } from "../_shared/pricing";
import type { StepProps } from "../_shared/steps";

export function ReviewPlanAside({ draft }: StepProps) {
  const { t, locale } = useI18n();
  const price = priceFor(draft);
  const selectedIntegrations = INTEGRATIONS.filter((i) => draft.integrations.includes(i.id));

  return (
    <section className="h-fit rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-hover)] p-4">
      <h3 className="text-[14px] font-bold text-[var(--octo-text-primary)]">{t("onboarding.review.plan")}</h3>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-[10px] bg-[#0D6EFD] px-3 py-2.5 text-white">
        <span className="text-[11.5px] font-medium">{t("onboarding.review.subscription")}</span>
        <span className="text-[12.5px] font-bold">{formatSar(price.subscription, locale)}</span>
      </div>

      {selectedIntegrations.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5 border-b border-[var(--octo-divider)] pb-3">
          {selectedIntegrations.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 text-[11.5px]">
              <span className="text-[var(--octo-text-secondary)]">{item.name}</span>
              <span className="font-medium text-[var(--octo-text-primary)]">{formatSar(item.priceSar, locale)}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex items-center justify-between gap-3 rounded-[10px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-3 py-2.5">
        <span className="text-[11.5px] font-semibold text-[var(--octo-text-secondary)]">{t("onboarding.review.total")}</span>
        <span className="text-[15px] font-bold text-[#0D6EFD]">{formatSar(price.total, locale)}</span>
      </div>

      {price.hasQuotedItems && (
        <p className="mt-2 text-[10.5px] text-[var(--octo-text-faint)]">{t("pricing.quoted")}</p>
      )}
    </section>
  );
}
