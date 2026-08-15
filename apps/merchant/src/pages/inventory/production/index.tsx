import { useMemo, useState } from "react";
import { ChefHat } from "lucide-react";
import { Button, EmptyState, Input, Select } from "@ui/primitives";
import { MiniKpiCard } from "../_shared/kpi-card";
import { Pagination } from "../_shared/pagination";
import { Drawer } from "../_shared/drawer";
import {
  productionBatches as initialBatches,
  productionKpis,
  batchYieldVariancePct,
  recipes,
  stockRows,
  BRANCHES,
  type ProductionBatch,
  type BatchStatus,
} from "@/shared/api/mock-inventory";
import { useI18n } from "@/app/providers/i18n-provider";

const STATUS_STYLE: Record<BatchStatus, string> = {
  Planned: "bg-[var(--octo-track)] text-[var(--octo-text-secondary)]",
  "In Progress": "bg-info/10 text-[#0D6EFD]",
  Completed: "bg-success/10 text-[#16a34a]",
  Failed: "bg-error/10 text-[#dc2626]",
};
const STATUS_KEY: Record<BatchStatus, string> = {
  Planned: "inventory.production.status.planned",
  "In Progress": "inventory.production.status.inProgress",
  Completed: "inventory.production.status.completed",
  Failed: "inventory.production.status.failed",
};

const recipeById = new Map(recipes.map((r) => [r.id, r] as const));
const ingredientById = new Map(stockRows.map((r) => [r.id, r] as const));
const PAGE_SIZE = 10;

export function ProductionPage() {
  const { t } = useI18n();
  const [recipe, setRecipe] = useState("all");
  const [branch, setBranch] = useState("all");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [activeId, setActiveId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return initialBatches.filter((b) => {
      if (recipe !== "all" && b.recipeId !== recipe) return false;
      if (branch !== "all" && b.branch !== branch) return false;
      if (status !== "all" && b.status !== status) return false;
      if (from && b.started.slice(0, 10) < from) return false;
      if (to && b.started.slice(0, 10) > to) return false;
      return true;
    });
  }, [recipe, branch, status, from, to]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const active = initialBatches.find((b) => b.id === activeId) ?? null;

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("inventory.production.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">{t("inventory.production.subtitle")}</p>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MiniKpiCard label={t("inventory.production.kpi.batchesToday")} value={productionKpis[0].value} />
        <MiniKpiCard label={t("inventory.production.kpi.inProgress")} value={productionKpis[1].value} />
        <MiniKpiCard label={t("inventory.production.kpi.yieldVariance")} value={productionKpis[2].value} tone="error" />
        <MiniKpiCard label={t("inventory.production.kpi.prepCost")} value={productionKpis[3].value} />
      </div>

      <section className="mt-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div className="flex items-center gap-2">
          <ChefHat size={15} className="text-[var(--octo-text-muted)]" />
          <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("inventory.production.listTitle")}</h2>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Select
            className="w-auto min-w-[150px]"
            value={recipe}
            onChange={(e) => {
              setRecipe(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">{t("inventory.production.filter.allRecipes")}</option>
            {recipes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
          <Select
            className="w-auto min-w-[140px]"
            value={branch}
            onChange={(e) => {
              setBranch(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">{t("inventory.production.filter.allBranches")}</option>
            {BRANCHES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </Select>
          <Select
            className="w-auto min-w-[130px]"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">{t("inventory.production.filter.allStatuses")}</option>
            {(Object.keys(STATUS_KEY) as BatchStatus[]).map((s) => (
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
                  "inventory.production.col.batchId",
                  "inventory.production.col.recipe",
                  "inventory.production.col.plannedQty",
                  "inventory.production.col.actualYield",
                  "inventory.production.col.variancePct",
                  "inventory.production.col.kitchen",
                  "inventory.production.col.started",
                  "inventory.production.col.status",
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
              {pageRows.map((b) => {
                const isPlanned = b.status === "Planned";
                const varPct = isPlanned ? null : batchYieldVariancePct(b);
                const over = varPct !== null && Math.abs(varPct) > 5;
                return (
                  <tr
                    key={b.id}
                    onClick={() => setActiveId(b.id)}
                    className="cursor-pointer border-b border-[var(--octo-row-border)] last:border-0 hover:bg-[var(--octo-row-hover)]"
                  >
                    <td className="whitespace-nowrap px-2 py-2.5 font-semibold text-[var(--octo-text-primary)]">{b.id}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 font-medium text-[var(--octo-text-primary)]">
                      {recipeById.get(b.recipeId)?.name}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{b.plannedQty}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">
                      {isPlanned ? "—" : b.actualYield}
                    </td>
                    <td
                      className={`whitespace-nowrap px-2 py-2.5 font-medium ${
                        varPct === null ? "text-[var(--octo-text-faint)]" : over ? "text-[#dc2626]" : "text-[var(--octo-text-secondary)]"
                      }`}
                    >
                      {varPct === null ? "—" : `${varPct.toFixed(1)}%`}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{b.branch}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-faint)]">{b.started}</td>
                    <td className="whitespace-nowrap px-2 py-2.5">
                      <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${STATUS_STYLE[b.status]}`}>
                        {t(STATUS_KEY[b.status])}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {pageRows.length === 0 && (
            <EmptyState
              icon={<ChefHat size={18} />}
              title={t("inventory.common.emptyTitle")}
              description={t("inventory.common.emptyDescription")}
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setRecipe("all");
                    setBranch("all");
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
        subtitle={active ? `${active.branch} · ${active.started}` : undefined}
      >
        {active && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-[var(--octo-border-card)] px-3 py-2.5">
                <p className="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                  {t("inventory.production.drawer.recipe")}
                </p>
                <p className="mt-0.5 text-[12.5px] font-medium text-[var(--octo-text-primary)]">
                  {recipeById.get(active.recipeId)?.name}
                </p>
              </div>
              <div className="rounded-lg border border-[var(--octo-border-card)] px-3 py-2.5">
                <p className="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                  {t("inventory.production.drawer.operator")}
                </p>
                <p className="mt-0.5 text-[12.5px] font-medium text-[var(--octo-text-primary)]">{active.operator}</p>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-[11.5px] font-semibold text-[var(--octo-text-primary)]">
                {t("inventory.production.drawer.consumedVsTheoretical")}
              </h3>
              <div className="octo-scroll -mx-1 overflow-x-auto px-1">
                <table className="w-full min-w-[420px] border-collapse text-[12px]">
                  <thead>
                    <tr className="border-b border-[var(--octo-divider)] text-start">
                      {[
                        "inventory.production.drawer.col.ingredient",
                        "inventory.production.drawer.col.theoretical",
                        "inventory.production.drawer.col.actual",
                        "inventory.production.drawer.col.variance",
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
                    {active.consumed.map((line) => {
                      const ingredient = ingredientById.get(line.ingredientId);
                      const diff = line.actual - line.theoretical;
                      const pct = line.theoretical === 0 ? 0 : (diff / line.theoretical) * 100;
                      const over = Math.abs(pct) > 5;
                      return (
                        <tr key={line.ingredientId} className="border-b border-[var(--octo-row-border)] last:border-0">
                          <td className="whitespace-nowrap px-1.5 py-2 font-medium text-[var(--octo-text-primary)]">{ingredient?.ingredient}</td>
                          <td className="whitespace-nowrap px-1.5 py-2 text-[var(--octo-text-secondary)]">
                            {line.theoretical} {line.unit}
                          </td>
                          <td className="whitespace-nowrap px-1.5 py-2 text-[var(--octo-text-secondary)]">
                            {line.actual} {line.unit}
                          </td>
                          <td
                            className={`whitespace-nowrap px-1.5 py-2 font-medium ${
                              over ? "text-[#dc2626]" : "text-[var(--octo-text-secondary)]"
                            }`}
                          >
                            {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)}
                            <span className="text-[var(--octo-text-faint)]"> · {pct.toFixed(1)}%</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-lg border border-[var(--octo-border-card)] px-3 py-2.5">
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                {t("inventory.production.drawer.notes")}
              </p>
              <p className="mt-0.5 text-[12.5px] text-[var(--octo-text-secondary)]">
                {active.notes || t("inventory.production.drawer.noNotes")}
              </p>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
