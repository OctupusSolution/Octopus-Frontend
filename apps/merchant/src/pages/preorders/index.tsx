import { useState } from "react";
import { RefreshCw, CalendarClock, Plus, Clock, X } from "lucide-react";
import { StatCard } from "@/widgets/sales-summary-chart";
import { preOrderStats, preOrderRows, type PreOrderStatus } from "@/shared/api/mock-preorders";
import { useI18n } from "@/app/providers/i18n-provider";
import { labelKey } from "@/shared/lib/labels";
import { Modal, Input, Select, EmptyState } from "@ui/primitives";

const STATUS_STYLE: Record<PreOrderStatus, string> = {
  Scheduled: "bg-info/10 text-[#0D6EFD]",
  Preparing: "bg-warning/10 text-[#c2660a]",
  Ready: "bg-success/10 text-[#16a34a]",
  Collected: "bg-[var(--octo-track)] text-[var(--octo-text-secondary)]",
  "No-show": "bg-error/10 text-[#dc2626]",
};

const CHANNELS: readonly ("Dine-in" | "Takeaway" | "Delivery" | "Aggregator")[] = [
  "Dine-in",
  "Takeaway",
  "Delivery",
  "Aggregator",
];

const DAYS: readonly ("Today" | "Tomorrow" | "Yesterday")[] = ["Today", "Tomorrow", "Yesterday"];

export function PreOrdersPage() {
  const { t } = useI18n();
  const [refreshing, setRefreshing] = useState(false);
  const [updatedJustNow, setUpdatedJustNow] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [rows, setRows] = useState<readonly (typeof preOrderRows)[number][]>(preOrderRows);
  const [channel, setChannel] = useState<(typeof preOrderRows)[number]["channel"]>("Takeaway");
  const [customer, setCustomer] = useState("");
  const [items, setItems] = useState("");
  const [total, setTotal] = useState("");
  const [day, setDay] = useState<(typeof preOrderRows)[number]["day"]>("Today");
  const [time, setTime] = useState("");
  const [error, setError] = useState(false);

  const handleRefresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    window.setTimeout(() => {
      setRefreshing(false);
      setUpdatedJustNow(true);
    }, 900);
  };

  const openModal = () => {
    setCustomer("");
    setItems("");
    setTotal("");
    setTime("");
    setError(false);
    setModalOpen(true);
  };

  const createPreOrder = () => {
    if (!customer.trim() || !items.trim() || !total.trim() || !time) {
      setError(true);
      return;
    }
    const itemsCount = Math.max(1, Number.parseInt(items, 10) || 1);
    const nextId = `#PO-${413 + rows.length}`;
    setRows((prev) => [
      { id: nextId, channel, customer: customer.trim(), items: itemsCount, total: total.trim(), day, time, status: "Scheduled" },
      ...prev,
    ]);
    setModalOpen(false);
  };

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("preorders.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">
            {t("preorders.subtitle")}
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
          <button
            type="button"
            onClick={openModal}
            className="flex items-center gap-1.5 rounded-[9px] border border-[var(--octo-border-input)] bg-[#0D6EFD] px-3 py-[7px] text-[12px] font-medium text-white transition-colors hover:bg-[#0b5ed7]"
          >
            <Plus size={13} />
            {t("preorders.newOrder")}
          </button>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {preOrderStats.map((card) => (
          <StatCard key={card.id} data={card} />
        ))}
      </div>

      <section className="mt-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div className="flex items-center gap-2">
          <CalendarClock size={15} className="text-[var(--octo-text-muted)]" />
          <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("preorders.cardTitle")}</h2>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={<CalendarClock size={16} />}
            title={t("preorders.cardTitle")}
            action={
              <button
                type="button"
                onClick={openModal}
                className="rounded-[9px] bg-[#0D6EFD] px-3 py-[7px] text-[12px] font-medium text-white transition-opacity hover:opacity-90"
              >
                {t("preorders.newOrder")}
              </button>
            }
          />
        ) : (
          <div className="octo-scroll mt-3 overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-[12.5px]">
              <thead>
                <tr className="border-b border-[var(--octo-divider)] text-start">
                  {["orders.col.order", "orders.col.channel", "orders.col.customer", "orders.col.items", "orders.col.total", "preorders.col.scheduled", "orders.col.status"].map((h) => (
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
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-[var(--octo-row-border)] last:border-0 hover:bg-[var(--octo-row-hover)]">
                    <td className="whitespace-nowrap px-2 py-2.5 font-semibold text-[var(--octo-text-primary)]">{row.id}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{t(labelKey(row.channel))}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{row.customer}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{row.items}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 font-medium text-[var(--octo-text-primary)]">{row.total}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 font-medium text-[#0D6EFD]">
                      {t(labelKey(row.day))} · {row.time}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5">
                      <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${STATUS_STYLE[row.status]}`}>
                        {t(labelKey(row.status))}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t("preorders.modal.title")}
        footer={
          <>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="flex-1 rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-[7px] text-[12px] font-medium text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)]"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={createPreOrder}
              className="flex-1 rounded-[9px] bg-[#0D6EFD] px-3 py-[7px] text-[12px] font-medium text-white transition-opacity hover:opacity-90"
            >
              {t("preorders.modal.create")}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Select
            label={t("preorders.modal.channel")}
            value={channel}
            onChange={(e) => setChannel(e.target.value as (typeof preOrderRows)[number]["channel"])}
          >
            {CHANNELS.map((c) => (
              <option key={c} value={c}>
                {t(labelKey(c))}
              </option>
            ))}
          </Select>

          <Input
            label={t("preorders.modal.customer")}
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            placeholder="Fahad N."
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t("preorders.modal.items")}
              type="number"
              min={1}
              value={items}
              onChange={(e) => setItems(e.target.value)}
              placeholder="3"
            />
            <Input
              label={t("preorders.modal.total")}
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              placeholder="SAR 142.00"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label={t("preorders.modal.scheduledTime")}
              value={day}
              onChange={(e) => setDay(e.target.value as (typeof preOrderRows)[number]["day"])}
            >
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {t(labelKey(d))}
                </option>
              ))}
            </Select>
            <Input
              label={t("time.label")}
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>

          {error && (
            <p className="flex items-center gap-1.5 text-[11.5px] text-[#EF4444]">
              <X size={12} />
              {t("preorders.modal.required")}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
