// apps/merchant/src/pages/orders-list/index.tsx
import { useMemo, useState } from "react";
import { ClipboardList, Download, Search } from "lucide-react";
import { EmptyState, Table, TBody, TH, THead } from "@ui/primitives";
import { useLiveOrders } from "@/shared/api/live-orders";
import { useI18n } from "@/app/providers/i18n-provider";
import { orderRecords } from "./_shared/mock-data";
import { mapLiveOrdersToRecords } from "./_shared/live-orders-bridge";
import { computeOrderStats, pillCount } from "./_shared/stats";
import { OrdersStatCards } from "./_shared/stat-cards";
import { OrderFilterPills } from "./_shared/filter-pills";
import { SourceFilterPopover } from "./_shared/source-filter-popover";
import { OrderCard, OrderTableRow } from "./_shared/order-row";
import { ordersToCsv } from "./_shared/csv-export";
import { OrderDetailsModal } from "./_shared/order-details-modal";
import { CancelOrderFlow } from "./_shared/cancel-order-flow";
import { VoidOrderFlow } from "./_shared/void-order-flow";
import { WastageOrderFlow } from "./_shared/wastage-order-flow";
import { RefundOrderFlow } from "./_shared/refund-order-flow";
import type { OrderAction } from "./_shared/theme";
import type { OrderRecord, OrderSource, OrderState } from "./_shared/types";

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function OrdersListPage() {
  const { t } = useI18n();
  const { orders: liveOrders } = useLiveOrders();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<OrderState | null>(null);
  const [selectedSources, setSelectedSources] = useState<readonly OrderSource[]>([]);
  const [search, setSearch] = useState("");
  const [detailsOrder, setDetailsOrder] = useState<OrderRecord | null>(null);
  const [pendingAction, setPendingAction] = useState<{ action: OrderAction; order: OrderRecord } | null>(null);

  // Live customer orders lead, seeded rows follow — same precedence the
  // page used before this rebuild.
  const allRecords = useMemo(() => [...mapLiveOrdersToRecords(liveOrders), ...orderRecords], [liveOrders]);

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

  function resetFilters() {
    setSelectedState(null);
    setSelectedSources([]);
    setSearch("");
  }

  function handleExport() {
    downloadCsv(`orders-${new Date().toISOString().slice(0, 10)}.csv`, ordersToCsv(visibleRows));
  }

  return (
    <>
      <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("orders.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">{t("orders.subtitle")}</p>
        </div>
        <span className="rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-[7px] text-[12px] font-medium text-[var(--octo-text-secondary)]">
          {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
        </span>
      </header>

      <div className="mt-4">
        <OrdersStatCards stats={stats} />
      </div>

      <section className="mt-4 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div className="flex flex-wrap items-center gap-2">
          <SourceFilterPopover selected={selectedSources} onChange={setSelectedSources} />
          <OrderFilterPills
            selected={selectedState}
            onSelect={setSelectedState}
            countAll={allRecords.length}
            countByState={(state) => pillCount(allRecords, state)}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search size={14} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[var(--octo-text-faint)]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("orders.search.placeholder")}
              className="w-full rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] py-[7px] ps-8 pe-3 text-[12.5px] text-[var(--octo-text-primary)] placeholder:text-[var(--octo-text-faint)] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/30 focus:border-[#0D6EFD]"
            />
          </div>
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-[9px] bg-[#0D6EFD] px-3 py-[7px] text-[12px] font-medium text-white transition-opacity hover:opacity-90"
          >
            <Download size={13} />
            {t("orders.export")}
          </button>
        </div>

        {visibleRows.length === 0 ? (
          <EmptyState
            icon={<ClipboardList size={16} />}
            title={t(isFiltered ? "orders.filter.empty" : "orders.empty.title")}
            description={isFiltered ? undefined : t("orders.empty.description")}
            action={
              isFiltered ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-[7px] text-[12px] font-medium text-[var(--octo-text-primary)] transition-colors hover:bg-[var(--octo-hover)]"
                >
                  {t("orders.filter.reset")}
                </button>
              ) : undefined
            }
            className="mt-4"
          />
        ) : (
          <>
            {/* Mobile: card accordion — tap a row to expand its details */}
            <div className="mt-3 divide-y divide-[var(--octo-row-border)] sm:hidden">
              {visibleRows.map((order) => (
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

            {/* Desktop/tablet: full data table */}
            <div className="octo-scroll mt-3 hidden overflow-x-auto sm:block">
              <Table>
                <THead>
                  <tr>
                    <TH>{t("orders.col.order")}</TH>
                    <TH>{t("orders.details.tableNo")}</TH>
                    <TH>{t("orders.col.total")}</TH>
                    <TH>{t("orders.details.timeline")}</TH>
                    <TH>{t("orders.col.actions")}</TH>
                  </tr>
                </THead>
                <TBody>
                  {visibleRows.map((order) => (
                    <OrderTableRow
                      key={order.id}
                      order={order}
                      onOpenDetails={setDetailsOrder}
                      onAction={(action, target) => setPendingAction({ action, order: target })}
                    />
                  ))}
                </TBody>
              </Table>
            </div>
          </>
        )}
      </section>
      </div>

      <OrderDetailsModal
        order={detailsOrder}
        onClose={() => setDetailsOrder(null)}
        onAction={(action, order) => {
          setDetailsOrder(null);
          setPendingAction({ action, order });
        }}
      />

      <CancelOrderFlow
        order={pendingAction?.action === "cancel" ? pendingAction.order : null}
        onClose={() => setPendingAction(null)}
      />
      <VoidOrderFlow
        order={pendingAction?.action === "void" ? pendingAction.order : null}
        onClose={() => setPendingAction(null)}
      />
      <WastageOrderFlow
        order={pendingAction?.action === "wastage" ? pendingAction.order : null}
        onClose={() => setPendingAction(null)}
      />
      <RefundOrderFlow
        order={pendingAction?.action === "refund" ? pendingAction.order : null}
        onClose={() => setPendingAction(null)}
      />
    </>
  );
}
