import { useMemo, useState } from "react";
import { ArrowRight, TriangleAlert, Truck } from "lucide-react";
import { Button, EmptyState, Select } from "@ui/primitives";
import { MiniKpiCard } from "../_shared/kpi-card";
import { Pagination } from "../_shared/pagination";
import { Drawer } from "../_shared/drawer";
import {
  transfers as initialTransfers,
  transfersKpis,
  transferValue,
  stockRows,
  BRANCHES,
  formatMoney,
  type Transfer,
  type TransferStatus,
} from "@/shared/api/mock-inventory";
import { useI18n } from "@/app/providers/i18n-provider";

const STATUS_STYLE: Record<TransferStatus, string> = {
  Requested: "bg-[var(--octo-track)] text-[var(--octo-text-secondary)]",
  Approved: "bg-info/10 text-[#0D6EFD]",
  "In Transit": "bg-info/10 text-[#0D6EFD]",
  Received: "bg-success/10 text-[#16a34a]",
  Rejected: "bg-error/10 text-[#dc2626]",
};
const STATUS_KEY: Record<TransferStatus, string> = {
  Requested: "inventory.transfers.status.requested",
  Approved: "inventory.transfers.status.approved",
  "In Transit": "inventory.transfers.status.inTransit",
  Received: "inventory.transfers.status.received",
  Rejected: "inventory.transfers.status.rejected",
};

const ingredientById = new Map(stockRows.map((r) => [r.id, r] as const));
const PAGE_SIZE = 10;

export function TransfersPage() {
  const { t } = useI18n();
  const [fromBranch, setFromBranch] = useState("all");
  const [toBranch, setToBranch] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [activeId, setActiveId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return initialTransfers.filter((tr) => {
      if (fromBranch !== "all" && tr.fromBranch !== fromBranch) return false;
      if (toBranch !== "all" && tr.toBranch !== toBranch) return false;
      if (status !== "all" && tr.status !== status) return false;
      return true;
    });
  }, [fromBranch, toBranch, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const active = initialTransfers.find((tr) => tr.id === activeId) ?? null;

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("inventory.transfers.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">{t("inventory.transfers.subtitle")}</p>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MiniKpiCard label={t("inventory.transfers.kpi.inTransit")} value={transfersKpis[0].value} />
        <MiniKpiCard label={t("inventory.transfers.kpi.completedWeek")} value={transfersKpis[1].value} tone="success" />
        <MiniKpiCard label={t("inventory.transfers.kpi.valueInTransit")} value={transfersKpis[2].value} />
        <MiniKpiCard label={t("inventory.transfers.kpi.avgTime")} value={transfersKpis[3].value} />
      </div>

      <section className="mt-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div className="flex items-center gap-2">
          <Truck size={15} className="text-[var(--octo-text-muted)]" />
          <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("inventory.transfers.listTitle")}</h2>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Select
            className="w-auto min-w-[160px]"
            value={fromBranch}
            onChange={(e) => {
              setFromBranch(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">{t("inventory.transfers.filter.fromBranch")}</option>
            {BRANCHES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </Select>
          <Select
            className="w-auto min-w-[160px]"
            value={toBranch}
            onChange={(e) => {
              setToBranch(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">{t("inventory.transfers.filter.toBranch")}</option>
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
            <option value="all">{t("inventory.transfers.filter.allStatuses")}</option>
            {(Object.keys(STATUS_KEY) as TransferStatus[]).map((s) => (
              <option key={s} value={s}>
                {t(STATUS_KEY[s])}
              </option>
            ))}
          </Select>
        </div>

        <div className="octo-scroll mt-3 overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-[var(--octo-divider)] text-start">
                {[
                  "inventory.transfers.col.transferId",
                  "inventory.transfers.col.direction",
                  "inventory.transfers.col.items",
                  "inventory.transfers.col.value",
                  "inventory.transfers.col.requested",
                  "inventory.transfers.col.status",
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
              {pageRows.map((tr) => (
                <tr
                  key={tr.id}
                  onClick={() => setActiveId(tr.id)}
                  className="cursor-pointer border-b border-[var(--octo-row-border)] last:border-0 hover:bg-[var(--octo-row-hover)]"
                >
                  <td className="whitespace-nowrap px-2 py-2.5 font-semibold text-[var(--octo-text-primary)]">{tr.id}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">
                    <span className="flex items-center gap-1.5">
                      {tr.fromBranch}
                      <ArrowRight size={12} className="shrink-0 text-[var(--octo-text-faint)] rtl:-scale-x-100" />
                      {tr.toBranch}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{tr.lines.length}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 font-medium text-[var(--octo-text-primary)]">{formatMoney(transferValue(tr))}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-faint)]">{tr.requested}</td>
                  <td className="whitespace-nowrap px-2 py-2.5">
                    <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${STATUS_STYLE[tr.status]}`}>
                      {t(STATUS_KEY[tr.status])}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {pageRows.length === 0 && (
            <EmptyState
              icon={<Truck size={18} />}
              title={t("inventory.common.emptyTitle")}
              description={t("inventory.common.emptyDescription")}
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setFromBranch("all");
                    setToBranch("all");
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
        subtitle={
          active && (
            <span className="flex items-center gap-1.5">
              {active.fromBranch}
              <ArrowRight size={12} className="rtl:-scale-x-100" />
              {active.toBranch}
            </span>
          )
        }
      >
        {active && (
          <div className="octo-scroll -mx-1 overflow-x-auto px-1">
            <table className="w-full min-w-[420px] border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-[var(--octo-divider)] text-start">
                  {[
                    "inventory.transfers.col.ingredient",
                    "inventory.transfers.col.sentQty",
                    "inventory.transfers.col.receivedQty",
                    "inventory.transfers.col.discrepancy",
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
                  const discrepancy = line.receivedQty !== null && line.receivedQty !== line.sentQty;
                  return (
                    <tr key={line.ingredientId} className="border-b border-[var(--octo-row-border)] last:border-0">
                      <td className="whitespace-nowrap px-1.5 py-2 font-medium text-[var(--octo-text-primary)]">{ingredient?.ingredient}</td>
                      <td className="whitespace-nowrap px-1.5 py-2 text-[var(--octo-text-secondary)]">
                        {line.sentQty} {line.unit}
                      </td>
                      <td className="whitespace-nowrap px-1.5 py-2 text-[var(--octo-text-secondary)]">
                        {line.receivedQty === null ? "—" : `${line.receivedQty} ${line.unit}`}
                      </td>
                      <td className="whitespace-nowrap px-1.5 py-2">
                        {discrepancy ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#dc2626]">
                            <TriangleAlert size={11} />
                            {line.receivedQty !== null ? line.receivedQty - line.sentQty : ""}
                          </span>
                        ) : (
                          <span className="text-[var(--octo-text-faint)]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Drawer>
    </div>
  );
}
