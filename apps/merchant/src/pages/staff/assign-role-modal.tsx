import { useEffect, useState } from "react";
import clsx from "clsx";
import { useI18n } from "@/app/providers/i18n-provider";
import { StaffIcon } from "./_shared/icon";
import { useStaffLabels } from "./_shared/labels";
import { StaffModal } from "./_shared/staff-modal";
import { useStaffStore } from "./_shared/staff-store";
import { INK, INK_SOFT } from "./_shared/theme";
import { useAssignableRoles } from "./_shared/use-assignable-roles";
import { RoleIcon } from "./role-icon";

export function AssignRoleModal({
  employeeId,
  onClose,
  onAssigned,
}: {
  employeeId: string | null;
  onClose: () => void;
  onAssigned: (name: string, roleName: string) => void;
}) {
  const { t } = useI18n();
  const labels = useStaffLabels();
  const store = useStaffStore();
  const profile = employeeId ? store.profileOf(employeeId) : null;
  const [roleId, setRoleId] = useState("");

  useEffect(() => {
    if (profile) setRoleId(profile.assignedRole);
    // Reset the choice only when a different member is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const selectable = useAssignableRoles(profile?.assignedRole);

  const save = () => {
    if (!profile) return;
    const role = selectable.find((r) => r.id === roleId);
    if (!role) return;
    store.patchProfile(profile.employee.id, { assignedRole: role.id });
    store.logAudit(profile.employee.id, "roleUpdated");
    onAssigned(profile.employee.name, labels.roleName(role));
    onClose();
  };

  return (
    <StaffModal
      open={Boolean(profile)}
      onClose={onClose}
      title={t("staff.assignRole.title")}
      submitLabel={t("staff.assignRole.save")}
      onSubmit={save}
      submitDisabled={!roleId || roleId === profile?.assignedRole}
    >
      <div className="flex flex-col gap-4">
        <p className={clsx("text-[14px] font-medium leading-[1.4]", INK_SOFT)}>
          {t("staff.assignRole.body").replace("{name}", profile?.employee.name ?? "")}
        </p>
        {/* Rows follow the Roles list's own row: 4px radius, blue outline when chosen. */}
        <div role="radiogroup" aria-label={t("staff.member.field.assignedRole")} className="flex flex-col gap-3">
          {selectable.map((role) => {
            const checked = role.id === roleId;
            return (
              <button
                key={role.id}
                type="button"
                role="radio"
                aria-checked={checked}
                onClick={() => setRoleId(role.id)}
                className={clsx(
                  "flex items-center gap-2 rounded-[4px] border p-1 text-start transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40",
                  checked ? "border-[#0D6EFD]" : "border-[#cbd5e1] hover:bg-[var(--octo-hover)] [[data-theme=dark]_&]:border-[var(--octo-border-input)]"
                )}
              >
                <RoleIcon roleId={role.id} />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className={clsx("truncate text-[14px] font-medium leading-[1.2]", INK)}>{labels.roleName(role)}</span>
                  <span className={clsx("truncate text-[12px] font-medium leading-[1.2]", INK_SOFT)}>{labels.roleDescription(role)}</span>
                </span>
                <StaffIcon
                  name={checked ? "form-radio-on.svg" : "form-radio-off.svg"}
                  size={24}
                  className={checked ? "text-[#0D6EFD]" : "text-[#64748b] [[data-theme=dark]_&]:text-[var(--octo-text-muted)]"}
                />
              </button>
            );
          })}
        </div>
      </div>
    </StaffModal>
  );
}
