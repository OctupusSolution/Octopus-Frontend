import { useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { assignRoleToStaffMembers } from "@octopus/api-client";
import { Modal } from "@ui/primitives";
import { useAuth } from "@/app/providers/auth-provider";
import { useI18n } from "@/app/providers/i18n-provider";
import { Avatar } from "./_shared/avatar";
import { buttonClass } from "./_shared/buttons";
import { TextInput } from "./_shared/form";
import { useStaffLabels } from "./_shared/labels";
import { useStaffStore } from "./_shared/staff-store";
import { serverMemberIdOrNull, serverRoleId } from "./_shared/staff-sync";
import { staffErrorText, useTx } from "./_shared/text";

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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tx = useTx();
  const { activeBusinessId } = useAuth();

  useEffect(() => {
    setQuery("");
    setPicked(new Set());
    setError(null);
    setSaving(false);
  }, [roleId]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return store.employees
      .map((e) => store.profileOf(e.id)!)
      .filter((p) => !q || p.employee.name.toLowerCase().includes(q));
  }, [store, query]);

  // POST /roles/{roleId}/members — all or nothing on the server, then each
  // member is re-read so the next profile save carries its new version.
  const save = async () => {
    if (!role || !activeBusinessId) return;
    const ids = [...picked];
    const serverIds = ids.map(serverMemberIdOrNull);
    if (serverIds.some((id) => !id)) {
      setError(tx("Some members are still being saved. Try again in a moment.", "بعض الموظفين ما زالوا قيد الحفظ. حاول بعد لحظات."));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await assignRoleToStaffMembers(activeBusinessId, serverRoleId(role.id), serverIds as string[]);
      await store.refreshMembers(ids);
      ids.forEach((id) => store.logAudit(id, "roleUpdated"));
      onSaved(res.assignedCount, labels.roleName(role));
      onClose();
    } catch (err) {
      setError(staffErrorText(err, tx));
    } finally {
      setSaving(false);
    }
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
          <button type="button" onClick={() => void save()} disabled={picked.size === 0 || saving} className={buttonClass("primary")}>
            {saving && <Loader2 size={16} className="animate-spin" aria-hidden />}
            {t("staff.assignUsers.save")}
          </button>
        </>
      }
    >
      <p className="-mt-1 mb-3 text-[13px] text-[var(--octo-text-secondary)]">{t("staff.assignUsers.body")}</p>
      {error && <p role="alert" className="mb-3 rounded-[9px] bg-[var(--octo-tone-danger-bg)] px-3 py-2 text-[13px] text-[var(--octo-tone-danger-text)]">{error}</p>}
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
