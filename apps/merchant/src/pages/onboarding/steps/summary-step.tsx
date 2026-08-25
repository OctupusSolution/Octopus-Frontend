// Step 9 — a read-only recap of everything chosen so far, with an edit link
// per card that jumps straight back to the step that produced it. Writes
// nothing; it only reads the wizard's own state back.
//
// The AI Insights / Quality Checklist panels are illustrative — a preview of
// what OCTOPUS surfaces once the business is live, not a real analysis run
// against this data. Labelled as such, same honesty rule as every other mock
// section in this flow.
import { Building2, Check, CheckCircle2, Package, Pencil, Plug, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import {
  addOnModules, computePrice, formatSar, getRestaurantType, getVertical,
  type ModuleId, type TypeCode, type VerticalId,
} from "@/shared/catalog";
import {
  INTEGRATIONS,
  type IntegrationId,
} from "../_shared/extras-catalog";
import { useI18n } from "@/app/providers/i18n-provider";
import { DASHBOARD_MOCKUP_URL } from "../_shared/assets";

const CHECKLIST_ITEMS = ["secure", "compliant", "connected", "ready"] as const;

export function SummaryStep({
  vertical,
  type,
  enabled,
  branchCount,
  integrations,
  onEditStep,
}: {
  vertical: VerticalId | null;
  type: TypeCode | null;
  enabled: readonly ModuleId[];
  branchCount: number;
  integrations: readonly IntegrationId[];
  onEditStep: (step: number) => void;
}) {
  const { t, locale } = useI18n();

  const verticalEntry = vertical ? getVertical(vertical) : undefined;
  const typeEntry = type ? getRestaurantType(type) : undefined;
  const price = computePrice(enabled, branchCount);
  const enabledAddOns = addOnModules.filter((m) => enabled.includes(m.id));

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.3fr_1fr]">
      <div className="flex flex-col gap-3">
        <SummaryCard
          icon={<Building2 size={16} />}
          color="#0D6EFD"
          title={t("onboarding.review.business")}
          onEdit={() => onEditStep(1)}
          complete={Boolean(verticalEntry || typeEntry)}
        >
          {verticalEntry || typeEntry ? (
            <div className="flex flex-col gap-1 text-[12.5px] text-[var(--octo-text-secondary)]">
              {verticalEntry && <p><span className="text-[var(--octo-text-faint)]">{t("onboarding.review.industry")}: </span>{t(verticalEntry.nameKey)}</p>}
              {typeEntry && <p><span className="text-[var(--octo-text-faint)]">{t("onboarding.review.type")}: </span>{t(typeEntry.nameKey)}</p>}
            </div>
          ) : (
            <EmptyLine text={t("onboarding.review.noBusiness")} />
          )}
        </SummaryCard>

        <SummaryCard
          icon={<Package size={16} />}
          color="#0D6EFD"
          title={t("onboarding.review.modules")}
          onEdit={() => onEditStep(4)}
          complete
        >
          <p className="mb-1.5 text-[15px] font-bold text-[var(--octo-text-primary)]">
            {formatSar(price.total, locale)} <span className="text-[11px] font-normal text-[var(--octo-text-muted)]">{t("pricing.perMonth")}</span>
          </p>
          {enabledAddOns.length === 0 ? (
            <EmptyLine text={t("onboarding.review.noAddOns")} />
          ) : (
            <p className="text-[12.5px] text-[var(--octo-text-secondary)]">
              {enabledAddOns.map((m) => t(m.nameKey)).join(" · ")}
            </p>
          )}
        </SummaryCard>

        <SummaryCard
          icon={<Plug size={16} />}
          color="#8B5CF6"
          title={t("onboarding.review.integrations")}
          onEdit={() => onEditStep(5)}
          complete={integrations.length > 0}
        >
          {integrations.length === 0 ? (
            <EmptyLine text={t("onboarding.review.noIntegrations")} />
          ) : (
            <p className="text-[12.5px] text-[var(--octo-text-secondary)]">
              {integrations.map((id) => INTEGRATIONS.find((i) => i.id === id)?.name ?? id).join(" · ")}
            </p>
          )}
        </SummaryCard>
      </div>

      <div className="flex flex-col gap-3">
        <img src={DASHBOARD_MOCKUP_URL} alt="" className="w-full object-contain" />

        <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-[#8B5CF6]" />
            <h3 className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{t("onboarding.review.aiInsights.title")}</h3>
          </div>
          <div className="mt-3 rounded-lg bg-[var(--octo-selected)] p-3">
            <p className="flex items-start gap-2 text-[12px] font-medium text-[var(--octo-text-primary)]">
              <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[#0D6EFD]" />
              {t("onboarding.review.aiInsights.headline")}
            </p>
            <ul className="mt-2 flex flex-col gap-1 ps-[22px] text-[11.5px] text-[var(--octo-text-secondary)]" style={{ listStyleType: "disc" }}>
              <li>{t("onboarding.review.aiInsights.point1")}</li>
              <li>{t("onboarding.review.aiInsights.point2")}</li>
              <li>{t("onboarding.review.aiInsights.point3")}</li>
              <li>{t("onboarding.review.aiInsights.point4")}</li>
            </ul>
          </div>
        </section>

        <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-[#16a34a]" />
            <h3 className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{t("onboarding.review.checklist.title")}</h3>
          </div>
          <p className="mt-1 text-[11.5px] text-[var(--octo-text-muted)]">{t("onboarding.review.aiInsights.headline")}</p>
          <ul className="mt-3 flex flex-col gap-2.5">
            {CHECKLIST_ITEMS.map((id) => (
              <li key={id} className="flex items-start gap-2">
                <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[#16a34a] text-white">
                  <Check size={10} strokeWidth={3} />
                </span>
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-[var(--octo-text-primary)]">{t(`onboarding.review.checklist.${id}.name`)}</p>
                  <p className="text-[11px] text-[var(--octo-text-muted)]">{t(`onboarding.review.checklist.${id}.desc`)}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <p className="text-[10.5px] leading-relaxed text-[var(--octo-text-faint)]">{t("onboarding.review.aiDisclaimer")}</p>
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  color,
  title,
  onEdit,
  complete,
  children,
}: {
  icon: ReactNode;
  color: string;
  title: string;
  onEdit: () => void;
  complete: boolean;
  children: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <section className="flex items-start gap-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px]"
        style={{ backgroundColor: `${color}1A`, color }}
      >
        {icon}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{title}</h3>
          <button
            type="button"
            onClick={onEdit}
            aria-label={t("onboarding.review.edit")}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-[var(--octo-border-card)] text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)]"
          >
            <Pencil size={13} />
          </button>
        </div>

        <div className="mt-1.5">{children}</div>

        {complete && (
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium text-[#16a34a]">
            <CheckCircle2 size={13} />
            {t("onboarding.review.completed")}
          </div>
        )}
      </div>
    </section>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="text-[11.5px] text-[var(--octo-text-faint)]">{text}</p>;
}
