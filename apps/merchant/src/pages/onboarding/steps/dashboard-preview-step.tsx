// Step 9 — a small, real dashboard rather than a screenshot, so it follows the
// active theme and reading direction. The figures are obviously sample data and
// are labelled as such; the module list and the summary are the merchant's own.
import { useState } from "react";
import { CheckCircle2, Info, Pencil } from "lucide-react";
import { Tabs } from "@ui/primitives";
import { formatSar, getModule, getRestaurantType, verticals } from "@/shared/catalog";
import { useI18n } from "@/app/providers/i18n-provider";
import { CatalogIcon } from "@/shared/lib/catalog-icon";
import { CITIES, readableOn } from "../_shared/brand-catalog";
import { INTEGRATIONS } from "../_shared/extras-catalog";
import type { StepProps } from "../_shared/steps";

const SAMPLE_TILES = [
  { labelKey: "dashboard.kpi.orders", value: "220" },
  { labelKey: "dashboard.kpi.reservations", value: "48" },
  { labelKey: "dashboard.kpi.revenue", value: 28000 },
  { labelKey: "dashboard.kpi.avgOrder", value: 145 },
];

export function DashboardPreviewStep({ draft, dispatch }: StepProps) {
  const { t, locale } = useI18n();
  const [tab, setTab] = useState<string>(draft.enabled[0] ?? "core");
  const { brand } = draft;
  const iconColor = readableOn(brand.primary);

  const vertical = verticals.find((v) => v.id === draft.vertical);
  const type = draft.type ? getRestaurantType(draft.type) : undefined;
  const city = CITIES.find((c) => c.id === brand.city);
  const tabs = draft.enabled
    .map((id) => getModule(id))
    .filter((m): m is NonNullable<typeof m> => Boolean(m))
    .map((m) => ({ id: m.id, label: t(m.nameKey) }));

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
      <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
        <Tabs items={tabs} value={tab} onChange={setTab} />

        <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {SAMPLE_TILES.map((tile) => (
            <div key={tile.labelKey} className="rounded-[10px] border border-[var(--octo-border-card)] p-3">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
                {t(tile.labelKey)}
              </p>
              <p className="mt-1 text-[19px] font-bold text-[var(--octo-text-primary)]">
                {typeof tile.value === "number" ? formatSar(tile.value, locale) : tile.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {draft.enabled.slice(0, 6).map((id) => {
            const module = getModule(id);
            return module ? (
              <div key={id} className="flex items-center gap-2.5 rounded-[10px] border border-[var(--octo-border-card)] px-3 py-2.5">
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px]"
                  style={{ backgroundColor: brand.primary, color: iconColor }}
                >
                  <CatalogIcon name={module.icon} size={14} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[12px] font-semibold text-[var(--octo-text-primary)]">{t(module.nameKey)}</span>
                  <span className="block truncate text-[10.5px] text-[var(--octo-text-muted)]">{t(module.descKey)}</span>
                </span>
              </div>
            ) : null;
          })}
        </div>

        <p className="mt-3 inline-flex items-center gap-1.5 rounded-[8px] bg-[var(--octo-hover)] px-2.5 py-1.5 text-[10.5px] text-[var(--octo-text-muted)]">
          <Info size={11} />
          {t("onboarding.dashboardPreview.sampleNote")}
        </p>
      </section>

      <aside className="h-fit rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
        <h3 className="text-[13px] font-bold text-[var(--octo-text-primary)]">{t("onboarding.dashboardPreview.summary")}</h3>

        <SummaryBlock titleKey="onboarding.review.business" onEdit={() => dispatch({ type: "goTo", step: 4 })} t={t}>
          <Row labelKey="onboarding.review.industry" value={vertical ? t(vertical.nameKey) : "—"} t={t} />
          <Row labelKey="onboarding.review.type" value={type ? t(type.nameKey) : "—"} t={t} />
          <Row labelKey="onboarding.review.city" value={city ? t(city.labelKey) : "—"} t={t} />
          <Row labelKey="onboarding.review.branches" value={String(brand.branchCount)} t={t} />
          <Row labelKey="onboarding.review.currency" value={brand.currency} t={t} />
        </SummaryBlock>

        <SummaryBlock titleKey="onboarding.review.modules" onEdit={() => dispatch({ type: "goTo", step: 5 })} t={t}>
          <div className="flex flex-wrap gap-1">
            {draft.enabled.map((id) => {
              const module = getModule(id);
              return module ? (
                <span key={id} className="rounded-full bg-[var(--octo-hover)] px-2 py-0.5 text-[10.5px] text-[var(--octo-text-secondary)]">
                  {t(module.nameKey)}
                </span>
              ) : null;
            })}
          </div>
        </SummaryBlock>

        <SummaryBlock titleKey="onboarding.review.integrations" onEdit={() => dispatch({ type: "goTo", step: 6 })} t={t}>
          <div className="flex flex-wrap gap-1">
            {INTEGRATIONS.filter((i) => draft.integrations.includes(i.id)).map((i) => (
              <span key={i.id} className="rounded-full bg-[var(--octo-hover)] px-2 py-0.5 text-[10.5px] text-[var(--octo-text-secondary)]">
                {i.name}
              </span>
            ))}
          </div>
        </SummaryBlock>

        <p className="mt-3 flex items-start gap-1.5 rounded-[8px] bg-[var(--octo-hover)] px-2.5 py-2 text-[10.5px] text-[var(--octo-text-secondary)]">
          <Info size={11} className="mt-0.5 shrink-0 text-[#0D6EFD]" />
          {t("onboarding.dashboardPreview.configured")}
        </p>
      </aside>
    </div>
  );
}

function SummaryBlock({
  titleKey, onEdit, t, children,
}: {
  titleKey: string;
  onEdit: () => void;
  t: (key: string) => string;
  children: React.ReactNode;
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
      <p className="mt-2 inline-flex items-center gap-1 text-[10.5px] text-[#22C55E]">
        <CheckCircle2 size={11} />
        {t("onboarding.review.completed")}
      </p>
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
