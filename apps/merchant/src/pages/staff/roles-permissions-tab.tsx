import { useState } from "react";
import { Crown, Plus } from "lucide-react";
import { Button, Modal } from "@ui/primitives";
import {
  staffRoleDefs,
  MODULES,
  PERMISSION_ACTIONS,
  defaultPermissionMatrix,
  type StaffRoleDef,
  type RoleId,
  type PermissionAction,
  type PermissionMatrix,
} from "@/shared/api/mock-staff";
import { useI18n } from "@/app/providers/i18n-provider";
import { RowMenu, type RowMenuItem } from "./_shared/row-menu";

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="h-5 w-9 cursor-pointer appearance-none rounded-full bg-[var(--octo-track)] transition-colors checked:bg-[#0D6EFD]"
    />
  );
}

export function RolesPermissionsTab() {
  const { t } = useI18n();
  const [roles, setRoles] = useState<StaffRoleDef[]>([...staffRoleDefs]);
  const [matrix, setMatrix] = useState<PermissionMatrix>(defaultPermissionMatrix);
  const [selectedRoleId, setSelectedRoleId] = useState<RoleId>(staffRoleDefs[0].id);
  const [openMenuId, setOpenMenuId] = useState<RoleId | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StaffRoleDef | null>(null);

  const selectedRole = roles.find((r) => r.id === selectedRoleId) ?? roles[0];
  const roleMatrix = matrix[selectedRole.id];

  const allOn = MODULES.every((m) => PERMISSION_ACTIONS.every((a) => roleMatrix[m.id][a]));

  const setAction = (moduleId: (typeof MODULES)[number]["id"], action: PermissionAction, value: boolean) => {
    setMatrix((prev) => ({
      ...prev,
      [selectedRole.id]: {
        ...prev[selectedRole.id],
        [moduleId]: { ...prev[selectedRole.id][moduleId], [action]: value },
      },
    }));
  };

  const setSelectAll = (value: boolean) => {
    setMatrix((prev) => {
      const next = { ...prev[selectedRole.id] };
      for (const m of MODULES) {
        next[m.id] = Object.fromEntries(PERMISSION_ACTIONS.map((a) => [a, value])) as Record<PermissionAction, boolean>;
      }
      return { ...prev, [selectedRole.id]: next };
    });
  };

  const menuItemsFor = (role: StaffRoleDef): RowMenuItem[] => [
    { key: "edit", label: t("staff.roles.menu.edit"), onSelect: () => setSelectedRoleId(role.id) },
    {
      key: "duplicate",
      label: t("staff.roles.menu.duplicate"),
      onSelect: () => {
        const copyId = `${role.id}-copy-${roles.length}` as RoleId;
        setRoles((prev) => [...prev, { ...role, id: copyId, name: `${role.name} (Copy)`, isSystemRole: false }]);
        setMatrix((prev) => ({ ...prev, [copyId]: prev[role.id] }));
      },
    },
    { key: "assign-users", label: t("staff.roles.menu.assignUsers"), onSelect: () => setSelectedRoleId(role.id) },
    { key: "deactivate", label: t("staff.roles.menu.deactivate"), tone: "warning", onSelect: () => {} },
    { key: "delete", label: t("staff.roles.menu.delete"), tone: "danger", onSelect: () => setDeleteTarget(role) },
  ];

  return (
    <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[320px_1fr]">
      <div className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-[18px]">
        <h2 className="text-[13.5px] font-bold text-[var(--octo-text-primary)]">{t("staff.roles.heading")}</h2>
        <p className="mt-1 text-[11.5px] text-[var(--octo-text-muted)]">{t("staff.roles.subheading")}</p>
        <Button variant="primary" size="sm" icon={<Plus size={14} />} className="mt-3 w-full justify-center">
          {t("staff.roles.addRole")}
        </Button>

        <div className="mt-3 flex flex-col gap-2">
          {roles.map((role) => (
            <button
              key={role.id}
              type="button"
              onClick={() => setSelectedRoleId(role.id)}
              className={`flex items-center justify-between gap-2 rounded-[10px] border px-3 py-2.5 text-start transition-colors ${
                role.id === selectedRole.id
                  ? "border-[#0D6EFD] bg-[var(--octo-selected)]"
                  : "border-[var(--octo-border-card)] hover:bg-[var(--octo-hover)]"
              }`}
            >
              <span className="flex min-w-0 items-center gap-2">
                {role.isSystemRole ? <Crown size={16} className="shrink-0 text-[#0D6EFD]" /> : <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[var(--octo-track)]" />}
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 truncate text-[12.5px] font-semibold text-[var(--octo-text-primary)]">
                    {role.name}
                    {role.isSystemRole && (
                      <span className="rounded-full bg-[#eaf2ff] px-1.5 py-0.5 text-[9.5px] font-medium text-[#0D6EFD]">{t("staff.roles.systemRole")}</span>
                    )}
                  </span>
                  <span className="block truncate text-[11px] text-[var(--octo-text-muted)]">{role.description}</span>
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                <span className="text-[11px] text-[var(--octo-text-faint)]">{role.memberCount}</span>
                {!role.isSystemRole && (
                  <RowMenu
                    items={menuItemsFor(role)}
                    open={openMenuId === role.id}
                    onOpenChange={(open) => setOpenMenuId(open ? role.id : null)}
                    ariaLabel={role.name}
                  />
                )}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-[18px]">
        <h2 className="text-[13.5px] font-bold text-[var(--octo-text-primary)]">{t("staff.permissions.matrixHeading")}</h2>
        <p className="mt-1 text-[11.5px] text-[var(--octo-text-muted)]">{t("staff.permissions.matrixSubheading")}</p>

        <div className="octo-scroll mt-3 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-[var(--octo-divider)]">
                <th className="px-2 py-2 text-start">
                  <span className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                    {t("staff.permissions.column.module")}
                    <Toggle checked={allOn} onChange={setSelectAll} />
                    <span>{t("staff.permissions.selectAll")}</span>
                  </span>
                </th>
                {PERMISSION_ACTIONS.map((action) => (
                  <th key={action} className="px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                    {t(`staff.permissions.column.${action}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODULES.map((mod) => (
                <tr key={mod.id} className="border-b border-[var(--octo-row-border)] last:border-0">
                  <td className="whitespace-nowrap px-2 py-2.5 font-medium text-[var(--octo-text-primary)]">{mod.label}</td>
                  {PERMISSION_ACTIONS.map((action) => (
                    <td key={action} className="px-2 py-2.5">
                      <Toggle checked={roleMatrix[mod.id][action]} onChange={(v) => setAction(mod.id, action, v)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={t("staff.roles.deleteConfirmTitle")}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(null)}>{t("common.cancel")}</Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (deleteTarget) setRoles((prev) => prev.filter((r) => r.id !== deleteTarget.id));
                setDeleteTarget(null);
              }}
            >
              {t("staff.roles.menu.delete")}
            </Button>
          </>
        }
      >
        <p className="text-[12.5px] text-[var(--octo-text-secondary)]">
          {t("staff.roles.deleteConfirmBody").replace("{name}", deleteTarget?.name ?? "")}
        </p>
      </Modal>
    </div>
  );
}
