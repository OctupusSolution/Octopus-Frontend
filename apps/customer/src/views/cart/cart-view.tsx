"use client";

import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EmptyState } from "@ui/primitives";
import type { MenuCategory, MenuItem, OrderLine } from "@octopus/api-client";
import { useI18n } from "@/app/providers";
import { useOrderingSession } from "@/entities/order";
import type { Tenant } from "@/entities/tenant";
import { AddToCartModal } from "@/features/cart/add-to-cart";
import { computePromoDiscountSar } from "@/shared/lib/pricing";
import { bestSellers, computeCartPricing, relatedItems } from "@/shared/lib/storefront";
import { Breadcrumb, SectionHeading } from "@/shared/ui";
import { CartLines } from "@/widgets/cart-lines";
import { CartTotals } from "@/widgets/cart-totals";
import { ProductRow } from "@/widgets/product-row";

export interface CartViewProps {
  tenant: Tenant;
  categories: MenuCategory[];
  items: MenuItem[];
}

export function CartView({ categories, items }: CartViewProps) {
  const { t } = useI18n();
  const router = useRouter();
  const { state, updateQuantity, removeLine } = useOrderingSession();
  const [selected, setSelected] = useState<MenuItem | null>(null);

  // The design's breadcrumb names the product the customer came from, so it
  // is read off the most recent line.
  const lastLine = state.lines[state.lines.length - 1] ?? null;
  const lastItem = lastLine ? items.find((i) => i.id === lastLine.menuItemId) ?? null : null;
  const lastCategory = lastItem
    ? categories.find((c) => c.id === lastItem.categoryId) ?? null
    : null;

  const pricing = computeCartPricing(state.lines);
  const discountSar = state.promoCode
    ? computePromoDiscountSar(pricing.totalSar, state.promoCode)
    : 0;

  const suggestions = lastItem ? relatedItems(items, lastItem) : bestSellers(items);

  function itemFor(line: OrderLine): MenuItem | null {
    return items.find((i) => i.id === line.menuItemId) ?? null;
  }

  function imageFor(line: OrderLine): string | null {
    return itemFor(line)?.imageUrl ?? null;
  }

  function hrefForItem(item: MenuItem): string {
    const category = categories.find((c) => c.id === item.categoryId);
    return category ? `/menu/${category.slug}/${item.id}` : "/menu";
  }

  function hrefForLine(line: OrderLine): string {
    const item = itemFor(line);
    if (!item) return "/menu";
    return `${hrefForItem(item)}?line=${line.lineId}`;
  }

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-12 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-5">
        <Breadcrumb
          items={[
            { label: t("store.nav.home"), href: "/" },
            { label: t("store.nav.menu"), href: "/menu" },
            ...(lastCategory
              ? [{ label: lastCategory.name, href: `/menu/${lastCategory.slug}` }]
              : []),
            ...(lastItem && lastCategory
              ? [{ label: lastItem.name, href: hrefForItem(lastItem) }]
              : []),
            { label: t("store.cart.title") },
          ]}
        />

        <div className="flex items-baseline gap-2">
          <SectionHeading title={t("store.cart.title")} />
          <span className="text-[15px] text-[var(--octo-text-muted)]">({state.lines.length})</span>
        </div>

        {state.lines.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag size={18} />}
            title={t("store.cart.empty")}
            action={
              <Link
                href="/menu"
                className="inline-flex items-center justify-center rounded-[10px] bg-[var(--octo-brand)] px-4 py-2 text-[12.5px] font-medium text-white transition-opacity hover:opacity-90"
              >
                {t("store.cart.browse")}
              </Link>
            }
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <CartLines
              lines={state.lines}
              imageFor={imageFor}
              hrefFor={hrefForLine}
              onQuantityChange={updateQuantity}
              onRemove={removeLine}
            />

            <CartTotals
              pricing={pricing}
              discountSar={discountSar}
              onContinue={() => router.push("/fulfillment")}
            />
          </div>
        )}
      </div>

      <ProductRow
        id="also-buy"
        title={t("store.cart.alsoBuy")}
        items={suggestions}
        hrefFor={hrefForItem}
        onAdd={setSelected}
      />

      <AddToCartModal item={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
