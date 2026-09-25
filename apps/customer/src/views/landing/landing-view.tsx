"use client";

import { useState } from "react";
import type { MenuCategory, MenuItem } from "@octopus/api-client";
import { useI18n } from "@/app/providers";
import { AddToCartModal } from "@/features/cart/add-to-cart";
import type { Tenant } from "@/entities/tenant";
import { bestSellers, offers } from "@/shared/lib/storefront";
import { SectionHeading } from "@/shared/ui";
import { CategoryMosaic } from "@/widgets/category-mosaic";
import { ProductRow } from "@/widgets/product-row";
import { StoreHero } from "@/widgets/store-hero";

export interface LandingViewProps {
  tenant: Tenant;
  hero?: import("@/widgets/store-hero").StoreHeroProps["copy"];
  categories: MenuCategory[];
  items: MenuItem[];
}

export function LandingView({ categories, items, hero }: LandingViewProps) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<MenuItem | null>(null);

  function hrefFor(item: MenuItem): string {
    const category = categories.find((c) => c.id === item.categoryId);
    return category ? `/menu/${category.slug}/${item.id}` : "/menu";
  }

  return (
    <>
      <StoreHero copy={hero} />

      <div className="mx-auto flex max-w-[1200px] flex-col gap-14 px-4 py-14 sm:px-6">
        <section className="flex flex-col gap-5">
          <SectionHeading id="menu" title={t("store.section.menu")} />
          <CategoryMosaic categories={categories} />
        </section>

        <ProductRow
          id="best-sellers"
          title={t("store.section.bestSellers")}
          items={bestSellers(items)}
          hrefFor={hrefFor}
          onAdd={setSelected}
        />

        <ProductRow
          id="offers"
          title={t("store.section.offers")}
          items={offers(items)}
          hrefFor={hrefFor}
          onAdd={setSelected}
        />
      </div>

      <AddToCartModal item={selected} onClose={() => setSelected(null)} />
    </>
  );
}
