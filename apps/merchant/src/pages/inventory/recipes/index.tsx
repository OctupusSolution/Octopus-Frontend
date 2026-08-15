import { useMemo, useState } from "react";
import { ChevronLeft, CornerDownRight, Search, TriangleAlert } from "lucide-react";
import { Input } from "@ui/primitives";
import {
  recipes,
  stockRows,
  recipeIngredientsCost,
  recipeLabourCost,
  recipeOverheadCost,
  recipeTotalCost,
  recipeFoodCostPct,
  recipeGrossMargin,
  formatMoney,
  type Recipe,
} from "@/shared/api/mock-inventory";
import { useI18n } from "@/app/providers/i18n-provider";

const ingredientById = new Map(stockRows.map((r) => [r.id, r] as const));
const sortedRecipes = [...recipes].sort((a, b) => a.name.localeCompare(b.name));

export function RecipesPage() {
  const { t, locale } = useI18n();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(sortedRecipes[0].id);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  const filteredList = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sortedRecipes;
    return sortedRecipes.filter((r) => r.name.toLowerCase().includes(q) || r.nameAr.includes(q));
  }, [query]);

  const selected: Recipe = recipes.find((r) => r.id === selectedId) ?? sortedRecipes[0];
  const ingredientsCost = recipeIngredientsCost(selected);
  const labourCost = recipeLabourCost(selected);
  const overheadCost = recipeOverheadCost(selected);
  const totalCost = recipeTotalCost(selected);
  const foodCostPct = recipeFoodCostPct(selected);
  const grossMargin = recipeGrossMargin(selected);
  const overTarget = foodCostPct > 35;

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("inventory.recipes.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">{t("inventory.recipes.subtitle")}</p>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[280px_1fr]">
        {/* Left: recipe list */}
        <section
          className={`rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] ${mobileShowDetail ? "hidden lg:block" : "block"}`}
        >
          <div className="border-b border-[var(--octo-divider)] p-3">
            <Input
              placeholder={t("inventory.recipes.searchPlaceholder")}
              icon={<Search size={13} />}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="octo-scroll max-h-[560px] overflow-y-auto p-2">
            {filteredList.map((r) => {
              const cost = recipeTotalCost(r);
              const margin = ((r.sellingPrice - cost) / r.sellingPrice) * 100;
              const active = r.id === selectedId;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(r.id);
                    setMobileShowDetail(true);
                  }}
                  className={`mb-1 flex w-full flex-col rounded-[9px] px-3 py-2 text-start transition-colors ${
                    active ? "bg-[var(--octo-selected)] text-[#0D6EFD]" : "text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]"
                  }`}
                >
                  <span className="text-[12.5px] font-semibold">{locale === "ar" ? r.nameAr : r.name}</span>
                  <span className={`mt-0.5 text-[11px] ${active ? "text-[#0D6EFD]/80" : "text-[var(--octo-text-muted)]"}`}>
                    {formatMoney(cost)} · {margin.toFixed(1)}%
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Right: selected recipe detail */}
        <section className={`space-y-3 ${mobileShowDetail ? "block" : "hidden lg:block"}`}>
          <button
            type="button"
            onClick={() => setMobileShowDetail(false)}
            className="mb-1 flex items-center gap-1 text-[12px] font-medium text-[#0D6EFD] lg:hidden"
          >
            <ChevronLeft size={13} className="shrink-0 rtl:rotate-180" />
            {t("inventory.recipes.backToList")}
          </button>

          <div className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-semibold text-[var(--octo-text-primary)]">{locale === "ar" ? selected.nameAr : selected.name}</h2>
                <p className="mt-1 text-[11.5px] text-[var(--octo-text-muted)]">
                  {t("inventory.recipes.yield")}: {selected.yieldPortions} · {selected.portionSize}
                </p>
              </div>
              <span className="rounded-full bg-[var(--octo-track)] px-2 py-1 text-[11px] font-medium text-[var(--octo-text-secondary)]">
                {selected.category}
              </span>
            </div>

            {overTarget && (
              <div className="mt-3 flex items-center gap-2 rounded-[9px] bg-error/10 px-3 py-2 text-[12px] font-medium text-[#dc2626]">
                <TriangleAlert size={14} />
                {t("inventory.recipes.foodCostWarning")}
              </div>
            )}

            <div className="octo-scroll mt-4 overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-[12.5px]">
                <thead>
                  <tr className="border-b border-[var(--octo-divider)] text-start">
                    {[
                      "inventory.recipes.col.ingredient",
                      "inventory.recipes.col.qty",
                      "inventory.recipes.col.unit",
                      "inventory.recipes.col.unitCost",
                      "inventory.recipes.col.lineCost",
                      "inventory.recipes.col.pctOfCost",
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
                  {selected.lines.map((line, i) => {
                    const ingredient = ingredientById.get(line.ingredientId);
                    const lineCost = line.qty * (ingredient?.unitCost ?? 0);
                    const pct = ingredientsCost === 0 ? 0 : (lineCost / ingredientsCost) * 100;
                    return (
                      <tr key={`${line.ingredientId}-${i}`} className="border-b border-[var(--octo-row-border)] last:border-0">
                        <td className="whitespace-nowrap px-2 py-2.5 font-medium text-[var(--octo-text-primary)]">
                          <span className="inline-flex items-center gap-1.5">
                            {line.isSubRecipe && <CornerDownRight size={12} className="text-[var(--octo-text-faint)]" />}
                            {ingredient?.ingredient}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{line.qty}</td>
                        <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{line.unit}</td>
                        <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{formatMoney(ingredient?.unitCost ?? 0)}</td>
                        <td className="whitespace-nowrap px-2 py-2.5 font-medium text-[var(--octo-text-primary)]">{formatMoney(lineCost)}</td>
                        <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{pct.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4">
              <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
                {t("inventory.recipes.costBreakdown")}
              </p>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-[var(--octo-track)]">
                <div className="h-full bg-[#0D6EFD]" style={{ width: `${(ingredientsCost / totalCost) * 100}%` }} />
                <div className="h-full bg-[#8b7cf0]" style={{ width: `${(labourCost / totalCost) * 100}%` }} />
                <div className="h-full bg-[#F59E0B]" style={{ width: `${(overheadCost / totalCost) * 100}%` }} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[var(--octo-text-secondary)]">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#0D6EFD]" />
                  {t("inventory.recipes.ingredientsCost")}: {formatMoney(ingredientsCost)}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#8b7cf0]" />
                  {t("inventory.recipes.labourCost")}: {formatMoney(labourCost)}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#F59E0B]" />
                  {t("inventory.recipes.overheadCost")}: {formatMoney(overheadCost)}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
                {t("inventory.recipes.totalCost")}
              </p>
              <p className="mt-2 text-[22px] font-bold text-[var(--octo-text-primary)]">{formatMoney(totalCost)}</p>
            </div>
            <div className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
                {t("inventory.recipes.sellingPrice")}
              </p>
              <p className="mt-2 text-[22px] font-bold text-[var(--octo-text-primary)]">{formatMoney(selected.sellingPrice)}</p>
            </div>
            <div className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
                {t("inventory.recipes.grossMargin")}
              </p>
              <p className={`mt-2 text-[22px] font-bold ${grossMargin >= 0 ? "text-[#16a34a]" : "text-[#dc2626]"}`}>
                {formatMoney(grossMargin)}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
                {t("inventory.recipes.foodCostPct")}
              </p>
              <p className={`mt-2 text-[22px] font-bold ${overTarget ? "text-[#dc2626]" : "text-[var(--octo-text-primary)]"}`}>
                {foodCostPct.toFixed(1)}%
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
