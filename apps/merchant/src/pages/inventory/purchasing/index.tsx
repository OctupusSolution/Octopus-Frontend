import { useMemo, useState } from "react";
import { ClipboardList, Plus, Search, Trash2 } from "lucide-react";
import { Button, EmptyState, Input, Modal, Select } from "@ui/primitives";
import { MiniKpiCard } from "../_shared/kpi-card";
import { Pagination } from "../_shared/pagination";
import { Drawer } from "../_shared/drawer";
import {
  purchaseOrders as initialPurchaseOrders,
  purchasingKpis,
  poTotal,
  poReceivedPct,
  stockRows,
  BRANCHES,
  SUPPLIERS,
  type PurchaseOrder,
  type POStatus,
  type Branch,
  type Supplier,
} from "@/shared/api/mock-inventory";
import { useI18n } from "@/app/providers/i18n-provider";

const STATUS_STYLE: Record<POStatus, string> = {
  Draft: "bg-[var(--octo-track)] text-[var(--octo-text-secondary)]",
  Sent: "bg-info/10 text-[#0D6EFD]",
  "Partially Received": "bg-warning/10 text-[#c2660a]",
  Received: "bg-success/10 text-[#16a34a]",
  Cancelled: "bg-[var(--octo-track)] text-[var(--octo-text-secondary)]",
  Overdue: "bg-error/10 text-[#dc2626]",
};

const STATUS_KEY: Record<POStatus, string> = {
  Draft: "inventory.purchasing.status.draft",
  Sent: "inventory.purchasing.status.sent",
  "Partially Received": "inventory.purchasing.status.partiallyReceived",
  Received: "inventory.purchasing.status.received",
  Cancelled: "inventory.purchasing.status.cancelled",
  Overdue: "inventory.purchasing.status.overdue",
};

const ingredientById = new Map(stockRows.map((r) => [r.id, r] as const));
const PAGE_SIZE = 10;

function money(n: number): string {
  return `SAR ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface NewPOLine {
  ingredientId: string;
  qty: number;
}

export function PurchasingPage() {
  const { t } = useI18n();
  const [orders, setOrders] = useState<readonly PurchaseOrder[]>(initialPurchaseOrders);
  const [query, setQuery] = useState("");
  const [supplier, setSupplier] = useState("all");
  const [branch, setBranch] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [receiveQty, setReceiveQty] = useState<Record<string, number>>({});

  const [newModalOpen, setNewModalOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState<Supplier>(SUPPLIERS[0]);
  const [newBranch, setNewBranch] = useState<Branch>(BRANCHES[0]);
  const [newDate, setNewDate] = useState("2026-08-20");
  const [newLines, setNewLines] = useState<NewPOLine[]>([{ ingredientId: stockRows[0].id, qty: 10 }]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((po) => {
      if (supplier !== "all" && po.supplier !== supplier) return false;
      if (branch !== "all" && po.branch !== branch) return false;
      if (status !== "all" && po.status !== status) return false;
      if (q && !po.id.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [orders, query, supplier, branch, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const active = orders.find((po) => po.id === activeId) ?? null;

  function openDrawer(po: PurchaseOrder) {
    setActiveId(po.id);
    const initial: Record<string, number> = {};
    po.lines.forEach((l) => (initial[l.ingredientId] = l.receivedQty));
    setReceiveQty(initial);
  }

  function applyReceive() {
    if (!active) return;
    setOrders((prev) =>
      prev.map((po) => {
        if (po.id !== active.id) return po;
        const lines = po.lines.map((l) => ({ ...l, receivedQty: receiveQty[l.ingredientId] ?? l.receivedQty }));
        const allReceived = lines.every((l) => l.receivedQty >= l.orderedQty);
        const someReceived = lines.some((l) => l.receivedQty > 0);
        const nextStatus: POStatus = allReceived ? "Received" : someReceived ? "Partially Received" : po.status;
        return { ...po, lines, status: nextStatus };
      })
    );
    setActiveId(null);
  }

  function addNewLine() {
    setNewLines((prev) => [...prev, { ingredientId: stockRows[0].id, qty: 10 }]);
  }
  function removeNewLine(i: number) {
    setNewLines((prev) => prev.filter((_, idx) => idx !== i));
  }
  function createPO() {
    const id = `PO-${2700 + orders.length}`;
    const lines = newLines.map((l) => ({
      ingredientId: l.ingredientId,
      orderedQty: l.qty,
      receivedQty: 0,
      unitCost: ingredientById.get(l.ingredientId)?.unitCost ?? 0,
    }));
    const po: PurchaseOrder = { id, supplier: newSupplier, branch: newBranch, status: "Draft", expectedDate: newDate, lines };
    setOrders((prev) => [po, ...prev]);
    setNewModalOpen(false);
    setNewLines([{ ingredientId: stockRows[0].id, qty: 10 }]);
  }

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("inventory.purchasing.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">{t("inventory.purchasing.subtitle")}</p>
        </div>
        <Button variant="primary" icon={<Plus size={13} />} onClick={() => setNewModalOpen(true)}>
          {t("inventory.purchasing.newPO")}
        </Button>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MiniKpiCard label={t("inventory.purchasing.kpi.openPOs")} value={purchasingKpis[0].value} />
        <MiniKpiCard label={t("inventory.purchasing.kpi.pendingReceipt")} value={purchasingKpis[1].value} />
        <MiniKpiCard label={t("inventory.purchasing.kpi.spendMonth")} value={purchasingKpis[2].value} />
        <MiniKpiCard label={t("inventory.purchasing.kpi.overdueDeliveries")} value={purchasingKpis[3].value} tone="warning" />
      </div>

      <section className="mt-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div className="flex items-center gap-2">
          <ClipboardList size={15} className="text-[var(--octo-text-muted)]" />
          <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("inventory.purchasing.listTitle")}</h2>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="min-w-[200px] flex-1">
            <Input
              placeholder={t("inventory.purchasing.searchPlaceholder")}
              icon={<Search size={13} />}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select
            className="w-auto min-w-[140px]"
            value={supplier}
            onChange={(e) => {
              setSupplier(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">{t("inventory.purchasing.filter.allSuppliers")}</option>
            {SUPPLIERS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Select
            className="w-auto min-w-[150px]"
            value={branch}
            onChange={(e) => {
              setBranch(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">{t("inventory.purchasing.filter.allBranches")}</option>
            {BRANCHES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </Select>
          <Select
            className="w-auto min-w-[150px]"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">{t("inventory.purchasing.filter.allStatuses")}</option>
            {(Object.keys(STATUS_KEY) as POStatus[]).map((s) => (
              <option key={s} value={s}>
                {t(STATUS_KEY[s])}
              </option>
            ))}
          </Select>
        </div>

        <div className="octo-scroll mt-3 overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-[var(--octo-divider)] text-start">
                {[
                  "inventory.purchasing.col.poNumber",
                  "inventory.purchasing.col.supplier",
                  "inventory.purchasing.col.branch",
                  "inventory.purchasing.col.items",
                  "inventory.purchasing.col.total",
                  "inventory.purchasing.col.expectedDate",
                  "inventory.purchasing.col.status",
                  "inventory.purchasing.col.receivedPct",
                ].map((key) => (
                  <th
                    key={key}
                    className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]"
                  >
                    {t(key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((po) => {
                const pct = poReceivedPct(po);
                return (
                  <tr
                    key={po.id}
                    onClick={() => openDrawer(po)}
                    className="cursor-pointer border-b border-[var(--octo-row-border)] last:border-0 hover:bg-[var(--octo-row-hover)]"
                  >
                    <td className="whitespace-nowrap px-2 py-2.5 font-semibold text-[var(--octo-text-primary)]">{po.id}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{po.supplier}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{po.branch}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{po.lines.length}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 font-medium text-[var(--octo-text-primary)]">{money(poTotal(po))}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-faint)]">{po.expectedDate}</td>
                    <td className="whitespace-nowrap px-2 py-2.5">
                      <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${STATUS_STYLE[po.status]}`}>
                        {t(STATUS_KEY[po.status])}
                      </span>
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-8 text-[var(--octo-text-secondary)]">{pct}%</span>
                        <span className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--octo-track)]">
                          <span
                            className={`block h-full rounded-full ${pct >= 100 ? "bg-[#22C55E]" : "bg-[#0D6EFD]"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {pageRows.length === 0 && (
            <EmptyState
              icon={<ClipboardList size={18} />}
              title={t("inventory.common.emptyTitle")}
              description={t("inventory.common.emptyDescription")}
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setQuery("");
                    setSupplier("all");
                    setBranch("all");
                    setStatus("all");
                  }}
                >
                  {t("inventory.common.clearFilters")}
                </Button>
              }
            />
          )}
        </div>

        <Pagination
          page={currentPage}
          pageCount={pageCount}
          total={filtered.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          showingLabel={t("inventory.common.showing")}
        />
      </section>

      <Drawer
        open={active !== null}
        onClose={() => setActiveId(null)}
        title={active?.id ?? ""}
        subtitle={active ? `${active.supplier} · ${active.branch}` : undefined}
        footer={
          active && (
            <>
              <Button variant="secondary" onClick={() => setActiveId(null)}>
                {t("common.cancel")}
              </Button>
              <Button variant="primary" onClick={applyReceive}>
                {t("inventory.purchasing.receiveItems")}
              </Button>
            </>
          )
        }
      >
        {active && (
          <div className="octo-scroll -mx-1 overflow-x-auto px-1">
            <table className="w-full min-w-[380px] border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-[var(--octo-divider)] text-start">
                  {[
                    "inventory.purchasing.col.ingredient",
                    "inventory.purchasing.col.ordered",
                    "inventory.purchasing.col.received",
                    "inventory.purchasing.col.variance",
                  ].map((key) => (
                    <th
                      key={key}
                      className="whitespace-nowrap px-1.5 py-2 text-start text-[10px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]"
                    >
                      {t(key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {active.lines.map((line) => {
                  const ingredient = ingredientById.get(line.ingredientId);
                  const recv = receiveQty[line.ingredientId] ?? line.receivedQty;
                  const variance = recv - line.orderedQty;
                  return (
                    <tr key={line.ingredientId} className="border-b border-[var(--octo-row-border)] last:border-0">
                      <td className="whitespace-nowrap px-1.5 py-2 font-medium text-[var(--octo-text-primary)]">{ingredient?.ingredient}</td>
                      <td className="whitespace-nowrap px-1.5 py-2 text-[var(--octo-text-secondary)]">{line.orderedQty}</td>
                      <td className="whitespace-nowrap px-1.5 py-2">
                        <input
                          type="number"
                          min={0}
                          value={recv}
                          onChange={(e) =>
                            setReceiveQty((prev) => ({ ...prev, [line.ingredientId]: Number(e.target.value) }))
                          }
                          className="w-16 rounded-[7px] border border-[var(--octo-border-input)] px-1.5 py-1 text-[12px]"
                        />
                      </td>
                      <td
                        className={`whitespace-nowrap px-1.5 py-2 font-medium ${
                          variance < 0 ? "text-[#EF4444]" : variance > 0 ? "text-[#c2660a]" : "text-[var(--octo-text-secondary)]"
                        }`}
                      >
                        {variance > 0 ? `+${variance}` : variance}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Drawer>

      <Modal
        open={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        title={t("inventory.purchasing.newPO")}
        className="max-w-xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setNewModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="primary" onClick={createPO}>
              {t("inventory.purchasing.createPO")}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Select label={t("inventory.purchasing.col.supplier")} value={newSupplier} onChange={(e) => setNewSupplier(e.target.value as Supplier)}>
            {SUPPLIERS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Select label={t("inventory.purchasing.col.branch")} value={newBranch} onChange={(e) => setNewBranch(e.target.value as Branch)}>
            {BRANCHES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </Select>
          <Input
            label={t("inventory.purchasing.col.expectedDate")}
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
          />
        </div>

        <div className="mt-4">
          <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
            {t("inventory.purchasing.items")}
          </p>
          <div className="space-y-2">
            {newLines.map((line, i) => (
              <div key={i} className="flex items-center gap-2">
                <Select
                  className="flex-1"
                  value={line.ingredientId}
                  onChange={(e) =>
                    setNewLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ingredientId: e.target.value } : l)))
                  }
                >
                  {stockRows.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.ingredient}
                    </option>
                  ))}
                </Select>
                <Input
                  type="number"
                  min={1}
                  className="w-20"
                  value={line.qty}
                  onChange={(e) =>
                    setNewLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, qty: Number(e.target.value) } : l)))
                  }
                />
                <button
                  type="button"
                  aria-label={t("common.cancel")}
                  onClick={() => removeNewLine(i)}
                  disabled={newLines.length === 1}
                  className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[8px] text-[var(--octo-text-muted)] transition-colors hover:bg-[var(--octo-hover)] hover:text-[#dc2626] disabled:opacity-40"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
          <Button variant="secondary" size="sm" className="mt-2" icon={<Plus size={12} />} onClick={addNewLine}>
            {t("inventory.purchasing.addItem")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
