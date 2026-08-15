import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Search, ChevronUp, ChevronDown, Wallet, X, CreditCard, ShieldCheck, FileText, ExternalLink,
} from "lucide-react";
import { StatCard } from "@/widgets/sales-summary-chart";
import { Badge, Button, Checkbox, EmptyState, Input, Modal, Segmented, Select } from "@ui/primitives";
import {
  transactionRows,
  paymentStats,
  formatSAR,
  type TransactionRow,
  type PaymentMethod,
  type PaymentGateway,
  type PaymentStatus,
} from "@/shared/api/mock-finance";
import { useI18n } from "@/app/providers/i18n-provider";

const STATUS_TONE: Record<PaymentStatus, "success" | "error" | "warning" | "info" | "neutral"> = {
  Captured: "success",
  Authorized: "info",
  Refunded: "neutral",
  "Partially Refunded": "neutral",
  Failed: "error",
  Chargeback: "error",
};

const STATUS_KEY: Record<PaymentStatus, string> = {
  Captured: "finance.payments.status.captured",
  Authorized: "finance.payments.status.authorized",
  Refunded: "finance.payments.status.refunded",
  "Partially Refunded": "finance.payments.status.partiallyRefunded",
  Failed: "finance.payments.status.failed",
  Chargeback: "finance.payments.status.chargeback",
};

const THREE_DS_KEY: Record<string, string> = {
  Authenticated: "finance.payments.threeDs.authenticated",
  Exempted: "finance.payments.threeDs.exempted",
  "Not enrolled": "finance.payments.threeDs.notEnrolled",
  "N/A": "finance.payments.threeDs.na",
};

const METHODS: PaymentMethod[] = ["Mada", "Apple Pay", "STC Pay", "Visa", "Mastercard", "Tabby", "Tamara", "Cash"];
const GATEWAYS: PaymentGateway[] = ["Moyasar", "Tap", "HyperPay", "PayTabs"];
const STATUSES: PaymentStatus[] = ["Captured", "Authorized", "Refunded", "Partially Refunded", "Failed", "Chargeback"];

type SortKey = "amount" | "time";
type SortDir = "asc" | "desc";
const PAGE_SIZE = 10;

export function PaymentsPage() {
  const { t } = useI18n();
  const [rows, setRows] = useState<TransactionRow[]>(() => transactionRows.map((r) => ({ ...r })));
  const [query, setQuery] = useState("");
  const [rangeFilter, setRangeFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [gatewayFilter, setGatewayFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("time");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = rows.filter((row) => {
      if (q && !row.id.toLowerCase().includes(q) && !row.order.toLowerCase().includes(q)) return false;
      if (rangeFilter === "1h" && row.minutesAgo > 60) return false;
      if (rangeFilter === "24h" && row.minutesAgo > 60 * 24) return false;
      if (methodFilter !== "all" && row.method !== methodFilter) return false;
      if (gatewayFilter !== "all" && row.gateway !== gatewayFilter) return false;
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "amount") return (a.amount - b.amount) * dir;
      return (a.minutesAgo - b.minutesAgo) * dir;
    });
    return list;
  }, [rows, query, rangeFilter, methodFilter, gatewayFilter, statusFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const drawerRow = rows.find((r) => r.id === drawerId) ?? null;

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };
  const sortIcon = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? <ChevronUp size={11} /> : <ChevronDown size={11} />) : null;

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    setSelectedIds((prev) => (prev.size === pageRows.length ? new Set() : new Set(pageRows.map((r) => r.id))));
  };
  const clearFilters = () => {
    setQuery(""); setRangeFilter("all"); setMethodFilter("all"); setGatewayFilter("all"); setStatusFilter("all"); setPage(1);
  };

  const applyRefund = (id: string, amount: number) => {
    setRows((prev) => prev.map((r) => {
      if (r.id !== id) return r;
      const full = Math.abs(amount - r.amount) < 0.01;
      return { ...r, status: full ? "Refunded" : "Partially Refunded" };
    }));
    setToast(t("finance.payments.refundToast").replace("{amount}", formatSAR(amount)).replace("{id}", id));
    window.setTimeout(() => setToast(null), 3500);
  };

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("finance.payments.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">
            {t("finance.payments.subtitle")}
          </p>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {paymentStats.map((card) => (
          <StatCard key={card.id} data={card} />
        ))}
      </div>

      <section className="mt-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        {toast && (
          <div className="mb-3 rounded-[9px] bg-[#eafbe9] px-3 py-2 text-center text-[11.5px] font-medium text-[#16a34a]">
            {toast}
          </div>
        )}

        {selectedIds.size > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12.5px] font-medium text-[var(--octo-text-primary)]">
              {selectedIds.size} {t("finance.payments.selected")}
            </span>
            <Button variant="secondary" size="sm">{t("finance.payments.bulkExport")}</Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())} className="ms-auto">
              {t("finance.payments.clearSelection")}
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="min-w-[200px] flex-1"
              placeholder={t("finance.payments.searchPlaceholder")}
              icon={<Search size={13} />}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            />
            <Select className="w-[140px]" value={rangeFilter} onChange={(e) => { setRangeFilter(e.target.value); setPage(1); }}>
              <option value="all">{t("finance.payments.range.all")}</option>
              <option value="1h">{t("finance.payments.range.lastHour")}</option>
              <option value="24h">{t("finance.payments.range.last24h")}</option>
            </Select>
            <Select className="w-[140px]" value={methodFilter} onChange={(e) => { setMethodFilter(e.target.value); setPage(1); }}>
              <option value="all">{t("finance.payments.filter.allMethods")}</option>
              {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </Select>
            <Select className="w-[140px]" value={gatewayFilter} onChange={(e) => { setGatewayFilter(e.target.value); setPage(1); }}>
              <option value="all">{t("finance.payments.filter.allGateways")}</option>
              {GATEWAYS.map((g) => <option key={g} value={g}>{g}</option>)}
            </Select>
            <Select className="w-[150px]" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="all">{t("finance.payments.filter.allStatuses")}</option>
              {STATUSES.map((s) => <option key={s} value={s}>{t(STATUS_KEY[s])}</option>)}
            </Select>
          </div>
        )}

        <div className="octo-scroll mt-3 overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-[var(--octo-divider)] text-start">
                <th className="w-8 px-2 py-2">
                  <Checkbox
                    checked={pageRows.length > 0 && selectedIds.size === pageRows.length}
                    onChange={toggleAll}
                    aria-label={t("finance.payments.selectAll")}
                  />
                </th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("finance.payments.col.transactionId")}</th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("finance.payments.col.order")}</th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("finance.payments.col.method")}</th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("finance.payments.col.gateway")}</th>
                <th className="cursor-pointer whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]" onClick={() => toggleSort("amount")}>
                  <span className="inline-flex items-center gap-1">{t("finance.payments.col.amount")} {sortIcon("amount")}</span>
                </th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("finance.payments.col.fee")}</th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("finance.payments.col.net")}</th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("finance.payments.col.status")}</th>
                <th className="cursor-pointer whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]" onClick={() => toggleSort("time")}>
                  <span className="inline-flex items-center gap-1">{t("finance.payments.col.time")} {sortIcon("time")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <tr key={row.id} className="border-b border-[var(--octo-row-border)] last:border-0 hover:bg-[var(--octo-row-hover)]">
                  <td className="px-2 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={selectedIds.has(row.id)} onChange={() => toggleRow(row.id)} aria-label={row.id} />
                  </td>
                  <td className="cursor-pointer whitespace-nowrap px-2 py-2.5 font-semibold text-[var(--octo-text-primary)]" onClick={() => setDrawerId(row.id)}>{row.id}</td>
                  <td className="cursor-pointer whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]" onClick={() => setDrawerId(row.id)}>{row.order}</td>
                  <td className="cursor-pointer whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]" onClick={() => setDrawerId(row.id)}>{row.method}</td>
                  <td className="cursor-pointer whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]" onClick={() => setDrawerId(row.id)}>{row.gateway}</td>
                  <td className="cursor-pointer whitespace-nowrap px-2 py-2.5 font-medium text-[var(--octo-text-primary)]" onClick={() => setDrawerId(row.id)}>{formatSAR(row.amount)}</td>
                  <td className="cursor-pointer whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-muted)]" onClick={() => setDrawerId(row.id)}>{formatSAR(row.fee)}</td>
                  <td className="cursor-pointer whitespace-nowrap px-2 py-2.5 font-medium text-[var(--octo-text-primary)]" onClick={() => setDrawerId(row.id)}>{formatSAR(row.net)}</td>
                  <td className="cursor-pointer whitespace-nowrap px-2 py-2.5" onClick={() => setDrawerId(row.id)}>
                    <Badge tone={STATUS_TONE[row.status]}>{t(STATUS_KEY[row.status])}</Badge>
                  </td>
                  <td className="cursor-pointer whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-faint)]" onClick={() => setDrawerId(row.id)}>{row.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {pageRows.length === 0 && (
            <EmptyState
              icon={<Wallet size={18} />}
              title={t("finance.payments.emptyTitle")}
              description={t("finance.payments.emptyDescription")}
              action={<Button variant="secondary" size="sm" onClick={clearFilters}>{t("finance.payments.clearFilters")}</Button>}
            />
          )}
        </div>

        {filtered.length > 0 && (
          <div className="mt-3 flex items-center justify-between text-[11.5px] text-[var(--octo-text-muted)]">
            <span>
              {t("finance.payments.showing")
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

      <PaymentDrawer row={drawerRow} onClose={() => setDrawerId(null)} onRefund={applyRefund} />
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

function PaymentDrawer({
  row,
  onClose,
  onRefund,
}: {
  row: TransactionRow | null;
  onClose: () => void;
  onRefund: (id: string, amount: number) => void;
}) {
  const { t } = useI18n();
  const open = Boolean(row);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundMode, setRefundMode] = useState<"full" | "partial">("full");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");

  useEffect(() => {
    setRefundOpen(false);
    setRefundMode("full");
    setRefundAmount(row ? String(row.amount) : "");
    setRefundReason("");
  }, [row?.id]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape" && !refundOpen) onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, refundOpen, onClose]);

  const canRefund = row && row.status !== "Refunded" && row.status !== "Chargeback" && row.status !== "Failed";

  return (
    <>
      <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
        <div className={`absolute inset-0 bg-black/30 transition-opacity ${open ? "opacity-100" : "opacity-0"}`} onClick={onClose} />
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("finance.payments.drawer.title")}
          className={`absolute inset-y-0 end-0 flex w-full flex-col bg-[var(--octo-card)] shadow-xl transition-transform duration-200 sm:w-[420px] ${open ? "translate-x-0" : "translate-x-full rtl:-translate-x-full"}`}
        >
          {row && (
            <>
              <div className="flex items-center justify-between border-b border-[var(--octo-divider)] px-[18px] py-[15px]">
                <h2 className="text-[15px] font-semibold text-[var(--octo-text-primary)]">{t("finance.payments.drawer.title")}</h2>
                <button type="button" aria-label={t("common.cancel")} onClick={onClose} className="grid h-7 w-7 place-items-center rounded-[7px] text-[var(--octo-text-muted)] transition-colors hover:bg-[var(--octo-hover)]">
                  <X size={15} />
                </button>
              </div>

              <div className="octo-scroll flex-1 overflow-y-auto px-[18px] py-[15px]">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-[16px] font-bold text-[var(--octo-text-primary)]">{row.id}</h3>
                  <Badge tone={STATUS_TONE[row.status]}>{t(STATUS_KEY[row.status])}</Badge>
                </div>
                <p className="mt-1 text-[12px] text-[var(--octo-text-muted)]">{row.order} · {row.time}</p>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-[12.5px]">
                  <DrawerField icon={<Wallet size={13} />} label={t("finance.payments.col.amount")} value={formatSAR(row.amount)} />
                  <DrawerField icon={<Wallet size={13} />} label={t("finance.payments.col.fee")} value={formatSAR(row.fee)} />
                  <DrawerField icon={<Wallet size={13} />} label={t("finance.payments.col.net")} value={formatSAR(row.net)} />
                  <DrawerField icon={<CreditCard size={13} />} label={t("finance.payments.drawer.cardMask")} value={row.cardMask ?? "—"} />
                  <DrawerField icon={<ShieldCheck size={13} />} label={t("finance.payments.drawer.threeDs")} value={t(THREE_DS_KEY[row.threeDs])} />
                  <DrawerField icon={<FileText size={13} />} label={t("finance.payments.drawer.linkedInvoice")} value={row.linkedInvoice} />
                </dl>

                <div className="mt-4">
                  <h4 className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{t("finance.payments.drawer.gatewayResponse")}</h4>
                  <pre className="octo-scroll mt-1.5 overflow-x-auto rounded-[9px] bg-[#0b1220] px-3 py-2.5 text-[11px] leading-relaxed text-[#a3e635]">
{`{
  "gateway": "${row.gateway}",
  "reference": "${row.gatewayResponse.reference}",
  "authCode": "${row.gatewayResponse.authCode}",
  "rrn": "${row.gatewayResponse.rrn}",
  "message": "${row.gatewayResponse.processorMessage}"
}`}
                  </pre>
                </div>

                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="mt-4 flex items-center justify-between gap-2 rounded-[9px] border border-[var(--octo-divider)] px-3 py-2.5 text-[12.5px] transition-colors hover:bg-[var(--octo-hover)]"
                >
                  <span className="flex items-center gap-2 font-medium text-[#0D6EFD]">
                    <FileText size={13} /> {row.linkedInvoice}
                  </span>
                  <ExternalLink size={13} className="text-[var(--octo-text-faint)]" />
                </a>
              </div>

              <div className="flex items-center gap-2 border-t border-[var(--octo-divider)] px-[18px] py-[15px]">
                <Button variant="danger" size="sm" disabled={!canRefund} onClick={() => setRefundOpen(true)}>
                  {t("finance.payments.drawer.refund")}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      <Modal
        open={refundOpen}
        onClose={() => setRefundOpen(false)}
        title={row ? t("finance.payments.refundModal.title").replace("{id}", row.id) : ""}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRefundOpen(false)}>{t("common.cancel")}</Button>
            <Button
              variant="danger"
              onClick={() => {
                if (!row) return;
                const amount = refundMode === "full" ? row.amount : Number(refundAmount) || 0;
                onRefund(row.id, amount);
                setRefundOpen(false);
              }}
            >
              {t("finance.payments.refundModal.confirm")}
            </Button>
          </>
        }
      >
        {row && (
          <div className="flex flex-col gap-3">
            <Segmented
              options={[
                { id: "full", label: t("finance.payments.refundModal.full") },
                { id: "partial", label: t("finance.payments.refundModal.partial") },
              ]}
              value={refundMode}
              onChange={(id) => setRefundMode(id as "full" | "partial")}
            />
            <Input
              type="number"
              min={0}
              max={row.amount}
              step={0.01}
              disabled={refundMode === "full"}
              label={t("finance.payments.refundModal.amount")}
              value={refundMode === "full" ? String(row.amount) : refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
            />
            <label className="flex flex-col gap-1.5">
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
                {t("finance.payments.refundModal.reason")}
              </span>
              <textarea
                className="w-full rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-2 text-[12.5px] text-[var(--octo-text-primary)] placeholder:text-[var(--octo-text-faint)] focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/30 focus:border-[#0D6EFD]"
                rows={2}
                placeholder={t("finance.payments.refundModal.reasonPlaceholder")}
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
              />
            </label>
          </div>
        )}
      </Modal>
    </>
  );
}
