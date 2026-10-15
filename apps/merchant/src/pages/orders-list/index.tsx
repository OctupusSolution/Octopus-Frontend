// apps/merchant/src/pages/orders-list/index.tsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Settings } from "lucide-react";
import type { DuplicateOrderTemplateResponse } from "@octopus/api-client";
import { mapRealOrderToRecord, mapRealOrdersToRecords, OrderErrorNote, useOrderText, useRealOrders } from "@/entities/order";
import { NewOrderModal } from "@/features/order/take-order";
import { OrderSettingsModal } from "@/features/order/order-settings";
import { useI18n } from "@/app/providers/i18n-provider";
import { ShellIcon } from "@/shared/ui/shell-icon";
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

// The frames' 40px controls: Export, and the header actions that share its shape.
const CONTROL = "inline-flex h-10 items-center justify-center gap-1 whitespace-nowrap rounded-[8px] px-3 text-[14px] font-medium leading-[14px]";
const CONTROL_PRIMARY = "bg-[#007bff] text-white transition-opacity hover:opacity-90";
const CONTROL_OUTLINE =
  "border border-[#cbd5e1] bg-[var(--octo-card)] text-[var(--octo-text-primary)] transition-colors hover:bg-[var(--octo-hover)] [[data-theme=dark]_&]:border-[var(--octo-border-input)]";
const EMPTY_ART_TONE = "text-[#cbd5e1] [[data-theme=dark]_&]:text-[var(--octo-border-input)]";

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
  const navigate = useNavigate();
  // A real order opens its own page; the modal remains for anything without
  // a server id.
  const showDetails = (order: OrderRecord) => {
    if (order.real) navigate(`/orders/${order.real.orderId}`);
    else setDetailsOrder(order);
  };
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
    // Called-off orders always sink to the bottom; within each group the
    // server's order is kept (Array.sort is stable).
    const calledOff = (order: OrderRecord) => (order.state === "Voided" || order.state === "Canceled" ? 1 : 0);
    const ordered = [...allRecords].sort((a, b) => calledOff(a) - calledOff(b));
    return ordered.filter((order) => {
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
      <div className="px-4 pb-10 pt-6 sm:px-6 lg:ps-12 lg:pt-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-3">
            <h1 className="text-[24px] font-bold leading-[24px] text-[var(--octo-text-primary)]">{t("orders.title")}</h1>
            <p className="text-[14px] font-medium leading-[14px] text-[var(--octo-text-secondary)]">{t("orders.subtitle")}</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button type="button" onClick={() => setSettingsOpen(true)} className={`${CONTROL} ${CONTROL_OUTLINE}`}>
              <Settings size={20} strokeWidth={1.5} />
              {tx("page.settings")}
            </button>
            <button
              type="button"
              disabled={ordersUnavailable}
              onClick={() => {
                setReorderTemplate(null);
                setNewOrderOpen(true);
              }}
              className={`${CONTROL} ${CONTROL_PRIMARY} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <Plus size={20} strokeWidth={1.5} />
              {tx("page.newOrder")}
            </button>
            <span className="flex h-10 items-center gap-2 whitespace-nowrap rounded-[4px] bg-[#f1f5f9] px-2 text-[14px] font-medium leading-[14px] text-[var(--octo-text-primary)] [[data-theme=dark]_&]:bg-[var(--octo-soft-bg)]">
              <ShellIcon name="ord-calendar.svg" size={24} />
              {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>
        </header>

        {ordersUnavailable ? (
          <OrderErrorNote message={tx("page.unavailable")} />
        ) : (
          ordersError && <OrderErrorNote message={tx("page.loadFailed").replace("{message}", ordersError)} />
        )}

        <div className="mt-7">
          <OrdersStatCards stats={stats} />
        </div>

        {ordersLoading && hasNoOrdersAtAll ? (
          <p className="py-16 text-center text-[13px] text-[var(--octo-text-muted)]">{tx("common.loading")}</p>
        ) : hasNoOrdersAtAll ? (
          <div className="mx-auto mt-16 flex w-full max-w-[667px] flex-col items-center gap-2 text-center lg:mt-[168px]">
            <EmptyOrdersArt className={EMPTY_ART_TONE} />
            <h2 className="text-[16px] font-bold leading-[16px] text-[var(--octo-text-primary)]">{t("orders.empty.title")}</h2>
            <p className="text-[14px] font-medium leading-[1.4] text-[var(--octo-text-secondary)]">{t("orders.empty.description")}</p>
          </div>
        ) : (
          <>
            <div className="mt-5 flex flex-wrap items-center gap-2">
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

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <label className="flex h-10 min-w-[200px] flex-1 items-center gap-2 rounded-[12px] border border-[#e2e8f0] bg-[var(--octo-card)] px-4 transition-colors focus-within:border-[#0d6efd] focus-within:ring-2 focus-within:ring-[#0d6efd]/30 [[data-theme=dark]_&]:border-[var(--octo-border-input)]">
                <ShellIcon name="ord-search.svg" size={24} className="text-[var(--octo-text-secondary)]" />
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder={t("orders.search.placeholder")}
                  aria-label={t("orders.search.placeholder")}
                  className="h-full min-w-0 flex-1 bg-transparent text-[14px] font-medium text-[var(--octo-text-primary)] placeholder:text-[var(--octo-text-secondary)] focus:outline-none"
                />
              </label>
              <button type="button" onClick={handleExport} className={`${CONTROL} ${CONTROL_PRIMARY}`}>
                <ShellIcon name="ord-export.svg" size={24} />
                {t("orders.export")}
              </button>
            </div>

            {visibleRows.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
                <EmptyOrdersArt size={140} className={EMPTY_ART_TONE} />
                <h2 className="text-[16px] font-bold leading-[16px] text-[var(--octo-text-primary)]">{t("orders.filter.empty")}</h2>
                <button type="button" onClick={resetFilters} className={`mt-2 ${CONTROL} ${CONTROL_OUTLINE}`}>
                  {t("orders.filter.reset")}
                </button>
              </div>
            ) : (
              <>
                {/* Mobile: the same card, collapsed to a tap-to-expand summary */}
                <div className="mt-4 flex flex-col gap-4 lg:hidden">
                  {pageRows.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      expanded={expandedId === order.id}
                      onToggle={() => setExpandedId(expandedId === order.id ? null : order.id)}
                      onOpenDetails={showDetails}
                      onAction={(action, target) => setPendingAction({ action, order: target })}
                    />
                  ))}
                </div>

                {/* Desktop: the full five-column row card */}
                <div className="mt-4 hidden flex-col gap-4 lg:flex">
                  {pageRows.map((order) => (
                    <OrderRowCard
                      key={order.id}
                      order={order}
                      onOpenDetails={showDetails}
                      onAction={(action, target) => setPendingAction({ action, order: target })}
                    />
                  ))}
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
          navigate(`/orders/${order.id}`);
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
