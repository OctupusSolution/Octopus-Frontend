// The permission matrix, driven by the business's own catalog
// (GET /permission-catalog: modules -> capabilities -> permissions, already
// intersected with what the business has bought) and one role's flat grant set
// (GET /roles/{id}). Saving replaces the whole set (PUT /roles/{id}/permissions)
// with the version it was read at, so a concurrent edit fails loudly instead of
// being half-applied.
import { Fragment, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  LayoutGrid,
  Link2,
  Loader2,
  ReceiptText,
  Settings,
  ShieldCheck,
  Users,
  UsersRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import clsx from "clsx";
import {
  ApiError,
  getStaffPermissionCatalog,
  getStaffRole,
  setStaffRolePermissions,
  type PermissionCatalogEntryResponse,
  type PermissionCatalogModuleResponse,
  type PermissionCatalogResponse,
} from "@octopus/api-client";
import { useAuth } from "@/app/providers/auth-provider";
import { useI18n } from "@/app/providers/i18n-provider";
import { buttonClass } from "./_shared/buttons";
import { useStaffLabels } from "./_shared/labels";
import { noteRoleVersion, serverRoleId } from "./_shared/staff-sync";
import type { RoleRecord } from "./_shared/staff-store";
import { Switch } from "./_shared/switch";
import { staffErrorText, useTx, UUID_RE } from "./_shared/text";

const MODULE_ICONS: [RegExp, LucideIcon][] = [
  [/staff/, UsersRound],
  [/menu/, BookOpen],
  [/order|pos|kds/, ReceiptText],
  [/reservation|booking/, CalendarDays],
  [/wait/, ClipboardList],
  [/floor/, LayoutGrid],
  [/crm|customer/, Users],
  [/bill|pay|finance/, Wallet],
  [/link|site|store/, Link2],
];
const moduleIcon = (code: string): LucideIcon => MODULE_ICONS.find(([re]) => re.test(code))?.[1] ?? Settings;

// The catalog carries resource keys, never text. Keys the console has a
// translation for are shown translated; the rest are read off the identifier.
const words = (value: string) => value.replace(/[-_]+/g, " ").replace(/^\w/, (c) => c.toUpperCase());
const lastSegment = (id: string) => id.split(/[.:]/).filter(Boolean).pop() ?? id;

/** The permission ids a module offers, gated or not. */
function modulePermissions(m: PermissionCatalogModuleResponse): PermissionCatalogEntryResponse[] {
  return [...m.capabilities.flatMap((c) => c.permissions), ...m.ungatedPermissions];
}

const catalogCache = new Map<string, Promise<PermissionCatalogResponse>>();
function loadCatalog(businessId: string): Promise<PermissionCatalogResponse> {
  let hit = catalogCache.get(businessId);
  if (!hit) {
    hit = getStaffPermissionCatalog(businessId);
    hit.catch(() => catalogCache.delete(businessId));
    catalogCache.set(businessId, hit);
  }
  return hit;
}

interface Granted {
  roleId: string;
  permissions: Set<string>;
  version: number;
}

export function PermissionMatrix({ role }: { role: RoleRecord }) {
  const { t } = useI18n();
  const tx = useTx();
  const labels = useStaffLabels();
  const { activeBusinessId } = useAuth();
  const [catalog, setCatalog] = useState<PermissionCatalogResponse | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [granted, setGranted] = useState<Granted | null>(null);
  const [draft, setDraft] = useState<Set<string>>(() => new Set());
  const [roleError, setRoleError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [reloadTick, setReloadTick] = useState(0);

  const sid = serverRoleId(role.id);
  const onServer = UUID_RE.test(sid);
  const readOnly = role.isSystemRole;
  const roleName = labels.roleName(role);

  const label = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  useEffect(() => {
    if (!activeBusinessId) return;
    let cancelled = false;
    setCatalogError(null);
    loadCatalog(activeBusinessId)
      .then((res) => !cancelled && setCatalog(res))
      .catch((err) => !cancelled && setCatalogError(staffErrorText(err, tx)));
    return () => {
      cancelled = true;
    };
  }, [activeBusinessId, tx, reloadTick]);

  useEffect(() => {
    if (!activeBusinessId || !onServer) return;
    let cancelled = false;
    setGranted(null);
    setRoleError(null);
    setSaveError(null);
    getStaffRole(activeBusinessId, sid)
      .then((res) => {
        if (cancelled) return;
        const next = { roleId: res.id, permissions: new Set(res.permissions), version: res.version };
        setGranted(next);
        setDraft(new Set(next.permissions));
      })
      .catch((err) => !cancelled && setRoleError(staffErrorText(err, tx)));
    return () => {
      cancelled = true;
    };
  }, [activeBusinessId, sid, onServer, tx, reloadTick]);

  const allIds = useMemo(() => (catalog ? catalog.modules.flatMap((m) => modulePermissions(m).map((p) => p.id)) : []), [catalog]);
  const dirty = granted !== null && (draft.size !== granted.permissions.size || [...draft].some((p) => !granted.permissions.has(p)));

  const setMany = (ids: readonly string[], value: boolean) =>
    setDraft((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (value) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  const toggleExpanded = (code: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });

  const save = async () => {
    if (!activeBusinessId || !granted) return;
    setSaving(true);
    setSaveError(null);
    try {
      // The whole set is sent, including grants for modules this business has
      // not bought (the catalog hides those, but they are still valid ids).
      const res = await setStaffRolePermissions(activeBusinessId, sid, {
        permissions: [...draft],
        expectedVersion: granted.version,
      });
      const next = { roleId: res.id, permissions: new Set(res.permissions), version: res.version };
      setGranted(next);
      setDraft(new Set(next.permissions));
      noteRoleVersion(role.id, res.version);
    } catch (err) {
      setSaveError(staffErrorText(err, tx));
      if (err instanceof ApiError && err.problem?.errorCode === "staff.role.unknown-permission") {
        if (activeBusinessId) catalogCache.delete(activeBusinessId);
      }
    } finally {
      setSaving(false);
    }
  };

  const heading = (
    <>
      <h2 id="matrix-heading" className="text-[16px] font-semibold text-[var(--octo-text-primary)]">
        {t("staff.permissions.matrixHeading")}
      </h2>
      <p className="mt-1 text-[14px] text-[var(--octo-text-secondary)]">
        {readOnly ? t("staff.permissions.systemRoleNote").replace("{name}", roleName) : t("staff.permissions.matrixSubheading")}
      </p>
    </>
  );

  const failure = catalogError ?? roleError;
  if (failure || !onServer || !catalog || !granted) {
    return (
      <section aria-labelledby="matrix-heading" className="min-w-0">
        {heading}
        <div className="mt-4 flex min-h-[160px] flex-col items-center justify-center gap-3 rounded-[16px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-4 py-8 text-center text-[13px] text-[var(--octo-text-secondary)]">
          {failure ? (
            <>
              <p role="alert" className="text-[var(--octo-tone-danger-text)]">{failure}</p>
              <button type="button" onClick={() => setReloadTick((n) => n + 1)} className={buttonClass("secondary", "sm")}>
                {tx("Try again", "إعادة المحاولة")}
              </button>
            </>
          ) : (
            <span className="flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" aria-hidden />
              {onServer ? tx("Loading permissions…", "جارٍ تحميل الصلاحيات…") : tx("Saving the role first…", "جارٍ حفظ الدور أولًا…")}
            </span>
          )}
        </div>
      </section>
    );
  }

  const allOn = allIds.length > 0 && allIds.every((id) => draft.has(id));

  return (
    <section aria-labelledby="matrix-heading" className="min-w-0">
      {heading}

      {catalog.modules.length === 0 ? (
        <div className="mt-4 rounded-[16px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-4 py-8 text-center text-[13px] text-[var(--octo-text-secondary)]">
          {tx("No modules are active for this business yet, so there is nothing to grant.", "لا توجد وحدات مفعّلة لهذا النشاط بعد، فلا توجد صلاحيات لمنحها.")}
        </div>
      ) : (
        <div className="octo-scroll mt-4 overflow-x-auto rounded-[16px] border border-[var(--octo-border-card)] bg-[var(--octo-card)]">
          <table className="w-full min-w-[560px] border-collapse text-[14px]">
            <caption className="sr-only">{t("staff.permissions.caption").replace("{name}", roleName)}</caption>
            <thead>
              <tr className="bg-[var(--octo-hover)]">
                <th scope="col" className="py-3 pe-2 ps-4 text-start text-[13px] font-medium text-[var(--octo-text-primary)]">
                  {t("staff.permissions.column.module")}
                </th>
                <th scope="col" className="w-[110px] px-2 py-3 text-center text-[13px] font-medium text-[var(--octo-text-primary)]">
                  {tx("Granted", "الممنوحة")}
                </th>
                <th scope="col" className="w-[150px] py-3 pe-4 ps-2 text-end">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] font-medium text-[var(--octo-text-primary)]">
                    {t("staff.permissions.selectAll")}
                    <Switch checked={allOn} disabled={readOnly} onChange={(v) => setMany(allIds, v)} label={t("staff.permissions.selectAll")} />
                  </label>
                </th>
              </tr>
            </thead>
            <tbody>
              {catalog.modules.map((m) => {
                const Icon = moduleIcon(m.code);
                const open = expanded.has(m.code);
                const moduleLabel = label(m.displayNameKey, words(m.code));
                const ids = modulePermissions(m).map((p) => p.id);
                const on = ids.filter((id) => draft.has(id)).length;
                const partial = on > 0 && on < ids.length;
                const groups = [
                  ...m.capabilities.map((c) => ({ key: c.id, title: label(c.displayNameKey, words(lastSegment(c.id))), description: label(c.descriptionKey, ""), permissions: c.permissions })),
                  ...(m.ungatedPermissions.length
                    ? [{ key: `${m.code}-general`, title: tx("General", "عام"), description: "", permissions: m.ungatedPermissions }]
                    : []),
                ];
                return (
                  <Fragment key={m.code}>
                    <tr className="border-t border-[var(--octo-divider)]">
                      <th scope="row" className="py-2.5 pe-2 ps-4 text-start font-normal">
                        <div className="flex items-center gap-2">
                          <Icon size={22} strokeWidth={1.5} aria-hidden className="shrink-0 text-[var(--octo-text-primary)]" />
                          <span className="min-w-0 flex-1 truncate text-[15px] text-[var(--octo-text-primary)]">{moduleLabel}</span>
                          <button
                            type="button"
                            aria-expanded={open}
                            aria-label={t(open ? "staff.permissions.collapse" : "staff.permissions.expand").replace("{module}", moduleLabel)}
                            onClick={() => toggleExpanded(m.code)}
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]"
                          >
                            <ChevronDown size={20} className={clsx("transition-transform", open && "rotate-180")} />
                          </button>
                        </div>
                      </th>
                      <td className="px-2 py-2.5 text-center text-[13px] tabular-nums text-[var(--octo-text-secondary)]">
                        {on} / {ids.length}
                      </td>
                      <td className="py-2.5 pe-4 ps-2">
                        <div className="relative flex justify-end">
                          <Switch
                            checked={ids.length > 0 && on === ids.length}
                            disabled={readOnly || ids.length === 0}
                            onChange={(v) => setMany(ids, v)}
                            label={`${moduleLabel}${partial ? ` (${t("staff.permissions.partial")})` : ""}`}
                          />
                          {partial && <span title={t("staff.permissions.partial")} className="absolute -bottom-2 end-4 h-1.5 w-1.5 rounded-full bg-[#0D6EFD]" />}
                        </div>
                      </td>
                    </tr>
                    {open &&
                      groups.map((g) => (
                        <Fragment key={g.key}>
                          <tr className="bg-[var(--octo-hover)]">
                            <th scope="rowgroup" colSpan={3} className="py-2 pe-4 ps-[46px] text-start text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-secondary)]">
                              {g.title}
                              {g.description && <span className="ms-2 font-normal normal-case tracking-normal text-[var(--octo-text-muted)]">{g.description}</span>}
                            </th>
                          </tr>
                          {g.permissions.map((p) => {
                            const name = label(p.displayNameKey, words(p.id.startsWith(`${m.code}.`) ? p.id.slice(m.code.length + 1).replace(/\./g, " · ") : p.id));
                            const description = label(p.descriptionKey, "");
                            return (
                              <tr key={p.id} className="border-t border-[var(--octo-divider)] bg-[var(--octo-card)]">
                                <th scope="row" colSpan={2} className="py-2 pe-2 ps-[58px] text-start font-normal">
                                  <span className="block text-[13px] text-[var(--octo-text-primary)]">{name}</span>
                                  <span dir="ltr" className="block text-[11.5px] text-[var(--octo-text-muted)]">{description || p.id}</span>
                                </th>
                                <td className="py-2 pe-4 ps-2">
                                  <div className="flex justify-end">
                                    <Switch size="sm" checked={draft.has(p.id)} disabled={readOnly} onChange={(v) => setMany([p.id], v)} label={name} />
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </Fragment>
                      ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {saveError && (
        <p role="alert" className="mt-3 rounded-[10px] bg-[var(--octo-tone-danger-bg)] px-4 py-2.5 text-[13px] text-[var(--octo-tone-danger-text)]">
          {saveError}{" "}
          <button type="button" className="underline" onClick={() => setReloadTick((n) => n + 1)}>
            {tx("Reload", "إعادة التحميل")}
          </button>
        </p>
      )}

      {dirty && !readOnly && (
        <div className="sticky bottom-4 z-20 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-4 py-3 shadow-[0_12px_32px_rgba(16,24,40,0.14)]">
          <span className="flex items-center gap-2 text-[14px] font-medium text-[var(--octo-text-primary)]">
            <ShieldCheck size={18} aria-hidden className="text-[#0D6EFD]" />
            {tx("Unsaved permission changes", "تغييرات صلاحيات غير محفوظة")}
          </span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setDraft(new Set(granted.permissions))} disabled={saving} className={buttonClass("secondary")}>
              {t("staff.member.discard")}
            </button>
            <button type="button" onClick={() => void save()} disabled={saving} className={buttonClass("primary")}>
              {saving && <Loader2 size={16} className="animate-spin" aria-hidden />}
              {tx("Save permissions", "حفظ الصلاحيات")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
