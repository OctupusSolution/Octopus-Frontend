"use client";

import type { MenuItem } from "@octopus/api-client";
import { ProductCard, SectionHeading } from "@/shared/ui";

export interface ProductRowProps {
  id: string;
  title: string;
  items: MenuItem[];
  hrefFor: (item: MenuItem) => string;
  onAdd: (item: MenuItem) => void;
}

export function ProductRow({ id, title, items, hrefFor, onAdd }: ProductRowProps) {
  if (items.length === 0) return null;

  return (
    <section className="flex flex-col gap-5">
      <SectionHeading id={id} title={title} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <ProductCard key={item.id} item={item} href={hrefFor(item)} onAdd={onAdd} />
        ))}
      </div>
    </section>
  );
}
