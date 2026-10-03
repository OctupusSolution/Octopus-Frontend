import { useEffect, useMemo, useState } from "react";
import { assignRoleToStaffMembers } from "@octopus/api-client";
import { useAuth } from "@/app/providers/auth-provider";
import { useI18n } from "@/app/providers/i18n-provider";
import { Avatar } from "./_shared/avatar";
import { TextInput } from "./_shared/form";
import { StaffIcon } from "./_shared/icon";
import { useStaffLabels } from "./_shared/labels";
import { StaffModal } from "./_shared/staff-modal";
import { useStaffStore } from "./_shared/staff-store";
import { serverMemberIdOrNull, serverRoleId } from "./_shared/staff-sync";
import { staffErrorText, useTx } from "./_shared/text";
import { FILL_RED, INK, INK_SOFT, TEXT_RED } from "./_shared/theme";

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
    <StaffModal
      open={Boolean(role)}
      onClose={onClose}
      title={role ? t("staff.assignUsers.title").replace("{name}", labels.roleName(role)) : ""}
      submitLabel={t("staff.assignUsers.save")}
      onSubmit={() => void save()}
      submitDisabled={picked.size === 0 || saving}
    >
      <div className="flex flex-col gap-4">
        <p className={`text-[14px] leading-[18px] ${INK_SOFT}`}>{t("staff.assignUsers.body")}</p>
        {error && <p role="alert" className={`rounded-[8px] px-3 py-2.5 text-[14px] leading-[18px] ${FILL_RED} ${TEXT_RED}`}>{error}</p>}
        <TextInput
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          // Enter in the search box filters; it must not submit the dialog.
          onKeyDown={(e) => {
            if (e.key === "Enter") e.preventDefault();
          }}
          placeholder={t("staff.assignUsers.search")}
          aria-label={t("staff.assignUsers.search")}
          leading={<StaffIcon name="crm-search.svg" size={24} />}
        />
        <ul className="octo-scroll flex max-h-[340px] flex-col gap-1 overflow-y-auto pe-1">
          {rows.map((p) => {
            const already = p.assignedRole === role?.id;
            const current = store.roles.find((r) => r.id === p.assignedRole);
            return (
              <li key={p.employee.id}>
                <label
                  className={
                    already
                      ? "flex cursor-not-allowed items-center gap-3 rounded-[4px] p-2 opacity-70"
                      : "flex cursor-pointer items-center gap-3 rounded-[4px] p-2 hover:bg-[var(--octo-hover)]"
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
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className={`truncate text-[14px] font-medium leading-[18px] ${INK}`}>{p.employee.name}</span>
                    <span className={`truncate text-[12px] leading-4 ${INK_SOFT}`}>
                      {already ? t("staff.assignUsers.alreadyMember") : current ? labels.roleName(current) : "—"}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
        <p className={`text-[14px] font-medium leading-[14px] ${INK}`}>{t("staff.assignUsers.selected").replace("{count}", String(picked.size))}</p>
      </div>
    </StaffModal>
  );
}
