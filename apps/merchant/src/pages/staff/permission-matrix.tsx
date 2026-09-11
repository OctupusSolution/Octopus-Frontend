import { Fragment, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  FileText,
  House,
  LayoutGrid,
  Package,
  ReceiptText,
  Settings,
  Users,
  UsersRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import clsx from "clsx";
import { MODULES, MODULE_FEATURES, PERMISSION_ACTIONS, type ModuleId, type PermissionAction } from "@/shared/api/mock-staff";
import { useI18n } from "@/app/providers/i18n-provider";
import { useStaffLabels } from "./_shared/labels";
import { uniformPermissions, useStaffStore, type RoleRecord } from "./_shared/staff-store";
import { Switch } from "./_shared/switch";

const MODULE_ICONS: Record<ModuleId, LucideIcon> = {
  dashboard: House,
  reservations: CalendarDays,
  waitlist: ClipboardList,
  floorPlan: LayoutGrid,
  orders: ReceiptText,
  paymentRefund: Wallet,
  menuPos: BookOpen,
  inventory: Package,
  reports: FileText,
  customerCrm: Users,
  staffManagement: UsersRound,
  settingIntegrations: Settings,
};

export function PermissionMatrix({ role }: { role: RoleRecord }) {
  const { t } = useI18n();
  const labels = useStaffLabels();
  const store = useStaffStore();
  const [expanded, setExpanded] = useState<Set<ModuleId>>(() => new Set());
  const permissions = store.permissions[role.id];
  const readOnly = role.isSystemRole;
  const roleName = labels.roleName(role);

  if (!permissions) return null;

  const moduleValue = (moduleId: ModuleId, action: PermissionAction) => {
    const features = MODULE_FEATURES[moduleId];
    const on = features.filter((f) => permissions[moduleId][f][action]).length;
    return { checked: on === features.length, partial: on > 0 && on < features.length };
  };

  const allOn = MODULES.every((m) => PERMISSION_ACTIONS.every((a) => moduleValue(m.id, a).checked));

  const setModule = (moduleId: ModuleId, action: PermissionAction, value: boolean) =>
    store.setRolePermissions(role.id, (prev) => ({
      ...prev,
      [moduleId]: Object.fromEntries(MODULE_FEATURES[moduleId].map((f) => [f, { ...prev[moduleId][f], [action]: value }])),
    }));

  const setFeature = (moduleId: ModuleId, feature: string, action: PermissionAction, value: boolean) =>
    store.setRolePermissions(role.id, (prev) => ({
      ...prev,
      [moduleId]: { ...prev[moduleId], [feature]: { ...prev[moduleId][feature], [action]: value } },
    }));

  const toggleExpanded = (moduleId: ModuleId) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });

  return (
    <section aria-labelledby="matrix-heading" className="min-w-0">
      <h2 id="matrix-heading" className="text-[16px] font-semibold text-[var(--octo-text-primary)]">
        {t("staff.permissions.matrixHeading")}
      </h2>
      <p className="mt-1 text-[14px] text-[var(--octo-text-secondary)]">
        {readOnly ? t("staff.permissions.systemRoleNote").replace("{name}", roleName) : t("staff.permissions.matrixSubheading")}
      </p>

      <div className="octo-scroll mt-4 overflow-x-auto rounded-[16px] border border-[var(--octo-border-card)] bg-[var(--octo-card)]">
        <table className="w-full min-w-[720px] table-fixed border-collapse text-[14px]">
          <caption className="sr-only">{t("staff.permissions.caption").replace("{name}", roleName)}</caption>
          <thead>
            <tr className="bg-[var(--octo-hover)]">
              <th scope="col" className="w-[252px] py-3 pe-2 ps-4 text-start">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[13px] font-medium text-[var(--octo-text-primary)]">{t("staff.permissions.column.module")}</span>
                  <label className="flex cursor-pointer items-center gap-2 text-[13px] font-medium text-[var(--octo-text-primary)]">
                    <Switch
                      checked={allOn}
                      disabled={readOnly}
                      onChange={(v) => store.setRolePermissions(role.id, () => uniformPermissions(v))}
                      label={t("staff.permissions.selectAll")}
                    />
                    {t("staff.permissions.selectAll")}
                  </label>
                </div>
              </th>
              {PERMISSION_ACTIONS.map((action) => (
                <th key={action} scope="col" className="px-1 py-3 text-center text-[13px] font-medium text-[var(--octo-text-primary)]">
                  {t(`staff.permissions.column.${action}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULES.map((m) => {
              const Icon = MODULE_ICONS[m.id];
              const open = expanded.has(m.id);
              const moduleLabel = labels.moduleLabel(m.id);
              return (
                <Fragment key={m.id}>
                  <tr className="border-t border-[var(--octo-divider)]">
                    <th scope="row" className="py-2.5 pe-2 ps-4 text-start font-normal">
                      <div className="flex items-center gap-2">
                        <Icon size={22} strokeWidth={1.5} aria-hidden className="shrink-0 text-[var(--octo-text-primary)]" />
                        <span className="min-w-0 flex-1 truncate text-[15px] text-[var(--octo-text-primary)]">{moduleLabel}</span>
                        <button
                          type="button"
                          aria-expanded={open}
                          aria-label={t(open ? "staff.permissions.collapse" : "staff.permissions.expand").replace("{module}", moduleLabel)}
                          onClick={() => toggleExpanded(m.id)}
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]"
                        >
                          <ChevronDown size={20} className={clsx("transition-transform", open && "rotate-180")} />
                        </button>
                      </div>
                    </th>
                    {PERMISSION_ACTIONS.map((action) => {
                      const { checked, partial } = moduleValue(m.id, action);
                      const actionLabel = t(`staff.permissions.column.${action}`);
                      return (
                        <td key={action} className="px-2 py-2.5">
                          <div className="relative flex justify-center">
                            <Switch
                              checked={checked}
                              disabled={readOnly}
                              onChange={(v) => setModule(m.id, action, v)}
                              label={`${moduleLabel} — ${actionLabel}${partial ? ` (${t("staff.permissions.partial")})` : ""}`}
                            />
                            {partial && (
                              <span
                                title={t("staff.permissions.partial")}
                                className="absolute -bottom-2 h-1.5 w-1.5 rounded-full bg-[#0D6EFD]"
                              />
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                  {open &&
                    MODULE_FEATURES[m.id].map((feature) => (
                      <tr key={feature} className="bg-[var(--octo-hover)]">
                        <th scope="row" className="py-2 pe-4 ps-[58px] text-start text-[13px] font-normal text-[var(--octo-text-secondary)]">
                          {labels.featureLabel(feature)}
                        </th>
                        {PERMISSION_ACTIONS.map((action) => (
                          <td key={action} className="px-2 py-2">
                            <div className="flex justify-center">
                              <Switch
                                size="sm"
                                checked={permissions[m.id][feature][action]}
                                disabled={readOnly}
                                onChange={(v) => setFeature(m.id, feature, action, v)}
                                label={`${labels.featureLabel(feature)} — ${t(`staff.permissions.column.${action}`)}`}
                              />
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

