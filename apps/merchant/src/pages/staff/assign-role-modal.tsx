import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import clsx from "clsx";
import { Modal } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { buttonClass } from "./_shared/buttons";
import { useStaffLabels } from "./_shared/labels";
import { useStaffStore } from "./_shared/staff-store";
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

  const selectable = store.roles.filter((r) => r.active || r.id === profile?.assignedRole);

  const save = () => {
    if (!profile) return;
    const role = store.roles.find((r) => r.id === roleId);
    if (!role) return;
    store.patchProfile(profile.employee.id, { assignedRole: role.id });
    onAssigned(profile.employee.name, labels.roleName(role));
    onClose();
  };

  return (
    <Modal
      open={Boolean(profile)}
      onClose={onClose}
      title={t("staff.assignRole.title")}
      className="max-w-lg"
      footer={
        <>
          <button type="button" onClick={onClose} className={buttonClass("secondary")}>{t("common.cancel")}</button>
          <button type="button" onClick={save} disabled={!roleId || roleId === profile?.assignedRole} className={buttonClass("primary")}>
            {t("staff.assignRole.save")}
          </button>
        </>
      }
    >
      <p className="-mt-1 mb-4 text-[13px] text-[var(--octo-text-secondary)]">
        {t("staff.assignRole.body").replace("{name}", profile?.employee.name ?? "")}
      </p>
      <div role="radiogroup" aria-label={t("staff.member.field.assignedRole")} className="octo-scroll flex max-h-[360px] flex-col gap-2 overflow-y-auto pe-1">
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
                "flex items-center gap-3 rounded-[10px] border px-3 py-2.5 text-start transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40",
                checked ? "border-[#0D6EFD] bg-[var(--octo-selected)]" : "border-[var(--octo-border-card)] hover:bg-[var(--octo-hover)]"
              )}
            >
              <RoleIcon roleId={role.id} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium text-[var(--octo-text-primary)]">{labels.roleName(role)}</span>
                <span className="block truncate text-[12px] text-[var(--octo-text-secondary)]">{labels.roleDescription(role)}</span>
              </span>
              <span
                aria-hidden
                className={clsx(
                  "grid h-5 w-5 shrink-0 place-items-center rounded-full border",
                  checked ? "border-[#0D6EFD] bg-[#0D6EFD] text-white" : "border-[var(--octo-border-input)]"
                )}
              >
                {checked && <Check size={12} strokeWidth={3} />}
              </span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
