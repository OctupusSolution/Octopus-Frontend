import { useMemo, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { Button, EmptyState, Input, Select } from "@ui/primitives";
import { MiniKpiCard } from "../_shared/kpi-card";
import { Pagination } from "../_shared/pagination";
import { Drawer } from "../_shared/drawer";
import {
  stockCounts as initialCounts,
  countsKpis,
  countVarianceValue,
  countVariancePct,
  stockRows,
  BRANCHES,
  formatMoney,
  type StockCount,
  type CountType,
  type CountStatus,
} from "@/shared/api/mock-inventory";
import { useI18n } from "@/app/providers/i18n-provider";

const TYPE_KEY: Record<CountType, string> = {
  Full: "inventory.counts.type.full",
  Spot: "inventory.counts.type.spot",
  Cycle: "inventory.counts.type.cycle",
};
const STATUS_STYLE: Record<CountStatus, string> = {
  "In Progress": "bg-info/10 text-[#0D6EFD]",
  "Pending Review": "bg-warning/10 text-[#c2660a]",
  Approved: "bg-success/10 text-[#16a34a]",
};
const STATUS_KEY: Record<CountStatus, string> = {
  "In Progress": "inventory.counts.status.inProgress",
  "Pending Review": "inventory.counts.status.pendingReview",
  Approved: "inventory.counts.status.approved",
};

const ingredientById = new Map(stockRows.map((r) => [r.id, r] as const));
const PAGE_SIZE = 10;

export function CountsPage() {
  const { t } = useI18n();
  const [counts, setCounts] = useState<readonly StockCount[]>(initialCounts);
  const [branch, setBranch] = useState("all");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [activeId, setActiveId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return counts.filter((c) => {
      if (branch !== "all" && c.branch !== branch) return false;
      if (type !== "all" && c.type !== type) return false;
      if (status !== "all" && c.status !== status) return false;
      if (from && c.date < from) return false;
      if (to && c.date > to) return false;
      return true;
    });
  }, [counts, branch, type, status, from, to]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const active = counts.find((c) => c.id === activeId) ?? null;

  function approveCount(id: string) {
    setCounts((prev) => prev.map((c) => (c.id === id ? { ...c, status: "Approved" } : c)));
  }

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("inventory.counts.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">{t("inventory.counts.subtitle")}</p>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MiniKpiCard label={t("inventory.counts.kpi.countsMonth")} value={countsKpis[0].value} />
        <MiniKpiCard label={t("inventory.counts.kpi.itemsCounted")} value={countsKpis[1].value} />
        <MiniKpiCard label={t("inventory.counts.kpi.totalVariance")} value={countsKpis[2].value} tone="error" />
        <MiniKpiCard label={t("inventory.counts.kpi.accuracy")} value={countsKpis[3].value} tone="success" />
      </div>

      <section className="mt-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div className="flex items-center gap-2">
          <ClipboardCheck size={15} className="text-[var(--octo-text-muted)]" />
          <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("inventory.counts.listTitle")}</h2>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Select
            className="w-auto min-w-[150px]"
            value={branch}
            onChange={(e) => {
              setBranch(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">{t("inventory.counts.filter.allBranches")}</option>
            {BRANCHES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </Select>
          <Select
            className="w-auto min-w-[130px]"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">{t("inventory.counts.filter.allTypes")}</option>
            {(Object.keys(TYPE_KEY) as CountType[]).map((tp) => (
              <option key={tp} value={tp}>
                {t(TYPE_KEY[tp])}
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
            <option value="all">{t("inventory.counts.filter.allStatuses")}</option>
            {(Object.keys(STATUS_KEY) as CountStatus[]).map((s) => (
              <option key={s} value={s}>
                {t(STATUS_KEY[s])}
              </option>
            ))}
          </Select>
          <Input type="date" className="w-auto" value={from} onChange={(e) => setFrom(e.target.value)} aria-label={t("inventory.common.from")} />
          <span className="text-[11.5px] text-[var(--octo-text-faint)]">{t("inventory.common.to")}</span>
          <Input type="date" className="w-auto" value={to} onChange={(e) => setTo(e.target.value)} aria-label={t("inventory.common.to")} />
        </div>

        <div className="octo-scroll mt-3 overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-[var(--octo-divider)] text-start">
                {[
                  "inventory.counts.col.countId",
                  "inventory.counts.col.date",
                  "inventory.counts.col.branch",
                  "inventory.counts.col.type",
                  "inventory.counts.col.countedBy",
                  "inventory.counts.col.items",
                  "inventory.counts.col.varianceValue",
                  "inventory.counts.col.variancePct",
                  "inventory.counts.col.status",
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
              {pageRows.map((c) => {
                const varValue = countVarianceValue(c);
                const varPct = countVariancePct(c);
                return (
                  <tr
                    key={c.id}
                    onClick={() => setActiveId(c.id)}
                    className="cursor-pointer border-b border-[var(--octo-row-border)] last:border-0 hover:bg-[var(--octo-row-hover)]"
                  >
                    <td className="whitespace-nowrap px-2 py-2.5 font-semibold text-[var(--octo-text-primary)]">{c.id}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-faint)]">{c.date}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{c.branch}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{t(TYPE_KEY[c.type])}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{c.countedBy}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{c.itemsCounted}</td>
                    <td
                      className={`whitespace-nowrap px-2 py-2.5 font-medium ${
                        varValue < 0 ? "text-[#dc2626]" : varValue > 0 ? "text-[#c2660a]" : "text-[var(--octo-text-secondary)]"
                      }`}
                    >
                      {formatMoney(varValue)}
                    </td>
                    <td
                      className={`whitespace-nowrap px-2 py-2.5 font-medium ${
                        varPct < 0 ? "text-[#dc2626]" : varPct > 0 ? "text-[#c2660a]" : "text-[var(--octo-text-secondary)]"
                      }`}
                    >
                      {varPct.toFixed(1)}%
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5">
                      <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${STATUS_STYLE[c.status]}`}>
                        {t(STATUS_KEY[c.status])}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {pageRows.length === 0 && (
            <EmptyState
              icon={<ClipboardCheck size={18} />}
              title={t("inventory.common.emptyTitle")}
              description={t("inventory.common.emptyDescription")}
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setBranch("all");
                    setType("all");
                    setStatus("all");
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

      <Drawer
        open={active !== null}
        onClose={() => setActiveId(null)}
        title={active?.id ?? ""}
        subtitle={active ? `${active.branch} · ${active.date}` : undefined}
        footer={
          active &&
          active.status !== "Approved" && (
            <Button
              variant="primary"
              onClick={() => {
                approveCount(active.id);
                setActiveId(null);
              }}
            >
              {t("inventory.counts.approve")}
            </Button>
          )
        }
      >
        {active && (
          <div className="octo-scroll -mx-1 overflow-x-auto px-1">
            <table className="w-full min-w-[420px] border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-[var(--octo-divider)] text-start">
                  {[
                    "inventory.counts.col.ingredient",
                    "inventory.counts.col.expected",
                    "inventory.counts.col.counted",
                    "inventory.counts.col.difference",
                    "inventory.counts.col.value",
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
                  const diff = line.counted - line.expected;
                  const value = diff * (ingredient?.unitCost ?? 0);
                  return (
                    <tr key={line.ingredientId} className="border-b border-[var(--octo-row-border)] last:border-0">
                      <td className="whitespace-nowrap px-1.5 py-2 font-medium text-[var(--octo-text-primary)]">{ingredient?.ingredient}</td>
                      <td className="whitespace-nowrap px-1.5 py-2 text-[var(--octo-text-secondary)]">
                        {line.expected} {line.unit}
                      </td>
                      <td className="whitespace-nowrap px-1.5 py-2 text-[var(--octo-text-secondary)]">
                        {line.counted} {line.unit}
                      </td>
                      <td
                        className={`whitespace-nowrap px-1.5 py-2 font-medium ${
                          diff < 0 ? "text-[#dc2626]" : diff > 0 ? "text-[#c2660a]" : "text-[var(--octo-text-secondary)]"
                        }`}
                      >
                        {diff > 0 ? `+${diff}` : diff}
                      </td>
                      <td
                        className={`whitespace-nowrap px-1.5 py-2 font-medium ${
                          value < 0 ? "text-[#dc2626]" : value > 0 ? "text-[#c2660a]" : "text-[var(--octo-text-secondary)]"
                        }`}
                      >
                        {formatMoney(value)}
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
