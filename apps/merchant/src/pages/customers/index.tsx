// apps/merchant/src/pages/customers/index.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users } from "lucide-react";
import { Button, EmptyState } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { ShellIcon } from "@/shared/ui/shell-icon";
import { customerActions, useCustomers, useCustomerSync, useSavedSegments } from "./_shared/customer-store";
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
import { actionErrorKey } from "./_shared/crm-api";
import { Toast, useToast } from "./_shared/toast";
import { Pagination } from "@/pages/inventory/_shared/pagination";
import type { CustomerRecord } from "./_shared/types";

const PAGE_SIZE = 10;

// The frames' 48px header / empty-state buttons.
const BIG_BUTTON = "inline-flex h-12 items-center justify-center gap-1 whitespace-nowrap rounded-[8px] px-3 text-[18px] font-bold leading-[18px]";
const BIG_PRIMARY = `${BIG_BUTTON} bg-[#0d6efd] text-white transition-opacity hover:opacity-90`;
const BIG_OUTLINE = `${BIG_BUTTON} border border-[#0d6efd] text-[#0d6efd] transition-colors hover:bg-[#0d6efd]/5`;
// The toolbar's 40px Reset / Save Segment buttons.
const TOOL_BUTTON = "inline-flex h-10 items-center gap-1 whitespace-nowrap rounded-[8px] text-[14px] font-medium leading-[14px] text-[#0d6efd] transition-colors";

const IMPORT_CSV_KEY = "customers.importCsv";

/** "Import CSV" is drawn in the frames but has no import endpoint yet, so the
 *  button is inert. The label falls back to English until the key is added
 *  to the locale files. */
function ImportCsvButton({ className }: { className?: string }) {
  const { t } = useI18n();
  const translated = t(IMPORT_CSV_KEY);
  return (
    <button type="button" disabled className={`${BIG_OUTLINE} cursor-not-allowed ${className ?? ""}`}>
      <ShellIcon name="crm-import.svg" size={24} />
      {translated === IMPORT_CSV_KEY ? "Import CSV" : translated}
    </button>
  );
}

function downloadFile(filename: string, blob: Blob) {
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
  useCustomerSync();
  const customers = useCustomers();
  const segments = useSavedSegments();
  const [filters, setFiltersState] = useState<ListFilters>(EMPTY_LIST_FILTERS);
  const [page, setPage] = useState(1);
  const [paymentLinkFor, setPaymentLinkFor] = useState<CustomerRecord | null>(null);
  const [toast, showToast, toastTone] = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [rowMenu, setRowMenu] = useState<{ anchor: HTMLElement; customer: CustomerRecord } | null>(null);
  const [noteFor, setNoteFor] = useState<CustomerRecord | null>(null);
  const [tagTarget, setTagTarget] = useState<{ ids: string[] } | null>(null);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [sendMessageOpen, setSendMessageOpen] = useState(false);
  const [saveSegmentOpen, setSaveSegmentOpen] = useState(false);

  /** Runs a store action and confirms it, or says why the server refused it. */
  function run(action: Promise<unknown>, confirmation: string) {
    action.then(
      () => showToast(confirmation),
      (err: unknown) => showToast(t(actionErrorKey(err)), "error")
    );
  }

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
        run(customerActions.toggleBlocked(customer.id), t(customer.isBlocked ? "customers.rowAction.unblocked" : "customers.rowAction.blocked"));
        break;
      case "delete":
        if (window.confirm(t("customers.rowAction.deleteConfirm"))) {
          run(customerActions.remove([customer.id]), t("customers.rowAction.deleted"));
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
    run(customerActions.remove(selectedCustomers.map((c) => c.id)), countText("customers.bulk.deletedConfirm"));
  }

  function handleBulkMerge() {
    if (selectedCustomers.length < 2) {
      showToast(t("customers.bulk.mergeNeedsTwo"));
      return;
    }
    run(customerActions.merge(selectedCustomers), countText("customers.bulk.mergedConfirm"));
  }

  function handleBulkExport() {
    const confirmation = countText("customers.bulk.exportedConfirm");
    const selected = selectedCustomers;
    customerActions.exportCustomers(selected.map((c) => c.id)).then(
      (file) => {
        if (file) downloadFile(file.fileName, file.blob);
        else downloadFile(`customers-${new Date().toISOString().slice(0, 10)}.csv`, new Blob([customersToCsv(selected)], { type: "text/csv;charset=utf-8;" }));
        showToast(confirmation);
      },
      (err: unknown) => showToast(t(actionErrorKey(err)), "error")
    );
  }

  const pageCount = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = visibleRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const isEmpty = customers.length === 0;

  return (
    <>
      <div className="px-4 pb-10 pt-6 sm:px-6 lg:ps-12 lg:pt-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-3">
            <h1 className="text-[24px] font-bold leading-[24px] text-[var(--octo-text-primary)]">{t("customers.title")}</h1>
            <p className="text-[14px] font-medium leading-[14px] text-[var(--octo-text-secondary)]">{t("customers.subtitle")}</p>
          </div>
          {!isEmpty && (
            <div className="flex flex-wrap items-center justify-end gap-4">
              <button
                type="button"
                onClick={() => setSendMessageOpen(true)}
                className={`${BIG_BUTTON} border border-[#cbd5e1] text-[var(--octo-text-primary)] transition-colors hover:bg-[var(--octo-hover)] [[data-theme=dark]_&]:border-[var(--octo-border-input)]`}
              >
                <ShellIcon name="crm-message-add.svg" size={24} className="rtl:-scale-x-100" />
                {t("customers.sendMessageCta")}
              </button>
              <ImportCsvButton />
              <button type="button" onClick={() => setAddCustomerOpen(true)} className={BIG_PRIMARY}>
                <ShellIcon name="crm-plus.svg" size={24} />
                {t("customers.addCustomer.cta")}
              </button>
            </div>
          )}
        </header>

        <div className="mt-8">
          <CustomerStatCards isEmpty={isEmpty} />
        </div>

        {isEmpty ? (
          <div className="mx-auto mt-[75px] flex w-full max-w-[686px] flex-col items-center gap-6 text-center">
            <EmptyCustomersIllustration className="text-[#cbd5e1] [[data-theme=dark]_&]:text-[var(--octo-border-input)]" />
            <div className="flex flex-col gap-2">
              <h2 className="text-[16px] font-bold leading-[16px] text-[var(--octo-text-primary)]">{t("customers.empty.title")}</h2>
              <p className="text-[14px] font-medium leading-[1.3] text-[var(--octo-text-secondary)] sm:leading-[14px]">{t("customers.empty.description")}</p>
            </div>
            <div className="flex w-full flex-col gap-3">
              <button type="button" onClick={() => setAddCustomerOpen(true)} className={`${BIG_PRIMARY} w-full`}>
                <ShellIcon name="crm-plus.svg" size={24} />
                {t("customers.empty.cta")}
              </button>
              <ImportCsvButton className="w-full" />
            </div>
          </div>
        ) : (
          <>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <label className="flex h-10 min-w-[200px] flex-1 items-center gap-2 rounded-[12px] border border-[#e2e8f0] bg-[var(--octo-card)] px-4 transition-colors focus-within:border-[#0d6efd] focus-within:ring-2 focus-within:ring-[#0d6efd]/30 [[data-theme=dark]_&]:border-[var(--octo-border-input)]">
                <ShellIcon name="crm-search.svg" size={24} className="text-[var(--octo-text-secondary)]" />
                <input
                  value={filters.search}
                  onChange={(event) => setFilters({ search: event.target.value })}
                  placeholder={t("customers.searchPlaceholder")}
                  aria-label={t("customers.searchPlaceholder")}
                  className="h-full min-w-0 flex-1 bg-transparent text-[14px] font-medium text-[var(--octo-text-primary)] placeholder:text-[var(--octo-text-secondary)] focus:outline-none"
                />
              </label>
              <TagsFilterPopover selected={filters.tags} onApply={(tags) => setFilters({ tags })} />
              <RangeFilterPopover label={t("customers.filter.visits")} kind="number" value={filters.visits} onApply={(visits) => setFilters({ visits })} />
              <RangeFilterPopover label={t("customers.filter.totalSpend")} kind="currency" value={filters.spend} onApply={(spend) => setFilters({ spend })} />
              <RangeFilterPopover label={t("customers.filter.lastVisit")} kind="date" value={filters.lastVisit} onApply={(lastVisit) => setFilters({ lastVisit })} />
              <button
                type="button"
                onClick={resetFilters}
                disabled={!isFiltered}
                className={`${TOOL_BUTTON} bg-[#f5f9ff] px-2 hover:bg-[#e9f1ff] disabled:cursor-default disabled:hover:bg-[#f5f9ff] [[data-theme=dark]_&]:bg-[#0d6efd]/10 [[data-theme=dark]_&]:hover:bg-[#0d6efd]/20 [[data-theme=dark]_&]:disabled:hover:bg-[#0d6efd]/10`}
              >
                <span className="grid h-6 w-6 place-items-center">
                  <ShellIcon name="crm-reset.svg" size={20} />
                </span>
                {t("customers.filter.reset")}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!isFiltered) showToast(t("customers.segment.needsFilter"));
                  else setSaveSegmentOpen(true);
                }}
                className={`${TOOL_BUTTON} border border-[#0d6efd] px-[7px] hover:bg-[#0d6efd]/5`}
              >
                <ShellIcon name="crm-archive-minus.svg" size={24} />
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

                <div className="mt-6 flex flex-col gap-3">
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
      <Toast message={toast} tone={toastTone} />
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
          run(customerActions.addNote(noteFor.id, text), t("customers.addNote.savedConfirm"));
        }}
      />
      <AddTagModal
        open={tagTarget !== null}
        onClose={() => setTagTarget(null)}
        onSave={(tag) => {
          if (!tagTarget) return;
          run(customerActions.addTag(tagTarget.ids, tag), t("customers.addTag.savedConfirm").replace("{tag}", tag));
        }}
      />
      <AddCustomerModal
        open={addCustomerOpen}
        onClose={() => setAddCustomerOpen(false)}
        onCreate={(customer) => {
          run(customerActions.create(customer), t("customers.addCustomer.createdConfirm"));
        }}
      />
      <SaveSegmentModal
        open={saveSegmentOpen}
        defaultName={t("customers.segment.defaultName").replace("{n}", String(segments.length + 1))}
        onClose={() => setSaveSegmentOpen(false)}
        onSave={(name) => {
          run(customerActions.saveSegment(name, filters), t("customers.segment.savedConfirm").replace("{name}", name));
        }}
      />
      <SendMessageWizard
        open={sendMessageOpen}
        customers={customers}
        segments={segments}
        onClose={() => setSendMessageOpen(false)}
        onError={(err) => showToast(t(actionErrorKey(err)), "error")}
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
