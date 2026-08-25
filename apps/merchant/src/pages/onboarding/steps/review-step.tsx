// Step 7 — everything the merchant chose, in one place, with an edit link per
// card back to the step that owns it, and the plan beside it. Nothing new is
// decided here; this is the last look before the previews.
import { CheckCircle2, Pencil } from "lucide-react";
import { getModule, getRestaurantType, verticals } from "@/shared/catalog";
import { useI18n } from "@/app/providers/i18n-provider";
import { INTEGRATIONS } from "../_shared/extras-catalog";
import { CITIES } from "../_shared/brand-catalog";
import { businessComplete, modulesComplete, integrationsComplete } from "../_shared/draft";
import { stepNumber, type StepProps } from "../_shared/steps";

export function ReviewStep({ draft, dispatch }: StepProps) {
  const { t } = useI18n();
  const { brand } = draft;

  const vertical = verticals.find((v) => v.id === draft.vertical);
  const type = draft.type ? getRestaurantType(draft.type) : undefined;
  const city = CITIES.find((c) => c.id === brand.city);
  const selectedIntegrations = INTEGRATIONS.filter((i) => draft.integrations.includes(i.id));

  // Resolved through the registry, never hardcoded: reordering STEPS moves
  // these links with it instead of quietly pointing at the wrong screen.
  const detailsStep = stepNumber("businessDetails");
  const modulesStep = stepNumber("modules");
  const integrationsStep = stepNumber("integrations");

  const rows: { labelKey: string; value: string }[] = [
    { labelKey: "onboarding.review.industry", value: vertical ? t(vertical.nameKey) : "—" },
    { labelKey: "onboarding.review.type", value: type ? t(type.nameKey) : "—" },
    { labelKey: "onboarding.review.city", value: city ? t(city.labelKey) : "—" },
    { labelKey: "onboarding.review.branches", value: String(brand.branchCount) },
    { labelKey: "onboarding.review.currency", value: brand.currency },
  ];

  return (
    <div className="flex flex-col gap-3">
      <Section
        titleKey="onboarding.review.business"
        onEdit={() => dispatch({ type: "goTo", step: detailsStep })}
        t={t}
        complete={businessComplete(draft)}
      >
        <dl className="flex flex-col gap-2">
          {rows.map((row) => (
            <div key={row.labelKey} className="flex items-center justify-between gap-3 text-[12px]">
              <dt className="text-[var(--octo-text-muted)]">{t(row.labelKey)}</dt>
              <dd className="font-medium text-[var(--octo-text-primary)]">{row.value}</dd>
            </div>
          ))}
          <div className="flex items-center justify-between gap-3 text-[12px]">
            <dt className="text-[var(--octo-text-muted)]">{t("onboarding.review.primaryColor")}</dt>
            <dd className="inline-flex items-center gap-1.5 rounded-[7px] border border-[var(--octo-border-card)] px-2 py-1">
              <span className="h-3.5 w-3.5 rounded-[4px]" style={{ backgroundColor: brand.primary }} />
              <span className="font-medium text-[var(--octo-text-primary)]">{brand.primary}</span>
            </dd>
          </div>
          {brand.logoDataUrl && (
            <div className="flex items-center justify-between gap-3 text-[12px]">
              <dt className="text-[var(--octo-text-muted)]">{t("onboarding.review.logo")}</dt>
              <dd><img src={brand.logoDataUrl} alt="" className="h-7 rounded-[6px] object-contain" /></dd>
            </div>
          )}
        </dl>
      </Section>

      <Section
        titleKey="onboarding.review.modules"
        onEdit={() => dispatch({ type: "goTo", step: modulesStep })}
        t={t}
        complete={modulesComplete(draft)}
      >
        {draft.enabled.length === 0 ? (
          <p className="text-[11.5px] text-[var(--octo-text-faint)]">{t("onboarding.review.none")}</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {draft.enabled.map((id) => {
              const module = getModule(id);
              return module ? (
                <span key={id} className="rounded-full bg-[var(--octo-hover)] px-2.5 py-1 text-[11.5px] text-[var(--octo-text-secondary)]">
                  {t(module.nameKey)}
                </span>
              ) : null;
            })}
          </div>
        )}
      </Section>

      <Section
        titleKey="onboarding.review.integrations"
        onEdit={() => dispatch({ type: "goTo", step: integrationsStep })}
        t={t}
        complete={integrationsComplete(draft)}
      >
        {selectedIntegrations.length === 0 ? (
          <p className="text-[11.5px] text-[var(--octo-text-faint)]">{t("onboarding.review.none")}</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {selectedIntegrations.map((item) => (
              <span key={item.id} className="rounded-full bg-[var(--octo-hover)] px-2.5 py-1 text-[11.5px] text-[var(--octo-text-secondary)]">
                {item.name}
              </span>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({
  titleKey, onEdit, t, children, complete,
}: {
  titleKey: string;
  onEdit: () => void;
  t: (key: string) => string;
  children: React.ReactNode;
  complete: boolean;
}) {
  return (
    <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[12.5px] font-bold text-[var(--octo-text-primary)]">{t(titleKey)}</h3>
        <button
          type="button"
          onClick={onEdit}
          aria-label={t("onboarding.review.edit")}
          className="text-[var(--octo-text-faint)] transition-colors hover:text-[#0D6EFD]"
        >
          <Pencil size={13} />
        </button>
      </div>
      <div className="mt-3">{children}</div>
      {complete && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-[#22C55E]">
          <CheckCircle2 size={12} />
          {t("onboarding.review.completed")}
        </p>
      )}
    </section>
  );
}
