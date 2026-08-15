import type { MenuCategory, MenuItem } from "@octopus/api-client";
import { ProductCard, SectionHeading } from "@/shared/ui";
import type { FulfillmentChannel } from "@/shared/lib/fulfillment";

export interface MenuListProps {
  categories: MenuCategory[];
  items: MenuItem[];
  channel: FulfillmentChannel;
  onSelectItem: (item: MenuItem) => void;
}

export function MenuList({ categories, items, channel, onSelectItem }: MenuListProps) {
  return (
    <div className="flex flex-col gap-6">
      {categories.map((category) => {
        const categoryItems = items.filter((item) => item.categoryId === category.id);
        if (categoryItems.length === 0) return null;

        return (
          <section key={category.id} className="flex flex-col gap-3">
            <SectionHeading title={category.name} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {categoryItems.map((item) => {
                const disabled = !item.availableFor.includes(channel);
                return (
                  <ProductCard
                    key={item.id}
                    item={item}
                    disabled={disabled}
                    disabledReason={disabled ? "غير متاح لهذا النوع من الطلبات" : undefined}
                    onSelect={onSelectItem}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
