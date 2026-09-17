// apps/merchant/src/pages/customers/index.tsx
import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { Button, EmptyState } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { customerRecords } from "./_shared/mock-data";
import { customerName } from "./_shared/format";
import { CustomerStatCards } from "./_shared/stat-cards";
import { CustomerRow } from "./_shared/customer-row";
import { TagsFilterPopover, RangeFilterPopover, type RangeValue } from "./_shared/filter-popover";
import { PaymentLinkModal } from "./_shared/payment-link-modal";
import { RowActionsMenu, type RowActionId } from "./_shared/row-actions-menu";
import { AddNoteModal } from "./_shared/add-note-modal";
import { AddTagModal } from "./_shared/add-tag-modal";
import { BulkActionBar } from "./_shared/bulk-action-bar";
import { customersToCsv } from "./_shared/csv-export";
import { Pagination } from "@/pages/inventory/_shared/pagination";
import type { CustomerRecord, CustomerTag } from "./_shared/types";

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  // Firefox requires the anchor to be in the DOM for `.click()` to trigger
  // a download, and revoking the object URL synchronously can cancel the
  // download before it starts in some browsers — so append, click, remove,
  // then defer the revoke.
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function CustomersPage() {
  const { t } = useI18n();
  const [customers, setCustomers] = useState<CustomerRecord[]>(() => [...customerRecords]);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<CustomerTag[]>([]);
  const [visitsRange, setVisitsRange] = useState<RangeValue>({ from: "", to: "" });
  const [spendRange, setSpendRange] = useState<RangeValue>({ from: "", to: "" });
  const [lastVisitRange, setLastVisitRange] = useState<RangeValue>({ from: "", to: "" });
  const [paymentLinkFor, setPaymentLinkFor] = useState<CustomerRecord | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [rowMenu, setRowMenu] = useState<{ anchor: HTMLElement; customer: CustomerRecord } | null>(null);
  const [noteFor, setNoteFor] = useState<CustomerRecord | null>(null);
  const [tagTarget, setTagTarget] = useState<{ ids: string[] } | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return customers.filter((c) => {
      if (query && !(customerName(c).toLowerCase().includes(query) || c.phone.includes(query) || c.email.toLowerCase().includes(query))) return false;
      if (tagFilter.length > 0 && !tagFilter.some((tag) => c.tags.includes(tag))) return false;
      if (visitsRange.from && c.visits < Number(visitsRange.from)) return false;
      if (visitsRange.to && c.visits > Number(visitsRange.to)) return false;
      if (spendRange.from && c.totalSpendSar < Number(spendRange.from)) return false;
      if (spendRange.to && c.totalSpendSar > Number(spendRange.to)) return false;
      if (lastVisitRange.from && c.lastVisit < lastVisitRange.from) return false;
      if (lastVisitRange.to && c.lastVisit > lastVisitRange.to) return false;
      return true;
    });
  }, [customers, search, tagFilter, visitsRange, spendRange, lastVisitRange]);

  const isFiltered = tagFilter.length > 0 || visitsRange.from !== "" || visitsRange.to !== "" || spendRange.from !== "" || spendRange.to !== "" || lastVisitRange.from !== "" || lastVisitRange.to !== "" || search.trim() !== "";

  function resetFilters() {
    setSearch("");
    setTagFilter([]);
    setVisitsRange({ from: "", to: "" });
    setSpendRange({ from: "", to: "" });
    setLastVisitRange({ from: "", to: "" });
  }

  function updateCustomer(id: string, patch: Partial<CustomerRecord> | ((c: CustomerRecord) => Partial<CustomerRecord>)) {
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...(typeof patch === "function" ? patch(c) : patch) } : c)));
  }

  function handleRowAction(action: RowActionId, customer: CustomerRecord) {
    switch (action) {
      case "addNote":
        setNoteFor(customer);
        break;
      case "history":
        setToast(t("customers.rowAction.historyComingSoon"));
        break;
      case "sendWhatsapp":
        setToast(t("customers.rowAction.whatsappSent"));
        break;
      case "sendEmail":
        setToast(t("customers.rowAction.emailSent"));
        break;
      case "addTag":
        setTagTarget({ ids: [customer.id] });
        break;
      case "toggleBlock":
        updateCustomer(customer.id, (c) => ({ isBlocked: !c.isBlocked }));
        setToast(t(customer.isBlocked ? "customers.rowAction.unblocked" : "customers.rowAction.blocked"));
        break;
      case "delete":
        if (window.confirm(t("customers.rowAction.deleteConfirm"))) {
          setCustomers((prev) => prev.filter((c) => c.id !== customer.id));
          setSelectedIds((prev) => { const next = new Set(prev); next.delete(customer.id); return next; });
        }
        break;
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const selectedCustomers = customers.filter((c) => selectedIds.has(c.id));

  function handleBulkDelete() {
    if (!window.confirm(t("customers.bulk.deleteConfirm").replace("{count}", String(selectedIds.size)))) return;
    setToast(t("customers.bulk.deletedConfirm").replace("{count}", String(selectedIds.size)));
    setCustomers((prev) => prev.filter((c) => !selectedIds.has(c.id)));
    setSelectedIds(new Set());
  }

  function handleBulkExport() {
    downloadCsv(`customers-${new Date().toISOString().slice(0, 10)}.csv`, customersToCsv(selectedCustomers));
  }

  const pageCount = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = visibleRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <>
      <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">{t("customers.title")}</h1>
            <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">{t("customers.subtitle")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm">{t("customers.sendMessageCta")}</Button>
            <Button variant="primary" size="sm">{t("customers.addCustomer.cta")}</Button>
          </div>
        </header>

        <div className="mt-4">
          <CustomerStatCards />
        </div>

        {customers.length === 0 ? (
          <EmptyState
            className="mt-8"
            icon={<Users size={18} />}
            title={t("customers.empty.title")}
            description={t("customers.empty.description")}
            action={<Button variant="primary">{t("customers.empty.cta")}</Button>}
          />
        ) : (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div className="relative min-w-[220px] flex-1">
                <Search size={13} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[var(--octo-text-muted)]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t("customers.searchPlaceholder")}
                  className="w-full rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] py-2 ps-8 pe-3 text-[12.5px] text-[var(--octo-text-primary)] placeholder:text-[var(--octo-text-faint)] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/30 focus:border-[#0D6EFD]"
                />
              </div>
              <TagsFilterPopover selected={tagFilter} onApply={(tags) => setTagFilter([...tags])} />
              <RangeFilterPopover label={t("customers.filter.visits")} kind="number" value={visitsRange} onApply={setVisitsRange} />
              <RangeFilterPopover label={t("customers.filter.totalSpend")} kind="currency" value={spendRange} onApply={setSpendRange} />
              <RangeFilterPopover label={t("customers.filter.lastVisit")} kind="date" value={lastVisitRange} onApply={setLastVisitRange} />
              {isFiltered && (
                <button type="button" onClick={resetFilters} className="rounded-[9px] px-3 py-2 text-[12px] font-medium text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)]">
                  {t("customers.filter.reset")}
                </button>
              )}
              <button
                type="button"
                onClick={() => setToast(t("customers.saveSegment"))}
                className="ms-auto inline-flex items-center gap-1.5 rounded-[9px] border border-[var(--octo-border-input)] px-3 py-2 text-[12px] font-medium text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)]"
              >
                {t("customers.saveSegment")}
              </button>
            </div>

            {toast && (
              <div className="mt-2 rounded-[9px] bg-[#22C55E]/10 px-3 py-2 text-[11.5px] font-medium text-[#16a34a]">{toast}</div>
            )}

            {visibleRows.length === 0 ? (
              <EmptyState
                className="mt-8"
                icon={<Users size={18} />}
                title={t("customers.noMatch.title")}
                action={<Button variant="secondary" size="sm" onClick={resetFilters}>{t("customers.noMatch.cta")}</Button>}
              />
            ) : (
              <>
                {selectedIds.size > 0 && (
                  <BulkActionBar
                    count={selectedIds.size}
                    onSendWhatsapp={() => setToast(t("customers.bulk.whatsappSentConfirm").replace("{count}", String(selectedIds.size)))}
                    onSendEmail={() => setToast(t("customers.bulk.emailSentConfirm").replace("{count}", String(selectedIds.size)))}
                    onPaymentLink={() => setPaymentLinkFor(selectedCustomers[0] ?? null)}
                    onAddTag={() => setTagTarget({ ids: [...selectedIds] })}
                    onMerge={() => setToast(t("customers.bulk.mergedConfirm"))}
                    onExport={handleBulkExport}
                    onDelete={handleBulkDelete}
                  />
                )}

                <div className="mt-3 flex flex-col gap-2.5">
                  {pageRows.map((customer) => (
                    <CustomerRow
                      key={customer.id}
                      customer={customer}
                      selected={selectedIds.has(customer.id)}
                      onToggleSelect={() => toggleSelect(customer.id)}
                      onEdit={() => {}}
                      onNewReservation={() => {}}
                      onOpenPaymentLink={() => setPaymentLinkFor(customer)}
                      onOpenRowActions={(anchor) => setRowMenu({ anchor, customer })}
                    />
                  ))}
                </div>

                <Pagination
                  page={currentPage}
                  pageCount={pageCount}
                  total={visibleRows.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={setPage}
                  showingLabel={t("customers.showing")}
                />
              </>
            )}
          </>
        )}
      </div>
      <PaymentLinkModal
        customer={paymentLinkFor}
        onClose={() => setPaymentLinkFor(null)}
        onSent={() => setToast(t("customers.paymentLink.sentConfirm"))}
      />
      {rowMenu && (
        <RowActionsMenu
          anchor={rowMenu.anchor}
          customer={rowMenu.customer}
          onAction={(action) => handleRowAction(action, rowMenu.customer)}
          onClose={() => setRowMenu(null)}
        />
      )}
      <AddNoteModal
        open={noteFor !== null}
        onClose={() => setNoteFor(null)}
        onSave={(text) => {
          if (!noteFor) return;
          updateCustomer(noteFor.id, (c) => ({ notes: [...c.notes, { date: new Date().toISOString().slice(0, 10), text }] }));
        }}
      />
      <AddTagModal
        open={tagTarget !== null}
        onClose={() => setTagTarget(null)}
        onSave={(tag) => {
          if (!tagTarget) return;
          setCustomers((prev) =>
            prev.map((c) => (tagTarget.ids.includes(c.id) && !c.tags.includes(tag) ? { ...c, tags: [...c.tags, tag] } : c))
          );
        }}
      />
    </>
  );
}
