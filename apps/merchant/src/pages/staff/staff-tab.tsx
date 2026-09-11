import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge, Button, Input, Select } from "@ui/primitives";
import { employees, branches, type Employee, type Branch, toMemberProfile } from "@/shared/api/mock-staff";
import { useI18n } from "@/app/providers/i18n-provider";
import { RowMenu, type RowMenuItem } from "./_shared/row-menu";
import { MemberDetails } from "./member-details";

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function StaffTab() {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState<"all" | Branch>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "Active" | "Inactive">("all");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deactivatedIds, setDeactivatedIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return employees.filter((e) => {
      if (q && !e.name.toLowerCase().includes(q) && !e.phone.includes(q)) return false;
      if (branchFilter !== "all" && e.branch !== branchFilter) return false;
      const status = deactivatedIds.has(e.id) ? "Inactive" : "Active";
      if (statusFilter !== "all" && status !== statusFilter) return false;
      return true;
    });
  }, [query, branchFilter, statusFilter, deactivatedIds]);

  const selected = selectedId ? employees.find((e) => e.id === selectedId) ?? null : null;

  if (selected) {
    return (
      <MemberDetails
        profile={toMemberProfile(selected)}
        deactivated={deactivatedIds.has(selected.id)}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  const menuItemsFor = (e: Employee): RowMenuItem[] => [
    { key: "edit", label: t("staff.grid.menu.edit"), onSelect: () => setSelectedId(e.id) },
    { key: "assign-role", label: t("staff.grid.menu.assignChangeRole"), onSelect: () => setSelectedId(e.id) },
    {
      key: "deactivate",
      label: t("staff.grid.menu.deactivate"),
      tone: "warning",
      onSelect: () => setDeactivatedIds((prev) => new Set(prev).add(e.id)),
    },
    {
      key: "delete",
      label: t("staff.grid.menu.delete"),
      tone: "danger",
      onSelect: () => setDeactivatedIds((prev) => new Set(prev).add(e.id)),
    },
  ];

  return (
    <div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Input
          className="min-w-[220px] flex-1"
          placeholder={t("staff.grid.searchPlaceholder")}
          icon={<Search size={13} />}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Select className="w-[170px]" value={branchFilter} onChange={(e) => setBranchFilter(e.target.value as "all" | Branch)}>
          <option value="all">{t("staff.filter.allBranches")}</option>
          {branches.map((b) => <option key={b} value={b}>{b}</option>)}
        </Select>
        <Select className="w-[150px]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "all" | "Active" | "Inactive")}>
          <option value="all">{t("staff.filter.allStatuses")}</option>
          <option value="Active">{t("staff.member.status.active")}</option>
          <option value="Inactive">{t("staff.grid.menu.deactivate")}</option>
        </Select>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {rows.map((e) => (
          <article
            key={e.id}
            role="button"
            tabIndex={0}
            onClick={() => setSelectedId(e.id)}
            onKeyDown={(ev) => { if (ev.key === "Enter") setSelectedId(e.id); }}
            className="flex cursor-pointer flex-col gap-2.5 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px] transition-colors hover:border-[#0D6EFD]/50"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#eaf2ff] text-[12px] font-bold text-[#0D6EFD]">
                  {initials(e.name)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-[var(--octo-text-primary)]">{e.name}</p>
                  <p className="truncate text-[11.5px] text-[#0D6EFD]">{e.role === "Branch Manager" ? "Restaurant Manager" : e.role}</p>
                </div>
              </div>
              <RowMenu
                items={menuItemsFor(e)}
                open={openMenuId === e.id}
                onOpenChange={(open) => setOpenMenuId(open ? e.id : null)}
                ariaLabel={e.name}
              />
            </div>

            <div className="flex flex-col gap-1 text-[12px] text-[var(--octo-text-secondary)]">
              <span>{e.phone}</span>
              <span>{e.branch}</span>
            </div>

            <div className="mt-1 flex items-center justify-between border-t border-[var(--octo-divider)] pt-2 text-[11px] text-[var(--octo-text-muted)]">
              <span>{t("staff.grid.lastAccess")}: May 12, 2026 - 10:30 AM</span>
              {deactivatedIds.has(e.id) && <Badge tone="neutral">{t("staff.grid.menu.deactivate")}</Badge>}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
