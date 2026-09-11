import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Modal } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { Avatar } from "./_shared/avatar";
import { buttonClass } from "./_shared/buttons";
import { TextInput } from "./_shared/form";
import { useStaffLabels } from "./_shared/labels";
import { useStaffStore } from "./_shared/staff-store";

export function AssignUsersModal({
  roleId,
  onClose,
  onSaved,
}: {
  roleId: string | null;
  onClose: () => void;
  onSaved: (added: number, roleName: string) => void;
}) {
  const { t } = useI18n();
  const labels = useStaffLabels();
  const store = useStaffStore();
  const role = roleId ? store.roles.find((r) => r.id === roleId) ?? null : null;
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setQuery("");
    setPicked(new Set());
  }, [roleId]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return store.employees
      .map((e) => store.profileOf(e.id)!)
      .filter((p) => !q || p.employee.name.toLowerCase().includes(q));
  }, [store, query]);

  const save = () => {
    if (!role) return;
    picked.forEach((id) => store.patchProfile(id, { assignedRole: role.id }));
    onSaved(picked.size, labels.roleName(role));
    onClose();
  };

  return (
    <Modal
      open={Boolean(role)}
      onClose={onClose}
      title={role ? t("staff.assignUsers.title").replace("{name}", labels.roleName(role)) : ""}
      className="max-w-lg"
      footer={
        <>
          <span className="me-auto text-[13px] text-[var(--octo-text-secondary)]">
            {t("staff.assignUsers.selected").replace("{count}", String(picked.size))}
          </span>
          <button type="button" onClick={onClose} className={buttonClass("secondary")}>{t("common.cancel")}</button>
          <button type="button" onClick={save} disabled={picked.size === 0} className={buttonClass("primary")}>
            {t("staff.assignUsers.save")}
          </button>
        </>
      }
    >
      <p className="-mt-1 mb-3 text-[13px] text-[var(--octo-text-secondary)]">{t("staff.assignUsers.body")}</p>
      <TextInput
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("staff.assignUsers.search")}
        aria-label={t("staff.assignUsers.search")}
        leading={<Search size={18} />}
      />
      <ul className="octo-scroll mt-3 flex max-h-[340px] flex-col gap-1 overflow-y-auto pe-1">
        {rows.map((p) => {
          const already = p.assignedRole === role?.id;
          const current = store.roles.find((r) => r.id === p.assignedRole);
          return (
            <li key={p.employee.id}>
              <label
                className={
                  already
                    ? "flex cursor-not-allowed items-center gap-3 rounded-[10px] px-2.5 py-2 opacity-70"
                    : "flex cursor-pointer items-center gap-3 rounded-[10px] px-2.5 py-2 hover:bg-[var(--octo-hover)]"
                }
                title={already ? t("staff.assignUsers.alreadyMember") : undefined}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 shrink-0 accent-[#0D6EFD]"
                  checked={already || picked.has(p.employee.id)}
                  disabled={already}
                  onChange={() =>
                    setPicked((prev) => {
                      const next = new Set(prev);
                      if (next.has(p.employee.id)) next.delete(p.employee.id);
                      else next.add(p.employee.id);
                      return next;
                    })
                  }
                />
                <Avatar name={p.employee.name} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium text-[var(--octo-text-primary)]">{p.employee.name}</span>
                  <span className="block truncate text-[12px] text-[var(--octo-text-secondary)]">
                    {already ? t("staff.assignUsers.alreadyMember") : current ? labels.roleName(current) : "—"}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
