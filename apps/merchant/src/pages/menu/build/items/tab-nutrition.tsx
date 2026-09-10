// The Nutrition tab. Four numbers, and the only source for the summary strip
// under the editor — that strip reads these, it does not store its own copy.
import type { Item } from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";

type Field = keyof Item["nutrition"];

const FIELDS: { id: Field; labelKey: string; placeholderKey: string; required?: boolean }[] = [
  { id: "calories", labelKey: "menuWiz.item.calories", placeholderKey: "menuWiz.item.caloriesPlaceholder", required: true },
  { id: "protein", labelKey: "menuWiz.item.protein", placeholderKey: "menuWiz.item.gramsPlaceholder" },
  { id: "carb", labelKey: "menuWiz.item.carb", placeholderKey: "menuWiz.item.gramsPlaceholder" },
  { id: "fat", labelKey: "menuWiz.item.fat", placeholderKey: "menuWiz.item.gramsPlaceholder" },
];

export function TabNutrition({
  item,
  onPatch,
}: {
  item: Item;
  onPatch: (patch: Partial<Item>) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="max-w-[680px] space-y-4">
      {FIELDS.map(({ id, labelKey, placeholderKey, required }) => (
        <label key={id} className="block">
          <span className="text-[14px] font-medium text-[var(--octo-text-primary)]">
            {t(labelKey)}
            {required && <span className="text-error"> *</span>}
          </span>
          <input
            type="number"
            min={0}
            // Empty rather than 0 when unset: a blank field reads as "not
            // filled in", where a 0 would claim the dish has no calories.
            value={item.nutrition[id] ?? ""}
            placeholder={t(placeholderKey)}
            onChange={(e) =>
              onPatch({
                nutrition: {
                  ...item.nutrition,
                  [id]: e.target.value === "" ? null : Number(e.target.value),
                },
              })
            }
            className="mt-1.5 w-full rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-2.5 text-[14px] text-[var(--octo-text-primary)]"
          />
        </label>
      ))}
    </div>
  );
}
