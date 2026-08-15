"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";
import { Button, Modal, Textarea } from "@ui/primitives";
import type { MenuItem, MenuItemModifierGroup, OrderLineModifier } from "@octopus/api-client";
import { useOrderingSession } from "@/entities/order";
import { formatSar } from "@/shared/lib/pricing";
import { QuantityStepper } from "@/shared/ui";

export interface AddToCartModalProps {
  item: MenuItem | null;
  onClose: () => void;
}

type Selections = Record<string, string[]>;

function computeTotalSar(item: MenuItem, selections: Selections, quantity: number): number {
  const modifierTotal = item.modifierGroups.reduce((sum, group) => {
    const selectedIds = selections[group.id] ?? [];
    const groupTotal = group.options
      .filter((option) => selectedIds.includes(option.id))
      .reduce((groupSum, option) => groupSum + option.priceDeltaSar, 0);
    return sum + groupTotal;
  }, 0);
  return (item.priceSar + modifierTotal) * quantity;
}

function findMissingRequiredGroup(item: MenuItem, selections: Selections): MenuItemModifierGroup | null {
  return item.modifierGroups.find((group) => group.required && (selections[group.id] ?? []).length === 0) ?? null;
}

export function AddToCartModal({ item, onClose }: AddToCartModalProps) {
  const { addLine } = useOrderingSession();
  const [selections, setSelections] = useState<Selections>({});
  const [notes, setNotes] = useState("");
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    setSelections({});
    setNotes("");
    setQuantity(1);
  }, [item?.id]);

  if (!item) return null;

  function toggleOption(group: MenuItemModifierGroup, optionId: string) {
    setSelections((prev) => {
      const current = prev[group.id] ?? [];
      if (group.multiple) {
        const next = current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId];
        return { ...prev, [group.id]: next };
      }
      return { ...prev, [group.id]: [optionId] };
    });
  }

  const missingGroup = findMissingRequiredGroup(item, selections);
  const totalSar = computeTotalSar(item, selections, quantity);

  function handleAdd() {
    if (!item || missingGroup) return;

    const modifiers: OrderLineModifier[] = item.modifierGroups.flatMap((group) => {
      const selectedIds = selections[group.id] ?? [];
      return group.options
        .filter((option) => selectedIds.includes(option.id))
        .map((option) => ({
          groupId: group.id,
          optionId: option.id,
          label: option.label,
          priceDeltaSar: option.priceDeltaSar,
        }));
    });

    addLine(item.id, item.name, item.priceSar, quantity, modifiers, notes);
    setSelections({});
    setNotes("");
    setQuantity(1);
    onClose();
  }

  return (
    <Modal open={Boolean(item)} onClose={onClose} title={item.name}>
      <div className="flex flex-col gap-4">
        <p className="text-[11.5px] text-[var(--octo-text-secondary)]">{item.description}</p>

        {item.modifierGroups.map((group) => (
          <div key={group.id} className="flex flex-col gap-2">
            <p className="text-[11.5px] font-semibold text-[var(--octo-text-primary)]">
              {group.label}
              {group.required && <span className="ms-1 text-[10.5px] font-normal text-[#EF4444]">(مطلوب)</span>}
            </p>
            <div className="flex flex-wrap gap-2">
              {group.options.map((option) => {
                const selected = (selections[group.id] ?? []).includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => toggleOption(group, option.id)}
                    className={clsx(
                      "rounded-full border px-3 py-1.5 text-[11.5px] font-medium transition-colors",
                      selected
                        ? "border-[#0D6EFD] bg-[#0D6EFD] text-white"
                        : "border-[var(--octo-border-input)] bg-[var(--octo-card)] text-[var(--octo-text-secondary)] hover:bg-[var(--octo-hover)]",
                    )}
                  >
                    {option.label}
                    {option.priceDeltaSar !== 0 && ` +${formatSar(option.priceDeltaSar)}`}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <Textarea label="ملاحظات" value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} />

        <div className="flex items-center justify-between">
          <span className="text-[11.5px] font-medium text-[var(--octo-text-secondary)]">الكمية</span>
          <QuantityStepper value={quantity} onChange={setQuantity} />
        </div>

        {missingGroup && (
          <p className="text-[11px] font-medium text-[#EF4444]">يرجى اختيار {missingGroup.label}</p>
        )}

        <Button onClick={handleAdd} disabled={Boolean(missingGroup)} className="w-full justify-center">
          إضافة إلى السلة · {formatSar(totalSar)}
        </Button>
      </div>
    </Modal>
  );
}
