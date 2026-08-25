// Step 7 — everything the merchant chose, in one place, with an edit link per
// card back to the step that owns it, and the plan beside it. Nothing new is
// decided here; this is the last look before the previews.
import { CheckCircle2, Pencil } from "lucide-react";
import {
  computePrice, formatSar, getModule, getRestaurantType, verticals,
} from "@/shared/catalog";
import { useI18n } from "@/app/providers/i18n-provider";
import { INTEGRATIONS, integrationsTotal } from "../_shared/extras-catalog";
import { CITIES } from "../_shared/brand-catalog";
import type { StepProps } from "../_shared/steps";

export function ReviewStep({ draft, dispatch }: StepProps) {
  const { t, locale } = useI18n();
  const { brand } = draft;

  const vertical = verticals.find((v) => v.id === draft.vertical);
  const type = draft.type ? getRestaurantType(draft.type) : undefined;
  const city = CITIES.find((c) => c.id === brand.city);
  const selectedIntegrations = INTEGRATIONS.filter((i) => draft.integrations.includes(i.id));
  const price = computePrice(draft.enabled, brand.branchCount);
  const connectors = integrationsTotal(draft.integrations);

  const rows: { labelKey: string; value: string }[] = [
    { labelKey: "onboarding.review.industry", value: vertical ? t(vertical.nameKey) : "—" },
    { labelKey: "onboarding.review.type", value: type ? t(type.nameKey) : "—" },
    { labelKey: "onboarding.review.city", value: city ? t(city.labelKey) : "—" },
    { labelKey: "onboarding.review.branches", value: String(brand.branchCount) },
    { labelKey: "onboarding.review.currency", value: brand.currency },
  ];

  const businessComplete = draft.vertical !== null && draft.type !== null
    && brand.businessName.trim() !== "" && brand.city !== "";
  const modulesComplete = draft.enabled.length > 0;
  const integrationsComplete = draft.integrations.length > 0;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
      <div className="flex flex-col gap-3">
        <Section
          titleKey="onboarding.review.business"
          onEdit={() => dispatch({ type: "goTo", step: 4 })}
          t={t}
          complete={businessComplete}
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
          onEdit={() => dispatch({ type: "goTo", step: 5 })}
          t={t}
          complete={modulesComplete}
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
          onEdit={() => dispatch({ type: "goTo", step: 6 })}
          t={t}
          complete={integrationsComplete}
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

      <aside className="h-fit rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
        <h3 className="text-[14px] font-bold text-[var(--octo-text-primary)]">{t("onboarding.review.plan")}</h3>

        <div className="mt-3 flex items-center justify-between gap-3 rounded-[10px] bg-[#0D6EFD] px-3 py-2.5 text-white">
          <span className="text-[11.5px] font-medium">{t("onboarding.review.subscription")}</span>
          <span className="text-[12.5px] font-bold">{formatSar(price.total, locale)}</span>
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

        <div className="mt-3 flex items-center justify-between gap-3 rounded-[10px] bg-[var(--octo-hover)] px-3 py-2.5">
          <span className="text-[11.5px] font-semibold text-[var(--octo-text-secondary)]">{t("onboarding.review.total")}</span>
          <span className="text-[15px] font-bold text-[#0D6EFD]">{formatSar(price.total + connectors, locale)}</span>
        </div>

        {price.hasQuotedItems && (
          <p className="mt-2 text-[10.5px] text-[var(--octo-text-faint)]">{t("pricing.quoted")}</p>
        )}
      </aside>
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
