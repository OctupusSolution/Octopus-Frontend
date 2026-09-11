import { useState } from "react";
import { Plus, UserRound } from "lucide-react";
import clsx from "clsx";
import { useI18n } from "@/app/providers/i18n-provider";
import { buttonClass } from "./_shared/buttons";
import { ConfirmModal } from "./_shared/confirm-modal";
import { useStaffLabels } from "./_shared/labels";
import { RowMenu, type RowMenuItem } from "./_shared/row-menu";
import { clonePermissions, useStaffStore, type RoleRecord } from "./_shared/staff-store";
import { StatusPill } from "./_shared/status-pill";
import { ToastBanner, useToast } from "./_shared/toast";
import { AssignUsersModal } from "./assign-users-modal";
import { PermissionMatrix } from "./permission-matrix";
import { RoleFormModal, type RoleFormState } from "./role-form-modal";
import { RoleIcon } from "./role-icon";

export function RolesPermissionsTab() {
  const { t } = useI18n();
  const labels = useStaffLabels();
  const store = useStaffStore();
  const { toast, notify } = useToast();
  const [selectedId, setSelectedId] = useState(store.roles[0]?.id ?? "");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [formState, setFormState] = useState<RoleFormState>(null);
  const [assignRoleId, setAssignRoleId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const selected = store.roles.find((r) => r.id === selectedId) ?? store.roles[0];
  const deleteTarget = deleteId ? store.roles.find((r) => r.id === deleteId) ?? null : null;

  const menuItemsFor = (role: RoleRecord): RowMenuItem[] => {
    const name = labels.roleName(role);
    return [
      { key: "edit", label: t("staff.roles.menu.edit"), onSelect: () => setFormState({ mode: "edit", roleId: role.id }) },
      {
        key: "duplicate",
        label: t("staff.roles.menu.duplicate"),
        onSelect: () => {
          const id = `role-${Date.now().toString(36)}`;
          const copyName = t("staff.roles.copyName").replace("{name}", name);
          store.addRole(
            { id, name: copyName, description: labels.roleDescription(role), isSystemRole: false, active: true },
            clonePermissions(store.permissions[role.id])
          );
          setSelectedId(id);
          notify(t("staff.toast.roleDuplicated").replace("{name}", copyName));
        },
      },
      { key: "assign", label: t("staff.roles.menu.assignUsers"), onSelect: () => setAssignRoleId(role.id) },
      {
        key: "status",
        label: role.active ? t("staff.roles.menu.deactivate") : t("staff.roles.menu.activate"),
        tone: role.active ? "warning" : "default",
        onSelect: () => {
          store.updateRole(role.id, { active: !role.active });
          notify(t(role.active ? "staff.toast.roleDeactivated" : "staff.toast.roleActivated").replace("{name}", name));
        },
      },
      {
        key: "delete",
        label: t("staff.roles.menu.delete"),
        tone: "danger",
        onSelect: () => {
          const count = store.memberCount(role.id);
          if (count > 0) {
            notify(t("staff.toast.roleHasMembers").replace("{name}", name).replace("{count}", String(count)), "error");
            return;
          }
          setDeleteId(role.id);
        },
      },
    ];
  };

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,366px)_minmax(0,1fr)]">
      <section aria-labelledby="roles-heading" className="rounded-[16px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
        <h2 id="roles-heading" className="text-[15px] font-semibold text-[var(--octo-text-primary)]">{t("staff.roles.heading")}</h2>
        <p className="mt-1 text-[14px] text-[var(--octo-text-secondary)]">{t("staff.roles.subheading")}</p>
        <button type="button" onClick={() => setFormState({ mode: "add" })} className={buttonClass("outline", "lg", "mt-3 w-full")}>
          <Plus size={20} strokeWidth={2.2} />
          {t("staff.roles.addRole")}
        </button>

        <ul className="mt-4 flex flex-col gap-3">
          {store.roles.map((role) => {
            const isSelected = role.id === selected?.id;
            const count = store.memberCount(role.id);
            return (
              <li key={role.id}>
                <div
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  onClick={() => setSelectedId(role.id)}
                  onKeyDown={(e) => {
                    if (e.target !== e.currentTarget) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedId(role.id);
                    }
                  }}
                  className={clsx(
                    "flex cursor-pointer items-center gap-3 rounded-[10px] border px-3 py-2.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40",
                    isSelected ? "border-[#0D6EFD] bg-[var(--octo-card)]" : "border-[var(--octo-border-card)] hover:bg-[var(--octo-hover)]"
                  )}
                >
                  <RoleIcon roleId={role.id} highlighted={role.isSystemRole} className={role.active ? undefined : "opacity-50"} />
                  <div className={clsx("min-w-0 flex-1", !role.active && "opacity-60")}>
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-[15px] font-medium text-[var(--octo-text-primary)]">{labels.roleName(role)}</span>
                      {role.isSystemRole && (
                        <span className="shrink-0 rounded-full bg-[var(--octo-selected)] px-2 py-0.5 text-[12px] font-medium text-[#0D6EFD]">
                          {t("staff.roles.systemRole")}
                        </span>
                      )}
                      {!role.active && <StatusPill tone="neutral" label={t("staff.status.inactive")} />}
                    </div>
                    <p className="truncate text-[13px] text-[var(--octo-text-secondary)]">{labels.roleDescription(role)}</p>
                  </div>
                  <span
                    className="flex shrink-0 items-center gap-1 text-[13px] text-[var(--octo-text-primary)]"
                    title={t("staff.roles.memberCount").replace("{count}", String(count))}
                  >
                    <UserRound size={17} strokeWidth={1.8} aria-hidden />
                    <span className="sr-only">{t("staff.roles.memberCount").replace("{count}", String(count))}</span>
                    <span aria-hidden>{count}</span>
                  </span>
                  {role.isSystemRole ? (
                    <span className="w-7 shrink-0" aria-hidden />
                  ) : (
                    <RowMenu
                      items={menuItemsFor(role)}
                      open={menuId === role.id}
                      onOpenChange={(open) => setMenuId(open ? role.id : null)}
                      ariaLabel={t("staff.roles.moreActions").replace("{name}", labels.roleName(role))}
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {selected && <PermissionMatrix role={selected} />}

      <RoleFormModal
        state={formState}
        onClose={() => setFormState(null)}
        onSaved={(roleId, message) => {
          setSelectedId(roleId);
          notify(message);
        }}
      />

      <AssignUsersModal
        roleId={assignRoleId}
        onClose={() => setAssignRoleId(null)}
        onSaved={(added, roleName) => notify(t("staff.toast.usersAssigned").replace("{count}", String(added)).replace("{name}", roleName))}
      />

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title={t("staff.roles.deleteConfirmTitle")}
        body={t("staff.roles.deleteConfirmBody").replace("{name}", deleteTarget ? labels.roleName(deleteTarget) : "")}
        confirmLabel={t("staff.roles.menu.delete")}
        cancelLabel={t("common.cancel")}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          const name = labels.roleName(deleteTarget);
          store.removeRole(deleteTarget.id);
          if (selectedId === deleteTarget.id) setSelectedId(store.roles[0]?.id ?? "");
          notify(t("staff.toast.roleDeleted").replace("{name}", name));
        }}
      />

      <ToastBanner toast={toast} />
    </div>
  );
}
