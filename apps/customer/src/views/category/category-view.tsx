"use client";

import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import type { MenuCategory, MenuGroup, MenuGroupId, MenuItem } from "@octopus/api-client";
import { useI18n } from "@/app/providers";
import { AddToCartModal } from "@/features/cart/add-to-cart";
import { useMenuFilters } from "@/features/menu/filter-items";
import { filterItems } from "@/shared/lib/storefront";
import { Breadcrumb, ProductCard, SectionHeading } from "@/shared/ui";
import { CategoryChipRail } from "@/widgets/category-chip-rail";
import { MenuFilterBar } from "@/widgets/menu-filter-bar";

export interface CategoryViewProps {
  category: MenuCategory;
  items: MenuItem[];
  groups: MenuGroup[];
}

export function CategoryView({ category, items, groups }: CategoryViewProps) {
  const { t } = useI18n();
  const { filters, setParam, toggleInList, clear } = useMenuFilters();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<MenuItem | null>(null);

  const visible = filterItems(items, filters);

  function handleChip(id: MenuGroupId) {
    setParam("group", id === "all" ? null : id);
  }

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-5 px-4 py-8 sm:px-6">
      <Breadcrumb
        items={[
          { label: t("store.nav.home"), href: "/" },
          { label: t("store.nav.menu"), href: "/menu" },
          { label: category.name },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <SectionHeading title={t("store.section.availableMeals")} />
          {/* The live match count. The design reads (500); a frozen number
              beside twenty-four visible cards would be a lie on the page. */}
          <span className="text-[15px] text-[var(--octo-text-muted)]">({visible.length})</span>
        </div>

        <button
          type="button"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((v) => !v)}
          className={`inline-flex items-center gap-2 rounded-[10px] px-4 py-2 text-[12.5px] transition-colors ${
            filtersOpen
              ? "bg-[#0D6EFD] text-white"
              : "border border-[var(--octo-border-input)] text-[var(--octo-text-secondary)] hover:bg-[var(--octo-hover)]"
          }`}
        >
          <SlidersHorizontal size={15} aria-hidden="true" />
          {t("store.filter.toggle")}
        </button>
      </div>

      {filtersOpen && (
        <MenuFilterBar filters={filters} setParam={setParam} toggleInList={toggleInList} />
      )}

      <CategoryChipRail groups={groups} activeGroup={filters.group} onSelect={handleChip} />

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-[12.5px] text-[var(--octo-text-secondary)]">{t("store.filter.empty")}</p>
          <button
            type="button"
            onClick={clear}
            className="text-[12.5px] font-medium text-[#0D6EFD] hover:underline"
          >
            {t("store.filter.clear")}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {visible.map((item) => (
            <ProductCard
              key={item.id}
              item={item}
              href={`/menu/${category.slug}/${item.id}`}
              onAdd={setSelected}
            />
          ))}
        </div>
      )}

      <AddToCartModal item={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
