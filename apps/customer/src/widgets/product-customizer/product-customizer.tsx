"use client";

import type { ReactNode } from "react";
import type { MenuItemModifierGroup } from "@octopus/api-client";
import { useI18n } from "@/app/providers";
import { AccordionRow, OptionPill } from "@/shared/ui";

export type ModifierSelections = Record<string, string[]>;

export interface ProductCustomizerProps {
  groups: MenuItemModifierGroup[];
  selections: ModifierSelections;
  onChange: (groupId: string, optionIds: string[]) => void;
  /** Rendered above the first group — the design puts "إرفق الصورة" first,
   *  before any choice. */
  imageSlot?: ReactNode;
}

/** Fully controlled — it holds no state of its own, so the view above it can
 *  price the current selection without reaching in here for it. */
export function ProductCustomizer({ groups, selections, onChange, imageSlot }: ProductCustomizerProps) {
  const { t } = useI18n();
  if (groups.length === 0 && !imageSlot) return null;

  function pillsFor(group: MenuItemModifierGroup) {
    const chosen = selections[group.id] ?? [];

    return (
      <div
        role={group.multiple ? "group" : "radiogroup"}
        aria-label={group.label}
        className="flex flex-wrap gap-2.5"
      >
        {group.options.map((option) => (
          <OptionPill
            key={option.id}
            label={option.label}
            note={option.note}
            priceDeltaSar={option.priceDeltaSar}
            multiple={group.multiple}
            selected={chosen.includes(option.id)}
            onSelect={() => {
              if (group.multiple) {
                onChange(
                  group.id,
                  chosen.includes(option.id)
                    ? chosen.filter((id) => id !== option.id)
                    : [...chosen, option.id],
                );
                return;
              }
              // A required single-choice group cannot be emptied by clicking
              // its own selection; an optional one can.
              onChange(
                group.id,
                chosen.includes(option.id) && !group.required ? [] : [option.id],
              );
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <section className="rounded-[20px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-6 shadow-[0_4px_18px_rgba(15,23,42,0.05)]">
      <h2 className="text-[19px] font-bold text-[var(--octo-text-primary)]">
        {t("store.product.customize")}
      </h2>

      <div className="mt-5 flex flex-col gap-5">
        {imageSlot}
        {groups.map((group) =>
          group.display === "accordion" ? (
            <AccordionRow key={group.id} label={group.label}>
              {pillsFor(group)}
            </AccordionRow>
          ) : (
            <div key={group.id} className="flex flex-col gap-2.5">
              <p className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">
                {group.label}
              </p>
              {pillsFor(group)}
            </div>
          ),
        )}
      </div>
    </section>
  );
}
