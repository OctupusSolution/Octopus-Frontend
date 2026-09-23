// apps/merchant/src/pages/orders-list/index.tsx
import { useMemo, useState } from "react";
import { CalendarDays, Download, Plus, Search, Settings } from "lucide-react";
import type { DuplicateOrderTemplateResponse } from "@octopus/api-client";
import { mapRealOrderToRecord, mapRealOrdersToRecords, OrderErrorNote, useOrderText, useRealOrders } from "@/entities/order";
import { NewOrderModal } from "@/features/order/take-order";
import { OrderSettingsModal } from "@/features/order/order-settings";
import { useI18n } from "@/app/providers/i18n-provider";
import { computeOrderStats, pillCount } from "./_shared/stats";
import { OrdersStatCards } from "./_shared/stat-cards";
import { OrderFilterPills } from "./_shared/filter-pills";
import { SourceFilterPopover } from "./_shared/source-filter-popover";
import { OrderCard, OrderRowCard } from "./_shared/order-row";
import { EmptyOrdersArt } from "./_shared/empty-orders-art";
import { Pagination } from "@/pages/inventory/_shared/pagination";
import { ordersToCsv } from "./_shared/csv-export";
import { OrderDetailsModal } from "./_shared/order-details-modal";
import { CancelOrderFlow } from "./_shared/cancel-order-flow";
import { VoidOrderFlow } from "./_shared/void-order-flow";
import { WastageOrderFlow } from "./_shared/wastage-order-flow";
import { RefundOrderFlow } from "./_shared/refund-order-flow";
import { RecordPaymentFlow } from "./_shared/record-payment-flow";
import type { OrderAction } from "./_shared/theme";
import type { OrderRecord, OrderSource, OrderState } from "./_shared/types";

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

const PAGE_SIZE = 10;

export function OrdersListPage() {
  const { t } = useI18n();
  const { tx } = useOrderText();
  const {
    orders: realOrders,
    refresh: refreshRealOrders,
    loading: ordersLoading,
    error: ordersError,
    unavailable: ordersUnavailable,
  } = useRealOrders();
  const [newOrderOpen, setNewOrderOpen] = useState(false);
  const [reorderTemplate, setReorderTemplate] = useState<DuplicateOrderTemplateResponse | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<OrderState | null>(null);
  const [selectedSources, setSelectedSources] = useState<readonly OrderSource[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [detailsOrder, setDetailsOrder] = useState<OrderRecord | null>(null);
  const [pendingAction, setPendingAction] = useState<{ action: OrderAction; order: OrderRecord } | null>(null);

  // Real orders only (US-018, AdminApi): today's plus every one still open.
  // The seeded demo rows and the mock-api "live" customer orders are gone
  // now that the real module feeds this page.
  const allRecords = useMemo(() => mapRealOrdersToRecords(realOrders), [realOrders]);
  // The detail modal follows the polled list, so it never shows a stale version.
  const openDetails = useMemo(() => {
    const realId = detailsOrder?.real?.orderId;
    if (!realId) return detailsOrder;
    return allRecords.find((record) => record.real?.orderId === realId) ?? detailsOrder;
  }, [detailsOrder, allRecords]);

  const visibleRows = useMemo(() => {
    return allRecords.filter((order) => {
      if (selectedState && order.state !== selectedState) return false;
      if (selectedSources.length > 0 && !selectedSources.includes(order.source)) return false;
      if (search.trim()) {
        const query = search.trim().toLowerCase();
        if (!order.id.toLowerCase().includes(query) && !(order.table ?? "").toLowerCase().includes(query)) return false;
      }
      return true;
    });
  }, [allRecords, selectedState, selectedSources, search]);

  const stats = useMemo(() => computeOrderStats(allRecords), [allRecords]);
  const isFiltered = selectedState !== null || selectedSources.length > 0 || search.trim() !== "";
  // With nothing in the book at all, orders.png drops the filter bar and the
  // search row entirely and shows only the illustration.
  const hasNoOrdersAtAll = allRecords.length === 0;

  const pageCount = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = visibleRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function resetFilters() {
    setSelectedState(null);
    setSelectedSources([]);
    setSearch("");
    setPage(1);
  }

  function handleExport() {
    // The export follows the active filters, not just the visible page —
    // exporting is expected to cover everything the filters matched.
    downloadCsv(`orders-${new Date().toISOString().slice(0, 10)}.csv`, ordersToCsv(visibleRows));
  }

  return (
    <>
      <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[25px]">
              {t("orders.title")}
            </h1>
            <p className="mt-1 text-[12.5px] text-[var(--octo-text-muted)] sm:text-[13px]">{t("orders.subtitle")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-2 rounded-[9px] bg-[var(--octo-hover)] px-3 py-[8px] text-[12.5px] font-medium text-[var(--octo-text-secondary)]">
              <CalendarDays size={15} className="text-[var(--octo-text-muted)]" />
              {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
            </span>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-2 rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-[7px] text-[12.5px] font-medium text-[var(--octo-text-primary)] transition-colors hover:bg-[var(--octo-hover)]"
            >
              <Settings size={15} className="text-[var(--octo-text-muted)]" />
              {tx("page.settings")}
            </button>
            <button
              type="button"
              disabled={ordersUnavailable}
              onClick={() => {
                setReorderTemplate(null);
                setNewOrderOpen(true);
              }}
              className="flex items-center gap-2 rounded-[9px] bg-[#0D6EFD] px-3.5 py-[8px] text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={15} />
              {tx("page.newOrder")}
            </button>
          </div>
        </header>

        {ordersUnavailable ? (
          <OrderErrorNote message={tx("page.unavailable")} />
        ) : (
          ordersError && <OrderErrorNote message={tx("page.loadFailed").replace("{message}", ordersError)} />
        )}

        <div className="mt-4">
          <OrdersStatCards stats={stats} />
        </div>

        {ordersLoading && hasNoOrdersAtAll ? (
          <p className="py-16 text-center text-[13px] text-[var(--octo-text-muted)]">{tx("common.loading")}</p>
        ) : hasNoOrdersAtAll ? (
          <div className="flex flex-col items-center px-4 py-16 text-center">
            <EmptyOrdersArt className="h-[168px] w-[196px] text-[var(--octo-crumb)]" />
            <h2 className="mt-6 text-[17px] font-bold text-[var(--octo-text-primary)]">{t("orders.empty.title")}</h2>
            <p className="mt-2 max-w-[440px] text-[13px] text-[var(--octo-text-muted)]">
              {t("orders.empty.description")}
            </p>
          </div>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <SourceFilterPopover
                selected={selectedSources}
                onChange={(sources) => {
                  setSelectedSources(sources);
                  setPage(1);
                }}
              />
              <OrderFilterPills
                selected={selectedState}
                onSelect={(state) => {
                  setSelectedState(state);
                  setPage(1);
                }}
                countAll={allRecords.length}
                countByState={(state) => pillCount(allRecords, state)}
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px] flex-1">
                <Search size={15} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-[var(--octo-text-faint)]" />
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder={t("orders.search.placeholder")}
                  className="w-full rounded-[10px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] py-[9px] ps-10 pe-3 text-[13px] text-[var(--octo-text-primary)] placeholder:text-[var(--octo-text-faint)] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/30 focus:border-[#0D6EFD]"
                />
              </div>
              <button
                type="button"
                onClick={handleExport}
                className="flex items-center gap-2 rounded-[10px] bg-[#0D6EFD] px-4 py-[9px] text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                <Download size={15} />
                {t("orders.export")}
              </button>
            </div>

            {visibleRows.length === 0 ? (
              <div className="flex flex-col items-center px-4 py-14 text-center">
                <EmptyOrdersArt className="h-[132px] w-[154px] text-[var(--octo-crumb)]" />
                <h2 className="mt-5 text-[15px] font-semibold text-[var(--octo-text-primary)]">
                  {t("orders.filter.empty")}
                </h2>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-4 rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3.5 py-[8px] text-[12.5px] font-medium text-[var(--octo-text-primary)] transition-colors hover:bg-[var(--octo-hover)]"
                >
                  {t("orders.filter.reset")}
                </button>
              </div>
            ) : (
              <>
                {/* Mobile: the same card, collapsed to a tap-to-expand summary */}
                <div className="mt-3 flex flex-col gap-2.5 lg:hidden">
                  {pageRows.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      expanded={expandedId === order.id}
                      onToggle={() => setExpandedId(expandedId === order.id ? null : order.id)}
                      onOpenDetails={setDetailsOrder}
                      onAction={(action, target) => setPendingAction({ action, order: target })}
                    />
                  ))}
                </div>

                {/* Desktop: the full five-column row card */}
                <div className="octo-scroll mt-3 hidden overflow-x-auto lg:block">
                  <div className="flex min-w-[1120px] flex-col gap-2.5">
                    {pageRows.map((order) => (
                      <OrderRowCard
                        key={order.id}
                        order={order}
                        onOpenDetails={setDetailsOrder}
                        onAction={(action, target) => setPendingAction({ action, order: target })}
                      />
                    ))}
                  </div>
                </div>

                <Pagination
                  page={currentPage}
                  pageCount={pageCount}
                  total={visibleRows.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={setPage}
                  showingLabel={t("orders.showing")}
                />
              </>
            )}
          </>
        )}
      </div>

      <OrderDetailsModal
        order={openDetails}
        onClose={() => setDetailsOrder(null)}
        onAction={(action, order) => {
          setDetailsOrder(null);
          setPendingAction({ action, order });
        }}
        onChanged={refreshRealOrders}
        onReorder={(template) => {
          setDetailsOrder(null);
          setReorderTemplate(template);
          setNewOrderOpen(true);
        }}
      />

      <NewOrderModal
        open={newOrderOpen}
        template={reorderTemplate}
        onClose={() => setNewOrderOpen(false)}
        onCreated={(order) => {
          setNewOrderOpen(false);
          setReorderTemplate(null);
          refreshRealOrders();
          setDetailsOrder(mapRealOrderToRecord(order));
        }}
      />
      <OrderSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <CancelOrderFlow
        order={pendingAction?.action === "cancel" ? pendingAction.order : null}
        onClose={() => setPendingAction(null)}
        onSuccess={refreshRealOrders}
      />
      <VoidOrderFlow
        order={pendingAction?.action === "void" ? pendingAction.order : null}
        onClose={() => setPendingAction(null)}
        onSuccess={refreshRealOrders}
      />
      <WastageOrderFlow
        order={pendingAction?.action === "wastage" ? pendingAction.order : null}
        onClose={() => setPendingAction(null)}
        onSuccess={refreshRealOrders}
      />
      <RefundOrderFlow
        order={pendingAction?.action === "refund" ? pendingAction.order : null}
        onClose={() => setPendingAction(null)}
        onSuccess={refreshRealOrders}
      />
      <RecordPaymentFlow
        order={pendingAction?.action === "payment" ? pendingAction.order : null}
        onClose={() => setPendingAction(null)}
        onSuccess={refreshRealOrders}
      />
    </>
  );
}
