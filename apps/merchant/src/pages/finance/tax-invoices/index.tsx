import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Search, ChevronUp, ChevronDown, FileCheck2, X, Copy, Check, ShieldCheck, AlertTriangle,
  RefreshCw, Hash, Link2, CircleCheck,
} from "lucide-react";
import { StatCard } from "@/widgets/sales-summary-chart";
import { Badge, Button, EmptyState, Input, Select } from "@ui/primitives";
import {
  zatcaInvoiceRows,
  invoiceStats,
  zatcaCsidValidUntil,
  zatcaRejectedCount,
  formatSAR,
  type ZatcaInvoiceRow,
  type InvoiceType,
  type ZatcaStatus,
} from "@/shared/api/mock-finance";
import { useI18n } from "@/app/providers/i18n-provider";

const STATUS_TONE: Record<ZatcaStatus, "success" | "error" | "warning" | "info" | "neutral"> = {
  Cleared: "success",
  Reported: "success",
  Pending: "warning",
  Warning: "warning",
  Rejected: "error",
};

const STATUS_KEY: Record<ZatcaStatus, string> = {
  Cleared: "finance.taxInvoices.status.cleared",
  Reported: "finance.taxInvoices.status.reported",
  Pending: "finance.taxInvoices.status.pending",
  Warning: "finance.taxInvoices.status.warning",
  Rejected: "finance.taxInvoices.status.rejected",
};

const TYPE_KEY: Record<InvoiceType, string> = {
  Standard: "finance.taxInvoices.type.standard",
  Simplified: "finance.taxInvoices.type.simplified",
  "Credit Note": "finance.taxInvoices.type.creditNote",
};

const TYPES: InvoiceType[] = ["Standard", "Simplified", "Credit Note"];
const STATUSES: ZatcaStatus[] = ["Cleared", "Reported", "Pending", "Warning", "Rejected"];

type SortKey = "total" | "time";
type SortDir = "asc" | "desc";
const PAGE_SIZE = 10;

// The required legal flow per invoice type — this is the whole point of the
// page: Standard MUST be cleared before issue, Simplified MUST be reported
// within 24h of issue. The badge alone is not enough context.
function flowCaptionKey(row: ZatcaInvoiceRow): string {
  if (row.type === "Standard" || row.type === "Credit Note") {
    if (row.zatcaStatus === "Cleared") return "finance.taxInvoices.flow.clearedBeforeIssue";
    if (row.zatcaStatus === "Pending") return "finance.taxInvoices.flow.pendingClearance";
    if (row.zatcaStatus === "Warning") return "finance.taxInvoices.flow.clearedWithWarning";
    return "finance.taxInvoices.flow.clearanceRejected";
  }
  if (row.zatcaStatus === "Reported") return "finance.taxInvoices.flow.reportedAfterIssue";
  if (row.zatcaStatus === "Pending") return "finance.taxInvoices.flow.pendingReport";
  if (row.zatcaStatus === "Warning") return "finance.taxInvoices.flow.reportedWithWarning";
  return "finance.taxInvoices.flow.reportRejected";
}

function shortHash(hash: string): string {
  return hash.length <= 16 ? hash : `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

function CopyableCode({ value, display }: { value: string; display: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard?.writeText(value).catch(() => {});
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1 rounded-[6px] px-1 py-0.5 font-mono text-[11px] text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)]"
    >
      {display}
      {copied ? <Check size={11} className="text-[#16a34a]" /> : <Copy size={11} className="text-[var(--octo-text-faint)]" />}
    </button>
  );
}

export function TaxInvoicesPage() {
  const { t } = useI18n();
  const [rows, setRows] = useState<ZatcaInvoiceRow[]>(() => zatcaInvoiceRows.map((r) => ({ ...r })));
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [rangeFilter, setRangeFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("time");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const rejectedCount = rows.filter((r) => r.zatcaStatus === "Rejected").length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = rows.filter((row) => {
      if (q && !row.id.toLowerCase().includes(q)) return false;
      if (typeFilter !== "all" && row.type !== typeFilter) return false;
      if (statusFilter !== "all" && row.zatcaStatus !== statusFilter) return false;
      if (rangeFilter === "24h" && row.hoursSinceIssued > 24) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "total") return (a.total - b.total) * dir;
      return (a.hoursSinceIssued - b.hoursSinceIssued) * dir;
    });
    return list;
  }, [rows, query, typeFilter, statusFilter, rangeFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const drawerRow = rows.find((r) => r.id === drawerId) ?? null;

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };
  const sortIcon = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? <ChevronUp size={11} /> : <ChevronDown size={11} />) : null;

  const clearFilters = () => { setQuery(""); setTypeFilter("all"); setStatusFilter("all"); setRangeFilter("all"); setPage(1); };

  const retrySubmission = (id: string) => {
    setRows((prev) => prev.map((r) => {
      if (r.id !== id) return r;
      const cleared: ZatcaStatus = r.type === "Simplified" ? "Reported" : "Cleared";
      return {
        ...r,
        zatcaStatus: cleared,
        zatcaMessage: r.type === "Simplified" ? "Invoice complies — reported to ZATCA." : "Invoice complies — cleared by ZATCA before issuance.",
        cryptographicStamp: { ...r.cryptographicStamp, signed: true },
      };
    }));
    setToast(t("finance.taxInvoices.retryToast").replace("{id}", id));
    window.setTimeout(() => setToast(null), 3500);
  };

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("finance.taxInvoices.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">
            {t("finance.taxInvoices.subtitle")}
          </p>
        </div>
      </header>

      <div className="sticky top-0 z-10 mt-4 flex flex-col gap-2">
        {rejectedCount > 0 && (
          <div className="flex items-center gap-2 rounded-[9px] border border-[#fbdada] bg-[#fdecec] px-3 py-2 text-[11.5px] font-medium text-[#dc2626]">
            <AlertTriangle size={14} />
            {t("finance.taxInvoices.rejectedBanner").replace("{n}", String(rejectedCount))}
          </div>
        )}
        <div className="flex items-center gap-2 rounded-[9px] border border-[#d9f2e1] bg-[#eafbe9] px-3 py-2 text-[11.5px] font-medium text-[#16a34a]">
          <span className="h-2 w-2 shrink-0 rounded-full bg-[#22C55E]" />
          {t("finance.taxInvoices.complianceBanner").replace("{date}", zatcaCsidValidUntil)}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {invoiceStats.map((card) => (
          <StatCard key={card.id} data={card} />
        ))}
      </div>

      <section className="mt-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        {toast && (
          <div className="mb-3 rounded-[9px] bg-[#eafbe9] px-3 py-2 text-center text-[11.5px] font-medium text-[#16a34a]">
            {toast}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Input
            className="min-w-[200px] flex-1"
            placeholder={t("finance.taxInvoices.searchPlaceholder")}
            icon={<Search size={13} />}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          />
          <Select className="w-[160px]" value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}>
            <option value="all">{t("finance.taxInvoices.filter.allTypes")}</option>
            {TYPES.map((ty) => <option key={ty} value={ty}>{t(TYPE_KEY[ty])}</option>)}
          </Select>
          <Select className="w-[150px]" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="all">{t("finance.taxInvoices.filter.allStatuses")}</option>
            {STATUSES.map((s) => <option key={s} value={s}>{t(STATUS_KEY[s])}</option>)}
          </Select>
          <Select className="w-[140px]" value={rangeFilter} onChange={(e) => { setRangeFilter(e.target.value); setPage(1); }}>
            <option value="all">{t("finance.taxInvoices.range.all")}</option>
            <option value="24h">{t("finance.taxInvoices.range.last24h")}</option>
          </Select>
        </div>

        <div className="octo-scroll mt-3 overflow-x-auto">
          <table className="w-full min-w-[1080px] border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-[var(--octo-divider)] text-start">
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("finance.taxInvoices.col.invoiceNo")}</th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("finance.taxInvoices.col.type")}</th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("finance.taxInvoices.col.buyer")}</th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("finance.taxInvoices.col.buyerVatNo")}</th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("finance.taxInvoices.col.net")}</th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("finance.taxInvoices.col.vat")}</th>
                <th className="cursor-pointer whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]" onClick={() => toggleSort("total")}>
                  <span className="inline-flex items-center gap-1">{t("finance.taxInvoices.col.total")} {sortIcon("total")}</span>
                </th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("finance.taxInvoices.col.zatcaStatus")}</th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("finance.taxInvoices.col.uuid")}</th>
                <th className="cursor-pointer whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]" onClick={() => toggleSort("time")}>
                  <span className="inline-flex items-center gap-1">{t("finance.taxInvoices.col.timestamp")} {sortIcon("time")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <tr key={row.id} className="cursor-pointer border-b border-[var(--octo-row-border)] last:border-0 hover:bg-[var(--octo-row-hover)]" onClick={() => setDrawerId(row.id)}>
                  <td className="whitespace-nowrap px-2 py-2.5 font-semibold text-[var(--octo-text-primary)]">{row.id}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{t(TYPE_KEY[row.type])}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{row.buyer === "Walk-in" ? t("finance.taxInvoices.walkIn") : row.buyer}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-muted)]">{row.buyerVatNo}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{formatSAR(row.net)}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{formatSAR(row.vat)}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 font-medium text-[var(--octo-text-primary)]">{formatSAR(row.total)}</td>
                  <td className="whitespace-nowrap px-2 py-2.5">
                    <Badge tone={STATUS_TONE[row.zatcaStatus]}>{t(STATUS_KEY[row.zatcaStatus])}</Badge>
                    <div className="mt-0.5 text-[10.5px] text-[var(--octo-text-muted)]">{t(flowCaptionKey(row))}</div>
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <CopyableCode value={row.uuid} display={`${row.uuid.slice(0, 8)}…`} />
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-faint)]">{row.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {pageRows.length === 0 && (
            <EmptyState
              icon={<FileCheck2 size={18} />}
              title={t("finance.taxInvoices.emptyTitle")}
              description={t("finance.taxInvoices.emptyDescription")}
              action={<Button variant="secondary" size="sm" onClick={clearFilters}>{t("finance.payments.clearFilters")}</Button>}
            />
          )}
        </div>

        {filtered.length > 0 && (
          <div className="mt-3 flex items-center justify-between text-[11.5px] text-[var(--octo-text-muted)]">
            <span>
              {t("finance.taxInvoices.showing")
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

      <InvoiceDrawer row={drawerRow} onClose={() => setDrawerId(null)} onRetry={retrySubmission} />
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

function QrPlaceholder() {
  // Deterministic pseudo-random square grid — visually stands in for a QR
  // code without pretending to be a real scannable ZATCA QR payload.
  const cells = Array.from({ length: 11 * 11 }, (_, i) => {
    const h = ((i * 928371) ^ (i << 3)) >>> 0;
    return h % 3 !== 0;
  });
  return (
    <div className="grid grid-cols-11 gap-[2px] rounded-[9px] border border-[var(--octo-divider)] bg-[var(--octo-card)] p-3" style={{ width: 148, height: 148 }}>
      {cells.map((on, i) => (
        <span key={i} className={on ? "bg-[#16161d]" : "bg-transparent"} />
      ))}
    </div>
  );
}

function InvoiceDrawer({
  row,
  onClose,
  onRetry,
}: {
  row: ZatcaInvoiceRow | null;
  onClose: () => void;
  onRetry: (id: string) => void;
}) {
  const { t } = useI18n();
  const open = Boolean(row);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div className={`absolute inset-0 bg-black/30 transition-opacity ${open ? "opacity-100" : "opacity-0"}`} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("finance.taxInvoices.drawer.title")}
        className={`absolute inset-y-0 end-0 flex w-full flex-col bg-[var(--octo-card)] shadow-xl transition-transform duration-200 sm:w-[440px] ${open ? "translate-x-0" : "translate-x-full rtl:-translate-x-full"}`}
      >
        {row && (
          <>
            <div className="flex items-center justify-between border-b border-[var(--octo-divider)] px-[18px] py-[15px]">
              <h2 className="text-[15px] font-semibold text-[var(--octo-text-primary)]">{t("finance.taxInvoices.drawer.title")}</h2>
              <button type="button" aria-label={t("common.cancel")} onClick={onClose} className="grid h-7 w-7 place-items-center rounded-[7px] text-[var(--octo-text-muted)] transition-colors hover:bg-[var(--octo-hover)]">
                <X size={15} />
              </button>
            </div>

            <div className="octo-scroll flex-1 overflow-y-auto px-[18px] py-[15px]">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[16px] font-bold text-[var(--octo-text-primary)]">{row.id}</h3>
                <Badge tone={STATUS_TONE[row.zatcaStatus]}>{t(STATUS_KEY[row.zatcaStatus])}</Badge>
              </div>
              <p className="mt-1 text-[12px] text-[var(--octo-text-muted)]">{t(flowCaptionKey(row))}</p>

              <div className="mt-4 flex justify-center">
                <QrPlaceholder />
              </div>
              <p className="mt-1.5 text-center text-[10.5px] text-[var(--octo-text-faint)]">{t("finance.taxInvoices.drawer.qrNote")}</p>

              {row.type === "Credit Note" && row.creditNoteOf && (
                <div className="mt-4 flex items-center gap-2 rounded-[9px] border border-[var(--octo-divider)] px-3 py-2.5 text-[12.5px]">
                  <Link2 size={13} className="text-[var(--octo-text-muted)]" />
                  <span className="text-[var(--octo-text-secondary)]">{t("finance.taxInvoices.drawer.creditsInvoice")}</span>
                  <span className="ms-auto font-medium text-[#0D6EFD]">{row.creditNoteOf}</span>
                </div>
              )}

              <dl className="mt-4 grid grid-cols-2 gap-3 text-[12.5px]">
                <DrawerField icon={<Hash size={13} />} label={t("finance.taxInvoices.col.type")} value={t(TYPE_KEY[row.type])} />
                <DrawerField icon={<Hash size={13} />} label={t("finance.taxInvoices.col.buyerVatNo")} value={row.buyerVatNo} />
                <DrawerField icon={<Hash size={13} />} label={t("finance.taxInvoices.drawer.vatRate")} value="15%" />
                <DrawerField icon={<Hash size={13} />} label={t("finance.taxInvoices.col.net")} value={formatSAR(row.net)} />
                <DrawerField icon={<Hash size={13} />} label={t("finance.taxInvoices.col.vat")} value={formatSAR(row.vat)} />
                <DrawerField icon={<Hash size={13} />} label={t("finance.taxInvoices.col.total")} value={formatSAR(row.total)} />
              </dl>

              <div className="mt-4 flex flex-col gap-2">
                <div className="flex items-center justify-between rounded-[9px] border border-[var(--octo-divider)] px-3 py-2.5 text-[12px]">
                  <span className="text-[var(--octo-text-muted)]">{t("finance.taxInvoices.drawer.xmlHash")}</span>
                  <CopyableCode value={row.xmlHash} display={shortHash(row.xmlHash)} />
                </div>
                <div className="flex items-center justify-between rounded-[9px] border border-[var(--octo-divider)] px-3 py-2.5 text-[12px]">
                  <span className="text-[var(--octo-text-muted)]">{t("finance.taxInvoices.drawer.pih")}</span>
                  <CopyableCode value={row.previousInvoiceHash} display={shortHash(row.previousInvoiceHash)} />
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-[9px] border border-[var(--octo-divider)] px-3 py-2.5 text-[12.5px]">
                {row.cryptographicStamp.signed ? (
                  <ShieldCheck size={14} className="text-[#16a34a]" />
                ) : (
                  <AlertTriangle size={14} className="text-[#dc2626]" />
                )}
                <div>
                  <div className={row.cryptographicStamp.signed ? "font-medium text-[#16a34a]" : "font-medium text-[#dc2626]"}>
                    {row.cryptographicStamp.signed ? t("finance.taxInvoices.drawer.stampValid") : t("finance.taxInvoices.drawer.stampInvalid")}
                  </div>
                  <div className="text-[11px] text-[var(--octo-text-muted)]">{row.cryptographicStamp.signedAt}</div>
                </div>
              </div>

              <div className="mt-4 rounded-[9px] px-3 py-2.5 text-[12px]" style={{
                backgroundColor: row.zatcaStatus === "Rejected" ? "#fdecec" : row.zatcaStatus === "Warning" ? "#fef3e8" : "#eafbe9",
                color: row.zatcaStatus === "Rejected" ? "#dc2626" : row.zatcaStatus === "Warning" ? "#c2660a" : "#16a34a",
              }}>
                <div className="mb-1 flex items-center gap-1.5 font-semibold">
                  <CircleCheck size={13} /> {t("finance.taxInvoices.drawer.zatcaResponse")}
                </div>
                {row.zatcaMessage}
              </div>
            </div>

            {row.zatcaStatus === "Rejected" && (
              <div className="flex items-center gap-2 border-t border-[var(--octo-divider)] px-[18px] py-[15px]">
                <Button size="sm" icon={<RefreshCw size={13} />} onClick={() => onRetry(row.id)}>
                  {t("finance.taxInvoices.drawer.retry")}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
