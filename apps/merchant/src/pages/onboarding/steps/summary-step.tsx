// Step 9 — a read-only recap of everything chosen so far, with an edit link
// per card that jumps straight back to the step that produced it. Writes
// nothing; it only reads the wizard's own state back.
import { Check, Pencil } from "lucide-react";
import type { ReactNode } from "react";
import {
  addOnModules, computePrice, formatSar, getModule, getRestaurantType, getVertical,
  type ModuleId, type TypeCode, type VerticalId,
} from "@/shared/catalog";
import {
  GOALS, INTEGRATIONS, SECURITY_OPTIONS, WORKFLOW_TEMPLATES,
  type GoalId, type IntegrationId, type SecuritySettings, type TeamInvite, type WorkflowId,
} from "../_shared/extras-catalog";
import { useI18n } from "@/app/providers/i18n-provider";

export function SummaryStep({
  vertical,
  type,
  goals,
  enabled,
  branchCount,
  integrations,
  security,
  team,
  workflows,
  onEditStep,
}: {
  vertical: VerticalId | null;
  type: TypeCode | null;
  goals: readonly GoalId[];
  enabled: readonly ModuleId[];
  branchCount: number;
  integrations: readonly IntegrationId[];
  security: SecuritySettings;
  team: readonly TeamInvite[];
  workflows: readonly WorkflowId[];
  onEditStep: (step: number) => void;
}) {
  const { t, locale } = useI18n();

  const verticalEntry = vertical ? getVertical(vertical) : undefined;
  const typeEntry = type ? getRestaurantType(type) : undefined;
  const price = computePrice(enabled, branchCount);
  const enabledAddOns = addOnModules.filter((m) => enabled.includes(m.id));
  const activeSecurity = SECURITY_OPTIONS.filter((o) => o.locked || security[o.id as keyof SecuritySettings]);

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <SummaryCard title={t("onboarding.review.business")} onEdit={() => onEditStep(1)}>
        {verticalEntry || typeEntry ? (
          <div className="flex flex-col gap-1.5 text-[12.5px] text-[var(--octo-text-secondary)]">
            {verticalEntry && <p><span className="text-[var(--octo-text-faint)]">{t("onboarding.review.industry")}: </span>{t(verticalEntry.nameKey)}</p>}
            {typeEntry && <p><span className="text-[var(--octo-text-faint)]">{t("onboarding.review.type")}: </span>{t(typeEntry.nameKey)}</p>}
          </div>
        ) : (
          <EmptyLine text={t("onboarding.review.noBusiness")} />
        )}
      </SummaryCard>

      <SummaryCard title={t("onboarding.review.goals")} onEdit={() => onEditStep(3)}>
        {goals.length === 0 ? (
          <EmptyLine text={t("onboarding.review.noGoals")} />
        ) : (
          <ChipList items={goals.map((id) => t(GOALS.find((g) => g.id === id)?.nameKey ?? ""))} />
        )}
      </SummaryCard>

      <SummaryCard title={t("onboarding.review.modules")} onEdit={() => onEditStep(5)}>
        <p className="mb-2 text-[15px] font-bold text-[var(--octo-text-primary)]">
          {formatSar(price.total, locale)} <span className="text-[11px] font-normal text-[var(--octo-text-muted)]">{t("pricing.perMonth")}</span>
        </p>
        {enabledAddOns.length === 0 ? (
          <EmptyLine text={t("onboarding.review.noAddOns")} />
        ) : (
          <ChipList items={enabledAddOns.map((m) => t(m.nameKey))} />
        )}
      </SummaryCard>

      <SummaryCard title={t("onboarding.review.integrations")} onEdit={() => onEditStep(6)}>
        {integrations.length === 0 ? (
          <EmptyLine text={t("onboarding.review.noIntegrations")} />
        ) : (
          <ChipList items={integrations.map((id) => INTEGRATIONS.find((i) => i.id === id)?.name ?? id)} />
        )}
      </SummaryCard>

      <SummaryCard title={t("onboarding.review.security")} onEdit={() => onEditStep(7)}>
        <ChipList items={activeSecurity.map((o) => t(o.nameKey))} />
      </SummaryCard>

      <SummaryCard title={t("onboarding.review.teamWorkflows")} onEdit={() => onEditStep(8)}>
        <div className="flex flex-col gap-2">
          {team.length === 0 ? (
            <EmptyLine text={t("onboarding.review.noTeam")} />
          ) : (
            <p className="text-[12px] text-[var(--octo-text-secondary)]">
              {t("onboarding.review.teamCount").replace("{n}", String(team.length))}
            </p>
          )}
          {workflows.length === 0 ? (
            <EmptyLine text={t("onboarding.review.noWorkflows")} />
          ) : (
            <ChipList items={workflows.map((id) => t(WORKFLOW_TEMPLATES.find((w) => w.id === id)?.nameKey ?? ""))} />
          )}
        </div>
      </SummaryCard>
    </div>
  );
}

function SummaryCard({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-1 text-[11px] font-medium text-[#0D6EFD] hover:underline"
        >
          <Pencil size={11} /> {t("onboarding.review.edit")}
        </button>
      </div>
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

function ChipList({ items }: { items: readonly string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((label, i) => (
        <span
          key={`${label}-${i}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--octo-hover)] px-2.5 py-1 text-[11.5px] text-[var(--octo-text-secondary)]"
        >
          <Check size={11} />
          {label}
        </span>
      ))}
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="text-[11.5px] text-[var(--octo-text-faint)]">{text}</p>;
}
