// apps/merchant/src/pages/customers/index.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bookmark, MessageSquareMore, Plus, RotateCcw, Search, Users } from "lucide-react";
import { Button, EmptyState } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { customerStore, useCustomers, useSavedSegments } from "./_shared/customer-store";
import { CustomerStatCards } from "./_shared/stat-cards";
import { CustomerRow } from "./_shared/customer-row";
import { TagsFilterPopover, RangeFilterPopover } from "./_shared/filter-popover";
import { PaymentLinkModal } from "./_shared/payment-link-modal";
import { RowActionsMenu, type RowActionId } from "./_shared/row-actions-menu";
import { AddNoteModal } from "./_shared/add-note-modal";
import { AddTagModal } from "./_shared/add-tag-modal";
import { AddCustomerModal } from "./_shared/add-customer-modal";
import { BulkActionBar } from "./_shared/bulk-action-bar";
import { customersToCsv } from "./_shared/csv-export";
import { SendMessageWizard } from "./_shared/send-message-wizard";
import { SaveSegmentModal } from "./_shared/save-segment-modal";
import { EmptyCustomersIllustration } from "./_shared/empty-illustration";
import { EMPTY_LIST_FILTERS, hasActiveFilters, matchesListFilters, type ListFilters } from "./_shared/list-filter";
import { mergeCustomers } from "./_shared/merge";
import { Toast, useToast } from "./_shared/toast";
import { Pagination } from "@/pages/inventory/_shared/pagination";
import type { CustomerRecord } from "./_shared/types";

const PAGE_SIZE = 10;

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
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const customers = useCustomers();
  const segments = useSavedSegments();
  const [filters, setFiltersState] = useState<ListFilters>(EMPTY_LIST_FILTERS);
  const [page, setPage] = useState(1);
  const [paymentLinkFor, setPaymentLinkFor] = useState<CustomerRecord | null>(null);
  const [toast, showToast] = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [rowMenu, setRowMenu] = useState<{ anchor: HTMLElement; customer: CustomerRecord } | null>(null);
  const [noteFor, setNoteFor] = useState<CustomerRecord | null>(null);
  const [tagTarget, setTagTarget] = useState<{ ids: string[] } | null>(null);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [sendMessageOpen, setSendMessageOpen] = useState(false);
  const [saveSegmentOpen, setSaveSegmentOpen] = useState(false);

  // Any change to search/filters starts again from page 1.
  function setFilters(patch: Partial<ListFilters>) {
    setFiltersState((prev) => ({ ...prev, ...patch }));
    setPage(1);
  }

  function resetFilters() {
    setFiltersState(EMPTY_LIST_FILTERS);
    setPage(1);
  }

  const visibleRows = useMemo(() => customers.filter((c) => matchesListFilters(c, filters)), [customers, filters]);
  const isFiltered = hasActiveFilters(filters);

  // Selection only ever covers rows the current filters show — a row
  // hidden by a filter (or deleted) drops out, so a bulk action never
  // touches customers the merchant can't see.
  useEffect(() => {
    const visibleIds = new Set(visibleRows.map((c) => c.id));
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => visibleIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [visibleRows]);

  function handleRowAction(action: RowActionId, customer: CustomerRecord) {
    switch (action) {
      case "addNote":
        setNoteFor(customer);
        break;
      case "history":
        navigate(`/customers/${customer.id}`);
        break;
      case "sendWhatsapp":
        showToast(t("customers.rowAction.whatsappSent"));
        break;
      case "sendEmail":
        showToast(t("customers.rowAction.emailSent"));
        break;
      case "addTag":
        setTagTarget({ ids: [customer.id] });
        break;
      case "toggleBlock":
        customerStore.updateCustomer(customer.id, (c) => ({ isBlocked: !c.isBlocked }));
        showToast(t(customer.isBlocked ? "customers.rowAction.unblocked" : "customers.rowAction.blocked"));
        break;
      case "delete":
        if (window.confirm(t("customers.rowAction.deleteConfirm"))) {
          customerStore.setCustomers((prev) => prev.filter((c) => c.id !== customer.id));
          showToast(t("customers.rowAction.deleted"));
        }
        break;
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedCustomers = visibleRows.filter((c) => selectedIds.has(c.id));
  const countText = (key: string) => t(key).replace("{count}", String(selectedCustomers.length));

  function handleBulkDelete() {
    if (!window.confirm(countText("customers.bulk.deleteConfirm"))) return;
    showToast(countText("customers.bulk.deletedConfirm"));
    customerStore.setCustomers((prev) => prev.filter((c) => !selectedIds.has(c.id)));
    setSelectedIds(new Set());
  }

  function handleBulkMerge() {
    if (selectedCustomers.length < 2) {
      showToast(t("customers.bulk.mergeNeedsTwo"));
      return;
    }
    const merged = mergeCustomers(selectedCustomers);
    const removed = new Set(selectedCustomers.slice(1).map((c) => c.id));
    customerStore.setCustomers((prev) => prev.filter((c) => !removed.has(c.id)).map((c) => (c.id === merged.id ? merged : c)));
    setSelectedIds(new Set([merged.id]));
    showToast(countText("customers.bulk.mergedConfirm"));
  }

  function handleBulkExport() {
    downloadCsv(`customers-${new Date().toISOString().slice(0, 10)}.csv`, customersToCsv(selectedCustomers));
    showToast(countText("customers.bulk.exportedConfirm"));
  }

  const pageCount = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = visibleRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const isEmpty = customers.length === 0;

  return (
    <>
      <div className="px-4 pb-8 pt-4 sm:px-[26px] sm:pt-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[24px] font-bold leading-tight text-[var(--octo-text-primary)]">{t("customers.title")}</h1>
            <p className="mt-1.5 text-[14px] text-[var(--octo-text-muted)]">{t("customers.subtitle")}</p>
          </div>
          {!isEmpty && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSendMessageOpen(true)}
                className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-[#3B82F6] bg-[var(--octo-card)] px-3.5 text-[16px] font-semibold text-[#3B82F6] transition-colors hover:bg-[#3B82F6]/5"
              >
                <MessageSquareMore size={20} strokeWidth={1.75} className="rtl:-scale-x-100" />
                {t("customers.sendMessageCta")}
              </button>
              <button
                type="button"
                onClick={() => setAddCustomerOpen(true)}
                className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-[#3B82F6] px-4 text-[16px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                <Plus size={18} strokeWidth={2.25} />
                {t("customers.addCustomer.cta")}
              </button>
            </div>
          )}
        </header>

        <div className="mt-6">
          <CustomerStatCards isEmpty={isEmpty} />
        </div>

        {isEmpty ? (
          <div className="mt-24 flex flex-col items-center text-center">
            <EmptyCustomersIllustration className="text-[#CBD5E1]" />
            <h2 className="mt-8 text-[16px] font-semibold text-[var(--octo-text-primary)]">{t("customers.empty.title")}</h2>
            <p className="mt-1 text-[14px] text-[var(--octo-text-muted)]">{t("customers.empty.description")}</p>
            <button
              type="button"
              onClick={() => setAddCustomerOpen(true)}
              className="mt-5 inline-flex h-11 w-full max-w-[660px] items-center justify-center gap-2 rounded-[8px] bg-[#3B82F6] text-[16px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Plus size={18} strokeWidth={2.25} />
              {t("customers.empty.cta")}
            </button>
          </div>
        ) : (
          <>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px] flex-1">
                <Search size={20} strokeWidth={1.5} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[var(--octo-text-muted)]" />
                <input
                  value={filters.search}
                  onChange={(event) => setFilters({ search: event.target.value })}
                  placeholder={t("customers.searchPlaceholder")}
                  aria-label={t("customers.searchPlaceholder")}
                  className="h-10 w-full rounded-[8px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] pe-3 ps-10 text-[14px] text-[var(--octo-text-primary)] placeholder:text-[var(--octo-text-muted)] transition-colors focus:border-[#0D6EFD] focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/30"
                />
              </div>
              <TagsFilterPopover selected={filters.tags} onApply={(tags) => setFilters({ tags })} />
              <RangeFilterPopover label={t("customers.filter.visits")} kind="number" value={filters.visits} onApply={(visits) => setFilters({ visits })} />
              <RangeFilterPopover label={t("customers.filter.totalSpend")} kind="currency" value={filters.spend} onApply={(spend) => setFilters({ spend })} />
              <RangeFilterPopover label={t("customers.filter.lastVisit")} kind="date" value={filters.lastVisit} onApply={(lastVisit) => setFilters({ lastVisit })} />
              <button
                type="button"
                onClick={resetFilters}
                disabled={!isFiltered}
                className="inline-flex h-10 items-center gap-1.5 rounded-[8px] bg-[#3B82F6]/[0.06] px-3 text-[14px] font-medium text-[#3B82F6] transition-colors hover:bg-[#3B82F6]/10 disabled:cursor-default disabled:opacity-60"
              >
                <RotateCcw size={18} strokeWidth={1.75} />
                {t("customers.filter.reset")}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!isFiltered) showToast(t("customers.segment.needsFilter"));
                  else setSaveSegmentOpen(true);
                }}
                className="inline-flex h-10 items-center gap-1.5 rounded-[8px] border border-[#3B82F6] bg-[var(--octo-card)] px-3 text-[14px] font-medium text-[#3B82F6] transition-colors hover:bg-[#3B82F6]/5"
              >
                <Bookmark size={18} strokeWidth={1.75} />
                {t("customers.saveSegment")}
              </button>
            </div>

            {visibleRows.length === 0 ? (
              <EmptyState
                className="mt-8"
                icon={<Users size={18} />}
                title={t("customers.noMatch.title")}
                action={<Button variant="secondary" size="sm" onClick={resetFilters}>{t("customers.noMatch.cta")}</Button>}
              />
            ) : (
              <>
                {selectedCustomers.length > 0 && (
                  <BulkActionBar
                    count={selectedCustomers.length}
                    onClearSelection={() => setSelectedIds(new Set())}
                    onSendWhatsapp={() => showToast(countText("customers.bulk.whatsappSentConfirm"))}
                    onSendEmail={() => showToast(countText("customers.bulk.emailSentConfirm"))}
                    onPaymentLink={() => setPaymentLinkFor(selectedCustomers[0] ?? null)}
                    onAddTag={() => setTagTarget({ ids: selectedCustomers.map((c) => c.id) })}
                    onMerge={handleBulkMerge}
                    onExport={handleBulkExport}
                    onDelete={handleBulkDelete}
                  />
                )}

                <div className="mt-5 flex flex-col gap-4">
                  {pageRows.map((customer) => (
                    <CustomerRow
                      key={customer.id}
                      customer={customer}
                      selected={selectedIds.has(customer.id)}
                      onToggleSelect={() => toggleSelect(customer.id)}
                      onEdit={() => navigate(`/customers/${customer.id}`)}
                      onNewReservation={() => navigate("/reservations/new")}
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
      <Toast message={toast} />
      <PaymentLinkModal
        customer={paymentLinkFor}
        onClose={() => setPaymentLinkFor(null)}
        onSent={() => showToast(t("customers.paymentLink.sentConfirm"))}
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
          customerStore.updateCustomer(noteFor.id, (c) => ({ notes: [...c.notes, { date: new Date().toISOString().slice(0, 10), text }] }));
          showToast(t("customers.addNote.savedConfirm"));
        }}
      />
      <AddTagModal
        open={tagTarget !== null}
        onClose={() => setTagTarget(null)}
        onSave={(tag) => {
          if (!tagTarget) return;
          customerStore.setCustomers((prev) =>
            prev.map((c) => (tagTarget.ids.includes(c.id) && !c.tags.includes(tag) ? { ...c, tags: [...c.tags, tag] } : c))
          );
          showToast(t("customers.addTag.savedConfirm").replace("{tag}", tag));
        }}
      />
      <AddCustomerModal
        open={addCustomerOpen}
        onClose={() => setAddCustomerOpen(false)}
        onCreate={(customer) => {
          customerStore.setCustomers((prev) => [customer, ...prev]);
          showToast(t("customers.addCustomer.createdConfirm"));
        }}
      />
      <SaveSegmentModal
        open={saveSegmentOpen}
        defaultName={t("customers.segment.defaultName").replace("{n}", String(segments.length + 1))}
        onClose={() => setSaveSegmentOpen(false)}
        onSave={(name) => {
          customerStore.addSegment(name, filters);
          showToast(t("customers.segment.savedConfirm").replace("{name}", name));
        }}
      />
      <SendMessageWizard
        open={sendMessageOpen}
        customers={customers}
        segments={segments}
        onClose={() => setSendMessageOpen(false)}
        onSent={(count, timing) => {
          const n = count.toLocaleString("en-US");
          if (timing.kind === "later") {
            const at = new Date(timing.at).toLocaleString(locale === "ar" ? "ar-SA" : "en-GB", { dateStyle: "medium", timeStyle: "short" });
            showToast(t("customers.sendMessage.scheduledConfirm").replace("{count}", n).replace("{at}", at));
          } else if (timing.kind === "batches") {
            showToast(t("customers.sendMessage.batchedConfirm").replace("{count}", n).replace("{size}", String(timing.batchSize)));
          } else {
            showToast(t("customers.sendMessage.sentConfirm").replace("{count}", n));
          }
        }}
      />
    </>
  );
}
