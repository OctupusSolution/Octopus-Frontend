// The Allergies tab: which allergens this dish carries, plus free text for the
// things a checkbox cannot say ("fried in the same oil as shellfish").
import { Plus } from "lucide-react";
import { Checkbox } from "@ui/primitives";
import type { Item } from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";

// The three the frame shows, offered by default. `Add Allergens` appends the
// rest of this list; anything already on the item is rendered whether or not
// it appears here, so an allergen set elsewhere is never silently dropped.
const KNOWN = ["gluten", "eggs", "dairy"] as const;

export function TabAllergies({
  item,
  onPatch,
}: {
  item: Item;
  onPatch: (patch: Partial<Item>) => void;
}) {
  const { t } = useI18n();
  const selected = item.allergies.allergens;
  const rows = Array.from(new Set<string>([...KNOWN, ...selected]));

  function toggle(id: string) {
    onPatch({
      allergies: {
        ...item.allergies,
        allergens: selected.includes(id)
          ? selected.filter((a) => a !== id)
          : [...selected, id],
      },
    });
  }

  return (
    <div className="max-w-[680px] space-y-2.5">
      {rows.map((id) => (
        <label
          key={id}
          className="flex items-center gap-2.5 rounded-[10px] border border-[var(--octo-border-card)] px-3 py-3"
        >
          <Checkbox checked={selected.includes(id)} onChange={() => toggle(id)} />
          <span className="text-[14px] font-medium text-[var(--octo-accent)]">
            {t(`menuWiz.item.allergen.${id}`)}
          </span>
        </label>
      ))}

      <button
        type="button"
        className="flex w-full items-center justify-center gap-2 rounded-[10px] border border-dashed border-[var(--octo-accent)] bg-[var(--octo-selected)] px-3 py-2.5 text-[14px] font-medium text-[var(--octo-accent)]"
      >
        <Plus size={16} aria-hidden />
        {t("menuWiz.item.addAllergens")}
      </button>

      <label className="block pt-1">
        <span className="text-[14px] font-medium text-[var(--octo-text-primary)]">
          {t("menuWiz.item.allergenNote")}
        </span>
        <textarea
          rows={3}
          value={item.allergies.note}
          onChange={(e) => onPatch({ allergies: { ...item.allergies, note: e.target.value } })}
          className="mt-1.5 w-full rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-2.5 text-[14px] text-[var(--octo-text-primary)]"
        />
      </label>
    </div>
  );
}
