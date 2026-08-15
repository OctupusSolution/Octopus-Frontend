import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Search, Landmark, X, Phone } from "lucide-react";
import { StatCard } from "@/widgets/sales-summary-chart";
import { Badge, Button, EmptyState, Input, Modal, Select } from "@ui/primitives";
import {
  houseAccountRows,
  houseAccountStats,
  formatSAR,
  type HouseAccountRow,
  type HouseAccountStatus,
  type PaymentTerms,
} from "@/shared/api/mock-finance";
import { useI18n } from "@/app/providers/i18n-provider";

const STATUS_TONE: Record<HouseAccountStatus, "success" | "error" | "warning" | "info" | "neutral"> = {
  Active: "success",
  "On Hold": "warning",
  "Over Limit": "error",
  Closed: "neutral",
};

const STATUS_KEY: Record<HouseAccountStatus, string> = {
  Active: "finance.houseAccounts.status.active",
  "On Hold": "finance.houseAccounts.status.onHold",
  "Over Limit": "finance.houseAccounts.status.overLimit",
  Closed: "finance.houseAccounts.status.closed",
};

const TERMS: PaymentTerms[] = ["Net 15", "Net 30", "Net 60"];
const STATUSES: HouseAccountStatus[] = ["Active", "On Hold", "Over Limit", "Closed"];
const PAGE_SIZE = 10;

function UtilisationBar({ limit, balance }: { limit: number; balance: number }) {
  const pct = limit > 0 ? Math.min((balance / limit) * 100, 130) : 0;
  const color = balance > limit ? "#EF4444" : balance / limit > 0.8 ? "#F59E0B" : "#22C55E";
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 w-[64px] overflow-hidden rounded-full bg-[var(--octo-track)]">
        <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10.5px] text-[var(--octo-text-muted)]">{Math.round((balance / Math.max(limit, 1)) * 100)}%</span>
    </div>
  );
}

export function HouseAccountsPage() {
  const { t } = useI18n();
  const [rows, setRows] = useState<HouseAccountRow[]>(() => houseAccountRows.map((r) => ({ ...r })));
  const [query, setQuery] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [termsFilter, setTermsFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [drawerId, setDrawerId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (q && !row.company.toLowerCase().includes(q) && !row.account.toLowerCase().includes(q)) return false;
      if (companyFilter !== "all" && row.company !== companyFilter) return false;
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (termsFilter !== "all" && row.paymentTerms !== termsFilter) return false;
      return true;
    });
  }, [rows, query, companyFilter, statusFilter, termsFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const drawerRow = rows.find((r) => r.id === drawerId) ?? null;
  const clearFilters = () => { setQuery(""); setCompanyFilter("all"); setStatusFilter("all"); setTermsFilter("all"); setPage(1); };

  const recordPayment = (id: string, amount: number) => {
    setRows((prev) => prev.map((r) => {
      if (r.id !== id) return r;
      const currentBalance = Math.max(Math.round((r.currentBalance - amount) * 100) / 100, 0);
      const availableCredit = Math.round((r.creditLimit - currentBalance) * 100) / 100;
      const status = r.status === "Closed" ? r.status : currentBalance > r.creditLimit ? "Over Limit" : "Active";
      return { ...r, currentBalance, availableCredit, status };
    }));
  };

  const adjustLimit = (id: string, newLimit: number) => {
    setRows((prev) => prev.map((r) => {
      if (r.id !== id) return r;
      const availableCredit = Math.round((newLimit - r.currentBalance) * 100) / 100;
      const status = r.status === "Closed" ? r.status : r.currentBalance > newLimit ? "Over Limit" : r.status === "Over Limit" ? "Active" : r.status;
      return { ...r, creditLimit: newLimit, availableCredit, status };
    }));
  };

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("finance.houseAccounts.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">
            {t("finance.houseAccounts.subtitle")}
          </p>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {houseAccountStats.map((card) => (
          <StatCard key={card.id} data={card} />
        ))}
      </div>

      <section className="mt-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            className="min-w-[200px] flex-1"
            placeholder={t("finance.houseAccounts.searchPlaceholder")}
            icon={<Search size={13} />}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          />
          <Select className="w-[190px]" value={companyFilter} onChange={(e) => { setCompanyFilter(e.target.value); setPage(1); }}>
            <option value="all">{t("finance.houseAccounts.filter.allCompanies")}</option>
            {[...new Set(rows.map((r) => r.company))].map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select className="w-[140px]" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="all">{t("finance.houseAccounts.filter.allStatuses")}</option>
            {STATUSES.map((s) => <option key={s} value={s}>{t(STATUS_KEY[s])}</option>)}
          </Select>
          <Select className="w-[130px]" value={termsFilter} onChange={(e) => { setTermsFilter(e.target.value); setPage(1); }}>
            <option value="all">{t("finance.houseAccounts.filter.allTerms")}</option>
            {TERMS.map((tm) => <option key={tm} value={tm}>{tm}</option>)}
          </Select>
        </div>

        <div className="octo-scroll mt-3 overflow-x-auto">
          <table className="w-full min-w-[1080px] border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-[var(--octo-divider)] text-start">
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("finance.houseAccounts.col.account")}</th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("finance.houseAccounts.col.company")}</th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("finance.houseAccounts.col.contact")}</th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("finance.houseAccounts.col.creditLimit")}</th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("finance.houseAccounts.col.currentBalance")}</th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("finance.houseAccounts.col.availableCredit")}</th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("finance.houseAccounts.col.terms")}</th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("finance.houseAccounts.col.oldestInvoiceAge")}</th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t("finance.houseAccounts.col.status")}</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <tr key={row.id} className="cursor-pointer border-b border-[var(--octo-row-border)] last:border-0 hover:bg-[var(--octo-row-hover)]" onClick={() => setDrawerId(row.id)}>
                  <td className="whitespace-nowrap px-2 py-2.5 font-semibold text-[var(--octo-text-primary)]">{row.account}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{row.company}</td>
                  <td className="whitespace-nowrap px-2 py-2.5">
                    <div className="text-[var(--octo-text-primary)]">{row.contactName}</div>
                    <div className="text-[11px] text-[var(--octo-text-muted)]">{row.contactPhone}</div>
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{formatSAR(row.creditLimit)}</td>
                  <td className="whitespace-nowrap px-2 py-2.5">
                    <div className="font-medium text-[var(--octo-text-primary)]">{formatSAR(row.currentBalance)}</div>
                    <UtilisationBar limit={row.creditLimit} balance={row.currentBalance} />
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{formatSAR(row.availableCredit)}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{row.paymentTerms}</td>
                  <td className={`whitespace-nowrap px-2 py-2.5 font-medium ${row.oldestInvoiceAgeDays > 60 ? "text-[#dc2626]" : "text-[var(--octo-text-primary)]"}`}>
                    {row.status === "Closed" ? "—" : `${row.oldestInvoiceAgeDays} d`}
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
              title={t("finance.houseAccounts.emptyTitle")}
              description={t("finance.houseAccounts.emptyDescription")}
              action={<Button variant="secondary" size="sm" onClick={clearFilters}>{t("finance.payments.clearFilters")}</Button>}
            />
          )}
        </div>

        {filtered.length > 0 && (
          <div className="mt-3 flex items-center justify-between text-[11.5px] text-[var(--octo-text-muted)]">
            <span>
              {t("finance.houseAccounts.showing")
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

      <HouseAccountDrawer row={drawerRow} onClose={() => setDrawerId(null)} onRecordPayment={recordPayment} onAdjustLimit={adjustLimit} />
    </div>
  );
}

function AgingRow({ label, amount, max }: { label: string; amount: number; max: number }) {
  const pct = max > 0 ? (amount / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-[11px] text-[var(--octo-text-secondary)]">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--octo-track)]">
        <div className="h-full rounded-full bg-[#0D6EFD]" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-20 shrink-0 text-end text-[11px] font-medium text-[var(--octo-text-primary)]">{formatSAR(amount)}</span>
    </div>
  );
}

function HouseAccountDrawer({
  row,
  onClose,
  onRecordPayment,
  onAdjustLimit,
}: {
  row: HouseAccountRow | null;
  onClose: () => void;
  onRecordPayment: (id: string, amount: number) => void;
  onAdjustLimit: (id: string, newLimit: number) => void;
}) {
  const { t } = useI18n();
  const open = Boolean(row);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [limitOpen, setLimitOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ invoice: "", amount: "", method: "Bank Transfer", date: "" });
  const [limitForm, setLimitForm] = useState({ newLimit: "", reason: "" });

  useEffect(() => {
    setPaymentOpen(false);
    setLimitOpen(false);
    setPaymentForm({ invoice: row?.statement[0]?.invoiceDate ?? "", amount: "", method: "Bank Transfer", date: "" });
    setLimitForm({ newLimit: row ? String(row.creditLimit) : "", reason: "" });
  }, [row?.id]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape" && !paymentOpen && !limitOpen) onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, paymentOpen, limitOpen, onClose]);

  const maxBucket = row ? Math.max(row.aging.current, row.aging.d30, row.aging.d60, row.aging.d90plus, 1) : 1;

  return (
    <>
      <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
        <div className={`absolute inset-0 bg-black/30 transition-opacity ${open ? "opacity-100" : "opacity-0"}`} onClick={onClose} />
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("finance.houseAccounts.drawer.title")}
          className={`absolute inset-y-0 end-0 flex w-full flex-col bg-[var(--octo-card)] shadow-xl transition-transform duration-200 sm:w-[440px] ${open ? "translate-x-0" : "translate-x-full rtl:-translate-x-full"}`}
        >
          {row && (
            <>
              <div className="flex items-center justify-between border-b border-[var(--octo-divider)] px-[18px] py-[15px]">
                <h2 className="text-[15px] font-semibold text-[var(--octo-text-primary)]">{t("finance.houseAccounts.drawer.title")}</h2>
                <button type="button" aria-label={t("common.cancel")} onClick={onClose} className="grid h-7 w-7 place-items-center rounded-[7px] text-[var(--octo-text-muted)] transition-colors hover:bg-[var(--octo-hover)]">
                  <X size={15} />
                </button>
              </div>

              <div className="octo-scroll flex-1 overflow-y-auto px-[18px] py-[15px]">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-[16px] font-bold text-[var(--octo-text-primary)]">{row.company}</h3>
                  <Badge tone={STATUS_TONE[row.status]}>{t(STATUS_KEY[row.status])}</Badge>
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-[12px] text-[var(--octo-text-muted)]">
                  <Phone size={11} /> {row.contactName} · {row.contactPhone}
                </p>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-[12.5px]">
                  <div>
                    <dt className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{t("finance.houseAccounts.col.creditLimit")}</dt>
                    <dd className="mt-1 text-[var(--octo-text-primary)]">{formatSAR(row.creditLimit)}</dd>
                  </div>
                  <div>
                    <dt className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{t("finance.houseAccounts.col.availableCredit")}</dt>
                    <dd className="mt-1 text-[var(--octo-text-primary)]">{formatSAR(row.availableCredit)}</dd>
                  </div>
                </dl>

                <div className="mt-4">
                  <h4 className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{t("finance.houseAccounts.drawer.aging")}</h4>
                  <div className="mt-2 flex flex-col gap-2">
                    <AgingRow label={t("finance.houseAccounts.drawer.current")} amount={row.aging.current} max={maxBucket} />
                    <AgingRow label={t("finance.houseAccounts.drawer.d30")} amount={row.aging.d30} max={maxBucket} />
                    <AgingRow label={t("finance.houseAccounts.drawer.d60")} amount={row.aging.d60} max={maxBucket} />
                    <AgingRow label={t("finance.houseAccounts.drawer.d90plus")} amount={row.aging.d90plus} max={maxBucket} />
                  </div>
                </div>

                <div className="mt-4">
                  <h4 className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{t("finance.houseAccounts.drawer.statement")}</h4>
                  <div className="octo-scroll mt-2 max-h-[200px] overflow-y-auto rounded-[9px] border border-[var(--octo-divider)]">
                    <table className="w-full border-collapse text-[11.5px]">
                      <thead>
                        <tr className="border-b border-[var(--octo-divider)] bg-[var(--octo-row-hover)] text-start">
                          <th className="px-2 py-1.5 text-start font-semibold text-[var(--octo-text-faint)]">{t("finance.houseAccounts.drawer.invoiceDate")}</th>
                          <th className="px-2 py-1.5 text-start font-semibold text-[var(--octo-text-faint)]">{t("finance.payments.col.amount")}</th>
                          <th className="px-2 py-1.5 text-start font-semibold text-[var(--octo-text-faint)]">{t("finance.houseAccounts.drawer.dueDate")}</th>
                          <th className="px-2 py-1.5 text-start font-semibold text-[var(--octo-text-faint)]">{t("finance.houseAccounts.drawer.paid")}</th>
                          <th className="px-2 py-1.5 text-start font-semibold text-[var(--octo-text-faint)]">{t("finance.houseAccounts.drawer.balance")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {row.statement.map((line, i) => (
                          <tr key={i} className="border-b border-[var(--octo-row-border)] last:border-0">
                            <td className="whitespace-nowrap px-2 py-1.5 text-[var(--octo-text-muted)]">{line.invoiceDate}</td>
                            <td className="whitespace-nowrap px-2 py-1.5 text-[var(--octo-text-secondary)]">{formatSAR(line.amount)}</td>
                            <td className="whitespace-nowrap px-2 py-1.5 text-[var(--octo-text-muted)]">{line.dueDate}</td>
                            <td className="whitespace-nowrap px-2 py-1.5">
                              <Badge tone={line.paid ? "success" : "neutral"}>
                                {t(line.paid ? "finance.houseAccounts.drawer.paidYes" : "finance.houseAccounts.drawer.paidNo")}
                              </Badge>
                            </td>
                            <td className="whitespace-nowrap px-2 py-1.5 font-medium text-[var(--octo-text-primary)]">{formatSAR(line.balance)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 border-t border-[var(--octo-divider)] px-[18px] py-[15px]">
                <Button size="sm" disabled={row.status === "Closed"} onClick={() => setPaymentOpen(true)}>
                  {t("finance.houseAccounts.drawer.recordPayment")}
                </Button>
                <Button variant="secondary" size="sm" disabled={row.status === "Closed"} onClick={() => setLimitOpen(true)}>
                  {t("finance.houseAccounts.drawer.adjustLimit")}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      <Modal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        title={t("finance.houseAccounts.paymentModal.title")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPaymentOpen(false)}>{t("common.cancel")}</Button>
            <Button
              onClick={() => {
                if (!row) return;
                onRecordPayment(row.id, Number(paymentForm.amount) || 0);
                setPaymentOpen(false);
              }}
            >
              {t("finance.houseAccounts.paymentModal.confirm")}
            </Button>
          </>
        }
      >
        {row && (
          <div className="flex flex-col gap-3">
            <Select
              label={t("finance.houseAccounts.paymentModal.invoice")}
              value={paymentForm.invoice}
              onChange={(e) => setPaymentForm((f) => ({ ...f, invoice: e.target.value }))}
            >
              {row.statement.map((line) => (
                <option key={line.invoiceDate} value={line.invoiceDate}>{line.invoiceDate} · {formatSAR(line.amount)}</option>
              ))}
            </Select>
            <Input
              type="number"
              min={0}
              label={t("finance.houseAccounts.paymentModal.amount")}
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))}
            />
            <Select
              label={t("finance.houseAccounts.paymentModal.method")}
              value={paymentForm.method}
              onChange={(e) => setPaymentForm((f) => ({ ...f, method: e.target.value }))}
            >
              <option value="Bank Transfer">{t("finance.houseAccounts.paymentModal.methodBank")}</option>
              <option value="Cheque">{t("finance.houseAccounts.paymentModal.methodCheque")}</option>
              <option value="Cash">{t("finance.houseAccounts.paymentModal.methodCash")}</option>
            </Select>
            <Input
              type="date"
              label={t("finance.houseAccounts.paymentModal.date")}
              value={paymentForm.date}
              onChange={(e) => setPaymentForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>
        )}
      </Modal>

      <Modal
        open={limitOpen}
        onClose={() => setLimitOpen(false)}
        title={t("finance.houseAccounts.limitModal.title")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setLimitOpen(false)}>{t("common.cancel")}</Button>
            <Button
              onClick={() => {
                if (!row) return;
                onAdjustLimit(row.id, Number(limitForm.newLimit) || row.creditLimit);
                setLimitOpen(false);
              }}
            >
              {t("finance.houseAccounts.limitModal.confirm")}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Input
            type="number"
            min={0}
            label={t("finance.houseAccounts.limitModal.newLimit")}
            value={limitForm.newLimit}
            onChange={(e) => setLimitForm((f) => ({ ...f, newLimit: e.target.value }))}
          />
          <label className="flex flex-col gap-1.5">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
              {t("finance.houseAccounts.limitModal.reason")}
            </span>
            <textarea
              className="w-full rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-2 text-[12.5px] text-[var(--octo-text-primary)] placeholder:text-[var(--octo-text-faint)] focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/30 focus:border-[#0D6EFD]"
              rows={2}
              value={limitForm.reason}
              onChange={(e) => setLimitForm((f) => ({ ...f, reason: e.target.value }))}
            />
          </label>
        </div>
      </Modal>
    </>
  );
}
