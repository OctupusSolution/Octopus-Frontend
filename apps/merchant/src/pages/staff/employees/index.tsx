import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Search,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Users,
  X,
  IdCard,
  Building2,
  CalendarDays,
  BadgeAlert,
  Briefcase,
  Wallet,
  Phone,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { StatCard } from "@/widgets/sales-summary-chart";
import { Badge, Button, Checkbox, EmptyState, Input, Modal, Select } from "@ui/primitives";
import {
  staffStats,
  employees as allEmployees,
  branches,
  staffRoles,
  type Employee,
  type ShiftStatus,
  type StaffRole,
  type ContractType,
  type Branch,
} from "@/shared/api/mock-staff";
import { useI18n } from "@/app/providers/i18n-provider";
import { labelKey } from "@/shared/lib/labels";

const STATUS_TONE: Record<ShiftStatus, "success" | "neutral" | "info" | "error"> = {
  "On Shift": "success",
  "Off Duty": "neutral",
  "On Leave": "info",
  Absent: "error",
};

const ROLE_KEY: Record<StaffRole, string> = {
  Owner: "staff.role.owner",
  "Branch Manager": "staff.role.branchManager",
  Cashier: "staff.role.cashier",
  Waiter: "staff.role.waiter",
  Kitchen: "staff.role.kitchen",
  Driver: "staff.role.driver",
};

const STATUS_KEY: Record<ShiftStatus, string> = {
  "On Shift": "status.onShift",
  "Off Duty": "status.offDuty",
  "On Leave": "status.onLeave",
  Absent: "status.absent",
};

const CONTRACT_KEY: Record<ContractType, string> = {
  "Full-time": "staff.contract.fullTime",
  "Part-time": "staff.contract.partTime",
  Seasonal: "staff.contract.seasonal",
};

type SortKey = "hours" | "attendance";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 10;
const IQAMA_WARNING_DAYS = 60;
const TODAY_MS = new Date("2026-08-09").getTime();

function daysUntil(iso: string): number {
  return Math.round((new Date(iso).getTime() - TODAY_MS) / (1000 * 60 * 60 * 24));
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function StaffEmployeesPage() {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("hours");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [deactivatedIds, setDeactivatedIds] = useState<Set<string>>(new Set());
  const [overrides, setOverrides] = useState<Record<string, { branch: Branch; contractType: ContractType }>>({});

  const resolved = (emp: Employee) => ({
    ...emp,
    branch: overrides[emp.id]?.branch ?? emp.branch,
    contractType: overrides[emp.id]?.contractType ?? emp.contractType,
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = allEmployees.map(resolved).filter((row) => {
      if (q && !row.name.toLowerCase().includes(q) && !row.phone.includes(q)) return false;
      if (branchFilter !== "all" && row.branch !== branchFilter) return false;
      if (roleFilter !== "all" && row.role !== roleFilter) return false;
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      return true;
    });
    rows = [...rows].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "hours") return (a.hoursThisWeek - b.hoursThisWeek) * dir;
      return (a.attendance - b.attendance) * dir;
    });
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, branchFilter, roleFilter, statusFilter, sortKey, sortDir, overrides]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selected = allEmployees.find((e) => e.id === openId);
  const selectedResolved = selected ? resolved(selected) : null;

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };
  const sortIcon = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? <ChevronUp size={11} /> : <ChevronDown size={11} />) : null;

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    setSelectedIds((prev) => (prev.size === pageRows.length ? new Set() : new Set(pageRows.map((r) => r.id))));
  };
  const clearFilters = () => {
    setQuery("");
    setBranchFilter("all");
    setRoleFilter("all");
    setStatusFilter("all");
    setPage(1);
  };

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("staff.employees.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">{t("staff.employees.subtitle")}</p>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {staffStats.map((card) => (
          <StatCard key={card.id} data={card} />
        ))}
      </div>

      <section className="mt-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        {selectedIds.size > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12.5px] font-medium text-[var(--octo-text-primary)]">
              {selectedIds.size} {t("staff.employees.selected")}
            </span>
            <Button variant="secondary" size="sm">{t("staff.employees.exportSelected")}</Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())} className="ms-auto">
              {t("staff.employees.clearSelection")}
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="min-w-[200px] flex-1"
              placeholder={t("staff.employees.searchPlaceholder")}
              icon={<Search size={13} />}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            />
            <Select className="w-[170px]" value={branchFilter} onChange={(e) => { setBranchFilter(e.target.value); setPage(1); }}>
              <option value="all">{t("staff.filter.allBranches")}</option>
              {branches.map((b) => <option key={b} value={b}>{b}</option>)}
            </Select>
            <Select className="w-[150px]" value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}>
              <option value="all">{t("staff.filter.allRoles")}</option>
              {staffRoles.map((r) => <option key={r} value={r}>{t(ROLE_KEY[r])}</option>)}
            </Select>
            <Select className="w-[140px]" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="all">{t("staff.filter.allStatuses")}</option>
              {(["On Shift", "Off Duty", "On Leave", "Absent"] as ShiftStatus[]).map((s) => (
                <option key={s} value={s}>{t(STATUS_KEY[s])}</option>
              ))}
            </Select>
          </div>
        )}

        {/* Mobile: card list — tap a row to open its details, no horizontal scroll */}
        <div className="mt-3 divide-y divide-[var(--octo-row-border)] sm:hidden">
          {pageRows.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => setOpenId(row.id)}
              className="flex w-full items-center justify-between gap-3 py-2.5 text-start"
            >
              <span className="flex min-w-0 items-center gap-2">
                {deactivatedIds.has(row.id) && (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#a9a9b2]" title={t("staff.employees.deactivated")} />
                )}
                <span className="min-w-0">
                  <span className="block truncate text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{row.name}</span>
                  <span className="block truncate text-[11px] text-[var(--octo-text-muted)]">{row.branch} · {row.todayShift}</span>
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                <Badge tone={STATUS_TONE[row.status]}>{t(STATUS_KEY[row.status])}</Badge>
                <ChevronRight size={15} className="text-[var(--octo-text-faint)] rtl:rotate-180" />
              </span>
            </button>
          ))}
        </div>

        <div className="octo-scroll mt-3 hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[920px] border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-[var(--octo-divider)] text-start">
                <th className="w-8 px-2 py-2">
                  <Checkbox
                    checked={pageRows.length > 0 && selectedIds.size === pageRows.length}
                    onChange={toggleAll}
                    aria-label={t("staff.employees.selectAll")}
                  />
                </th>
                {[
                  ["staff.col.employee", null],
                  ["staff.col.branch", null],
                  ["staff.col.status", null],
                  ["staff.col.shift", null],
                  ["staff.col.hours", "hours"],
                  ["staff.col.attendance", "attendance"],
                ].map(([labelKeyStr, sortId]) => (
                  <th
                    key={labelKeyStr as string}
                    className={`whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)] ${sortId ? "cursor-pointer" : ""}`}
                    onClick={sortId ? () => toggleSort(sortId as SortKey) : undefined}
                  >
                    <span className="inline-flex items-center gap-1">
                      {t(labelKeyStr as string)}
                      {sortId ? sortIcon(sortId as SortKey) : null}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <tr
                  key={row.id}
                  className="cursor-pointer border-b border-[var(--octo-row-border)] last:border-0 hover:bg-[var(--octo-row-hover)]"
                  onClick={() => setOpenId(row.id)}
                >
                  <td className="px-2 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={selectedIds.has(row.id)} onChange={() => toggleRow(row.id)} aria-label={row.id} />
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5">
                    <div className="flex items-center gap-2">
                      {deactivatedIds.has(row.id) && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#a9a9b2]" title={t("staff.employees.deactivated")} />
                      )}
                      <div>
                        <div className="font-semibold text-[var(--octo-text-primary)]">{row.name}</div>
                        <div className="text-[11px] text-[var(--octo-text-muted)]">{row.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{row.branch}</td>
                  <td className="whitespace-nowrap px-2 py-2.5">
                    <Badge tone={STATUS_TONE[row.status]}>{t(STATUS_KEY[row.status])}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{row.todayShift}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{row.hoursThisWeek}</td>
                  <td className="px-2 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--octo-track)]">
                        <div className="h-full rounded-full bg-[#0D6EFD]" style={{ width: `${row.attendance}%` }} />
                      </div>
                      <span className="text-[11px] text-[var(--octo-text-secondary)]">{row.attendance}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pageRows.length === 0 && (
            <EmptyState
              icon={<Users size={18} />}
              title={t("staff.employees.emptyTitle")}
              description={t("staff.employees.emptyDescription")}
              action={<Button variant="secondary" size="sm" onClick={clearFilters}>{t("customers.clearFilters")}</Button>}
            />
          )}
        </div>

        {filtered.length > 0 && (
          <div className="mt-3 flex items-center justify-between text-[11.5px] text-[var(--octo-text-muted)]">
            <span>
              {t("customers.feedback.showing")
                .replace("{from}", String((page - 1) * PAGE_SIZE + 1))
                .replace("{to}", String(Math.min(page * PAGE_SIZE, filtered.length)))
                .replace("{total}", String(filtered.length))}
            </span>
            <div className="flex items-center gap-1">
              <button type="button" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-[7px] px-2 py-1 hover:bg-[var(--octo-hover)] disabled:opacity-30">‹</button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button key={i} type="button" onClick={() => setPage(i + 1)} className={`rounded-[7px] px-2 py-1 ${page === i + 1 ? "bg-[#eaf2ff] font-semibold text-[#0D6EFD]" : "hover:bg-[var(--octo-hover)]"}`}>{i + 1}</button>
              ))}
              <button type="button" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="rounded-[7px] px-2 py-1 hover:bg-[var(--octo-hover)] disabled:opacity-30">›</button>
            </div>
          </div>
        )}
      </section>

      <EmployeeDrawer
        employee={selectedResolved}
        deactivated={openId ? deactivatedIds.has(openId) : false}
        onClose={() => setOpenId(null)}
        onDeactivate={() => { if (openId) setDeactivatedIds((prev) => new Set(prev).add(openId)); }}
        onSaveEdit={(patch) => { if (openId) setOverrides((prev) => ({ ...prev, [openId]: patch })); }}
      />
    </div>
  );
}

function DrawerField({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
        {icon} {label}
      </dt>
      <dd className="mt-1 text-[var(--octo-text-primary)]">{value}</dd>
    </div>
  );
}

function EmployeeDrawer({
  employee,
  deactivated,
  onClose,
  onDeactivate,
  onSaveEdit,
}: {
  employee: Employee | null;
  deactivated: boolean;
  onClose: () => void;
  onDeactivate: () => void;
  onSaveEdit: (patch: { branch: Branch; contractType: ContractType }) => void;
}) {
  const { t } = useI18n();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch>("Riyadh - Olaya");
  const [editContract, setEditContract] = useState<ContractType>("Full-time");
  const open = Boolean(employee);

  useEffect(() => {
    setConfirmOpen(false);
    setEditOpen(false);
    if (employee) {
      setEditBranch(employee.branch);
      setEditContract(employee.contractType);
    }
  }, [employee?.id]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const expiryDays = employee ? daysUntil(employee.iqamaExpiry) : 0;
  const expiryWarning = employee ? expiryDays < IQAMA_WARNING_DAYS : false;

  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div className={`absolute inset-0 bg-black/30 transition-opacity ${open ? "opacity-100" : "opacity-0"}`} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("staff.employees.drawer.title")}
        className={`absolute inset-y-0 end-0 flex w-full flex-col bg-[var(--octo-card)] shadow-xl transition-transform duration-200 sm:w-[420px] ${open ? "translate-x-0" : "translate-x-full rtl:-translate-x-full"}`}
      >
        {employee && (
          <>
            <div className="flex items-center justify-between border-b border-[var(--octo-divider)] px-[18px] py-[15px]">
              <h2 className="text-[15px] font-semibold text-[var(--octo-text-primary)]">{t("staff.employees.drawer.title")}</h2>
              <button type="button" aria-label={t("common.cancel")} onClick={onClose} className="grid h-7 w-7 place-items-center rounded-[7px] text-[var(--octo-text-muted)] transition-colors hover:bg-[var(--octo-hover)]">
                <X size={15} />
              </button>
            </div>

            <div className="octo-scroll flex-1 overflow-y-auto px-[18px] py-[15px]">
              {deactivated && (
                <div className="mb-3 rounded-[9px] bg-[#fdecec] px-3 py-2 text-center text-[11.5px] font-medium text-[#dc2626]">
                  {t("staff.employees.deactivatedNotice")}
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#eaf2ff] text-[14px] font-bold text-[#0D6EFD]">
                  {initials(employee.name)}
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-[var(--octo-text-primary)]">{employee.name}</h3>
                  <p className="text-[12px] text-[var(--octo-text-muted)]">{employee.nameAr}</p>
                  <p className="text-[11px] text-[var(--octo-text-faint)]">{employee.id}</p>
                </div>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 text-[12.5px]">
                <DrawerField icon={<Briefcase size={13} />} label={t("staff.col.role")} value={t(ROLE_KEY[employee.role])} />
                <DrawerField icon={<Building2 size={13} />} label={t("staff.col.branch")} value={employee.branch} />
                <DrawerField icon={<CalendarDays size={13} />} label={t("staff.employees.drawer.hireDate")} value={employee.hireDate} />
                <DrawerField icon={<IdCard size={13} />} label={t("staff.employees.drawer.contractType")} value={t(CONTRACT_KEY[employee.contractType])} />
              </dl>

              <div className="mt-4">
                <dt className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
                  <BadgeAlert size={13} /> {t("staff.employees.drawer.iqamaExpiry")}
                </dt>
                <dd className="mt-1.5 flex items-center gap-2">
                  <span className="text-[12.5px] text-[var(--octo-text-primary)]">{employee.iqamaExpiry}</span>
                  {expiryWarning && (
                    <Badge tone="warning">
                      <AlertTriangle size={10} /> {t("staff.employees.drawer.expiringSoon").replace("{n}", String(Math.max(expiryDays, 0)))}
                    </Badge>
                  )}
                </dd>
              </div>

              <div className="mt-4">
                <dt className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
                  <Wallet size={13} /> {t("staff.employees.drawer.salaryBand")}
                </dt>
                <dd className="mt-1.5 text-[12.5px] text-[var(--octo-text-primary)]">
                  {employee.role === "Owner"
                    ? t("staff.employees.drawer.notApplicable")
                    : `SAR ${employee.salaryBandMin.toLocaleString()}–${employee.salaryBandMax.toLocaleString()}/${t("staff.employees.drawer.perMonth")}`}
                </dd>
              </div>

              <div className="mt-4">
                <dt className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
                  <Phone size={13} /> {t("staff.employees.drawer.emergencyContact")}
                </dt>
                <dd className="mt-1.5 text-[12.5px] text-[var(--octo-text-primary)]">
                  {employee.emergencyContactName} · {employee.emergencyContactPhone}
                </dd>
              </div>

              <div className="mt-4">
                <dt className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
                  <FileText size={13} /> {t("staff.employees.drawer.documents")}
                </dt>
                <ul className="mt-1.5 flex flex-col gap-1.5">
                  {employee.documents.map((doc) => (
                    <li key={doc.name}>
                      <a href="#" onClick={(e) => e.preventDefault()} className="flex items-center justify-between rounded-[9px] border border-[var(--octo-divider)] px-2.5 py-1.5 text-[12px] text-[#0D6EFD] hover:bg-[var(--octo-hover)]">
                        <span>{doc.name}</span>
                        <span className="text-[10.5px] uppercase text-[var(--octo-text-faint)]">{doc.type}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-[var(--octo-divider)] px-[18px] py-[15px]">
              <Button variant="secondary" size="sm" disabled={deactivated} onClick={() => setEditOpen(true)}>
                {t("staff.employees.drawer.edit")}
              </Button>
              <Button variant="danger" size="sm" disabled={deactivated} onClick={() => setConfirmOpen(true)}>
                {t("staff.employees.drawer.deactivate")}
              </Button>
            </div>
          </>
        )}
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t("staff.employees.drawer.deactivateConfirmTitle")}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setConfirmOpen(false)}>{t("common.cancel")}</Button>
            <Button variant="danger" size="sm" onClick={() => { onDeactivate(); setConfirmOpen(false); }}>
              {t("staff.employees.drawer.deactivate")}
            </Button>
          </>
        }
      >
        <p className="text-[12.5px] text-[var(--octo-text-secondary)]">
          {t("staff.employees.drawer.deactivateConfirmBody").replace("{name}", employee?.name ?? "")}
        </p>
      </Modal>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={t("staff.employees.drawer.editTitle")}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setEditOpen(false)}>{t("common.cancel")}</Button>
            <Button variant="primary" size="sm" onClick={() => { onSaveEdit({ branch: editBranch, contractType: editContract }); setEditOpen(false); }}>
              {t("common.save")}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Select label={t("staff.col.branch")} value={editBranch} onChange={(e) => setEditBranch(e.target.value as Branch)}>
            {(["Riyadh - Olaya", "Riyadh - Narjis", "Jeddah - Corniche", "Dammam - Corniche", "Khobar - Rakah"] as const).map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </Select>
          <Select label={t("staff.employees.drawer.contractType")} value={editContract} onChange={(e) => setEditContract(e.target.value as ContractType)}>
            <option value="Full-time">{t(CONTRACT_KEY["Full-time"])}</option>
            <option value="Part-time">{t(CONTRACT_KEY["Part-time"])}</option>
            <option value="Seasonal">{t(CONTRACT_KEY["Seasonal"])}</option>
          </Select>
        </div>
      </Modal>
    </div>
  );
}
