"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { MenuItem, MenuItemModifierGroup, OrderLine, OrderLineModifier } from "@octopus/api-client";
import { useI18n } from "@/app/providers";
import { useOrderingSession } from "@/entities/order";
import { discountPercent, relatedItems } from "@/shared/lib/storefront";
import { useMobileFlow } from "@/shared/lib/flow-context";
import {
  TableBackTitle, TableButton, TableIcon, TableMoney, TableRadio, TableSectionTitle, TableStepper,
} from "@/shared/ui/table";
import { TableItemGrid } from "@/widgets/table-item-card";
import { TableFooter, TableTopCard } from "@/widgets/table-shell";

export interface TableProductViewProps {
  item: MenuItem;
  items: MenuItem[];
}

type Selections = Record<string, string[]>;

/** Restores what an edited line had chosen; otherwise a required single-choice
 *  group starts on its first option, as the design draws every row with one lit. */
function selectionsFrom(item: MenuItem, line: OrderLine | null): Selections {
  const seeded: Selections = {};
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

function OptionPills({
  group, chosen, onChange,
}: { group: MenuItemModifierGroup; chosen: string[]; onChange: (optionIds: string[]) => void }) {
  function select(optionId: string) {
    const selected = chosen.includes(optionId);
    if (group.multiple) {
      onChange(selected ? chosen.filter((id) => id !== optionId) : [...chosen, optionId]);
      return;
    }
    // A required single-choice group cannot be emptied by tapping its own selection.
    onChange(selected && !group.required ? [] : [optionId]);
  }

  return (
    <div
      role={group.multiple ? "group" : "radiogroup"}
      aria-label={group.label}
      className="flex flex-wrap gap-3"
    >
      {group.options.map((option) => {
        const selected = chosen.includes(option.id);
        return (
          <button
            key={option.id}
            type="button"
            role={group.multiple ? "checkbox" : "radio"}
            aria-checked={selected}
            onClick={() => select(option.id)}
            className={`flex h-10 min-w-[calc((100%-24px)/3)] items-center justify-between gap-2 rounded-[12px] border px-1 text-[12px] font-semibold leading-none ${
              selected
                ? "border-ocean-blue bg-[var(--octo-store-select-soft)] text-[var(--octo-store-select-text)]"
                : "border-gray-300 text-gray-900"
            }`}
          >
            <span className="ps-1">
              {option.label}
              {option.priceDeltaSar > 0 && (
                <span className="ms-1 font-normal" dir="ltr">+{option.priceDeltaSar}</span>
              )}
            </span>
            <TableRadio checked={selected} />
          </button>
        );
      })}
    </div>
  );
}

function AccordionGroup({
  group, chosen, onChange,
}: { group: MenuItemModifierGroup; chosen: string[]; onChange: (optionIds: string[]) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-12 w-full items-center justify-between rounded-[24px] border border-gray-300 p-3 text-[12px] font-semibold leading-none text-gray-900"
      >
        {group.label}
        <TableIcon name="arrow-down" className={open ? "rotate-180" : ""} />
      </button>
      {open && <OptionPills group={group} chosen={chosen} onChange={onChange} />}
    </div>
  );
}

export function TableProductView({ item, items }: TableProductViewProps) {
  const { t } = useI18n();
  const router = useRouter();
  const flow = useMobileFlow();
  const searchParams = useSearchParams();
  const { state, addLine, replaceLine } = useOrderingSession();

  const editingLine = state.lines.find((line) => line.lineId === searchParams.get("line")) ?? null;

  const [selections, setSelections] = useState<Selections>(() => selectionsFrom(item, editingLine));
  const [quantity, setQuantity] = useState(() => editingLine?.quantity ?? 1);
  const [photo, setPhoto] = useState(0);

  const images = item.images && item.images.length > 0 ? item.images : [item.imageUrl];
  const percent = discountPercent(item);
  const soldOut = item.inStock === false;
  const related = relatedItems(items, item);

  const selectedOptions = item.modifierGroups.flatMap((group) =>
    (selections[group.id] ?? []).flatMap((optionId) => {
      const option = group.options.find((o) => o.id === optionId);
      return option ? [{ group, option }] : [];
    }),
  );
  const totalSar =
    (item.priceSar + selectedOptions.reduce((sum, { option }) => sum + option.priceDeltaSar, 0)) * quantity;

  function handleSubmit() {
    const modifiers: OrderLineModifier[] = selectedOptions.map(({ group, option }) => ({
      groupId: group.id,
      groupLabel: group.label,
      optionId: option.id,
      label: option.label,
      priceDeltaSar: option.priceDeltaSar,
    }));

    if (editingLine) {
      replaceLine(editingLine.lineId, item.id, item.name, item.priceSar, quantity, modifiers, "",
                  editingLine.customerImageName, editingLine.customerImageSize);
    } else {
      addLine(item.id, item.name, item.priceSar, quantity, modifiers, "");
    }
    router.push(flow.cart);
  }

  return (
    <div className="flex flex-col gap-4">
      <TableTopCard />

      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-6 px-4">
          <div className="flex flex-col gap-4">
            <TableBackTitle
              title={t("store.section.productDetails")}
              backHref={flow.menu}
              backLabel={t("store.table.back")}
            />

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex h-[211px] items-center justify-center overflow-hidden rounded-[12px] bg-[var(--octo-store-tile)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={images[photo] ?? item.imageUrl}
                    alt={item.name}
                    className="h-[179px] w-[224px] object-contain"
                  />
                </div>

                {images.length > 1 && (
                  <div className="flex gap-4">
                    {images.slice(0, 3).map((src, index) => (
                      <button
                        // eslint-disable-next-line react/no-array-index-key
                        key={index}
                        type="button"
                        aria-pressed={photo === index}
                        aria-label={`${item.name} ${index + 1}`}
                        onClick={() => setPhoto(index)}
                        className={`flex h-[79px] flex-1 items-center justify-center overflow-hidden rounded-[12px] bg-[var(--octo-store-tile)] ${
                          photo === index ? "border border-ocean-blue" : ""
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="" className="h-[55px] w-[70px] object-contain" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {item.allergens && item.allergens.length > 0 && (
                <section className="flex flex-col gap-2 rounded-[12px] bg-[var(--octo-store-allergy)] px-3 py-2">
                  <div className="flex flex-col gap-1">
                    <h2 className="flex items-center gap-2 text-[14px] font-bold leading-none text-[var(--octo-store-allergy-title)]">
                      <TableIcon name="warning" />
                      {t("store.allergy.title")}
                    </h2>
                    <p className="text-[10px] font-medium leading-[1.5] text-[var(--octo-store-select-label)]">
                      {t("store.allergy.body")}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] font-medium leading-none text-gray-900">
                      {t("store.allergy.contains")}
                    </p>
                    <ul className="flex flex-wrap gap-2">
                      {item.allergens.map((id) => (
                        <li
                          key={id}
                          className="flex items-center gap-1 text-[14px] font-medium leading-none text-gray-900"
                        >
                          <span className="flex size-6 items-center justify-center rounded-full bg-white">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/images/table/allergen.png" alt="" className="size-4" />
                          </span>
                          {t(`store.allergen.${id}`)}
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-3">
                    {item.rating !== undefined && (
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-2">
                          {[0, 1, 2, 3, 4].map((star) => (
                            <TableIcon
                              key={star}
                              name="star-filled"
                              size={12}
                              className={star < Math.round(item.rating ?? 0) ? "" : "opacity-30"}
                            />
                          ))}
                        </span>
                        <span className="text-[12px] leading-none text-[var(--octo-store-select-label)]" dir="ltr">
                          ({item.rating})
                        </span>
                      </div>
                    )}

                    <div className="flex flex-col items-start gap-2">
                      <div className="flex flex-col gap-2">
                        <p className="text-[16px] font-bold leading-none text-black">{item.name}</p>
                        <p className="text-[12px] font-medium leading-[1.5] text-[var(--octo-store-select-label)]">
                          {item.description}
                        </p>
                      </div>
                      {item.calories !== undefined && (
                        <span className="flex items-center gap-1 rounded-[20px] bg-[var(--octo-store-pill)] px-2 py-1 text-[12px] font-medium leading-none text-gray-900">
                          <TableIcon name="fire" size={16} />
                          {t(item.caloriesApprox ? "store.product.caloriesApprox" : "store.product.calories", {
                            n: item.calories,
                          })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="relative flex items-center">
                      <TableIcon
                        name="vector2"
                        size={[110, 32]}
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                      />
                      <TableMoney
                        amount={item.priceSar}
                        className="relative text-[24px] font-bold text-[var(--octo-store-price)]"
                        currencyClassName="text-[12px] font-normal"
                      />
                    </span>
                    {item.compareAtPriceSar !== undefined && item.compareAtPriceSar > item.priceSar && (
                      <TableMoney
                        amount={item.compareAtPriceSar}
                        className="text-[12px] text-[var(--octo-store-select-label)] line-through"
                      />
                    )}
                    {percent !== null && (
                      <span className="rounded-[20px] border border-[var(--octo-store-success)] bg-[rgba(16,161,70,0.05)] px-2 py-1 text-[8px] font-semibold leading-none text-[var(--octo-store-success)]">
                        {t("store.product.discount", { n: percent })}
                      </span>
                    )}
                  </div>
                </div>

                {item.modifierGroups.length > 0 && (
                  <section className="flex flex-col gap-4 rounded-[24px] border border-gray-300 bg-white p-3 drop-shadow-[0_0_4px_rgba(0,0,0,0.08)]">
                    <h2 className="text-[18px] font-bold leading-none text-black">
                      {t("store.product.customize")}
                    </h2>
                    <div className="flex flex-col gap-6">
                      {item.modifierGroups.map((group) => {
                        const chosen = selections[group.id] ?? [];
                        const onChange = (optionIds: string[]) =>
                          setSelections((prev) => ({ ...prev, [group.id]: optionIds }));
                        return group.display === "accordion" ? (
                          <AccordionGroup key={group.id} group={group} chosen={chosen} onChange={onChange} />
                        ) : (
                          <div key={group.id} className="flex flex-col gap-4">
                            <p className="px-2 text-[14px] font-semibold leading-none text-black">{group.label}</p>
                            <OptionPills group={group} chosen={chosen} onChange={onChange} />
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
              </div>

              <div className="flex flex-col gap-4">
                <p className="px-2 text-[18px] font-medium leading-none text-black">
                  {t("store.product.quantity")}
                </p>
                <TableStepper value={quantity} onChange={setQuantity} />
              </div>
            </div>
          </div>

          {related.length > 0 && (
            <section className="flex flex-col gap-8">
              <TableSectionTitle title={t("store.section.related")} />
              <TableItemGrid items={related} />
            </section>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-200 bg-white px-4 py-3">
          <div className="flex items-center justify-between px-3">
            <span className="text-[12px] font-medium leading-none text-gray-900">{t("store.table.total")}</span>
            <TableMoney
              amount={totalSar}
              className="text-[18px] font-bold text-[var(--octo-store-price)]"
              currencyClassName="text-[12px] font-normal"
            />
          </div>
          <TableButton size="lg" disabled={soldOut} onClick={handleSubmit}>
            {soldOut
              ? t("store.product.outOfStock")
              : t(editingLine ? "store.product.update" : "store.product.addToCart")}
          </TableButton>
        </div>

        <TableFooter />
      </div>
    </div>
  );
}
