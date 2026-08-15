"use client";

import Link from "next/link";
import { useState } from "react";
import type { MenuCategory, MenuItem } from "@octopus/api-client";
import { AddToCartModal } from "@/features/cart/add-to-cart";
import { useOrderingSession } from "@/entities/order";
import type { Tenant } from "@/entities/tenant";
import { computeCartSubtotalSar, formatSar } from "@/shared/lib/pricing";
import { Breadcrumb } from "@/shared/ui";
import { MenuList } from "@/widgets/menu-list";

export interface MenuViewProps {
  tenant: Tenant;
  categories: MenuCategory[];
  items: MenuItem[];
}

export function MenuView({ tenant, categories, items }: MenuViewProps) {
  const { state } = useOrderingSession();
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  if (!state.channel) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-16 text-center">
        <p className="text-[12.5px] text-[var(--octo-text-secondary)]">
          الرجاء اختيار طريقة الاستلام أولاً.
        </p>
        <Link href="/" className="text-[12.5px] font-medium text-[#0D6EFD] hover:underline">
          العودة إلى الصفحة الرئيسية
        </Link>
      </div>
    );
  }

  const itemCount = state.lines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotalSar = computeCartSubtotalSar(state.lines);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 pb-24 pt-4 sm:px-[26px]">
      <Breadcrumb items={[{ label: "الرئيسية", href: "/" }, { label: "القائمة" }]} />
      <h1 className="text-[21px] font-bold text-[var(--octo-text-primary)]">{tenant.name}</h1>

      <MenuList categories={categories} items={items} channel={state.channel} onSelectItem={setSelectedItem} />

      <AddToCartModal item={selectedItem} onClose={() => setSelectedItem(null)} />

      {itemCount > 0 && (
        <Link
          href="/cart"
          className="fixed inset-x-0 bottom-0 z-20 mx-auto flex w-full max-w-6xl items-center justify-between bg-[#0D6EFD] px-4 py-3 text-white shadow-[0_-4px_14px_rgba(15,23,42,0.15)] sm:px-[26px]"
        >
          <span className="text-[12.5px] font-medium">{itemCount} عنصر في السلة</span>
          <span className="text-[12.5px] font-semibold">{formatSar(subtotalSar)}</span>
        </Link>
      )}
    </div>
  );
}
