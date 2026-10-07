"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import type { AllergenId, DietaryId, MenuCategory, MenuGroup, MenuGroupId, MenuItem } from "@octopus/api-client";
import { useI18n } from "@/app/providers";
import { useMenuFilters } from "@/features/menu/filter-items";
import { filterItems, type MenuFilters } from "@/shared/lib/storefront";
import { useMobileFlow } from "@/shared/lib/flow-context";
import { TableBackTitle, TableButton, TableIcon, TableSheet } from "@/shared/ui/table";
import { TableItemGrid } from "@/widgets/table-item-card";
import { TableFooter, TableTopCard } from "@/widgets/table-shell";

export interface TableMenuViewProps {
  categories: MenuCategory[];
  items: MenuItem[];
  groups: MenuGroup[];
}

const PRICE_RANGES: readonly { value: string; labelKey: string; vars: Record<string, number> }[] = [
  { value: "0-50", labelKey: "store.filter.priceUnder", vars: { n: 50 } },
  { value: "50-100", labelKey: "store.filter.priceRange", vars: { a: 50, b: 100 } },
  { value: "100-200", labelKey: "store.filter.priceRange", vars: { a: 100, b: 200 } },
  { value: "200-", labelKey: "store.filter.priceOver", vars: { n: 200 } },
];
const ALLERGENS: readonly AllergenId[] = ["gluten", "dairy", "eggs", "nuts", "soy", "seafood"];
const DIETARY: readonly DietaryId[] = ["vegetarian", "vegan", "gluten_free", "spicy", "healthy"];
const MEAL_TYPES: readonly MenuGroupId[] = [
  "chicken", "meat", "burger", "pizza", "sides", "appetizers", "salads",
];
/** The query keys the sheet owns. `category` is the page's, and survives a reset. */
export const FILTER_KEYS = ["group", "best", "available", "price", "diet", "allergen"] as const;

type Panel = "price" | "allergens" | "dietary" | "mealType";

const ROW_ON = "border-ocean-blue bg-[var(--octo-store-select-soft)] text-[var(--octo-store-price)]";
const ROW_OFF = "border-gray-300 text-gray-900";

function FilterRow({
  label, active, expanded, chevron = true, onClick,
}: { label: string; active: boolean; expanded?: boolean; chevron?: boolean; onClick: () => void }) {
  // The pickup frames draw the same rows with a rounder corner.
  const corner = useMobileFlow().mode === "pickup" ? "rounded-[20px]" : "rounded-[12px]";

  return (
    <button
      type="button"
      aria-pressed={expanded === undefined ? active : undefined}
      aria-expanded={expanded}
      onClick={onClick}
      className={`flex h-10 w-full items-center justify-between border px-3 text-[16px] leading-none ${corner} ${
        active ? ROW_ON : ROW_OFF
      }`}
    >
      {label}
      {chevron && (
        <TableIcon name="chevron" className={expanded ? "-rotate-90 -scale-y-100" : "rotate-90 -scale-y-100"} />
      )}
    </button>
  );
}

function FilterOption({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex h-9 items-center rounded-[12px] border px-3 text-[14px] leading-none ${
        active ? ROW_ON : ROW_OFF
      }`}
    >
      {label}
    </button>
  );
}

function FilterPanel({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  filters: MenuFilters;
  setParam: (key: string, value: string | null) => void;
  toggleInList: (key: string, value: string) => void;
  onReset: () => void;
}

export function FilterSheet({ open, onClose, filters, setParam, toggleInList, onReset }: FilterSheetProps) {
  const { t } = useI18n();
  const [panel, setPanel] = useState<Panel | null>(null);

  const activePrice =
    filters.minPriceSar === null && filters.maxPriceSar === null
      ? null
      : `${filters.minPriceSar ?? ""}-${filters.maxPriceSar ?? ""}`;

  const toggle = (next: Panel) => setPanel((current) => (current === next ? null : next));

  return (
    <TableSheet open={open} onClose={onClose} label={t("store.filter.toggle")}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <h2 className="text-[18px] font-bold leading-none text-gray-900">{t("store.filter.toggle")}</h2>

          <div className="flex flex-col gap-4">
            <FilterRow
              label={t("store.filter.bestSellers")}
              active={filters.bestSellersOnly}
              chevron={false}
              onClick={() => setParam("best", filters.bestSellersOnly ? null : "1")}
            />

            <FilterRow
              label={t("store.filter.price")}
              active={activePrice !== null}
              expanded={panel === "price"}
              onClick={() => toggle("price")}
            />
            {panel === "price" && (
              <FilterPanel>
                {PRICE_RANGES.map((range) => (
                  <FilterOption
                    key={range.value}
                    label={t(range.labelKey, range.vars)}
                    active={activePrice === range.value}
                    onClick={() => setParam("price", activePrice === range.value ? null : range.value)}
                  />
                ))}
              </FilterPanel>
            )}

            <FilterRow
              label={t("store.filter.allergens")}
              active={filters.excludeAllergens.length > 0}
              expanded={panel === "allergens"}
              onClick={() => toggle("allergens")}
            />
            {panel === "allergens" && (
              <FilterPanel>
                {ALLERGENS.map((id) => (
                  <FilterOption
                    key={id}
                    label={t(`store.allergen.${id}`)}
                    active={filters.excludeAllergens.includes(id)}
                    onClick={() => toggleInList("allergen", id)}
                  />
                ))}
              </FilterPanel>
            )}

            <FilterRow
              label={t("store.filter.dietary")}
              active={filters.dietary.length > 0}
              expanded={panel === "dietary"}
              onClick={() => toggle("dietary")}
            />
            {panel === "dietary" && (
              <FilterPanel>
                {DIETARY.map((id) => (
                  <FilterOption
                    key={id}
                    label={t(`store.dietary.${id}`)}
                    active={filters.dietary.includes(id)}
                    onClick={() => toggleInList("diet", id)}
                  />
                ))}
              </FilterPanel>
            )}

            <FilterRow
              label={t("store.filter.mealType")}
              active={filters.group !== null}
              expanded={panel === "mealType"}
              onClick={() => toggle("mealType")}
            />
            {panel === "mealType" && (
              <FilterPanel>
                {MEAL_TYPES.map((id) => (
                  <FilterOption
                    key={id}
                    label={t(`store.group.${id}`)}
                    active={filters.group === id}
                    onClick={() => setParam("group", filters.group === id ? null : id)}
                  />
                ))}
              </FilterPanel>
            )}

            <FilterRow
              label={t("store.filter.available")}
              active={filters.availableOnly}
              onClick={() => setParam("available", filters.availableOnly ? null : "1")}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <TableButton size="lg" onClick={onClose}>
            {t("store.table.filterApply")}
          </TableButton>
          <button
            type="button"
            onClick={onReset}
            className="flex h-12 w-full items-center justify-center gap-1 rounded-[24px] text-[16px] font-medium leading-none text-[var(--octo-store-select-text)]"
          >
            <TableIcon name="reload" />
            {t("store.table.filterReset")}
          </button>
        </div>
      </div>
    </TableSheet>
  );
}

export function TableMenuView({ categories, items, groups }: TableMenuViewProps) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { filters, setParam, toggleInList } = useMenuFilters();
  const flow = useMobileFlow();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [query, setQuery] = useState("");

  const category = categories.find((c) => c.slug === searchParams.get("category")) ?? null;
  const scoped = category ? items.filter((item) => item.categoryId === category.id) : items;
  const needle = query.trim().toLowerCase();
  const visible = filterItems(scoped, filters).filter(
    (item) => !needle || item.name.toLowerCase().includes(needle),
  );

  function resetFilters() {
    const next = new URLSearchParams(searchParams.toString());
    FILTER_KEYS.forEach((key) => next.delete(key));
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-4">
      <TableTopCard />

      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <div className="px-4">
              <TableBackTitle
                title={category?.name ?? t("store.nav.menu")}
                count={visible.length}
                backHref={flow.mode === "table" ? flow.home : flow.menuIndex}
                backLabel={t("store.table.back")}
              />
            </div>

            <ul className="flex gap-4 overflow-x-auto bg-gray-100 px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {groups.map((group) => {
                // "all" is the resting state, so it lights up when nothing is chosen.
                const active = group.id === "all" ? filters.group === null : filters.group === group.id;
                return (
                  <li key={group.id} className="shrink-0">
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => setParam("group", group.id === "all" ? null : group.id)}
                      className="flex min-w-12 flex-col items-center gap-2"
                    >
                      <span
                        className={`flex size-12 items-center justify-center rounded-full bg-gray-100 drop-shadow-[0_0_5px_rgba(0,0,0,0.1)] ${
                          active ? "border-2 border-ocean-blue" : ""
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={group.imageUrl}
                          alt=""
                          loading="lazy"
                          className={`object-contain ${active ? "size-[27px]" : "size-[33px]"}`}
                        />
                      </span>
                      <span
                        className={`whitespace-nowrap text-[12px] font-bold leading-none ${
                          active ? "text-[var(--octo-store-price)]" : "text-black"
                        }`}
                      >
                        {t(`store.group.${group.id}`)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="flex gap-2 px-4">
              <label className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-[12px] border border-gray-300 p-2">
                <TableIcon name="search" />
                <input
                  type="text"
                  inputMode="search"
                  enterKeyHint="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t("store.table.search")}
                  aria-label={t("store.table.search")}
                  className="min-w-0 flex-1 bg-transparent text-[14px] leading-none text-gray-900 outline-none placeholder:text-[var(--octo-store-select-label)]"
                />
              </label>
              <button
                type="button"
                aria-label={t("store.filter.toggle")}
                aria-expanded={sheetOpen}
                onClick={() => setSheetOpen(true)}
                className="flex size-12 shrink-0 items-center justify-center rounded-[12px] bg-gray-100"
              >
                <TableIcon name="filter" />
              </button>
            </div>
          </div>

          <div className="px-4">
            {visible.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <p className="text-[14px] text-[var(--octo-store-select-label)]">{t("store.filter.empty")}</p>
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    resetFilters();
                  }}
                  className="text-[14px] font-medium text-[var(--octo-store-select-text)]"
                >
                  {t("store.filter.clear")}
                </button>
              </div>
            ) : (
              <TableItemGrid items={visible} />
            )}
          </div>
        </div>

        <TableFooter />
      </div>

      <FilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        filters={filters}
        setParam={setParam}
        toggleInList={toggleInList}
        onReset={resetFilters}
      />
    </div>
  );
}
