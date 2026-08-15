import { useMemo, useState } from "react";
import { Search, HandCoins, AlertTriangle, X, ChevronUp, ChevronDown, CircleDollarSign } from "lucide-react";
import { StatCard } from "@/widgets/sales-summary-chart";
import { Badge, Button, Checkbox, EmptyState, Input, Modal, Select } from "@ui/primitives";
import {
  tipsStats,
  tipRecords as initialTipRecords,
  employeeById,
  defaultTipSplitRules,
  type TipPoolMethod,
  type TipPoolRole,
  type TipStatus,
  type TipRecord,
} from "@/shared/api/mock-staff";
import { useI18n } from "@/app/providers/i18n-provider";
import { labelKey } from "@/shared/lib/labels";

const POOL_ROLES: readonly TipPoolRole[] = ["Waiters", "Kitchen", "Runners", "Hosts"];

const ROLE_KEY: Record<TipPoolRole, string> = {
  Waiters: "staff.tips.role.waiters",
  Kitchen: "staff.tips.role.kitchen",
  Runners: "staff.tips.role.runners",
  Hosts: "staff.tips.role.hosts",
};

const METHOD_KEY: Record<TipPoolMethod, string> = {
  Individual: "staff.tips.ruleCard.method.individual",
  "Pooled by branch": "staff.tips.ruleCard.method.branch",
  "Pooled by shift": "staff.tips.ruleCard.method.shift",
};

const STATUS_TONE: Record<TipStatus, "warning" | "success" | "neutral"> = {
  Pending: "warning",
  Distributed: "success",
  "Paid Out": "neutral",
};
const STATUS_KEY: Record<TipStatus, string> = {
  Pending: "staff.tips.status.pending",
  Distributed: "staff.tips.status.distributed",
  "Paid Out": "staff.tips.status.paidOut",
};

const PAGE_SIZE = 10;

function sar(n: number): string {
  return `SAR ${n.toLocaleString("en-US")}`;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

type SortKey = "hours" | "total";
type SortDir = "asc" | "desc";

export function StaffTipsPage() {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [method, setMethod] = useState<TipPoolMethod>("Pooled by shift");
  const [splits, setSplits] = useState<Record<TipPoolRole, number>>(() =>
    Object.fromEntries(defaultTipSplitRules.map((r) => [r.role, r.percent])) as Record<TipPoolRole, number>
  );
  const [statusOverrides, setStatusOverrides] = useState<Record<string, TipStatus>>({});

  const [distributeOpen, setDistributeOpen] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const resolvedStatus = (rec: TipRecord): TipStatus => statusOverrides[rec.id] ?? rec.status;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const joined = initialTipRecords
      .map((rec) => ({ rec, emp: employeeById.get(rec.employeeId) }))
      .filter(({ emp }) => Boolean(emp));
    let filtered = joined.filter(({ rec, emp }) => {
      if (q && !emp!.name.toLowerCase().includes(q)) return false;
      if (statusFilter !== "all" && resolvedStatus(rec) !== statusFilter) return false;
      return true;
    });
    filtered = [...filtered].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "hours") return (a.rec.hours - b.rec.hours) * dir;
      const aTotal = a.rec.cardTips + a.rec.cashTips;
      const bTotal = b.rec.cardTips + b.rec.cashTips;
      return (aTotal - bTotal) * dir;
    });
    return filtered;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, statusFilter, sortKey, sortDir, statusOverrides]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const splitSum = POOL_ROLES.reduce((sum, role) => sum + (splits[role] ?? 0), 0);
  const splitError = splitSum !== 100;

  const pendingRecords = initialTipRecords.filter((r) => resolvedStatus(r) === "Pending");
  const pendingPool = pendingRecords.reduce((sum, r) => sum + r.cardTips + r.cashTips, 0);

  const totalCard = initialTipRecords.reduce((s, r) => s + r.cardTips, 0);
  const totalCash = initialTipRecords.reduce((s, r) => s + r.cashTips, 0);
  const totalHours = initialTipRecords.reduce((s, r) => s + r.hours, 0);

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
    setSelectedIds((prev) => (prev.size === pageRows.length ? new Set() : new Set(pageRows.map((r) => r.rec.id))));
  };
  const clearFilters = () => {
    setQuery("");
    setStatusFilter("all");
    setPage(1);
    setSelectedIds(new Set());
  };

  const markDistributed = (ids: string[]) => {
    setStatusOverrides((prev) => {
      const next = { ...prev };
      ids.forEach((id) => {
        if (resolvedStatus(initialTipRecords.find((r) => r.id === id)!) === "Pending") next[id] = "Distributed";
      });
      return next;
    });
    setSelectedIds(new Set());
  };

  const canDistribute = pendingRecords.length > 0 && (method === "Individual" || !splitError);

  const distributedAmount = useMemo(() => {
    if (method === "Individual") return pendingPool;
    const pool = pendingPool;
    return POOL_ROLES.reduce((sum, role) => sum + Math.round((pool * (splits[role] ?? 0)) / 100), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, splits, pendingPool]);

  const confirmDistribute = () => {
    markDistributed(pendingRecords.map((r) => r.id));
    setDistributeOpen(false);
    setBanner(t("staff.tips.distributedConfirm").replace("{amount}", sar(distributedAmount)).replace("{n}", String(pendingRecords.length)));
    window.setTimeout(() => setBanner(null), 3000);
  };

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">{t("staff.tips.title")}</h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">{t("staff.tips.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" icon={<HandCoins size={13} />} onClick={() => setDistributeOpen(true)} disabled={!canDistribute}>
            {t("staff.tips.distribute")}
          </Button>
        </div>
      </header>

      {banner && (
        <div className="mt-3 rounded-[9px] bg-[#eafbe9] px-3 py-2 text-center text-[11.5px] font-medium text-[#16a34a]">{banner}</div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tipsStats.map((card) => (
          <StatCard key={card.id} data={card} />
        ))}
      </div>

      <section className="mt-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div className="flex flex-wrap items-center gap-2">
          <HandCoins size={15} className="text-[var(--octo-text-muted)]" />
          <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("staff.tips.ruleCard.title")}</h2>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-[240px_1fr]">
          <div>
            <Select label={t("staff.tips.ruleCard.method")} value={method} onChange={(e) => setMethod(e.target.value as TipPoolMethod)}>
              <option value="Individual">{t(METHOD_KEY.Individual)}</option>
              <option value="Pooled by branch">{t(METHOD_KEY["Pooled by branch"])}</option>
              <option value="Pooled by shift">{t(METHOD_KEY["Pooled by shift"])}</option>
            </Select>
            {method === "Individual" && (
              <p className="mt-2 rounded-[9px] bg-[#eaf2ff] px-3 py-2 text-[11.5px] leading-relaxed text-[#0D6EFD]">
                {t("staff.tips.ruleCard.individualNote")}
              </p>
            )}
          </div>

          <div>
            <div className="octo-scroll overflow-x-auto">
              <table className="w-full min-w-[320px] border-collapse text-[12.5px]">
                <thead>
                  <tr className="border-b border-[var(--octo-divider)] text-start">
                    {["staff.tips.ruleCard.role", "staff.tips.ruleCard.percent"].map((h) => (
                      <th key={h} className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t(h)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {POOL_ROLES.map((role) => (
                    <tr key={role} className="border-b border-[var(--octo-row-border)] last:border-0">
                      <td className="whitespace-nowrap px-2 py-2 text-[var(--octo-text-primary)]">{t(ROLE_KEY[role])}</td>
                      <td className="w-40 px-2 py-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={splits[role] ?? 0}
                            disabled={method === "Individual"}
                            onChange={(e) => {
                              const val = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                              setSplits((prev) => ({ ...prev, [role]: val }));
                            }}
                            className="w-full rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-1.5 text-end text-[12.5px] text-[var(--octo-text-primary)] focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/30 focus:border-[#0D6EFD] disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label={`${t(ROLE_KEY[role])} ${t("staff.tips.ruleCard.percent")}`}
                          />
                          <span className="text-[var(--octo-text-muted)]">%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td className="px-2 py-2 text-[11.5px] font-semibold text-[var(--octo-text-primary)]">{t("staff.tips.ruleCard.total")}</td>
                    <td className={`px-2 py-2 text-[11.5px] font-bold ${splitError ? "text-[#dc2626]" : "text-[#16a34a]"}`}>{splitSum}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
            {method !== "Individual" && splitError && (
              <p className="mt-2 flex items-center gap-1.5 rounded-[9px] bg-[#fdecec] px-3 py-2 text-[11.5px] font-medium text-[#dc2626]">
                <AlertTriangle size={12} /> {t("staff.tips.ruleCard.mustEqual100")}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="mt-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        {selectedIds.size > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12.5px] font-medium text-[var(--octo-text-primary)]">
              {selectedIds.size} {t("staff.employees.selected")}
            </span>
            <Button variant="secondary" size="sm" onClick={() => markDistributed([...selectedIds])}>
              {t("staff.tips.status.distributed")}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())} className="ms-auto">
              {t("staff.employees.clearSelection")}
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="min-w-[200px] flex-1"
              placeholder={t("staff.tips.searchPlaceholder")}
              icon={<Search size={13} />}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            />
            <Select className="w-[150px]" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="all">{t("staff.filter.allStatuses")}</option>
              {(["Pending", "Distributed", "Paid Out"] as TipStatus[]).map((s) => (
                <option key={s} value={s}>{t(STATUS_KEY[s])}</option>
              ))}
            </Select>
          </div>
        )}

        {/* Mobile: card accordion — tap a row to expand its breakdown, no horizontal scroll */}
        <div className="mt-3 divide-y divide-[var(--octo-row-border)] sm:hidden">
          {pageRows.map(({ rec, emp }) => {
            const status = resolvedStatus(rec);
            const total = rec.cardTips + rec.cashTips;
            const isOpen = expandedId === rec.id;
            return (
              <div key={rec.id}>
                <div className="flex items-center gap-2 py-2.5">
                  <Checkbox checked={selectedIds.has(rec.id)} onChange={() => toggleRow(rec.id)} aria-label={rec.id} />
                  <button
                    type="button"
                    onClick={() => setExpandedId(isOpen ? null : rec.id)}
                    aria-expanded={isOpen}
                    className="flex flex-1 items-center justify-between gap-3 text-start"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{emp!.name}</span>
                      <span className="block truncate text-[11px] text-[var(--octo-text-muted)]">{sar(total)}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      <Badge tone={STATUS_TONE[status]}>{t(STATUS_KEY[status])}</Badge>
                      <ChevronDown size={15} className={`text-[var(--octo-text-faint)] transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </span>
                  </button>
                </div>

                {isOpen && (
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-2 pb-3 text-[12px]">
                    {[
                      ["staff.tips.col.role", t(ROLE_KEY[rec.poolRole])],
                      ["staff.tips.col.hours", `${rec.hours}h`],
                      ["staff.tips.col.poolShare", `${rec.poolSharePercent}%`],
                      ["staff.tips.col.cardTips", sar(rec.cardTips)],
                      ["staff.tips.col.cashTips", sar(rec.cashTips)],
                    ].map(([labelId, value]) => (
                      <div key={labelId}>
                        <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t(labelId)}</dt>
                        <dd className="mt-0.5 text-[var(--octo-text-secondary)]">{value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            );
          })}
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
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("staff.col.employee")}</th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("staff.tips.col.role")}</th>
                <th className="cursor-pointer whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]" onClick={() => toggleSort("hours")}>
                  <span className="inline-flex items-center gap-1">{t("staff.tips.col.hours")}{sortIcon("hours")}</span>
                </th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("staff.tips.col.poolShare")}</th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("staff.tips.col.cardTips")}</th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("staff.tips.col.cashTips")}</th>
                <th className="cursor-pointer whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]" onClick={() => toggleSort("total")}>
                  <span className="inline-flex items-center gap-1">{t("staff.tips.col.total")}{sortIcon("total")}</span>
                </th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("staff.tips.col.status")}</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map(({ rec, emp }) => {
                const status = resolvedStatus(rec);
                const total = rec.cardTips + rec.cashTips;
                return (
                  <tr key={rec.id} className="border-b border-[var(--octo-row-border)] last:border-0 hover:bg-[var(--octo-row-hover)]">
                    <td className="px-2 py-2.5">
                      <Checkbox checked={selectedIds.has(rec.id)} onChange={() => toggleRow(rec.id)} aria-label={rec.id} />
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--octo-track)] text-[9.5px] font-bold text-[var(--octo-text-secondary)]">{initials(emp!.name)}</span>
                        <div>
                          <div className="font-semibold text-[var(--octo-text-primary)]">{emp!.name}</div>
                          <div className="text-[11px] text-[var(--octo-text-muted)]">{emp!.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{t(ROLE_KEY[rec.poolRole])}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{rec.hours}h</td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{rec.poolSharePercent}%</td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-primary)]">{sar(rec.cardTips)}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-primary)]">{sar(rec.cashTips)}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 font-semibold text-[var(--octo-text-primary)]">{sar(total)}</td>
                    <td className="whitespace-nowrap px-2 py-2.5">
                      <Badge tone={STATUS_TONE[status]}>{t(STATUS_KEY[status])}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-[var(--octo-divider)]">
                <td />
                <td className="whitespace-nowrap px-2 py-2.5 text-[11.5px] font-bold text-[var(--octo-text-primary)]">{t("staff.tips.totals")}</td>
                <td />
                <td className="whitespace-nowrap px-2 py-2.5 text-[11.5px] font-bold text-[var(--octo-text-primary)]">{totalHours}h</td>
                <td className="whitespace-nowrap px-2 py-2.5 text-[11.5px] font-bold text-[var(--octo-text-primary)]">100%</td>
                <td className="whitespace-nowrap px-2 py-2.5 text-[11.5px] font-bold text-[var(--octo-text-primary)]">{sar(totalCard)}</td>
                <td className="whitespace-nowrap px-2 py-2.5 text-[11.5px] font-bold text-[var(--octo-text-primary)]">{sar(totalCash)}</td>
                <td className="whitespace-nowrap px-2 py-2.5 text-[11.5px] font-bold text-[var(--octo-text-primary)]">{sar(totalCard + totalCash)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
          {pageRows.length === 0 && (
            <EmptyState
              icon={<CircleDollarSign size={18} />}
              title={t("staff.tips.emptyTitle")}
              description={t("staff.tips.emptyDescription")}
              action={<Button variant="secondary" size="sm" onClick={clearFilters}>{t("customers.clearFilters")}</Button>}
            />
          )}
        </div>

        {rows.length > 0 && (
          <div className="mt-3 flex items-center justify-between text-[11.5px] text-[var(--octo-text-muted)]">
            <span>
              {t("customers.feedback.showing")
                .replace("{from}", String((page - 1) * PAGE_SIZE + 1))
                .replace("{to}", String(Math.min(page * PAGE_SIZE, rows.length)))
                .replace("{total}", String(rows.length))}
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

      <DistributeModal
        open={distributeOpen}
        onClose={() => setDistributeOpen(false)}
        method={method}
        splits={splits}
        splitError={method !== "Individual" && splitError}
        pool={pendingPool}
        pendingCount={pendingRecords.length}
        individualRows={pendingRecords
          .map((r) => ({ rec: r, emp: employeeById.get(r.employeeId) }))
          .filter((x) => Boolean(x.emp))}
        onConfirm={confirmDistribute}
      />
    </div>
  );
}

function DistributeModal({
  open,
  onClose,
  method,
  splits,
  splitError,
  pool,
  pendingCount,
  individualRows,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  method: TipPoolMethod;
  splits: Record<TipPoolRole, number>;
  splitError: boolean;
  pool: number;
  pendingCount: number;
  individualRows: { rec: TipRecord; emp: ReturnType<typeof employeeById.get> }[];
  onConfirm: () => void;
}) {
  const { t } = useI18n();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("staff.tips.modal.title")}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>{t("common.cancel")}</Button>
          <Button variant="primary" size="sm" onClick={onConfirm} disabled={splitError}>
            {t("staff.tips.modal.confirm")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between rounded-[9px] bg-[var(--octo-row-hover)] px-3 py-2 text-[12px]">
          <span className="text-[var(--octo-text-muted)]">{t("staff.tips.modal.method")}</span>
          <span className="font-semibold text-[var(--octo-text-primary)]">{t(METHOD_KEY[method])}</span>
        </div>
        <div className="flex items-center justify-between rounded-[9px] bg-[var(--octo-row-hover)] px-3 py-2 text-[12px]">
          <span className="text-[var(--octo-text-muted)]">{t("staff.tips.modal.pool")}</span>
          <span className="font-semibold text-[var(--octo-text-primary)]">{sar(pool)}</span>
        </div>
        <div className="flex items-center justify-between rounded-[9px] bg-[var(--octo-row-hover)] px-3 py-2 text-[12px]">
          <span className="text-[var(--octo-text-muted)]">{t("staff.tips.modal.pendingCount").replace("{n}", String(pendingCount))}</span>
          <span className="font-semibold text-[var(--octo-text-primary)]">{sar(pool)}</span>
        </div>

        {method === "Individual" ? (
          <div className="max-h-48 overflow-y-auto rounded-[9px] border border-[var(--octo-divider)]">
            <table className="w-full border-collapse text-[12px]">
              <tbody>
                {individualRows.map(({ rec, emp }) => (
                  <tr key={rec.id} className="border-b border-[var(--octo-row-border)] last:border-0">
                    <td className="px-3 py-1.5 text-[var(--octo-text-secondary)]">{emp!.name}</td>
                    <td className="px-3 py-1.5 text-end font-medium text-[var(--octo-text-primary)]">{sar(rec.cardTips + rec.cashTips)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-[var(--octo-divider)] text-start">
                <th className="px-2 py-1.5 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("staff.tips.ruleCard.role")}</th>
                <th className="px-2 py-1.5 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("staff.tips.ruleCard.percent")}</th>
                <th className="px-2 py-1.5 text-end text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("staff.tips.col.total")}</th>
              </tr>
            </thead>
            <tbody>
              {POOL_ROLES.map((role) => {
                const pct = splits[role] ?? 0;
                return (
                  <tr key={role} className="border-b border-[var(--octo-row-border)] last:border-0">
                    <td className="px-2 py-1.5 text-[var(--octo-text-secondary)]">{t(ROLE_KEY[role])}</td>
                    <td className="px-2 py-1.5 text-[var(--octo-text-secondary)]">{pct}%</td>
                    <td className="px-2 py-1.5 text-end font-medium text-[var(--octo-text-primary)]">{sar(Math.round((pool * pct) / 100))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {splitError && (
          <p className="flex items-center gap-1.5 rounded-[9px] bg-[#fdecec] px-3 py-2 text-[11.5px] font-medium text-[#dc2626]">
            <AlertTriangle size={12} /> {t("staff.tips.ruleCard.mustEqual100")}
          </p>
        )}

        <p className="flex items-start gap-1.5 rounded-[9px] bg-[#fef3e8] px-3 py-2 text-[11.5px] text-[#c2660a]">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {t("staff.tips.modal.warning")}
        </p>
      </div>
    </Modal>
  );
}
