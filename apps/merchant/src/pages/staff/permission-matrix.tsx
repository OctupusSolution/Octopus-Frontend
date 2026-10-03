// The permission matrix, driven by the business's own catalog
// (GET /permission-catalog: modules -> capabilities -> permissions, already
// intersected with what the business has bought) and one role's flat grant set
// (GET /roles/{id}). Saving replaces the whole set (PUT /roles/{id}/permissions)
// with the version it was read at, so a concurrent edit fails loudly instead of
// being half-applied.
import { Fragment, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
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
import { StaffIcon } from "./_shared/icon";
import { useStaffLabels } from "./_shared/labels";
import { noteRoleVersion, serverRoleId } from "./_shared/staff-sync";
import type { RoleRecord } from "./_shared/staff-store";
import { Switch } from "./_shared/switch";
import { staffErrorText, useTx, UUID_RE } from "./_shared/text";
import { FILL_RED, INK, INK_MUTED, INK_SOFT, LINE, LINE_SOFT, TEXT_RED } from "./_shared/theme";

// The frame's module glyphs, matched on the catalog's module code. The floor
// plan is the one the frame draws at 20px rather than 24.
const MODULE_ICONS: [RegExp, string, number?][] = [
  [/staff/, "staff-perm-people.svg"],
  [/dashboard|home/, "staff-perm-home.svg"],
  [/menu/, "staff-perm-menu-board.svg"],
  [/order|pos|kds/, "staff-perm-clipboard-text.svg"],
  [/reservation|booking/, "staff-perm-calendar-add.svg"],
  [/wait/, "staff-perm-clipboard-text.svg"],
  [/floor/, "staff-perm-floor-plan.svg", 20],
  [/crm|customer/, "staff-perm-profile-2user.svg"],
  [/bill|pay|finance/, "staff-perm-money.svg"],
  [/inventory|stock/, "staff-perm-box.svg"],
  [/report|analytic/, "staff-perm-document-text.svg"],
];
function moduleIcon(code: string): { name: string; size: number } {
  const hit = MODULE_ICONS.find(([re]) => re.test(code));
  return { name: hit?.[1] ?? "staff-perm-setting.svg", size: hit?.[2] ?? 24 };
}

// The catalog sends module codes ("crm", "floor-plan") and resource keys the
// console has no translation for, so the modules the console knows are named
// here; anything else is still read off its code.
const MODULE_NAMES: [RegExp, string, string][] = [
  [/crm|customer/, "Customer CRM", "إدارة علاقات العملاء"],
  [/floor/, "Floor Plan", "مخطط القاعة"],
  [/menu/, "Menu", "القائمة"],
  [/order/, "Orders", "الطلبات"],
  [/public/, "Public Link", "الرابط العام"],
  [/reservation|booking/, "Reservations", "الحجوزات"],
  [/wait/, "Wait List", "قائمة الانتظار"],
  [/staff/, "Staff", "الموظفون"],
];

// The card the matrix sits in, the same one as the Roles list beside it.
const CARD = `min-w-0 rounded-[16px] border bg-[var(--octo-card)] p-3 ${LINE}`;

// Table chrome from the frame: a 36px tinted header over 52px rows, split by
// 0.8px hairlines.
const PANEL = `rounded-[14.5px] border-[0.8px] bg-[var(--octo-card)] ${LINE_SOFT}`;
const HEAD_CELL = `h-9 border-b-[0.8px] px-3 text-[12px] font-medium capitalize leading-3 ${LINE_SOFT} ${INK}`;
const ROW_LINE = "border-b-[0.8px] border-[#f1f5f9] [[data-theme=dark]_&]:border-[var(--octo-divider)]";
const HEAD_FILL = "bg-[#f8fafc] [[data-theme=dark]_&]:bg-[var(--octo-hover)]";

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
      <h2 id="matrix-heading" className={clsx("text-[14px] font-bold leading-[14px]", INK)}>
        {t("staff.permissions.matrixHeading")}
      </h2>
      <p className={clsx("-mb-[2px] mt-[6px] text-[14px] leading-[18px]", INK_SOFT)}>
        {readOnly ? t("staff.permissions.systemRoleNote").replace("{name}", roleName) : t("staff.permissions.matrixSubheading")}
      </p>
    </>
  );

  const failure = catalogError ?? roleError;
  if (failure || !onServer || !catalog || !granted) {
    return (
      <section aria-labelledby="matrix-heading" className={CARD}>
        {heading}
        <div className={clsx("mt-4 flex min-h-[160px] flex-col items-center justify-center gap-3 px-4 py-8 text-center text-[14px]", PANEL, INK_SOFT)}>
          {failure ? (
            <>
              <p role="alert" className={TEXT_RED}>{failure}</p>
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
    <section aria-labelledby="matrix-heading" className={CARD}>
      {heading}

      {catalog.modules.length === 0 ? (
        <div className={clsx("mt-4 px-4 py-8 text-center text-[14px]", PANEL, INK_SOFT)}>
          {tx("No modules are active for this business yet, so there is nothing to grant.", "لا توجد وحدات مفعّلة لهذا النشاط بعد، فلا توجد صلاحيات لمنحها.")}
        </div>
      ) : (
        <div className={clsx("octo-scroll mt-4 overflow-x-auto p-[0.8px]", PANEL)}>
          <table className="w-full min-w-[560px] border-separate border-spacing-0">
            <caption className="sr-only">{t("staff.permissions.caption").replace("{name}", roleName)}</caption>
            <thead>
              <tr className={HEAD_FILL}>
                <th scope="col" className={clsx(HEAD_CELL, "text-start")}>
                  {t("staff.permissions.column.module")}
                </th>
                <th scope="col" className={clsx(HEAD_CELL, "w-[76px] text-center")}>
                  {tx("Granted", "الممنوحة")}
                </th>
                <th scope="col" className={clsx(HEAD_CELL, "w-[1%] whitespace-nowrap text-end")}>
                  <label className="inline-flex cursor-pointer items-center gap-2 align-middle">
                    <Switch checked={allOn} disabled={readOnly} onChange={(v) => setMany(allIds, v)} label={t("staff.permissions.selectAll")} />
                    {t("staff.permissions.selectAll")}
                  </label>
                </th>
              </tr>
            </thead>
            <tbody>
              {catalog.modules.map((m) => {
                const icon = moduleIcon(m.code);
                const open = expanded.has(m.code);
                const known = MODULE_NAMES.find(([re]) => re.test(m.code));
                const moduleLabel = label(m.displayNameKey, known ? tx(known[1], known[2]) : words(m.code));
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
                    <tr>
                      <th scope="row" className={clsx("h-[52px] px-3 text-start font-normal", ROW_LINE)}>
                        <div className="flex items-center gap-2">
                          {/* One 24px slot for every glyph, so the names line up whatever size the frame draws the icon at. */}
                          <span className="grid h-6 w-6 shrink-0 place-items-center">
                            <StaffIcon name={icon.name} size={icon.size} className={INK} />
                          </span>
                          <span className={clsx("-my-[2px] min-w-0 flex-1 truncate py-[2px] text-[14px] font-medium leading-[14px]", INK)}>{moduleLabel}</span>
                          <button
                            type="button"
                            aria-expanded={open}
                            aria-label={t(open ? "staff.permissions.collapse" : "staff.permissions.expand").replace("{module}", moduleLabel)}
                            onClick={() => toggleExpanded(m.code)}
                            className={clsx(
                              "grid h-6 w-6 shrink-0 place-items-center rounded-[4px] hover:bg-[var(--octo-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40",
                              INK_SOFT
                            )}
                          >
                            <StaffIcon name="staff-perm-arrow-down.svg" size={24} className={clsx("transition-transform", open && "rotate-180")} />
                          </button>
                        </div>
                      </th>
                      <td className={clsx("h-[52px] px-3 text-center text-[12px] font-medium tabular-nums leading-3", ROW_LINE, INK_SOFT)}>
                        {on} / {ids.length}
                      </td>
                      <td className={clsx("h-[52px] px-3", ROW_LINE)}>
                        <div className="flex justify-end">
                          <span className="relative inline-flex">
                            <Switch
                              size="lg"
                              checked={ids.length > 0 && on === ids.length}
                              disabled={readOnly || ids.length === 0}
                              onChange={(v) => setMany(ids, v)}
                              label={`${moduleLabel}${partial ? ` (${t("staff.permissions.partial")})` : ""}`}
                            />
                            {partial && <span title={t("staff.permissions.partial")} className="absolute -bottom-2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#0D6EFD]" />}
                          </span>
                        </div>
                      </td>
                    </tr>
                    {open &&
                      groups.map((g) => (
                        <Fragment key={g.key}>
                          <tr className={HEAD_FILL}>
                            <th scope="rowgroup" colSpan={3} className={clsx("h-9 pe-3 ps-11 text-start text-[12px] font-medium leading-3", ROW_LINE, INK)}>
                              {g.title}
                              {g.description && <span className={clsx("ms-2 font-normal", INK_MUTED)}>{g.description}</span>}
                            </th>
                          </tr>
                          {g.permissions.map((p) => {
                            // "crm.customers.export" reads as "Customers · Export".
                            const name = label(
                              p.displayNameKey,
                              (p.id.startsWith(`${m.code}.`) ? p.id.slice(m.code.length + 1) : p.id).split(".").map(words).join(" · ")
                            );
                            const description = label(p.descriptionKey, "");
                            return (
                              <tr key={p.id}>
                                {/* The raw permission id is for developers; it stays as a tooltip. */}
                                <th scope="row" colSpan={2} title={p.id} className={clsx("h-[44px] py-2 pe-3 ps-11 text-start font-normal", ROW_LINE)}>
                                  <span className={clsx("block text-[14px] leading-[18px]", INK)}>{name}</span>
                                  {description && <span className={clsx("block text-[12px] leading-4", INK_MUTED)}>{description}</span>}
                                </th>
                                <td className={clsx("h-[44px] px-3", ROW_LINE)}>
                                  <div className="flex justify-end">
                                    <Switch checked={draft.has(p.id)} disabled={readOnly} onChange={(v) => setMany([p.id], v)} label={name} />
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
        <p role="alert" className={clsx("mt-3 rounded-[8px] px-3 py-2.5 text-[14px] leading-[18px]", FILL_RED, TEXT_RED)}>
          {saveError}{" "}
          <button type="button" className="underline" onClick={() => setReloadTick((n) => n + 1)}>
            {tx("Reload", "إعادة التحميل")}
          </button>
        </p>
      )}

      {dirty && !readOnly && (
        <div className={clsx("sticky bottom-4 z-20 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border bg-[var(--octo-card)] p-3 shadow-[0px_0px_12px_0px_rgba(0,0,0,0.12)]", LINE_SOFT)}>
          <span className={clsx("flex items-center gap-2 text-[14px] font-medium leading-[14px]", INK)}>
            <StaffIcon name="staff-shield.svg" size={24} className="text-[#0D6EFD]" />
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
