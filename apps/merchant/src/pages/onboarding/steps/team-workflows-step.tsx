// Step 8 — two lightweight sections on one page rather than two thin steps:
// who else is on this team, and which routine notifications should run once
// the console is live. Both are local state only — invites don't send and
// workflows don't fire until this is wired to a real backend.
import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import clsx from "clsx";
import { Button, Input, Select } from "@ui/primitives";
import {
  WORKFLOW_TEMPLATES, type TeamInvite, type TeamRole, type WorkflowId,
} from "../_shared/extras-catalog";
import type { ModuleId } from "@/shared/catalog";
import { useI18n } from "@/app/providers/i18n-provider";
import { CatalogIcon } from "../_shared/icon";

const ROLES: readonly TeamRole[] = ["manager", "staff", "accountant"];

export function TeamWorkflowsStep({
  team,
  onTeamChange,
  workflows,
  onToggleWorkflow,
  enabledModules,
}: {
  team: readonly TeamInvite[];
  onTeamChange: (next: TeamInvite[]) => void;
  workflows: readonly WorkflowId[];
  onToggleWorkflow: (id: WorkflowId) => void;
  enabledModules: readonly ModuleId[];
}) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("manager");

  function addInvite() {
    if (!name.trim() || !email.trim()) return;
    onTeamChange([...team, { id: `${Date.now()}`, name: name.trim(), email: email.trim(), role }]);
    setName("");
    setEmail("");
    setRole("manager");
  }

  function removeInvite(id: string) {
    onTeamChange(team.filter((invite) => invite.id !== id));
  }

  return (
    <div className="flex flex-col gap-3">
      <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
          {t("onboarding.team.title")}
        </h3>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_140px_auto] sm:items-end">
          <Input
            label={t("onboarding.team.nameLabel")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("onboarding.team.namePlaceholder")}
          />
          <Input
            type="email"
            label={t("onboarding.team.emailLabel")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("onboarding.team.emailPlaceholder")}
          />
          <Select label={t("onboarding.team.roleLabel")} value={role} onChange={(e) => setRole(e.target.value as TeamRole)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {t(`onboarding.team.roles.${r}`)}
              </option>
            ))}
          </Select>
          <Button type="button" variant="secondary" icon={<Plus size={13} />} onClick={addInvite}>
            {t("onboarding.team.addButton")}
          </Button>
        </div>

        {team.length === 0 ? (
          <p className="mt-3 text-[11.5px] text-[var(--octo-text-faint)]">{t("onboarding.team.empty")}</p>
        ) : (
          <div className="mt-3 flex flex-col gap-1.5">
            {team.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center gap-2.5 rounded-[9px] border border-[var(--octo-border-input)] px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-medium text-[var(--octo-text-primary)]">{invite.name}</p>
                  <p className="truncate text-[11px] text-[var(--octo-text-muted)]">{invite.email}</p>
                </div>
                <span className="shrink-0 rounded-full bg-[var(--octo-hover)] px-2 py-0.5 text-[10.5px] font-medium text-[var(--octo-text-secondary)]">
                  {t(`onboarding.team.roles.${invite.role}`)}
                </span>
                <button
                  type="button"
                  onClick={() => removeInvite(invite.id)}
                  aria-label={t("onboarding.team.remove")}
                  className="shrink-0 grid h-6 w-6 place-items-center rounded-md text-[var(--octo-text-faint)] transition-colors hover:bg-[var(--octo-hover)] hover:text-[var(--octo-text-secondary)]"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="mt-3 text-[11px] text-[var(--octo-text-faint)]">{t("onboarding.team.disclaimer")}</p>
      </section>

      <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
          {t("onboarding.workflows.title")}
        </h3>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {WORKFLOW_TEMPLATES.map((template) => {
            const active = workflows.includes(template.id);
            const related = template.relatedModule && enabledModules.includes(template.relatedModule as ModuleId);
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => onToggleWorkflow(template.id)}
                aria-pressed={active}
                className={clsx(
                  "flex items-start gap-2.5 rounded-[10px] border px-3 py-2.5 text-start transition-colors",
                  active
                    ? "border-[#0D6EFD] bg-[var(--octo-selected)]"
                    : "border-[var(--octo-border-input)] hover:bg-[var(--octo-hover)]"
                )}
              >
                <span className="mt-0.5 shrink-0 text-[var(--octo-text-secondary)]">
                  <CatalogIcon name={template.icon} size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-medium text-[var(--octo-text-primary)]">{t(template.nameKey)}</p>
                  <p className="mt-0.5 text-[11px] text-[var(--octo-text-muted)]">{t(template.descKey)}</p>
                  {related && (
                    <p className="mt-1 text-[10.5px] text-[#0D6EFD]">{t("onboarding.workflows.moduleReady")}</p>
                  )}
                </div>
                {active && (
                  <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[#0D6EFD] text-white">
                    <Check size={9} strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
