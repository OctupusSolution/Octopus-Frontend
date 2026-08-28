"use client";

import { Flame } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { MenuCategory, MenuItem, OrderLine, OrderLineModifier } from "@octopus/api-client";
import { useI18n } from "@/app/providers";
import { useOrderingSession } from "@/entities/order";
import { AttachImage, type AttachedImage } from "@/features/cart/attach-image";
import { discountPercent, relatedItems } from "@/shared/lib/storefront";
import { Breadcrumb, PriceBlock, QuantityStepper, RatingStars, SectionHeading } from "@/shared/ui";
import { AllergenPanel } from "@/widgets/allergen-panel";
import { PriceBreakdown } from "@/widgets/price-breakdown";
import { ProductCustomizer, type ModifierSelections } from "@/widgets/product-customizer";
import { ProductGallery } from "@/widgets/product-gallery";
import { ProductRow } from "@/widgets/product-row";

export interface ProductViewProps {
  item: MenuItem;
  category: MenuCategory;
  categories: MenuCategory[];
  items: MenuItem[];
}

/** Restores what an edited line had chosen; otherwise required single-choice
 *  groups start on their first option, which is what the design shows — every
 *  pill row has one already lit. */
function selectionsFrom(item: MenuItem, line: OrderLine | null): ModifierSelections {
  const seeded: ModifierSelections = {};
  for (const group of item.modifierGroups) {
    const fromLine = line?.modifiers.filter((m) => m.groupId === group.id).map((m) => m.optionId);
    if (fromLine && fromLine.length > 0) {
      seeded[group.id] = fromLine;
      continue;
    }
    seeded[group.id] =
      group.required && !group.multiple && group.options.length > 0 ? [group.options[0].id] : [];
  }
  return seeded;
}

export function ProductView({ item, category, categories, items }: ProductViewProps) {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state, addLine, replaceLine } = useOrderingSession();

  const editingLineId = searchParams.get("line");
  const editingLine = state.lines.find((line) => line.lineId === editingLineId) ?? null;

  const [selections, setSelections] = useState<ModifierSelections>(
    () => selectionsFrom(item, editingLine),
  );
  const [quantity, setQuantity] = useState(() => editingLine?.quantity ?? 1);
  const [image, setImage] = useState<AttachedImage | null>(null);

  const percent = discountPercent(item);
  const soldOut = item.inStock === false;
  const images = item.images && item.images.length > 0 ? item.images : [item.imageUrl];

  const selectedOptions = item.modifierGroups.flatMap((group) =>
    (selections[group.id] ?? []).flatMap((optionId) => {
      const option = group.options.find((o) => o.id === optionId);
      return option ? [{ group, option }] : [];
    }),
  );

  const breakdownRows = [
    { label: item.name, amountSar: item.priceSar },
    ...selectedOptions
      .filter(({ option }) => option.priceDeltaSar > 0)
      .map(({ option }) => ({
        label: t("store.product.addonLine", { name: option.label }),
        amountSar: option.priceDeltaSar,
      })),
  ];
  const breakdownTotal = breakdownRows.reduce((sum, row) => sum + row.amountSar, 0);

  function hrefFor(other: MenuItem): string {
    const cat = categories.find((c) => c.id === other.categoryId);
    return cat ? `/menu/${cat.slug}/${other.id}` : "/menu";
  }

  function handleSubmit() {
    const modifiers: OrderLineModifier[] = selectedOptions.map(({ group, option }) => ({
      groupId: group.id,
      groupLabel: group.label,
      optionId: option.id,
      label: option.label,
      priceDeltaSar: option.priceDeltaSar,
    }));

    // An edit cannot restore the preview — only the name was ever persisted —
    // so an untouched field keeps whatever the line already carried.
    const imageName = image?.name ?? editingLine?.customerImageName;
    const imageSize = image?.size ?? editingLine?.customerImageSize;

    if (editingLine) {
      replaceLine(editingLine.lineId, item.id, item.name, item.priceSar, quantity,
                  modifiers, "", imageName, imageSize);
    } else {
      addLine(item.id, item.name, item.priceSar, quantity, modifiers, "", imageName, imageSize);
    }

    router.push("/cart");
  }

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-14 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-5">
        <Breadcrumb
          items={[
            { label: t("store.nav.home"), href: "/" },
            { label: t("store.nav.menu"), href: "/menu" },
            { label: category.name, href: `/menu/${category.slug}` },
            ...(item.group ? [{ label: t(`store.group.${item.group}`) }] : []),
          ]}
        />

        <SectionHeading title={t("store.section.productDetails")} />

        {item.customisable && <PriceBreakdown rows={breakdownRows} totalSar={breakdownTotal} />}

        <div className="grid gap-10 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <ProductGallery images={images} alt={item.name} />
            <AllergenPanel allergens={item.allergens ?? []} />
          </div>

          <div className="flex flex-col gap-4">
            {item.rating !== undefined && (
              <div className="flex justify-end">
                <RatingStars value={item.rating} count={5} size={17} />
              </div>
            )}

            <h1 className="text-[24px] font-bold text-[var(--octo-text-primary)] sm:text-[30px]">
              {item.name}
            </h1>

            <p className="text-[13px] leading-[1.9] text-[var(--octo-text-secondary)]">
              {item.description}
            </p>

            {item.calories !== undefined && (
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[var(--octo-selected)] px-3.5 py-1.5 text-[12px] font-semibold text-[var(--octo-text-primary)]">
                <Flame size={14} className="text-[#F59E0B]" aria-hidden="true" />
                {t(item.caloriesApprox ? "store.product.caloriesApprox" : "store.product.calories", {
                  n: item.calories,
                })}
              </span>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <PriceBlock item={item} size="hero" />
              {percent !== null && (
                <span className="rounded-full bg-[#E8F8EF] px-3 py-1 text-[12px] font-semibold text-[#16a34a]">
                  {t("store.product.discount", { n: percent })}
                </span>
              )}
            </div>

            <ProductCustomizer
              groups={item.modifierGroups}
              selections={selections}
              onChange={(groupId, optionIds) =>
                setSelections((prev) => ({ ...prev, [groupId]: optionIds }))
              }
              imageSlot={
                item.allowsCustomerImage ? (
                  <div className="flex flex-col gap-1.5">
                    <AttachImage value={image} onChange={setImage} />
                    {!image && editingLine?.customerImageName && (
                      <p className="text-[11px] text-[var(--octo-text-muted)]">
                        {t("store.cart.attachedImage", { name: editingLine.customerImageName })}
                      </p>
                    )}
                  </div>
                ) : undefined
              }
            />

            <div className="flex flex-col gap-2">
              <p className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">
                {t("store.product.quantity")}
              </p>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <QuantityStepper value={quantity} onChange={setQuantity} />

                <button
                  type="button"
                  disabled={soldOut}
                  onClick={handleSubmit}
                  className="flex-1 rounded-[10px] bg-[#0D6EFD] px-6 py-3 text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {soldOut
                    ? t("store.product.outOfStock")
                    : t(editingLine ? "store.product.update" : "store.product.addToCart")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ProductRow
        id="related"
        title={t("store.section.related")}
        items={relatedItems(items, item)}
        hrefFor={hrefFor}
        onAdd={(other) => router.push(hrefFor(other))}
      />
    </div>
  );
}
