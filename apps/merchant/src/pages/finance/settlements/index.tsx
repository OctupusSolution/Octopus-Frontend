import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronUp, ChevronDown, Landmark, X, CheckCircle2 } from "lucide-react";
import { StatCard } from "@/widgets/sales-summary-chart";
import { Badge, Button, EmptyState, Segmented, Select } from "@ui/primitives";
import {
  settlementRows,
  settlementStats,
  formatSAR,
  type SettlementRow,
  type SettlementStatus,
  type PaymentGateway,
} from "@/shared/api/mock-finance";
import { useI18n } from "@/app/providers/i18n-provider";

const STATUS_TONE: Record<SettlementStatus, "success" | "error" | "warning" | "info" | "neutral"> = {
  Pending: "info",
  Received: "success",
  Reconciled: "success",
  Discrepancy: "error",
};

const STATUS_KEY: Record<SettlementStatus, string> = {
  Pending: "finance.settlements.status.pending",
  Received: "finance.settlements.status.received",
  Reconciled: "finance.settlements.status.reconciled",
  Discrepancy: "finance.settlements.status.discrepancy",
};

const GATEWAYS: PaymentGateway[] = ["Moyasar", "Tap", "HyperPay", "PayTabs"];
const STATUSES: SettlementStatus[] = ["Pending", "Received", "Reconciled", "Discrepancy"];

type SortKey = "gross" | "difference";
type SortDir = "asc" | "desc";
const PAGE_SIZE = 10;

export function SettlementsPage() {
  const { t } = useI18n();
  const [rows, setRows] = useState<SettlementRow[]>(() => settlementRows.map((r) => ({ ...r })));
  const [gatewayFilter, setGatewayFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [drawerId, setDrawerId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = rows.filter((row) => {
      if (gatewayFilter !== "all" && row.gateway !== gatewayFilter) return false;
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (periodFilter === "recent" && rows.indexOf(row) > 3) return false;
      return true;
    });
    if (sortKey) {
      list = [...list].sort((a, b) => {
        const dir = sortDir === "asc" ? 1 : -1;
        return (a[sortKey] - b[sortKey]) * dir;
      });
    }
    return list;
  }, [rows, gatewayFilter, statusFilter, periodFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const drawerRow = rows.find((r) => r.id === drawerId) ?? null;

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };
  const sortIcon = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? <ChevronUp size={11} /> : <ChevronDown size={11} />) : null;

  const clearFilters = () => { setGatewayFilter("all"); setStatusFilter("all"); setPeriodFilter("all"); setPage(1); };

  const markReconciled = (id: string, note: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: "Reconciled", note } : r)));
  };

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("finance.settlements.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">
            {t("finance.settlements.subtitle")}
          </p>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {settlementStats.map((card) => (
          <StatCard key={card.id} data={card} />
        ))}
      </div>

      <section className="mt-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div className="flex flex-wrap items-center gap-2">
          <Select className="w-[150px]" value={gatewayFilter} onChange={(e) => { setGatewayFilter(e.target.value); setPage(1); }}>
            <option value="all">{t("finance.settlements.filter.allGateways")}</option>
            {GATEWAYS.map((g) => <option key={g} value={g}>{g}</option>)}
          </Select>
          <Select className="w-[160px]" value={periodFilter} onChange={(e) => { setPeriodFilter(e.target.value); setPage(1); }}>
            <option value="all">{t("finance.settlements.filter.allPeriods")}</option>
            <option value="recent">{t("finance.settlements.filter.recent")}</option>
          </Select>
          <Select className="w-[150px]" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="all">{t("finance.settlements.filter.allStatuses")}</option>
            {STATUSES.map((s) => <option key={s} value={s}>{t(STATUS_KEY[s])}</option>)}
          </Select>
        </div>

        <div className="octo-scroll mt-3 overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-[var(--octo-divider)] text-start">
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("finance.settlements.col.id")}</th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("finance.settlements.col.gateway")}</th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("finance.settlements.col.period")}</th>
                <th className="cursor-pointer whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]" onClick={() => toggleSort("gross")}>
                  <span className="inline-flex items-center gap-1">{t("finance.settlements.col.gross")} {sortIcon("gross")}</span>
                </th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("finance.settlements.col.fees")}</th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("finance.settlements.col.netExpected")}</th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("finance.settlements.col.netReceived")}</th>
                <th className="cursor-pointer whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]" onClick={() => toggleSort("difference")}>
                  <span className="inline-flex items-center gap-1">{t("finance.settlements.col.difference")} {sortIcon("difference")}</span>
                </th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("finance.settlements.col.status")}</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <tr key={row.id} className="cursor-pointer border-b border-[var(--octo-row-border)] last:border-0 hover:bg-[var(--octo-row-hover)]" onClick={() => setDrawerId(row.id)}>
                  <td className="whitespace-nowrap px-2 py-2.5 font-semibold text-[var(--octo-text-primary)]">{row.id}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{row.gateway}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{row.period}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{formatSAR(row.gross)}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-muted)]">{formatSAR(row.fees)}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{formatSAR(row.netExpected)}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 font-medium text-[var(--octo-text-primary)]">{formatSAR(row.netReceived)}</td>
                  <td className={`whitespace-nowrap px-2 py-2.5 font-semibold ${row.difference !== 0 ? "text-[#EF4444]" : "text-[var(--octo-text-secondary)]"}`}>
                    {row.difference > 0 ? "+" : ""}{formatSAR(row.difference)}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5">
                    <Badge tone={STATUS_TONE[row.status]}>{t(STATUS_KEY[row.status])}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pageRows.length === 0 && (
            <EmptyState
              icon={<Landmark size={18} />}
              title={t("finance.settlements.emptyTitle")}
              description={t("finance.settlements.emptyDescription")}
              action={<Button variant="secondary" size="sm" onClick={clearFilters}>{t("finance.payments.clearFilters")}</Button>}
            />
          )}
        </div>

        {filtered.length > 0 && (
          <div className="mt-3 flex items-center justify-between text-[11.5px] text-[var(--octo-text-muted)]">
            <span>
              {t("finance.settlements.showing")
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

      <SettlementDrawer row={drawerRow} onClose={() => setDrawerId(null)} onMarkReconciled={markReconciled} />
    </div>
  );
}

function DrawerField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{label}</dt>
      <dd className="mt-1 text-[var(--octo-text-primary)]">{value}</dd>
    </div>
  );
}

function SettlementDrawer({
  row,
  onClose,
  onMarkReconciled,
}: {
  row: SettlementRow | null;
  onClose: () => void;
  onMarkReconciled: (id: string, note: string) => void;
}) {
  const { t } = useI18n();
  const open = Boolean(row);
  const [lineFilter, setLineFilter] = useState<"all" | "Matched" | "Unmatched">("all");
  const [note, setNote] = useState("");

  useEffect(() => {
    setLineFilter("all");
    setNote(row?.note ?? "");
  }, [row?.id]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const visibleLines = row ? row.lines.filter((l) => lineFilter === "all" || l.status === lineFilter) : [];

  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div className={`absolute inset-0 bg-black/30 transition-opacity ${open ? "opacity-100" : "opacity-0"}`} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("finance.settlements.drawer.title")}
        className={`absolute inset-y-0 end-0 flex w-full flex-col bg-[var(--octo-card)] shadow-xl transition-transform duration-200 sm:w-[440px] ${open ? "translate-x-0" : "translate-x-full rtl:-translate-x-full"}`}
      >
        {row && (
          <>
            <div className="flex items-center justify-between border-b border-[var(--octo-divider)] px-[18px] py-[15px]">
              <h2 className="text-[15px] font-semibold text-[var(--octo-text-primary)]">{t("finance.settlements.drawer.title")}</h2>
              <button type="button" aria-label={t("common.cancel")} onClick={onClose} className="grid h-7 w-7 place-items-center rounded-[7px] text-[var(--octo-text-muted)] transition-colors hover:bg-[var(--octo-hover)]">
                <X size={15} />
              </button>
            </div>

            <div className="octo-scroll flex-1 overflow-y-auto px-[18px] py-[15px]">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[16px] font-bold text-[var(--octo-text-primary)]">{row.id}</h3>
                <Badge tone={STATUS_TONE[row.status]}>{t(STATUS_KEY[row.status])}</Badge>
              </div>
              <p className="mt-1 text-[12px] text-[var(--octo-text-muted)]">{row.gateway} · {row.period}</p>

              <dl className="mt-4 grid grid-cols-2 gap-3 text-[12.5px]">
                <DrawerField label={t("finance.settlements.col.netExpected")} value={formatSAR(row.netExpected)} />
                <DrawerField label={t("finance.settlements.col.netReceived")} value={formatSAR(row.netReceived)} />
                <DrawerField
                  label={t("finance.settlements.col.difference")}
                  value={<span className={row.difference !== 0 ? "font-semibold text-[#EF4444]" : ""}>{row.difference > 0 ? "+" : ""}{formatSAR(row.difference)}</span>}
                />
              </dl>

              <div className="mt-4 flex items-center justify-between gap-2">
                <h4 className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
                  {t("finance.settlements.drawer.lines")}
                </h4>
                <Segmented
                  options={[
                    { id: "all", label: t("finance.settlements.drawer.all") },
                    { id: "Matched", label: t("finance.settlements.drawer.matched") },
                    { id: "Unmatched", label: t("finance.settlements.drawer.unmatched") },
                  ]}
                  value={lineFilter}
                  onChange={(id) => setLineFilter(id as "all" | "Matched" | "Unmatched")}
                />
              </div>

              <div className="octo-scroll mt-2 max-h-[220px] overflow-y-auto rounded-[9px] border border-[var(--octo-divider)]">
                <table className="w-full border-collapse text-[11.5px]">
                  <thead>
                    <tr className="border-b border-[var(--octo-divider)] bg-[var(--octo-row-hover)] text-start">
                      <th className="px-2 py-1.5 text-start font-semibold text-[var(--octo-text-faint)]">{t("finance.settlements.drawer.date")}</th>
                      <th className="px-2 py-1.5 text-start font-semibold text-[var(--octo-text-faint)]">{t("finance.settlements.col.gross")}</th>
                      <th className="px-2 py-1.5 text-start font-semibold text-[var(--octo-text-faint)]">{t("finance.settlements.col.fees")}</th>
                      <th className="px-2 py-1.5 text-start font-semibold text-[var(--octo-text-faint)]">{t("finance.settlements.drawer.net")}</th>
                      <th className="px-2 py-1.5 text-start font-semibold text-[var(--octo-text-faint)]">{t("finance.settlements.col.status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleLines.map((line, i) => (
                      <tr key={i} className="border-b border-[var(--octo-row-border)] last:border-0">
                        <td className="whitespace-nowrap px-2 py-1.5 text-[var(--octo-text-muted)]">{line.date}</td>
                        <td className="whitespace-nowrap px-2 py-1.5 text-[var(--octo-text-secondary)]">{formatSAR(line.amount)}</td>
                        <td className="whitespace-nowrap px-2 py-1.5 text-[var(--octo-text-muted)]">{formatSAR(line.fee)}</td>
                        <td className="whitespace-nowrap px-2 py-1.5 font-medium text-[var(--octo-text-primary)]">{formatSAR(line.net)}</td>
                        <td className="whitespace-nowrap px-2 py-1.5">
                          <Badge tone={line.status === "Matched" ? "success" : "warning"}>
                            {t(line.status === "Matched" ? "finance.settlements.drawer.matched" : "finance.settlements.drawer.unmatched")}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <label className="mt-4 flex flex-col gap-1.5">
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
                  {t("finance.settlements.drawer.note")}
                </span>
                <textarea
                  className="w-full rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-2 text-[12.5px] text-[var(--octo-text-primary)] placeholder:text-[var(--octo-text-faint)] focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/30 focus:border-[#0D6EFD]"
                  rows={2}
                  placeholder={t("finance.settlements.drawer.notePlaceholder")}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
            </div>

            <div className="flex items-center gap-2 border-t border-[var(--octo-divider)] px-[18px] py-[15px]">
              <Button
                size="sm"
                icon={<CheckCircle2 size={13} />}
                disabled={row.status === "Reconciled"}
                onClick={() => onMarkReconciled(row.id, note)}
              >
                {t("finance.settlements.drawer.markReconciled")}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
