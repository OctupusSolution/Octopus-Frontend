import { useMemo, useState } from "react";
import { MapPin, Phone, Search, Settings, Users } from "lucide-react";
import { EmptyState } from "@ui/primitives";
import { branches, type Branch } from "@/shared/api/mock-staff";
import { useI18n } from "@/app/providers/i18n-provider";
import { Avatar } from "./_shared/avatar";
import { buttonClass } from "./_shared/buttons";
import { ConfirmModal } from "./_shared/confirm-modal";
import { SelectInput, TextInput } from "./_shared/form";
import { formatDateTime } from "./_shared/format";
import { useStaffLabels } from "./_shared/labels";
import { RowMenu, type RowMenuItem } from "./_shared/row-menu";
import { useStaffStore } from "./_shared/staff-store";
import { StatusPill } from "./_shared/status-pill";
import { ToastBanner, useToast } from "./_shared/toast";
import { AddMemberModal } from "./add-member-modal";
import { AssignRoleModal } from "./assign-role-modal";
import { MemberDetails, type MemberDraft } from "./member-details";

type StatusFilter = "all" | "active" | "inactive";

export function StaffTab({
  addOpen,
  onAddOpenChange,
  selectedId,
  onSelect,
}: {
  addOpen: boolean;
  onAddOpenChange: (open: boolean) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const { t, locale } = useI18n();
  const store = useStaffStore();
  const labels = useStaffLabels();
  const { toast, notify } = useToast();
  const [query, setQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState<"all" | Branch>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [roleTargetId, setRoleTargetId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return store.employees.filter((e) => {
      const profile = store.profileOf(e.id);
      if (!profile) return false;
      if (q) {
        const haystack = [e.name, e.phone.replace(/\s/g, ""), profile.email, profile.jobTitle, labels.data("staff.jobTitle", profile.jobTitle)]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q.replace(/\s/g, "")) && !haystack.includes(q)) return false;
      }
      if (branchFilter !== "all" && e.branch !== branchFilter) return false;
      if (statusFilter === "active" && store.isInactive(e.id)) return false;
      if (statusFilter === "inactive" && !store.isInactive(e.id)) return false;
      return true;
    });
  }, [store, query, branchFilter, statusFilter, labels]);

  const selected = selectedId ? store.profileOf(selectedId) : null;
  const deleteTarget = deleteTargetId ? store.profileOf(deleteTargetId) : null;
  const hasFilters = query !== "" || branchFilter !== "all" || statusFilter !== "all";

  const clearFilters = () => {
    setQuery("");
    setBranchFilter("all");
    setStatusFilter("all");
  };

  const saveMember = (id: string, draft: MemberDraft) => {
    const before = store.profileOf(id);
    const wasInactive = store.isInactive(id);
    const name = `${draft.firstName.trim()} ${draft.lastName.trim()}`.trim();
    store.updateEmployee(id, {
      name,
      phone: draft.phone.trim(),
      branch: draft.branch,
      hireDate: draft.hireDate,
      contractType: draft.employmentType === "Full time" ? "Full-time" : "Part-time",
    });
    store.patchProfile(id, {
      email: draft.email.trim(),
      dateOfBirth: draft.dateOfBirth,
      gender: draft.gender,
      nationality: draft.nationality.trim(),
      languages: draft.languages,
      jobTitle: draft.jobTitle,
      department: draft.department,
      reportsTo: draft.reportsTo,
      assignedRole: draft.assignedRole,
      accessLevel: draft.accessLevel,
      modulesAccess: draft.modulesAccess,
      loginMethod: draft.loginMethod,
      pinCode: draft.pinCode,
      twoFactorEnabled: draft.twoFactorEnabled,
      twoFactorMethod: draft.twoFactorMethod,
      allowSystemLogin: draft.allowSystemLogin,
      allowAccessOutsideBranch: draft.allowAccessOutsideBranch,
    });
    store.setInactive(id, draft.status === "Inactive");
    if (before) {
      const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
      const accessChanged =
        before.accessLevel !== draft.accessLevel ||
        !same(before.modulesAccess, draft.modulesAccess) ||
        before.loginMethod !== draft.loginMethod ||
        before.twoFactorEnabled !== draft.twoFactorEnabled ||
        before.twoFactorMethod !== draft.twoFactorMethod ||
        before.allowSystemLogin !== draft.allowSystemLogin ||
        before.allowAccessOutsideBranch !== draft.allowAccessOutsideBranch;
      const profileChanged =
        before.firstName !== draft.firstName.trim() ||
        before.lastName !== draft.lastName.trim() ||
        before.employee.phone !== draft.phone.trim() ||
        before.email !== draft.email.trim() ||
        before.dateOfBirth !== draft.dateOfBirth ||
        before.gender !== draft.gender ||
        before.nationality !== draft.nationality.trim() ||
        before.languages !== draft.languages ||
        before.jobTitle !== draft.jobTitle ||
        before.employee.branch !== draft.branch ||
        before.department !== draft.department ||
        before.reportsTo !== draft.reportsTo ||
        before.employee.hireDate !== draft.hireDate ||
        before.employmentType !== draft.employmentType;
      if (profileChanged) store.logAudit(id, "profileUpdated");
      if (accessChanged) store.logAudit(id, "accessUpdated");
      if (before.pinCode !== draft.pinCode) store.logAudit(id, "pinReset");
      if (before.assignedRole !== draft.assignedRole) store.logAudit(id, "roleUpdated");
      if (wasInactive !== (draft.status === "Inactive")) store.logAudit(id, wasInactive ? "activated" : "deactivated");
    }
    notify(t("staff.toast.memberUpdated").replace("{name}", name));
  };

  const menuItemsFor = (id: string, name: string): RowMenuItem[] => {
    const inactive = store.isInactive(id);
    return [
      { key: "edit", label: t("staff.grid.menu.edit"), onSelect: () => onSelect(id) },
      { key: "role", label: t("staff.grid.menu.assignChangeRole"), onSelect: () => setRoleTargetId(id) },
      {
        key: "status",
        label: inactive ? t("staff.grid.menu.activate") : t("staff.grid.menu.deactivate"),
        tone: inactive ? "default" : "warning",
        onSelect: () => {
          store.setInactive(id, !inactive);
          store.logAudit(id, inactive ? "activated" : "deactivated");
          notify(t(inactive ? "staff.toast.memberActivated" : "staff.toast.memberDeactivated").replace("{name}", name));
        },
      },
      { key: "delete", label: t("staff.grid.menu.delete"), tone: "danger", onSelect: () => setDeleteTargetId(id) },
    ];
  };

  return (
    <>
      {selected ? (
        <MemberDetails
          key={selected.employee.id}
          profile={selected}
          inactive={store.isInactive(selected.employee.id)}
          onSave={(draft) => saveMember(selected.employee.id, draft)}
          onLockChange={(locked) => {
            store.patchProfile(selected.employee.id, { locked });
            store.logAudit(selected.employee.id, locked ? "locked" : "unlocked");
            notify(t(locked ? "staff.toast.accountLocked" : "staff.toast.accountUnlocked").replace("{name}", selected.employee.name));
          }}
          notify={notify}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-[240px] flex-1">
              <TextInput
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("staff.grid.searchPlaceholder")}
                aria-label={t("staff.grid.searchPlaceholder")}
                leading={<Search size={20} />}
              />
            </div>
            <div className="w-full sm:w-[190px]">
              <SelectInput aria-label={t("staff.filter.allBranches")} value={branchFilter} onChange={(e) => setBranchFilter(e.target.value as "all" | Branch)}>
                <option value="all">{t("staff.filter.allBranches")}</option>
                {branches.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </SelectInput>
            </div>
            <div className="w-full sm:w-[170px]">
              <SelectInput aria-label={t("staff.filter.allStatuses")} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
                <option value="all">{t("staff.filter.allStatuses")}</option>
                <option value="active">{t("staff.status.active")}</option>
                <option value="inactive">{t("staff.status.inactive")}</option>
              </SelectInput>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="mt-4 rounded-[12px] border border-[var(--octo-border-card)] bg-[var(--octo-card)]">
              <EmptyState
                icon={<Users size={18} />}
                title={t("staff.grid.emptyTitle")}
                description={t(hasFilters ? "staff.grid.emptyFiltered" : "staff.grid.emptyDescription")}
                action={
                  hasFilters ? (
                    <button type="button" onClick={clearFilters} className={buttonClass("secondary", "sm")}>
                      {t("staff.grid.clearFilters")}
                    </button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 min-[1400px]:grid-cols-4">
              {rows.map((e) => {
                const profile = store.profileOf(e.id)!;
                const inactive = store.isInactive(e.id);
                return (
                  <article
                    key={e.id}
                    role="button"
                    tabIndex={0}
                    aria-label={e.name}
                    onClick={() => onSelect(e.id)}
                    onKeyDown={(ev) => {
                      if (ev.target !== ev.currentTarget) return;
                      if (ev.key === "Enter" || ev.key === " ") {
                        ev.preventDefault();
                        onSelect(e.id);
                      }
                    }}
                    className="group flex cursor-pointer flex-col rounded-[12px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-4 pb-3.5 pt-4 transition-[border-color,box-shadow] hover:border-[#0D6EFD]/40 hover:shadow-[0_4px_16px_rgba(16,24,40,0.06)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40"
                  >
                    <div className="flex gap-3">
                      <Avatar name={e.name} size={44} className={inactive ? "opacity-60" : undefined} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-[15px] font-semibold leading-snug text-[var(--octo-text-primary)]">{e.name}</p>
                            <p className="truncate text-[13px] leading-snug text-[#0D6EFD]">{labels.data("staff.jobTitle", profile.jobTitle)}</p>
                          </div>
                          <RowMenu
                            items={menuItemsFor(e.id, e.name)}
                            open={menuId === e.id}
                            onOpenChange={(open) => setMenuId(open ? e.id : null)}
                            ariaLabel={t("staff.grid.moreActions").replace("{name}", e.name)}
                          />
                        </div>
                        <div className="mt-2 flex flex-col gap-1.5 text-[13px] text-[var(--octo-text-secondary)]">
                          <span className="flex min-w-0 items-center gap-1.5">
                            <Phone size={15} aria-hidden className="shrink-0" />
                            <span dir="ltr" className="truncate">{e.phone}</span>
                          </span>
                          <span className="flex min-w-0 items-center gap-1.5">
                            <MapPin size={15} aria-hidden className="shrink-0" />
                            <span className="truncate">{e.branch}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--octo-divider)] pt-3">
                      <span className="flex min-w-0 items-center gap-1.5 text-[12px] text-[var(--octo-text-primary)]">
                        <Settings size={15} aria-hidden className="shrink-0" />
                        <span className="truncate">
                          {t("staff.grid.lastAccess")}: {profile.lastAccess ? formatDateTime(profile.lastAccess, locale) : t("staff.grid.neverSignedIn")}
                        </span>
                      </span>
                      {profile.locked ? (
                        <StatusPill tone="danger" label={t("staff.status.locked")} />
                      ) : inactive ? (
                        <StatusPill tone="neutral" label={t("staff.status.inactive")} />
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      <AddMemberModal
        open={addOpen}
        onClose={() => onAddOpenChange(false)}
        onCreated={(name) => notify(t("staff.toast.memberAdded").replace("{name}", name))}
      />

      <AssignRoleModal
        employeeId={roleTargetId}
        onClose={() => setRoleTargetId(null)}
        onAssigned={(name, roleName) => notify(t("staff.toast.roleAssigned").replace("{name}", name).replace("{role}", roleName))}
      />

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title={t("staff.delete.title")}
        body={t("staff.delete.body").replace("{name}", deleteTarget?.employee.name ?? "")}
        confirmLabel={t("staff.delete.confirm")}
        cancelLabel={t("common.cancel")}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          const { id, name } = deleteTarget.employee;
          store.removeEmployee(id);
          if (selectedId === id) onSelect(null);
          notify(t("staff.toast.memberDeleted").replace("{name}", name));
        }}
      />

      <ToastBanner toast={toast} />
    </>
  );
}
