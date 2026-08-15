import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, EmptyState, Input, Modal, Select } from "@ui/primitives";
import { MiniKpiCard } from "../_shared/kpi-card";
import { Pagination } from "../_shared/pagination";
import {
  wasteEntries as initialWasteEntries,
  wasteKpis,
  wasteByWeek,
  WASTE_REASONS,
  WASTE_REASON_COLOR,
  stockRows,
  BRANCHES,
  formatMoney,
  type WasteEntry,
  type WasteReason,
  type Branch,
} from "@/shared/api/mock-inventory";
import { useI18n } from "@/app/providers/i18n-provider";

const REASON_KEY: Record<WasteReason, string> = {
  Expired: "inventory.waste.reason.expired",
  Spoiled: "inventory.waste.reason.spoiled",
  "Prep Error": "inventory.waste.reason.prepError",
  "Customer Return": "inventory.waste.reason.customerReturn",
  Overproduction: "inventory.waste.reason.overproduction",
  "Damaged in Transit": "inventory.waste.reason.damagedInTransit",
};

const PAGE_SIZE = 10;

export function WastePage() {
  const { t } = useI18n();
  const [entries, setEntries] = useState<readonly WasteEntry[]>(initialWasteEntries);
  const [branch, setBranch] = useState("all");
  const [reason, setReason] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);

  const [logDate, setLogDate] = useState("2026-08-09");
  const [logItem, setLogItem] = useState(stockRows[0].id);
  const [logQty, setLogQty] = useState(1);
  const [logReason, setLogReason] = useState<WasteReason>("Spoiled");
  const [logBranch, setLogBranch] = useState<Branch>(BRANCHES[0]);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (branch !== "all" && e.branch !== branch) return false;
      if (reason !== "all" && e.reason !== reason) return false;
      if (from && e.date < from) return false;
      if (to && e.date > to) return false;
      return true;
    });
  }, [entries, branch, reason, from, to]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = [...filtered].sort((a, b) => (a.date < b.date ? 1 : -1)).slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const maxWeekTotal = Math.max(
    1,
    ...wasteByWeek.map((w) => Object.values(w.byReason).reduce((s, v) => s + v, 0))
  );

  function logWaste() {
    const item = stockRows.find((r) => r.id === logItem);
    const entry: WasteEntry = {
      id: `waste-${entries.length + 1}`,
      date: logDate,
      item: item?.ingredient ?? "",
      qty: logQty,
      unit: item?.unit ?? "kg",
      cost: Math.round(logQty * (item?.unitCost ?? 0) * 100) / 100,
      reason: logReason,
      branch: logBranch,
      loggedBy: "You",
    };
    setEntries((prev) => [entry, ...prev]);
    setModalOpen(false);
    setLogQty(1);
  }

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("inventory.waste.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">{t("inventory.waste.subtitle")}</p>
        </div>
        <Button variant="primary" icon={<Plus size={13} />} onClick={() => setModalOpen(true)}>
          {t("inventory.waste.logWaste")}
        </Button>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MiniKpiCard label={t("inventory.waste.kpi.wasteMonth")} value={wasteKpis[0].value} tone="warning" />
        <MiniKpiCard label={t("inventory.waste.kpi.pctOfSales")} value={wasteKpis[1].value} />
        <MiniKpiCard label={t("inventory.waste.kpi.topReason")} value={t(REASON_KEY.Expired)} />
        <MiniKpiCard label={t("inventory.waste.kpi.trend")} value={wasteKpis[3].value} tone="success" />
      </div>

      <section className="mt-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("inventory.waste.byWeek")}</h2>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {WASTE_REASONS.map((r) => (
            <span key={r} className="flex items-center gap-1.5 whitespace-nowrap text-[11px] text-[var(--octo-text-secondary)]">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: WASTE_REASON_COLOR[r] }} />
              {t(REASON_KEY[r])}
            </span>
          ))}
        </div>
        <div className="mt-4 flex h-[160px] items-end gap-4 px-2">
          {wasteByWeek.map((w) => {
            const total = Object.values(w.byReason).reduce((s, v) => s + v, 0);
            return (
              <div key={w.weekLabel} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex w-10 flex-1 flex-col-reverse gap-[2px]" style={{ height: "128px" }}>
                  {WASTE_REASONS.map((r) => {
                    const value = w.byReason[r];
                    if (value <= 0) return null;
                    return (
                      <div
                        key={r}
                        className="w-full rounded-[3px]"
                        title={`${t(REASON_KEY[r])}: ${formatMoney(value)}`}
                        style={{ height: `${(value / maxWeekTotal) * 100}%`, backgroundColor: WASTE_REASON_COLOR[r] }}
                      />
                    );
                  })}
                </div>
                <span className="text-[10.5px] text-[var(--octo-text-faint)]">{w.weekLabel}</span>
                <span className="text-[10.5px] font-medium text-[var(--octo-text-secondary)]">{formatMoney(total)}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            className="w-auto min-w-[150px]"
            value={branch}
            onChange={(e) => {
              setBranch(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">{t("inventory.waste.filter.allBranches")}</option>
            {BRANCHES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </Select>
          <Select
            className="w-auto min-w-[160px]"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">{t("inventory.waste.filter.allReasons")}</option>
            {WASTE_REASONS.map((r) => (
              <option key={r} value={r}>
                {t(REASON_KEY[r])}
              </option>
            ))}
          </Select>
          <Input type="date" className="w-auto" value={from} onChange={(e) => setFrom(e.target.value)} aria-label={t("inventory.common.from")} />
          <span className="text-[11.5px] text-[var(--octo-text-faint)]">{t("inventory.common.to")}</span>
          <Input type="date" className="w-auto" value={to} onChange={(e) => setTo(e.target.value)} aria-label={t("inventory.common.to")} />
        </div>

        <div className="octo-scroll mt-3 overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-[var(--octo-divider)] text-start">
                {[
                  "inventory.waste.col.date",
                  "inventory.waste.col.item",
                  "inventory.waste.col.qty",
                  "inventory.waste.col.unit",
                  "inventory.waste.col.cost",
                  "inventory.waste.col.reason",
                  "inventory.waste.col.branch",
                  "inventory.waste.col.loggedBy",
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
              {pageRows.map((e) => (
                <tr key={e.id} className="border-b border-[var(--octo-row-border)] last:border-0 hover:bg-[var(--octo-row-hover)]">
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-faint)]">{e.date}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 font-semibold text-[var(--octo-text-primary)]">{e.item}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{e.qty}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{e.unit}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 font-medium text-[var(--octo-text-primary)]">{formatMoney(e.cost)}</td>
                  <td className="whitespace-nowrap px-2 py-2.5">
                    <span
                      className="rounded-full px-2 py-1 text-[11px] font-medium"
                      style={{ backgroundColor: `${WASTE_REASON_COLOR[e.reason]}1a`, color: WASTE_REASON_COLOR[e.reason] }}
                    >
                      {t(REASON_KEY[e.reason])}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{e.branch}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{e.loggedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {pageRows.length === 0 && (
            <EmptyState
              icon={<Trash2 size={18} />}
              title={t("inventory.common.emptyTitle")}
              description={t("inventory.common.emptyDescription")}
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setBranch("all");
                    setReason("all");
                    setFrom("");
                    setTo("");
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

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t("inventory.waste.logWaste")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="primary" onClick={logWaste}>
              {t("common.save")}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label={t("inventory.waste.col.date")} type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} />
          <Select label={t("inventory.waste.col.branch")} value={logBranch} onChange={(e) => setLogBranch(e.target.value as Branch)}>
            {BRANCHES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </Select>
          <Select
            label={t("inventory.waste.col.item")}
            className="sm:col-span-2"
            value={logItem}
            onChange={(e) => setLogItem(e.target.value)}
          >
            {stockRows.map((r) => (
              <option key={r.id} value={r.id}>
                {r.ingredient}
              </option>
            ))}
          </Select>
          <Input
            label={t("inventory.waste.col.qty")}
            type="number"
            min={1}
            value={logQty}
            onChange={(e) => setLogQty(Number(e.target.value))}
          />
          <Select label={t("inventory.waste.col.reason")} value={logReason} onChange={(e) => setLogReason(e.target.value as WasteReason)}>
            {WASTE_REASONS.map((r) => (
              <option key={r} value={r}>
                {t(REASON_KEY[r])}
              </option>
            ))}
          </Select>
        </div>
      </Modal>
    </div>
  );
}
