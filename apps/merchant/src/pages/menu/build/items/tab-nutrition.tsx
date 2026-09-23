// The Nutrition tab: the measured facts an item declares. Which facts exist is
// the business's configuration (GET /menu/facts), so the rows are those codes
// — each with an amount and its unit — rather than a fixed list. The codes the
// summary strip knows (calories, protein, carbs, fat) are mirrored into
// `nutrition`, which the strip and the preview read.
//
// When the fact types cannot be read (or none are configured) the tab falls
// back to the frame's four fields, kept locally and not sent as facts: a code
// the platform has not configured would be refused on save.
import type { Item, ItemFact } from "@/entities/menu";
import { nutritionFieldOf, useFactTypes } from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";
import { useMenuCopy } from "../../copy";

type Field = keyof Item["nutrition"];

const FIELDS: { id: Field; labelKey: string; placeholderKey: string; required?: boolean }[] = [
  { id: "calories", labelKey: "menuWiz.item.calories", placeholderKey: "menuWiz.item.caloriesPlaceholder", required: true },
  { id: "protein", labelKey: "menuWiz.item.protein", placeholderKey: "menuWiz.item.gramsPlaceholder" },
  { id: "carb", labelKey: "menuWiz.item.carb", placeholderKey: "menuWiz.item.gramsPlaceholder" },
  { id: "fat", labelKey: "menuWiz.item.fat", placeholderKey: "menuWiz.item.gramsPlaceholder" },
];

const inputClass =
  "mt-1.5 w-full rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-2.5 text-[14px] text-[var(--octo-text-primary)]";

/** A unit to start from: kcal for energy, grams for the macros, else a
 *  neutral "unit" the merchant can change (units are free codes server-side). */
function defaultUnit(code: string): string {
  const field = nutritionFieldOf(code);
  if (field === "calories") return "kcal";
  if (field) return "g";
  return "unit";
}

const UNIT = /^[a-z][a-z0-9-]{0,30}$/;

export function TabNutrition({
  item,
  onPatch,
}: {
  item: Item;
  onPatch: (patch: Partial<Item>) => void;
}) {
  const { t } = useI18n();
  const c = useMenuCopy();
  const factTypes = useFactTypes();
  const codes = (factTypes.data ?? []).map((f) => f.factCode);
  const facts = item.facts ?? [];

  function labelFor(code: string): string {
    const field = nutritionFieldOf(code);
    const spec = FIELDS.find((f) => f.id === field);
    if (spec) return t(spec.labelKey);
    return code.charAt(0).toUpperCase() + code.slice(1).replace(/-/g, " ");
  }

  function setFact(code: string, patch: Partial<ItemFact> | null) {
    const current = facts.find((f) => f.factCode === code);
    const rest = facts.filter((f) => f.factCode !== code);
    const next: ItemFact[] =
      patch === null ? rest : [...rest, { factCode: code, amount: 0, unitCode: defaultUnit(code), ...current, ...patch }];
    const field = nutritionFieldOf(code);
    const amount = patch === null ? null : (next.find((f) => f.factCode === code)?.amount ?? null);
    onPatch({ facts: next, ...(field ? { nutrition: { ...item.nutrition, [field]: amount } } : {}) });
  }

  if (factTypes.loading && !factTypes.data) {
    return <p className="py-6 text-center text-[13px] text-[var(--octo-text-muted)]">{c("loading")}</p>;
  }

  if (codes.length === 0) {
    return (
      <div className="max-w-[680px] space-y-4">
        {factTypes.error && (
          <p role="alert" className="flex items-center justify-between gap-2 rounded-[9px] bg-error/10 px-3 py-2 text-[12.5px] text-error">
            <span>{factTypes.error}</span>
            <button type="button" className="underline" onClick={factTypes.refresh}>
              {c("retry")}
            </button>
          </p>
        )}
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
              className={inputClass}
            />
          </label>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-[680px] space-y-4">
      <p className="text-[13px] text-[var(--octo-text-secondary)]">{c("items.factsHint")}</p>
      {codes.map((code) => {
        const fact = facts.find((f) => f.factCode === code);
        const unit = fact?.unitCode ?? defaultUnit(code);
        return (
          <div key={code} className="grid grid-cols-[minmax(0,1fr)_110px] items-end gap-2.5">
            <label className="block">
              <span className="text-[14px] font-medium text-[var(--octo-text-primary)]">{labelFor(code)}</span>
              <input
                type="number"
                min={0}
                step="any"
                value={fact ? fact.amount : ""}
                placeholder={nutritionFieldOf(code) === "calories" ? t("menuWiz.item.caloriesPlaceholder") : undefined}
                onChange={(e) =>
                  setFact(code, e.target.value === "" ? null : { amount: Math.max(0, Number(e.target.value)) })
                }
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-[12px] text-[var(--octo-text-muted)]">{c("items.unit")}</span>
              <input
                dir="ltr"
                aria-label={`${labelFor(code)} — ${c("items.unit")}`}
                value={unit}
                disabled={!fact}
                onChange={(e) => setFact(code, { unitCode: e.target.value.trim().toLowerCase() })}
                className={`${inputClass} ${fact && !UNIT.test(unit) ? "border-error" : ""}`}
              />
            </label>
          </div>
        );
      })}
    </div>
  );
}
