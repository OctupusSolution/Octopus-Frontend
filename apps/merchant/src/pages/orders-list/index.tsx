import { useEffect, useRef, useState } from "react";
import { RefreshCw, SlidersHorizontal, ClipboardList, ChevronDown, X, Clock } from "lucide-react";
import { StatCard } from "@/widgets/sales-summary-chart";
import { orderStats, orderRows, type OrderStatus } from "@/shared/api/mock-orders";
import { useLiveOrders } from "@/shared/api/live-orders";
import { useI18n } from "@/app/providers/i18n-provider";
import { labelKey } from "@/shared/lib/labels";
import { Checkbox, EmptyState } from "@ui/primitives";

const STATUS_STYLE: Record<OrderStatus, string> = {
  New: "bg-info/10 text-[#0D6EFD]",
  Preparing: "bg-warning/10 text-[#c2660a]",
  Ready: "bg-success/10 text-[#16a34a]",
  "Out for Delivery": "bg-info/10 text-[#0D6EFD]",
  Completed: "bg-[var(--octo-track)] text-[var(--octo-text-secondary)]",
  Cancelled: "bg-error/10 text-[#dc2626]",
};

const ORDER_STATUSES: readonly OrderStatus[] = [
  "New",
  "Preparing",
  "Ready",
  "Out for Delivery",
  "Completed",
  "Cancelled",
];

function minutesLabel(minutesAgo: number, t: (key: string) => string): string {
  return t("common.minutesAgo").replace("{n}", String(minutesAgo));
}

export function OrdersListPage() {
  const { t } = useI18n();
  const { rows: liveRows, refresh: refreshLiveOrders } = useLiveOrders();
  const [expandedId, setExpandedId] = useState<string | null>(orderRows[0]?.id ?? null);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedJustNow, setUpdatedJustNow] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftStatuses, setDraftStatuses] = useState<readonly OrderStatus[]>([]);
  const [statuses, setStatuses] = useState<readonly OrderStatus[]>([]);
  const filterRef = useRef<HTMLDivElement>(null);

  // Live customer orders lead, seeded rows follow.
  const allRows = [...liveRows, ...orderRows];

  const isFiltered = statuses.length > 0;
  const visibleRows = isFiltered
    ? allRows.filter((row) => statuses.includes(row.status))
    : allRows;

  const handleRefresh = () => {
    refreshLiveOrders();
    if (refreshing) return;
    setRefreshing(true);
    window.setTimeout(() => {
      setRefreshing(false);
      setUpdatedJustNow(true);
    }, 900);
  };

  useEffect(() => {
    if (!filterOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFilterOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [filterOpen]);

  const openFilter = () => {
    setDraftStatuses(statuses);
    setFilterOpen(true);
  };

  const applyFilter = () => {
    setStatuses(draftStatuses);
    setFilterOpen(false);
  };

  const resetFilter = () => {
    setDraftStatuses([]);
    setStatuses([]);
    setFilterOpen(false);
  };

  const toggleStatus = (status: OrderStatus) => {
    setDraftStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("orders.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">
            {t("orders.subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="hidden items-center gap-1.5 text-[11.5px] text-[var(--octo-text-muted)] md:flex">
            <Clock size={13} />
            {t(updatedJustNow ? "orders.updatedJustNow" : "orders.lastUpdated")}
          </span>

          <button
            type="button"
            aria-label={t("common.refresh")}
            title={t("common.refresh")}
            onClick={handleRefresh}
            className="grid h-[30px] w-[30px] place-items-center rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)]"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : undefined} />
          </button>

          <div ref={filterRef} className="relative">
            <button
              type="button"
              aria-haspopup="dialog"
              aria-expanded={filterOpen}
              onClick={() => (filterOpen ? setFilterOpen(false) : openFilter())}
              className="flex items-center gap-1.5 rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-[7px] text-[12px] font-medium text-[var(--octo-text-primary)] transition-colors hover:bg-[var(--octo-hover)]"
            >
              <SlidersHorizontal size={13} />
              {t("common.filter")}
              {isFiltered && <span className="h-1.5 w-1.5 rounded-full bg-[#0D6EFD]" />}
              <ChevronDown size={12} className={`transition-transform ${filterOpen ? "rotate-180" : ""}`} />
            </button>

            {filterOpen && (
              <div
                role="dialog"
                aria-label={t("orders.filter.title")}
                className="absolute end-0 top-[calc(100%+6px)] z-30 w-[240px] rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-3.5 shadow-lg"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">
                    {t("orders.filter.title")}
                  </p>
                  <button
                    type="button"
                    aria-label={t("common.cancel")}
                    onClick={() => setFilterOpen(false)}
                    className="text-[var(--octo-text-faint)] transition-colors hover:text-[var(--octo-text-secondary)]"
                  >
                    <X size={14} />
                  </button>
                </div>

                <p className="mt-3 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
                  {t("orders.filter.status")}
                </p>
                <div className="mt-2 flex flex-col gap-2">
                  {ORDER_STATUSES.map((status) => (
                    <Checkbox
                      key={status}
                      label={t(labelKey(status))}
                      checked={draftStatuses.includes(status)}
                      onChange={() => toggleStatus(status)}
                    />
                  ))}
                </div>

                <div className="mt-4 flex items-center gap-2 border-t border-[var(--octo-divider)] pt-3">
                  <button
                    type="button"
                    onClick={resetFilter}
                    className="flex-1 rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-[7px] text-[12px] font-medium text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)]"
                  >
                    {t("orders.filter.reset")}
                  </button>
                  <button
                    type="button"
                    onClick={applyFilter}
                    className="flex-1 rounded-[9px] bg-[#0D6EFD] px-3 py-[7px] text-[12px] font-medium text-white transition-opacity hover:opacity-90"
                  >
                    {t("orders.filter.apply")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {orderStats.map((card) => (
          <StatCard key={card.id} data={card} />
        ))}
      </div>

      <section className="mt-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div className="flex items-center gap-2">
          <ClipboardList size={15} className="text-[var(--octo-text-muted)]" />
          <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("orders.liveOrders")}</h2>
        </div>

        {visibleRows.length === 0 ? (
          <EmptyState
            icon={<ClipboardList size={16} />}
            title={t("orders.filter.empty")}
            action={
              <button
                type="button"
                onClick={resetFilter}
                className="rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-[7px] text-[12px] font-medium text-[var(--octo-text-primary)] transition-colors hover:bg-[var(--octo-hover)]"
              >
                {t("orders.filter.reset")}
              </button>
            }
          />
        ) : (
          <>
            {/* Mobile: card accordion — no horizontal scroll, tap a row to expand its details */}
            <div className="mt-3 divide-y divide-[var(--octo-row-border)] sm:hidden">
              {visibleRows.map((row) => {
                const isOpen = expandedId === row.id;
                return (
                  <div key={row.id}>
                    <button
                      type="button"
                      onClick={() => setExpandedId(isOpen ? null : row.id)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center justify-between gap-3 py-2.5 text-start"
                    >
                      <span className="flex items-baseline gap-2 truncate">
                        <span className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{row.id}</span>
                        <span className="truncate text-[11.5px] text-[var(--octo-text-secondary)]">{row.branch}</span>
                      </span>
                      <ChevronDown
                        size={15}
                        className={`shrink-0 text-[var(--octo-text-faint)] transition-transform ${isOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    {isOpen && (
                      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 pb-3 text-[12px]">
                        {[
                          ["orders.col.channel", t(labelKey(row.channel))],
                          ["orders.col.customer", row.customer],
                          ["orders.col.items", String(row.items)],
                          ["orders.col.total", row.total],
                          ["orders.col.time", minutesLabel(row.minutesAgo, t)],
                        ].map(([labelId, value]) => (
                          <div key={labelId}>
                            <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                              {t(labelId)}
                            </dt>
                            <dd className="mt-0.5 text-[var(--octo-text-secondary)]">{value}</dd>
                          </div>
                        ))}
                        <div>
                          <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                            {t("orders.col.status")}
                          </dt>
                          <dd className="mt-1">
                            <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${STATUS_STYLE[row.status]}`}>
                              {t(labelKey(row.status))}
                            </span>
                          </dd>
                        </div>
                      </dl>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop/tablet: full data table */}
            <div className="octo-scroll mt-3 hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[720px] border-collapse text-[12.5px]">
                <thead>
                  <tr className="border-b border-[var(--octo-divider)] text-start">
                    {["orders.col.order", "orders.col.branch", "orders.col.channel", "orders.col.customer", "orders.col.items", "orders.col.total", "orders.col.status", "orders.col.time"].map((h) => (
                      <th
                        key={h}
                        className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]"
                      >
                        {t(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => (
                    <tr key={row.id} className="border-b border-[var(--octo-row-border)] last:border-0 hover:bg-[var(--octo-row-hover)]">
                      <td className="whitespace-nowrap px-2 py-2.5 font-semibold text-[var(--octo-text-primary)]">{row.id}</td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{row.branch}</td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{t(labelKey(row.channel))}</td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{row.customer}</td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{row.items}</td>
                      <td className="whitespace-nowrap px-2 py-2.5 font-medium text-[var(--octo-text-primary)]">{row.total}</td>
                      <td className="whitespace-nowrap px-2 py-2.5">
                        <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${STATUS_STYLE[row.status]}`}>
                          {t(labelKey(row.status))}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-faint)]">
                        {minutesLabel(row.minutesAgo, t)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
