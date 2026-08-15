import { useMemo, useState } from "react";
import { PackageSearch, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Button, Checkbox, EmptyState, Input, Select } from "@ui/primitives";
import { MiniKpiCard } from "../_shared/kpi-card";
import { Pagination } from "../_shared/pagination";
import {
  ingredientKpis,
  stockRows,
  BRANCHES,
  SUPPLIERS,
  type StockRow,
  type StockStatus,
} from "@/shared/api/mock-inventory";
import { useI18n } from "@/app/providers/i18n-provider";

const STATUS_STYLE: Record<StockStatus, string> = {
  "In Stock": "bg-success/10 text-[#16a34a]",
  "Low Stock": "bg-warning/10 text-[#c2660a]",
  "Out of Stock": "bg-error/10 text-[#dc2626]",
};

const STATUS_KEY: Record<StockStatus, string> = {
  "In Stock": "inventory.ingredients.status.inStock",
  "Low Stock": "inventory.ingredients.status.lowStock",
  "Out of Stock": "inventory.ingredients.status.outOfStock",
};

const CATEGORIES = Array.from(new Set(stockRows.map((r) => r.category))).sort();

type SortKey = "onHand" | "lastReceived";
type SortDir = "asc" | "desc";

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown size={11} className="opacity-40" />;
  return dir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />;
}

const PAGE_SIZE = 10;

export function IngredientsPage() {
  const { t, locale } = useI18n();
  const [query, setQuery] = useState("");
  const [supplier, setSupplier] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = stockRows.filter((row) => {
      if (supplier !== "all" && row.supplier !== supplier) return false;
      if (category !== "all" && row.category !== category) return false;
      if (lowStockOnly && row.status === "In Stock") return false;
      if (q && !row.ingredient.toLowerCase().includes(q) && !row.ingredientAr.includes(q)) return false;
      return true;
    });
    if (sortKey) {
      rows = [...rows].sort((a, b) => {
        const av = sortKey === "onHand" ? a.onHand : a.lastReceived;
        const bv = sortKey === "onHand" ? b.onHand : b.lastReceived;
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return rows;
  }, [query, supplier, category, lowStockOnly, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function resetFilters() {
    setQuery("");
    setSupplier("all");
    setCategory("all");
    setLowStockOnly(false);
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllOnPage() {
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = pageRows.every((r) => next.has(r.id));
      pageRows.forEach((r) => (allSelected ? next.delete(r.id) : next.add(r.id)));
      return next;
    });
  }

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("inventory.ingredients.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">
            {t("inventory.ingredients.subtitle")}
          </p>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MiniKpiCard label={t("inventory.ingredients.kpi.totalSkus")} value={ingredientKpis[0].value} />
        <MiniKpiCard label={t("inventory.ingredients.kpi.lowStock")} value={ingredientKpis[1].value} tone="warning" />
        <MiniKpiCard label={t("inventory.ingredients.kpi.stockValue")} value={ingredientKpis[2].value} />
        <MiniKpiCard label={t("inventory.ingredients.kpi.waste")} value={ingredientKpis[3].value} tone="warning" />
      </div>

      <section className="mt-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div className="flex items-center gap-2">
          <PackageSearch size={15} className="text-[var(--octo-text-muted)]" />
          <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("inventory.ingredients.listTitle")}</h2>
        </div>

        {selected.size > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-[9px] bg-[var(--octo-selected)] px-3 py-2">
            <span className="text-[12px] font-medium text-[#0D6EFD]">
              {t("inventory.common.selected").replace("{n}", String(selected.size))}
            </span>
            <Button size="sm" variant="primary" className="ms-2" onClick={() => setSelected(new Set())}>
              {t("inventory.ingredients.reorderSelected")}
            </Button>
            <Button size="sm" variant="ghost" className="ms-auto" onClick={() => setSelected(new Set())}>
              {t("inventory.common.clear")}
            </Button>
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="min-w-[200px] flex-1">
              <Input
                placeholder={t("inventory.ingredients.searchPlaceholder")}
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
              <option value="all">{t("inventory.ingredients.filter.allSuppliers")}</option>
              {SUPPLIERS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            <Select
              className="w-auto min-w-[150px]"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">{t("inventory.ingredients.filter.allCategories")}</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <label className="flex items-center gap-1.5 rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-[7px] text-[12px] font-medium text-[var(--octo-text-primary)]">
              <Checkbox
                checked={lowStockOnly}
                onChange={(e) => {
                  setLowStockOnly(e.target.checked);
                  setPage(1);
                }}
              />
              {t("inventory.ingredients.filter.lowStockOnly")}
            </label>
          </div>
        )}

        <div className="octo-scroll mt-3 overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-[var(--octo-divider)] text-start">
                <th className="w-8 px-2 py-2">
                  <Checkbox
                    checked={pageRows.length > 0 && pageRows.every((r) => selected.has(r.id))}
                    onChange={toggleAllOnPage}
                    aria-label={t("inventory.common.selectAll")}
                  />
                </th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                  {t("inventory.ingredients.col.ingredient")}
                </th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                  {t("inventory.ingredients.col.supplier")}
                </th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                  <button type="button" className="flex items-center gap-1" onClick={() => toggleSort("onHand")}>
                    {t("inventory.ingredients.col.onHand")}
                    <SortIcon active={sortKey === "onHand"} dir={sortDir} />
                  </button>
                </th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                  {t("inventory.ingredients.col.unit")}
                </th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                  {t("inventory.ingredients.col.parLevel")}
                </th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                  {t("inventory.ingredients.col.branch")}
                </th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                  {t("inventory.ingredients.col.status")}
                </th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                  <button type="button" className="flex items-center gap-1" onClick={() => toggleSort("lastReceived")}>
                    {t("inventory.ingredients.col.lastReceived")}
                    <SortIcon active={sortKey === "lastReceived"} dir={sortDir} />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row: StockRow) => {
                const below = row.onHand < row.parLevel;
                const barPct = Math.min(100, Math.round((row.onHand / Math.max(1, row.parLevel)) * 100));
                return (
                  <tr key={row.id} className="border-b border-[var(--octo-row-border)] last:border-0 hover:bg-[var(--octo-row-hover)]">
                    <td className="px-2 py-2.5">
                      <Checkbox
                        checked={selected.has(row.id)}
                        onChange={() => toggleRow(row.id)}
                        aria-label={row.ingredient}
                      />
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5">
                      <div className="font-semibold text-[var(--octo-text-primary)]">{row.ingredient}</div>
                      <div className="text-[11px] text-[var(--octo-text-muted)]">{row.ingredientAr}</div>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{row.supplier}</td>
                    <td className={`whitespace-nowrap px-2 py-2.5 font-medium ${below ? "text-[#EF4444]" : "text-[var(--octo-text-primary)]"}`}>
                      {row.onHand}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{row.unit}</td>
                    <td className="px-2 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--octo-text-secondary)]">{row.parLevel}</span>
                        <span className="h-1.5 w-14 overflow-hidden rounded-full bg-[var(--octo-track)]">
                          <span
                            className={`block h-full rounded-full ${below ? "bg-[#F59E0B]" : "bg-[#22C55E]"}`}
                            style={{ width: `${barPct}%` }}
                          />
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{row.branch}</td>
                    <td className="whitespace-nowrap px-2 py-2.5">
                      <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${STATUS_STYLE[row.status]}`}>
                        {t(STATUS_KEY[row.status])}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-faint)]">
                      {new Date(row.lastReceived).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {pageRows.length === 0 && (
            <EmptyState
              icon={<PackageSearch size={18} />}
              title={t("inventory.common.emptyTitle")}
              description={t("inventory.common.emptyDescription")}
              action={
                <Button variant="secondary" size="sm" onClick={resetFilters}>
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
    </div>
  );
}
