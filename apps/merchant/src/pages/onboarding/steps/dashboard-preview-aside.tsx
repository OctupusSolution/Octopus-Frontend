// The setup summary beside step 9. Same registry `Aside` slot, same width and
// same treatment as the panels on steps 2, 4 and 5.
//
// The "Completed" ticks and the empty state read from the same predicates the
// Review step uses, so the two screens can never disagree about whether the
// merchant has, say, chosen any integrations.
import { CheckCircle2, Info, Pencil } from "lucide-react";
import { getModule, getRestaurantType, verticals } from "@/shared/catalog";
import { useI18n } from "@/app/providers/i18n-provider";
import { CITIES } from "../_shared/brand-catalog";
import { INTEGRATIONS } from "../_shared/extras-catalog";
import { businessComplete, modulesComplete, integrationsComplete } from "../_shared/draft";
import { stepNumber, type StepProps } from "../_shared/steps";

export function DashboardPreviewAside({ draft, dispatch }: StepProps) {
  const { t } = useI18n();
  const { brand } = draft;

  const vertical = verticals.find((v) => v.id === draft.vertical);
  const type = draft.type ? getRestaurantType(draft.type) : undefined;
  const city = CITIES.find((c) => c.id === brand.city);
  const selectedIntegrations = INTEGRATIONS.filter((i) => draft.integrations.includes(i.id));

  // Resolved through the registry, never hardcoded.
  const detailsStep = stepNumber("businessDetails");
  const modulesStep = stepNumber("modules");
  const integrationsStep = stepNumber("integrations");

  return (
    <section className="h-fit rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-hover)] p-4">
      <h3 className="text-[13px] font-bold text-[var(--octo-text-primary)]">{t("onboarding.dashboardPreview.summary")}</h3>

      <SummaryBlock
        titleKey="onboarding.review.business"
        onEdit={() => dispatch({ type: "goTo", step: detailsStep })}
        t={t}
        complete={businessComplete(draft)}
      >
        <Row labelKey="onboarding.review.industry" value={vertical ? t(vertical.nameKey) : "—"} t={t} />
        <Row labelKey="onboarding.review.type" value={type ? t(type.nameKey) : "—"} t={t} />
        <Row labelKey="onboarding.review.city" value={city ? t(city.labelKey) : "—"} t={t} />
        <Row labelKey="onboarding.review.branches" value={String(brand.branchCount)} t={t} />
        <Row labelKey="onboarding.review.currency" value={brand.currency} t={t} />
      </SummaryBlock>

      <SummaryBlock
        titleKey="onboarding.review.modules"
        onEdit={() => dispatch({ type: "goTo", step: modulesStep })}
        t={t}
        complete={modulesComplete(draft)}
      >
        {draft.enabled.length === 0 ? (
          <p className="text-[10.5px] text-[var(--octo-text-faint)]">{t("onboarding.review.none")}</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {draft.enabled.map((id) => {
              const module = getModule(id);
              return module ? (
                <span key={id} className="rounded-full border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-2 py-0.5 text-[10.5px] text-[var(--octo-text-secondary)]">
                  {t(module.nameKey)}
                </span>
              ) : null;
            })}
          </div>
        )}
      </SummaryBlock>

      <SummaryBlock
        titleKey="onboarding.review.integrations"
        onEdit={() => dispatch({ type: "goTo", step: integrationsStep })}
        t={t}
        complete={integrationsComplete(draft)}
      >
        {selectedIntegrations.length === 0 ? (
          <p className="text-[10.5px] text-[var(--octo-text-faint)]">{t("onboarding.review.none")}</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {selectedIntegrations.map((i) => (
              <span key={i.id} className="rounded-full border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-2 py-0.5 text-[10.5px] text-[var(--octo-text-secondary)]">
                {i.name}
              </span>
            ))}
          </div>
        )}
      </SummaryBlock>

      <p className="mt-3 flex items-start gap-1.5 rounded-[8px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-2.5 py-2 text-[10.5px] text-[var(--octo-text-secondary)]">
        <Info size={11} className="mt-0.5 shrink-0 text-[#0D6EFD]" />
        {t("onboarding.dashboardPreview.configured")}
      </p>
    </section>
  );
}

function SummaryBlock({
  titleKey, onEdit, t, children, complete,
}: {
  titleKey: string;
  onEdit: () => void;
  t: (key: string) => string;
  children: React.ReactNode;
  complete: boolean;
}) {
  return (
    <div className="mt-3 border-t border-[var(--octo-divider)] pt-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11.5px] font-semibold text-[var(--octo-text-primary)]">{t(titleKey)}</p>
        <button type="button" onClick={onEdit} aria-label={t("onboarding.review.edit")} className="text-[var(--octo-text-faint)] hover:text-[#0D6EFD]">
          <Pencil size={12} />
        </button>
      </div>
      <div className="mt-2">{children}</div>
      {complete && (
        <p className="mt-2 inline-flex items-center gap-1 text-[10.5px] text-[#22C55E]">
          <CheckCircle2 size={11} />
          {t("onboarding.review.completed")}
        </p>
      )}
    </div>
  );
}

function Row({ labelKey, value, t }: { labelKey: string; value: string; t: (key: string) => string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[11px]">
      <span className="text-[var(--octo-text-muted)]">{t(labelKey)}</span>
      <span className="font-medium text-[var(--octo-text-primary)]">{value}</span>
    </div>
  );
}
