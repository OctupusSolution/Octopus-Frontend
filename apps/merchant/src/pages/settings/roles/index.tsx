import { useEffect, useMemo, useRef, useState } from "react";
import { Check, CircleCheck, Lock, Minus, Plus, Save, ShieldCheck, X } from "lucide-react";
import clsx from "clsx";
import { Badge, Button } from "@ui/primitives";
import {
  roles as roleSeed,
  permissionActions,
  permissionModules,
  type PermissionAction,
  type PermissionMatrix,
  type Role,
} from "@/shared/api/mock-settings-roles";
import { useI18n } from "@/app/providers/i18n-provider";

const ROLE_KEY: Record<string, string> = {
  Owner: "settings.roles.role.owner",
  "Branch Manager": "settings.roles.role.branchManager",
  "Shift Supervisor": "settings.roles.role.shiftSupervisor",
  Cashier: "settings.roles.role.cashier",
  Waiter: "settings.roles.role.waiter",
  Kitchen: "settings.roles.role.kitchen",
  Driver: "settings.roles.role.driver",
  Accountant: "settings.roles.role.accountant",
};

const MODULE_KEY: Record<string, string> = {
  Dashboard: "settings.roles.module.dashboard",
  Orders: "settings.roles.module.orders",
  Menu: "settings.roles.module.menu",
  Inventory: "settings.roles.module.inventory",
  Delivery: "settings.roles.module.delivery",
  Customers: "settings.roles.module.customers",
  Marketing: "settings.roles.module.marketing",
  Finance: "settings.roles.module.finance",
  Staff: "settings.roles.module.staff",
  Reports: "settings.roles.module.reports",
  Settings: "settings.roles.module.settings",
  Integrations: "settings.roles.module.integrations",
};

const ACTION_KEY: Record<PermissionAction, string> = {
  View: "settings.roles.action.view",
  Create: "settings.roles.action.create",
  Edit: "settings.roles.action.edit",
  Delete: "settings.roles.action.delete",
  Approve: "settings.roles.action.approve",
};

type TriState = "on" | "off" | "some";

function TriCheck({
  state,
  onChange,
  disabled,
}: {
  state: TriState;
  onChange: (next: "on" | "off") => void;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = state === "some";
  }, [state]);

  return (
    <label
      className={clsx(
        "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors",
        state === "off" && "border-[var(--octo-border-input)] bg-[var(--octo-card)]",
        (state === "on" || state === "some") && "border-[#0D6EFD] bg-[#0D6EFD]",
        disabled && "cursor-not-allowed opacity-40"
      )}
    >
      <input
        ref={ref}
        type="checkbox"
        className="sr-only"
        checked={state === "on"}
        disabled={disabled}
        onChange={() => onChange(state === "on" ? "off" : "on")}
      />
      {state === "on" ? <Check size={10} strokeWidth={3} className="text-white" /> : null}
      {state === "some" ? <Minus size={10} strokeWidth={3} className="text-white" /> : null}
    </label>
  );
}

function matrixState(matrix: PermissionMatrix, mod: string): TriState {
  const actions = Object.values(matrix[mod as keyof PermissionMatrix]);
  if (actions.every(Boolean)) return "on";
  if (actions.some(Boolean)) return "some";
  return "off";
}

export function RolesSettingsPage() {
  const { t } = useI18n();
  const [selectedId, setSelectedId] = useState<string>(roleSeed[0].id);
  const [drafts, setDrafts] = useState<Record<string, PermissionMatrix>>(() =>
    Object.fromEntries(roleSeed.map((r) => [r.id, r.permissions]))
  );
  const [baseline, setBaseline] = useState<Record<string, PermissionMatrix>>(() =>
    Object.fromEntries(roleSeed.map((r) => [r.id, r.permissions]))
  );
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(id);
  }, [toast]);

  const selected = roleSeed.find((r) => r.id === selectedId) ?? roleSeed[0];
  const locked = Boolean(selected.locked);
  const matrix = drafts[selected.id];

  const dirty = useMemo(
    () => JSON.stringify(baseline[selected.id]) !== JSON.stringify(drafts[selected.id]),
    [baseline, drafts, selected.id]
  );

  function setCell(mod: string, action: PermissionAction, value: boolean) {
    setDrafts((prev) => {
      const next = structuredClone(prev);
      next[selected.id] = { ...next[selected.id], [mod as keyof PermissionMatrix]: { ...next[selected.id][mod as keyof PermissionMatrix], [action]: value } };
      return next;
    });
  }

  function setModule(mod: string, next: "on" | "off") {
    setDrafts((prev) => {
      const copy = structuredClone(prev);
      const m = copy[selected.id];
      for (const action of permissionActions) m[mod as keyof PermissionMatrix][action] = next === "on";
      return copy;
    });
  }

  function onSave() {
    setBaseline((prev) => ({ ...prev, [selected.id]: structuredClone(drafts[selected.id]) }));
    setToast(t("settings.roles.saved"));
  }

  function onDiscard() {
    setDrafts((prev) => ({ ...prev, [selected.id]: structuredClone(baseline[selected.id]) }));
  }

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("settings.roles.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">
            {t("settings.roles.subtitle")}
          </p>
        </div>
        <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={() => setToast(t("settings.roles.added"))}>
          {t("settings.roles.addRole")}
        </Button>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[290px_1fr]">
        {/* Master — role list */}
        <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
          <div className="flex items-center gap-2">
            <ShieldCheck size={15} className="text-[var(--octo-text-muted)]" />
            <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("settings.roles.listTitle")}</h2>
          </div>

          <div className="mt-3 flex flex-col gap-1">
            {roleSeed.map((role) => {
              const active = role.id === selectedId;
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedId(role.id)}
                  className={clsx(
                    "flex items-center justify-between gap-2 rounded-[9px] px-3 py-2.5 text-start transition-colors",
                    active ? "bg-[var(--octo-selected)] text-[#0D6EFD]" : "text-[var(--octo-text-secondary)] hover:bg-[var(--octo-hover)]"
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-[12.5px] font-medium">{t(ROLE_KEY[role.name] ?? role.name)}</span>
                    {role.locked && <Lock size={11} className="shrink-0 text-[var(--octo-text-faint)]" />}
                  </span>
                  <span className="shrink-0 text-[11px] text-[var(--octo-text-faint)]">{role.users}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Detail — permission matrix */}
        <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t(ROLE_KEY[selected.name] ?? selected.name)}</h2>
            <Badge tone="neutral">{t("settings.roles.usersCount").replace("{n}", String(selected.users))}</Badge>
            {locked && <Badge tone="info"><Lock size={10} /> {t("settings.roles.locked")}</Badge>}
          </div>

          {locked && (
            <p className="mt-2 rounded-[9px] bg-[var(--octo-selected)] px-3 py-2 text-[11.5px] text-[#0D6EFD]">
              {t("settings.roles.lockedHint")}
            </p>
          )}

          <div className="octo-scroll mt-3 overflow-x-auto">
            <div className="min-w-[620px]">
              <div className="grid grid-cols-[1fr_repeat(5,44px)] items-center gap-1 border-b border-[var(--octo-divider)] px-2 pb-2">
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
                  {t("settings.roles.colModule")}
                </span>
                {permissionActions.map((a) => (
                  <span key={a} className="text-center text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
                    {t(ACTION_KEY[a])}
                  </span>
                ))}
              </div>

              {permissionModules.map((mod) => (
                <div
                  key={mod}
                  className="grid grid-cols-[1fr_repeat(5,44px)] items-center gap-1 border-b border-[var(--octo-row-border)] px-2 py-2.5 transition-colors hover:bg-[var(--octo-row-hover)]"
                >
                  <div className="flex items-center gap-2">
                    <TriCheck
                      state={matrixState(matrix, mod)}
                      disabled={locked}
                      onChange={(next) => setModule(mod, next)}
                    />
                    <span className="text-[12.5px] font-medium text-[var(--octo-text-primary)]">{t(MODULE_KEY[mod])}</span>
                  </div>
                  {permissionActions.map((action) => (
                    <div key={action} className="flex justify-center">
                      <label className="inline-flex h-4 w-4 cursor-pointer items-center justify-center">
                        <input
                          type="checkbox"
                          checked={matrix[mod][action]}
                          disabled={locked}
                          onChange={(e) => setCell(mod, action, e.target.checked)}
                          className="peer sr-only"
                        />
                        <span className="grid h-4 w-4 place-items-center rounded-[4px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] text-white transition-colors peer-checked:border-[#0D6EFD] peer-checked:bg-[#0D6EFD] peer-disabled:cursor-not-allowed peer-disabled:opacity-40">
                          <Check size={10} strokeWidth={3} />
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {dirty && (
        <div className="sticky bottom-0 z-10 -mx-4 -mb-6 mt-5 flex flex-col gap-3 border-t border-[var(--octo-border-card)] bg-[var(--octo-card)] px-4 py-3 backdrop-blur sm:-mx-[26px] sm:flex-row sm:items-center sm:justify-between sm:px-[26px]">
          <p className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--octo-text-secondary)]">
            <span className="h-2 w-2 rounded-full bg-[#F59E0B]" />
            {t("settings.business.unsaved")}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" icon={<X size={13} />} onClick={onDiscard}>
              {t("settings.business.discard")}
            </Button>
            <Button variant="primary" size="sm" icon={<Save size={13} />} onClick={onSave}>
              {t("settings.business.save")}
            </Button>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-5 end-5 z-50 flex items-center gap-2 rounded-[9px] border border-[#22C55E]/20 bg-[#22C55E]/10 px-4 py-2.5 text-[12.5px] font-medium text-[#16a34a] shadow-lg">
          <CircleCheck size={14} className="text-[#22C55E]" />
          {toast}
        </div>
      )}
    </div>
  );
}
