"use client";

import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { AllergenId, DietaryId, MenuGroupId } from "@octopus/api-client";
import { useI18n } from "@/app/providers";
import type { MenuFilters } from "@/shared/lib/storefront";

export interface MenuFilterBarProps {
  filters: MenuFilters;
  setParam: (key: string, value: string | null) => void;
  toggleInList: (key: string, value: string) => void;
}

interface PriceRange {
  value: string;
  labelKey: string;
  vars: Record<string, number>;
}

const PRICE_RANGES: readonly PriceRange[] = [
  { value: "0-50", labelKey: "store.filter.priceUnder", vars: { n: 50 } },
  { value: "50-100", labelKey: "store.filter.priceRange", vars: { a: 50, b: 100 } },
  { value: "100-200", labelKey: "store.filter.priceRange", vars: { a: 100, b: 200 } },
  { value: "200-", labelKey: "store.filter.priceOver", vars: { n: 200 } },
];

const ALLERGENS: readonly AllergenId[] = ["gluten", "dairy", "eggs", "nuts", "soy", "seafood"];
const DIETARY: readonly DietaryId[] = ["vegetarian", "vegan", "gluten_free", "spicy", "healthy"];
const GROUPS: readonly MenuGroupId[] = [
  "chicken", "meat", "burger", "pizza", "sides", "appetizers", "salads",
];

const CELL = "flex flex-1 items-center gap-2 px-4 py-3 text-[12.5px]";
const EDGE = "border-e border-[var(--octo-divider)]";

function CheckLabel({
  label, checked, onChange,
}: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[12px] text-[var(--octo-text-secondary)]">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-[14px] w-[14px] shrink-0 accent-[#0D6EFD]"
      />
      {label}
    </label>
  );
}

/** A cell whose panel opens below it. Only one panel is open at a time —
 *  opening another closes the first, which is what a single toolbar implies. */
function DropdownCell({
  label, open, onToggle, last, children,
}: { label: string; open: boolean; onToggle: () => void; last?: boolean; children: ReactNode }) {
  return (
    <div className={`relative min-w-[150px] flex-1 ${last ? "" : EDGE}`}>
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className={`${CELL} w-full justify-between text-[var(--octo-text-secondary)]`}
      >
        {label}
        <ChevronDown
          size={15}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-20 mt-1 flex flex-col gap-2 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-3 shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
          {children}
        </div>
      )}
    </div>
  );
}

export function MenuFilterBar({ filters, setParam, toggleInList }: MenuFilterBarProps) {
  const { t } = useI18n();
  const [openCell, setOpenCell] = useState<string | null>(null);

  const toggleCell = (id: string) => setOpenCell((current) => (current === id ? null : id));

  // Round-trips the parsed range back to the parameter the radios write, so
  // the right one shows as chosen after a reload.
  const currentPrice =
    filters.minPriceSar === null && filters.maxPriceSar === null
      ? null
      : `${filters.minPriceSar ?? ""}-${filters.maxPriceSar ?? ""}`;

  return (
    <div className="flex flex-wrap items-stretch rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)]">
      <div
        className={`${CELL} ${EDGE} min-w-[150px] ${
          filters.bestSellersOnly ? "bg-[var(--octo-selected)] ring-1 ring-inset ring-[#0D6EFD]" : ""
        }`}
      >
        <CheckLabel
          label={t("store.filter.bestSellers")}
          checked={filters.bestSellersOnly}
          onChange={() => setParam("best", filters.bestSellersOnly ? null : "1")}
        />
      </div>

      <DropdownCell
        label={t("store.filter.price")}
        open={openCell === "price"}
        onToggle={() => toggleCell("price")}
      >
        {PRICE_RANGES.map((range) => (
          <label
            key={range.value}
            className="flex cursor-pointer items-center gap-2 text-[12px] text-[var(--octo-text-secondary)]"
          >
            <input
              type="radio"
              name="price"
              checked={currentPrice === range.value}
              onChange={() => setParam("price", range.value)}
              className="h-[14px] w-[14px] shrink-0 accent-[#0D6EFD]"
            />
            {t(range.labelKey, range.vars)}
          </label>
        ))}
        <button
          type="button"
          onClick={() => setParam("price", null)}
          className="mt-1 text-start text-[11px] text-[#0D6EFD]"
        >
          {t("store.filter.clear")}
        </button>
      </DropdownCell>

      <DropdownCell
        label={t("store.filter.allergens")}
        open={openCell === "allergen"}
        onToggle={() => toggleCell("allergen")}
      >
        {ALLERGENS.map((id) => (
          <CheckLabel
            key={id}
            label={t(`store.allergen.${id}`)}
            checked={filters.excludeAllergens.includes(id)}
            onChange={() => toggleInList("allergen", id)}
          />
        ))}
      </DropdownCell>

      <DropdownCell
        label={t("store.filter.dietary")}
        open={openCell === "diet"}
        onToggle={() => toggleCell("diet")}
      >
        {DIETARY.map((id) => (
          <CheckLabel
            key={id}
            label={t(`store.dietary.${id}`)}
            checked={filters.dietary.includes(id)}
            onChange={() => toggleInList("diet", id)}
          />
        ))}
      </DropdownCell>

      <DropdownCell
        label={t("store.filter.mealType")}
        open={openCell === "group"}
        onToggle={() => toggleCell("group")}
      >
        {GROUPS.map((id) => (
          <label
            key={id}
            className="flex cursor-pointer items-center gap-2 text-[12px] text-[var(--octo-text-secondary)]"
          >
            <input
              type="radio"
              name="mealType"
              checked={filters.group === id}
              onChange={() => setParam("group", id)}
              className="h-[14px] w-[14px] shrink-0 accent-[#0D6EFD]"
            />
            {t(`store.group.${id}`)}
          </label>
        ))}
      </DropdownCell>

      <div className={`${CELL} min-w-[150px] justify-end`}>
        <CheckLabel
          label={t("store.filter.available")}
          checked={filters.availableOnly}
          onChange={() => setParam("available", filters.availableOnly ? null : "1")}
        />
      </div>
    </div>
  );
}
