import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Modal } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { Avatar } from "../_shared/avatar";
import { buttonClass } from "../_shared/buttons";
import { ConfirmModal } from "../_shared/confirm-modal";
import { Field, TextInput } from "../_shared/form";
import { useStaffLabels } from "../_shared/labels";
import { RowMenu } from "../_shared/row-menu";
import { useStaffStore, type ShiftRoleRecord } from "../_shared/staff-store";
import { ToastBanner, useToast } from "../_shared/toast";
import { ColorSwatches, SWATCHES } from "./templates-view";

const MAX_PER_DAY = 20;

export function ShiftRolesView() {
  const { t } = useI18n();
  const labels = useStaffLabels();
  const store = useStaffStore();
  const { toast, notify } = useToast();
  const [menuId, setMenuId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(SWATCHES[0]);
  const [minPerDay, setMinPerDay] = useState(1);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ShiftRoleRecord | null>(null);

  const members = (role: ShiftRoleRecord) =>
    role.staffRole ? store.employees.filter((e) => e.role === role.staffRole && !store.isInactive(e.id)) : [];

  const setMin = (id: string, value: number) =>
    store.setShiftRoles((prev) => prev.map((r) => (r.id === id ? { ...r, minPerDay: Math.max(0, Math.min(MAX_PER_DAY, value)) } : r)));

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t("staff.validation.required"));
      return;
    }
    store.setShiftRoles((prev) => [...prev, { id: `shift-role-${Date.now().toString(36)}`, name: trimmed, color, minPerDay, staffRole: null }]);
    notify(t("staff.shiftsTab.shiftRoles.toast").replace("{name}", trimmed));
    setAddOpen(false);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[14px] text-[var(--octo-text-secondary)]">{t("staff.shiftsTab.shiftRoles.subtitle")}</p>
        <button
          type="button"
          onClick={() => {
            setName("");
            setColor(SWATCHES[store.shiftRoles.length % SWATCHES.length]);
            setMinPerDay(1);
            setError("");
            setAddOpen(true);
          }}
          className={buttonClass("primary", "lg")}
        >
          <Plus size={20} aria-hidden />
          {t("staff.shiftsTab.shiftRoles.addRole")}
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-[12px] border border-[var(--octo-border-card)] bg-[var(--octo-card)]">
        <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_180px_40px] items-center gap-4 border-b border-[var(--octo-divider)] bg-[var(--octo-hover)] px-4 py-2.5 text-[13px] font-medium text-[var(--octo-text-primary)] md:grid">
          <span>{t("staff.shiftsTab.shiftRoles.role")}</span>
          <span>{t("staff.shiftsTab.shiftRoles.team")}</span>
          <span>{t("staff.shiftsTab.shiftRoles.minPerDay")}</span>
          <span />
        </div>
        <ul>
          {store.shiftRoles.map((role) => {
            const people = members(role);
            const roleName = labels.data("staff.jobTitle", role.name);
            return (
              <li
                key={role.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--octo-divider)] px-4 py-3 last:border-b-0 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_180px_40px] md:gap-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span aria-hidden className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ backgroundColor: role.color }} />
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-medium text-[var(--octo-text-primary)]">{roleName}</span>
                    <span className="block text-[13px] text-[var(--octo-text-secondary)]">
                      {t("staff.roles.memberCount").replace("{count}", String(people.length))}
                    </span>
                  </span>
                </div>
                <div className="order-last col-span-2 flex items-center md:order-none md:col-span-1">
                  {people.length === 0 ? (
                    <span className="text-[13px] text-[var(--octo-text-faint)]">{t("staff.shiftsTab.shiftRoles.nobody")}</span>
                  ) : (
                    <span className="flex -space-x-2 rtl:space-x-reverse">
                      {people.slice(0, 5).map((p) => (
                        <span key={p.id} title={p.name} className="rounded-full ring-2 ring-[var(--octo-card)]">
                          <Avatar name={p.name} size={30} />
                        </span>
                      ))}
                      {people.length > 5 && (
                        <span className="grid h-[30px] min-w-[30px] place-items-center rounded-full bg-[var(--octo-hover)] px-1.5 text-[12px] font-medium text-[var(--octo-text-secondary)] ring-2 ring-[var(--octo-card)]">
                          +{people.length - 5}
                        </span>
                      )}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2" role="group" aria-label={`${roleName} — ${t("staff.shiftsTab.shiftRoles.minPerDay")}`}>
                  <button type="button" onClick={() => setMin(role.id, role.minPerDay - 1)} disabled={role.minPerDay <= 0} aria-label={t("staff.shiftsTab.shiftRoles.decrease")} className={buttonClass("secondary", "sm", "w-9 px-0")}>
                    <Minus size={16} />
                  </button>
                  <input
                    type="number"
                    min={0}
                    max={MAX_PER_DAY}
                    value={role.minPerDay}
                    aria-label={t("staff.shiftsTab.shiftRoles.minPerDay")}
                    onChange={(e) => setMin(role.id, Number(e.target.value) || 0)}
                    className="h-9 w-14 rounded-[8px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] text-center text-[14px] text-[var(--octo-text-primary)] focus:border-[#0D6EFD] focus:outline-none"
                  />
                  <button type="button" onClick={() => setMin(role.id, role.minPerDay + 1)} disabled={role.minPerDay >= MAX_PER_DAY} aria-label={t("staff.shiftsTab.shiftRoles.increase")} className={buttonClass("secondary", "sm", "w-9 px-0")}>
                    <Plus size={16} />
                  </button>
                </div>
                <div className="hidden md:block">
                  {role.staffRole === null && (
                    <RowMenu
                      open={menuId === role.id}
                      onOpenChange={(open) => setMenuId(open ? role.id : null)}
                      ariaLabel={t("staff.grid.moreActions").replace("{name}", roleName)}
                      items={[{ key: "delete", label: t("staff.grid.menu.delete"), tone: "danger", onSelect: () => setDeleteTarget(role) }]}
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      <p className="mt-2 text-[12px] text-[var(--octo-text-secondary)]">{t("staff.shiftsTab.shiftRoles.coverageHint")}</p>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={t("staff.shiftsTab.shiftRoles.addRoleTitle")}
        className="max-w-md"
        footer={
          <>
            <button type="button" onClick={() => setAddOpen(false)} className={buttonClass("secondary")}>{t("common.cancel")}</button>
            <button type="button" onClick={save} className={buttonClass("primary")}>{t("staff.shiftsTab.shiftRoles.save")}</button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label={t("staff.shiftsTab.shiftRoles.name")} htmlFor="sr-name" error={error}>
            <TextInput id="sr-name" autoFocus value={name} invalid={!!error} onChange={(e) => { setName(e.target.value); setError(""); }} placeholder={t("staff.shiftsTab.shiftRoles.namePlaceholder")} />
          </Field>
          <Field label={t("staff.shiftsTab.shiftRoles.minPerDay")} htmlFor="sr-min">
            <TextInput id="sr-min" type="number" min={0} max={MAX_PER_DAY} value={minPerDay} onChange={(e) => setMinPerDay(Math.max(0, Math.min(MAX_PER_DAY, Number(e.target.value) || 0)))} />
          </Field>
          <Field label={t("staff.shiftsTab.shiftRoles.color")}>
            <ColorSwatches value={color} onChange={setColor} label={t("staff.shiftsTab.shiftRoles.color")} />
          </Field>
        </div>
      </Modal>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title={t("staff.shiftsTab.shiftRoles.deleteTitle")}
        body={t("staff.shiftsTab.shiftRoles.deleteBody").replace("{name}", deleteTarget?.name ?? "")}
        confirmLabel={t("staff.grid.menu.delete")}
        cancelLabel={t("common.cancel")}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          store.setShiftRoles((prev) => prev.filter((r) => r.id !== deleteTarget.id));
          notify(t("staff.shiftsTab.shiftRoles.toastDeleted").replace("{name}", deleteTarget.name));
        }}
      />

      <ToastBanner toast={toast} />
    </div>
  );
}
