import { useState } from "react";
import clsx from "clsx";
import { duplicateStaffRole } from "@octopus/api-client";
import { useAuth } from "@/app/providers/auth-provider";
import { useI18n } from "@/app/providers/i18n-provider";
import { ConfirmModal } from "./_shared/confirm-modal";
import { StaffIcon } from "./_shared/icon";
import { useStaffLabels } from "./_shared/labels";
import { RowMenu, type RowMenuItem } from "./_shared/row-menu";
import { useStaffStore, type RoleRecord } from "./_shared/staff-store";
import { rememberRole, serverRoleId } from "./_shared/staff-sync";
import { newKey, staffErrorText, useTx } from "./_shared/text";
import { StatusPill } from "./_shared/status-pill";
import { FILL_BLUE, INK, INK_LINK, INK_SOFT, LINE } from "./_shared/theme";
import { ToastBanner, useToast } from "./_shared/toast";
import { AssignUsersModal } from "./assign-users-modal";
import { PermissionMatrix } from "./permission-matrix";
import { RoleFormModal, type RoleFormState } from "./role-form-modal";
import { RoleIcon } from "./role-icon";

export function RolesPermissionsTab() {
  const { t } = useI18n();
  const labels = useStaffLabels();
  const store = useStaffStore();
  const tx = useTx();
  const { activeBusinessId } = useAuth();
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
          if (!activeBusinessId) return;
          // POST /roles/{id}/duplicate: same permissions, no members, a new name.
          const copyName = t("staff.roles.copyName").replace("{name}", name);
          duplicateStaffRole(activeBusinessId, serverRoleId(role.id), { name: copyName, description: role.description || null }, newKey())
            .then((res) => {
              const copy = rememberRole(res);
              store.adoptRole(copy);
              setSelectedId(copy.id);
              notify(t("staff.toast.roleDuplicated").replace("{name}", copyName));
            })
            .catch((err) => notify(staffErrorText(err, tx), "error"));
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
      <section aria-labelledby="roles-heading" className={clsx("rounded-[16px] border bg-[var(--octo-card)] p-3", LINE)}>
        <h2 id="roles-heading" className={clsx("text-[14px] font-bold leading-[14px]", INK)}>{t("staff.roles.heading")}</h2>
        {/* An 18px line box pulled back to the frame's 14px, so a wrapped line still breathes. */}
        <p className={clsx("-mb-[2px] mt-[6px] text-[14px] leading-[18px]", INK)}>{t("staff.roles.subheading")}</p>
        <button
          type="button"
          onClick={() => setFormState({ mode: "add" })}
          className={clsx(
            "mt-2 flex h-10 w-full items-center justify-center gap-1 rounded-[4px] border border-[#0d6efd] px-2 text-[14px] font-semibold leading-[14px] text-[#0d6efd] transition-[filter] hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40",
            FILL_BLUE
          )}
        >
          <StaffIcon name="staff-role-plus.svg" size={24} />
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
                    "flex cursor-pointer items-center gap-2 rounded-[4px] border p-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40",
                    isSelected ? "border-[#0d6efd]" : clsx(LINE, "hover:bg-[var(--octo-hover)]")
                  )}
                >
                  <RoleIcon roleId={role.id} highlighted={role.isSystemRole} className={role.active ? undefined : "opacity-50"} />
                  <div className={clsx("flex min-w-0 flex-1 flex-col justify-center gap-2", !role.active && "opacity-60")}>
                    <div className="flex min-w-0 items-center gap-2">
                      {/* The padding keeps descenders inside the truncation clip at a 14px line height. */}
                      <span className={clsx("-my-[2px] truncate py-[2px] text-[14px] font-medium leading-[14px]", INK)}>{labels.roleName(role)}</span>
                      {role.isSystemRole && (
                        <span className={clsx("shrink-0 whitespace-nowrap rounded-full px-2 py-1 text-[12px] font-medium leading-3", FILL_BLUE, INK_LINK)}>
                          {t("staff.roles.systemRole")}
                        </span>
                      )}
                      {!role.active && <StatusPill tone="neutral" label={t("staff.status.inactive")} />}
                    </div>
                    <p className={clsx("-my-[2px] truncate py-[2px] text-[12px] font-medium leading-3", INK_SOFT)}>{labels.roleDescription(role)}</p>
                  </div>
                  <span
                    className={clsx("flex shrink-0 items-end gap-[2px] text-[12px] font-medium leading-3", INK)}
                    title={t("staff.roles.memberCount").replace("{count}", String(count))}
                  >
                    <StaffIcon name="staff-role-user-16.svg" size={16} />
                    <span className="sr-only">{t("staff.roles.memberCount").replace("{count}", String(count))}</span>
                    <span aria-hidden>{count}</span>
                  </span>
                  {/* The Owner role offers only "duplicate" — that is how a business starts from full access. */}
                  <RowMenu
                    items={role.isSystemRole ? menuItemsFor(role).filter((i) => i.key === "duplicate") : menuItemsFor(role)}
                    open={menuId === role.id}
                    onOpenChange={(open) => setMenuId(open ? role.id : null)}
                    ariaLabel={t("staff.roles.moreActions").replace("{name}", labels.roleName(role))}
                    iconSize={24}
                  />
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
