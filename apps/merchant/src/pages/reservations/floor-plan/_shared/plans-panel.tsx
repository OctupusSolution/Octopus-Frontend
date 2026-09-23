// Every floor plan the business has, from the server: the entry summary on
// top, then one row per plan with its actions (details, duplicate, archive or
// restore, delete while never published, statistics) and the switch that
// makes a plan the one the builder and live floor work on.
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Archive, ArchiveRestore, BarChart3, Copy, LayoutTemplate, MoreHorizontal, Pencil, Trash2, Users, X } from "lucide-react";
import clsx from "clsx";
import {
  archiveFloorPlan,
  deleteFloorPlan,
  duplicateFloorPlan,
  getFloorPlan,
  getFloorPlanStats,
  getFloorPlanSummary,
  listFloorPlans,
  restoreFloorPlan,
  updateFloorPlanDetails,
  type FloorPlanBadge,
  type FloorPlanEntrySummaryResponse,
  type FloorPlanStatsResponse,
  type FloorPlanSummaryResponse,
} from "@octopus/api-client";
import { Modal } from "@ui/primitives";
import { useAuth } from "@/app/providers/auth-provider";
import { useI18n } from "@/app/providers/i18n-provider";
import { useAdminText, type AdminT, type AdminTextKey } from "./admin-text";
import { errorText, idempotencyKey } from "./api-error";
import { ConfirmModal } from "./confirm-modal";
import { Dropdown, MenuItem } from "./dropdown";
import { TextAreaField, TextField } from "./fields";
import { formatDateTime, formatNumber } from "./format";
import { TableIcon } from "./icons";
import { SwitchField } from "./switch";

type Dialog =
  | { kind: "details"; plan: FloorPlanSummaryResponse }
  | { kind: "duplicate"; plan: FloorPlanSummaryResponse }
  | { kind: "archive"; plan: FloorPlanSummaryResponse }
  | { kind: "delete"; plan: FloorPlanSummaryResponse }
  | { kind: "stats"; plan: FloorPlanSummaryResponse };

const BADGE_TONE: Record<FloorPlanBadge, string> = {
  Draft: "bg-[#F59E0B]/12 text-[#B45309]",
  Published: "bg-[var(--octo-tone-success-bg)] text-[var(--octo-tone-success-text)]",
  PublishedWithChanges: "bg-[#0D6EFD]/10 text-[#0D6EFD]",
  Archived: "bg-[var(--octo-track)] text-[var(--octo-text-muted)]",
};

function SummaryTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--octo-border-card)] px-4 py-3">
      <span className="text-[#2563EB]">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{label}</p>
        <p className="text-[18px] font-bold text-[var(--octo-text-primary)]">{value}</p>
      </div>
    </div>
  );
}

export function PlansPanel({
  activePlanId,
  onSwitch,
  onActiveChanged,
  notify,
  className,
}: {
  activePlanId: string | null;
  onSwitch: (planId: string) => Promise<void>;
  /** The active plan was changed here (renamed, archived, deleted…). */
  onActiveChanged: (removed: boolean) => Promise<void>;
  notify: (text: string, tone?: "success" | "error" | "info") => void;
  className?: string;
}) {
  const t = useAdminText();
  const { locale } = useI18n();
  const businessId = useAuth().activeBusinessId ?? null;
  const [summary, setSummary] = useState<FloorPlanEntrySummaryResponse | null>(null);
  const [plans, setPlans] = useState<FloorPlanSummaryResponse[] | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!businessId) return;
    setError(null);
    try {
      const [s, list] = await Promise.all([getFloorPlanSummary(businessId), listFloorPlans(businessId, { includeArchived: showArchived, pageSize: 50 })]);
      setSummary(s);
      setPlans(list.data);
    } catch (err) {
      setError(errorText(err, t));
    }
  }, [businessId, showArchived, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(plan: FloorPlanSummaryResponse, job: () => Promise<unknown>, done: string, affectsActive: "changed" | "removed" | null) {
    setBusyId(plan.id);
    try {
      await job();
      notify(done);
      await load();
      if (affectsActive && plan.id === activePlanId) await onActiveChanged(affectsActive === "removed");
    } catch (err) {
      notify(errorText(err, t), "error");
    } finally {
      setBusyId(null);
    }
  }

  if (!businessId) return null;
  if (plans && plans.length === 0 && !showArchived && !error) return null;

  const active = activePlanId ?? plans?.find((p) => p.badge === "Published")?.id ?? plans?.[0]?.id ?? null;

  return (
    <section className={clsx("rounded-2xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[17px] font-semibold text-[var(--octo-text-primary)]">{t("plans.title")}</h2>
          <p className="mt-1 text-[13px] text-[var(--octo-text-secondary)]">{t("plans.subtitle")}</p>
        </div>
        <SwitchField size="sm" checked={showArchived} onChange={setShowArchived} label={t("plans.showArchived")} />
      </div>

      {summary && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SummaryTile icon={<LayoutTemplate size={20} strokeWidth={1.7} />} label={t("summary.plans")} value={formatNumber(summary.planCount, locale)} />
          <SummaryTile icon={<TableIcon size={20} />} label={t("summary.spots")} value={formatNumber(summary.totalSpots, locale)} />
          <SummaryTile icon={<Users size={20} strokeWidth={1.7} />} label={t("summary.capacity")} value={formatNumber(summary.totalCapacity, locale)} />
        </div>
      )}

      {error ? (
        <div role="alert" className="mt-4 flex items-center justify-between gap-3 rounded-[10px] bg-error/10 px-4 py-2.5 text-[13px] text-error">
          <span>{error || t("plans.loadFailed")}</span>
          <button type="button" className="shrink-0 underline" onClick={() => void load()}>
            {t("plans.retry")}
          </button>
        </div>
      ) : plans === null ? (
        <p className="mt-4 text-[13px] text-[var(--octo-text-muted)]">{t("plans.loading")}</p>
      ) : plans.length === 0 ? (
        <p className="mt-4 text-[13px] text-[var(--octo-text-muted)]">{t("plans.empty")}</p>
      ) : (
        <ul className="mt-4 flex flex-col divide-y divide-[var(--octo-border-card)] rounded-xl border border-[var(--octo-border-card)]">
          {plans.map((plan) => {
            const archived = plan.badge === "Archived";
            const isActive = plan.id === active && !archived;
            return (
              <li key={plan.id} className={clsx("flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center", busyId === plan.id && "opacity-60")}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-[14px] font-semibold text-[var(--octo-text-primary)]">{plan.name}</span>
                    <span className={clsx("rounded-full px-2 py-0.5 text-[11px] font-medium", BADGE_TONE[plan.badge])}>{t(`badge.${plan.badge}` as AdminTextKey)}</span>
                    {plan.lastPublishedVersion > 0 && !archived && (
                      <span className="text-[11.5px] text-[var(--octo-text-muted)]">{t("plans.version", { n: plan.lastPublishedVersion })}</span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-[12px] text-[var(--octo-text-muted)]">
                    {t("plans.tables", { n: formatNumber(plan.spotCount, locale) })} · {t("plans.seats", { n: formatNumber(plan.totalCapacity, locale) })}
                    {plan.updatedAtUtc && ` · ${t("plans.updated", { when: formatDateTime(Date.parse(plan.updatedAtUtc), locale) })}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {isActive ? (
                    <span className="rounded-full bg-[#0D6EFD]/10 px-2.5 py-1 text-[12px] font-medium text-[#0D6EFD]">{t("plans.inEditor")}</span>
                  ) : (
                    !archived && (
                      <button
                        type="button"
                        disabled={busyId !== null}
                        onClick={() => {
                          setBusyId(plan.id);
                          onSwitch(plan.id)
                            .catch((err) => notify(errorText(err, t), "error"))
                            .finally(() => setBusyId(null));
                        }}
                        className="h-9 rounded-[9px] border border-[var(--octo-border-input)] px-3 text-[12.5px] font-medium text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)] disabled:opacity-50"
                      >
                        {t("plans.useInEditor")}
                      </button>
                    )
                  )}
                  <Dropdown
                    ariaLabel={t("plans.actions")}
                    label={<MoreHorizontal size={16} />}
                    buttonClassName="h-9 !gap-1 !px-2.5"
                    panelClassName="w-[240px]"
                  >
                    {(close) => {
                      const open = (kind: Dialog["kind"]) => () => {
                        close();
                        setDialog({ kind, plan });
                      };
                      return (
                      <>
                        {!archived && <MenuItem icon={<Pencil size={15} />} label={t("plans.details")} onClick={open("details")} />}
                        <MenuItem icon={<Copy size={15} />} label={t("plans.duplicate")} onClick={open("duplicate")} />
                        <MenuItem icon={<BarChart3 size={15} />} label={t("plans.stats")} onClick={open("stats")} />
                        {archived ? (
                          <MenuItem
                            icon={<ArchiveRestore size={15} />}
                            label={t("plans.restore")}
                            onClick={() => {
                              close();
                              void act(plan, () => restoreFloorPlan(businessId, plan.id, { expectedVersion: plan.version }), t("restore.done"), null);
                            }}
                          />
                        ) : (
                          <MenuItem icon={<Archive size={15} />} label={t("plans.archive")} onClick={open("archive")} />
                        )}
                        <MenuItem
                          icon={<Trash2 size={15} />}
                          label={t("plans.delete")}
                          description={plan.lastPublishedVersion > 0 ? t("plans.deleteHint") : undefined}
                          disabled={plan.lastPublishedVersion > 0}
                          onClick={open("delete")}
                        />
                      </>
                      );
                    }}
                  </Dropdown>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {dialog?.kind === "details" && (
        <DetailsModal
          businessId={businessId}
          plan={dialog.plan}
          onClose={() => setDialog(null)}
          onSaved={() => {
            const plan = dialog.plan;
            setDialog(null);
            void act(plan, async () => undefined, t("details.saved"), "changed");
          }}
        />
      )}
      {dialog?.kind === "duplicate" && (
        <DuplicateModal
          plan={dialog.plan}
          onClose={() => setDialog(null)}
          onConfirm={(name) => {
            const plan = dialog.plan;
            setDialog(null);
            void act(plan, () => duplicateFloorPlan(businessId, plan.id, { name }, idempotencyKey()), t("duplicate.done"), null);
          }}
        />
      )}
      <ConfirmModal
        open={dialog?.kind === "archive"}
        onClose={() => setDialog(null)}
        tone="warning"
        icon={<Archive size={20} />}
        title={t("archive.title")}
        body={t("archive.body")}
        actions={[
          { label: t("common.cancel"), variant: "secondary", onClick: () => setDialog(null) },
          {
            label: t("plans.archive"),
            onClick: () => {
              if (dialog?.kind !== "archive") return;
              const plan = dialog.plan;
              setDialog(null);
              void act(plan, () => archiveFloorPlan(businessId, plan.id, { expectedVersion: plan.version }), t("archive.done"), "removed");
            },
          },
        ]}
      />
      <ConfirmModal
        open={dialog?.kind === "delete"}
        onClose={() => setDialog(null)}
        tone="danger"
        icon={<Trash2 size={20} />}
        title={t("delete.title")}
        body={t("delete.body")}
        actions={[
          { label: t("common.cancel"), variant: "secondary", onClick: () => setDialog(null) },
          {
            label: t("plans.delete"),
            variant: "danger",
            onClick: () => {
              if (dialog?.kind !== "delete") return;
              const plan = dialog.plan;
              setDialog(null);
              void act(plan, () => deleteFloorPlan(businessId, plan.id, plan.version), t("delete.done"), "removed");
            },
          },
        ]}
      />
      {dialog?.kind === "stats" && <StatsModal businessId={businessId} plan={dialog.plan} onClose={() => setDialog(null)} />}
    </section>
  );
}

function ModalHeader({ title, onClose, t }: { title: string; onClose: () => void; t: AdminT }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <h2 className="text-[16px] font-semibold text-[var(--octo-text-primary)]">{title}</h2>
      <button type="button" onClick={onClose} aria-label={t("common.close")} className="-me-1 -mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--octo-text-muted)] hover:bg-[var(--octo-hover)]">
        <X size={16} />
      </button>
    </div>
  );
}

function DetailsModal({ businessId, plan, onClose, onSaved }: { businessId: string; plan: FloorPlanSummaryResponse; onClose: () => void; onSaved: () => void }) {
  const t = useAdminText();
  const [form, setForm] = useState<{ name: string; description: string; branchId: string; version: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getFloorPlan(businessId, plan.id)
      .then((p) => {
        if (!cancelled) setForm({ name: p.name, description: p.description ?? "", branchId: p.branchId ?? "", version: p.version });
      })
      .catch((err) => {
        if (!cancelled) setError(errorText(err, t));
      });
    return () => {
      cancelled = true;
    };
  }, [businessId, plan.id, t]);

  async function save() {
    if (!form || !form.name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await updateFloorPlanDetails(businessId, plan.id, {
        name: form.name.trim(),
        description: form.description.trim() || null,
        branchId: form.branchId.trim() || null,
        expectedVersion: form.version,
      });
      onSaved();
    } catch (err) {
      setError(errorText(err, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} className="max-w-[480px] p-6">
      <ModalHeader title={t("details.title")} onClose={onClose} t={t} />
      {error && (
        <p role="alert" className="mt-3 rounded-[9px] bg-error/10 px-3 py-2 text-[12.5px] text-error">
          {error}
        </p>
      )}
      {!form ? (
        !error && <p className="py-6 text-center text-[13px] text-[var(--octo-text-muted)]">{t("common.loading")}</p>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          <TextField label={t("details.name")} value={form.name} maxLength={80} onChange={(name) => setForm({ ...form, name })} />
          <TextAreaField label={t("details.description")} value={form.description} maxLength={500} onChange={(description) => setForm({ ...form, description })} />
          <TextField label={t("details.branch")} hint={t("details.branchHint")} value={form.branchId} onChange={(branchId) => setForm({ ...form, branchId })} />
        </div>
      )}
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} className="h-10 rounded-[9px] border border-[var(--octo-border-input)] px-4 text-[13px] font-medium text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]">
          {t("common.cancel")}
        </button>
        <button
          type="button"
          disabled={!form || !form.name.trim() || busy}
          onClick={() => void save()}
          className="h-10 rounded-[9px] bg-[#0D6EFD] px-5 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? t("common.saving") : t("details.save")}
        </button>
      </div>
    </Modal>
  );
}

function DuplicateModal({ plan, onClose, onConfirm }: { plan: FloorPlanSummaryResponse; onClose: () => void; onConfirm: (name: string) => void }) {
  const t = useAdminText();
  const [name, setName] = useState(`${plan.name} ${t("duplicate.copySuffix")}`);
  return (
    <ConfirmModal
      open
      onClose={onClose}
      icon={<Copy size={20} />}
      title={t("duplicate.title")}
      body={t("duplicate.body")}
      actions={[
        { label: t("common.cancel"), variant: "secondary", onClick: onClose },
        { label: t("duplicate.confirm"), onClick: () => name.trim() && onConfirm(name.trim()) },
      ]}
    >
      <TextField label={t("duplicate.name")} value={name} maxLength={80} onChange={setName} />
    </ConfirmModal>
  );
}

const STAT_KEYS: (keyof FloorPlanStatsResponse)[] = [
  "spotCount",
  "totalCapacity",
  "zoneCount",
  "blockedCount",
  "walkInCapacity",
  "unzonedCount",
  "sceneElementCount",
  "wallLengthMeters",
];

function StatsModal({ businessId, plan, onClose }: { businessId: string; plan: FloorPlanSummaryResponse; onClose: () => void }) {
  const t = useAdminText();
  const { locale } = useI18n();
  const [stats, setStats] = useState<FloorPlanStatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getFloorPlanStats(businessId, plan.id)
      .then((s) => {
        if (!cancelled) setStats(s);
      })
      .catch((err) => {
        if (!cancelled) setError(errorText(err, t));
      });
    return () => {
      cancelled = true;
    };
  }, [businessId, plan.id, t]);

  return (
    <Modal open onClose={onClose} className="max-w-[480px] p-6">
      <ModalHeader title={`${t("stats.title")} · ${plan.name}`} onClose={onClose} t={t} />
      {error ? (
        <p role="alert" className="mt-3 rounded-[9px] bg-error/10 px-3 py-2 text-[12.5px] text-error">
          {error}
        </p>
      ) : !stats ? (
        <p className="py-6 text-center text-[13px] text-[var(--octo-text-muted)]">{t("common.loading")}</p>
      ) : (
        <dl className="mt-4 grid grid-cols-2 gap-3">
          {STAT_KEYS.map((k) => (
            <div key={k} className="rounded-xl border border-[var(--octo-border-card)] px-3.5 py-2.5">
              <dt className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{t(`stats.${k}` as AdminTextKey)}</dt>
              <dd className="mt-0.5 text-[18px] font-bold text-[var(--octo-text-primary)]" dir={k === "wallLengthMeters" ? "ltr" : undefined}>
                {k === "wallLengthMeters" ? `${stats[k].toFixed(1)}m` : formatNumber(stats[k], locale)}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </Modal>
  );
}
