// The Nutrition tab: the measured facts an item declares. Which facts exist is
// the business's configuration (GET /menu/facts), so the rows are those codes
// rather than a fixed list. The codes the summary strip knows (calories,
// protein, carbs, fat) are mirrored into `nutrition`, which the strip and the
// preview read.
//
// When the fact types cannot be read (or none are configured) the tab falls
// back to the frame's four fields, kept locally and not sent as facts: a code
// the platform has not configured would be refused on save.
//
// Calories carries the frame's red asterisk. Every field is a text input so a
// non-number can be shown and refused; the item only receives values that
// passed.
import { useMemo } from "react";
import clsx from "clsx";
import type { Item, ItemFact } from "@/entities/menu";
import { nutritionFieldOf, parseAmount, useFactTypes } from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";
import { useMenuCopy } from "../../copy";
import { Field } from "../../_shared/controls";
import { ERROR_STRIP, FIELD_INVALID, TEXT_GRAY } from "../../_shared/theme";
import { FIELD_4 } from "./ui";
import type { ItemForm, NutritionRow } from "./use-item-form";

/** A fact's unit is editable in the code but drawn in no frame; flip this to
 *  show the unit box beside each amount again. */
const SHOW_FACT_UNITS: boolean = false;

type NutritionField = keyof Item["nutrition"];

const FIELDS: { id: NutritionField; labelKey: string; placeholderKey: string; required?: boolean }[] = [
  { id: "calories", labelKey: "menuWiz.item.calories", placeholderKey: "menuWiz.item.caloriesPlaceholder", required: true },
  { id: "protein", labelKey: "menuWiz.item.protein", placeholderKey: "menuWiz.item.gramsPlaceholder" },
  { id: "carb", labelKey: "menuWiz.item.carb", placeholderKey: "menuWiz.item.gramsPlaceholder" },
  { id: "fat", labelKey: "menuWiz.item.fat", placeholderKey: "menuWiz.item.gramsPlaceholder" },
];

/** A unit to start from: kcal for energy, grams for the macros, else a
 *  neutral "unit" the merchant can change (units are free codes server-side). */
function defaultUnit(code: string): string {
  const field = nutritionFieldOf(code);
  if (field === "calories") return "kcal";
  if (field) return "g";
  return "unit";
}

const UNIT = /^[a-z][a-z0-9-]{0,30}$/;

/** The tab's rows, shared with the step so its validation covers exactly the
 *  fields the tab draws. */
export function useNutritionRows(): {
  rows: NutritionRow[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const { t } = useI18n();
  const factTypes = useFactTypes();
  const codes = factTypes.data;

  const rows = useMemo<NutritionRow[]>(() => {
    if (!codes || codes.length === 0) {
      return FIELDS.map((field) => ({
        key: field.id,
        label: t(field.labelKey),
        placeholder: t(field.placeholderKey),
        required: field.required === true,
      }));
    }
    return codes.map(({ factCode }) => {
      const spec = FIELDS.find((field) => field.id === nutritionFieldOf(factCode));
      return {
        key: factCode,
        factCode,
        label: spec ? t(spec.labelKey) : factCode.charAt(0).toUpperCase() + factCode.slice(1).replace(/-/g, " "),
        placeholder: spec ? t(spec.placeholderKey) : undefined,
        required: spec?.required === true,
      };
    });
  }, [codes, t]);

  return {
    rows,
    loading: factTypes.loading && !factTypes.data,
    error: factTypes.error ?? null,
    refresh: factTypes.refresh,
  };
}

export function TabNutrition({
  item,
  onPatch,
  form,
  rows,
}: {
  item: Item;
  onPatch: (patch: Partial<Item>) => void;
  form: ItemForm;
  rows: readonly NutritionRow[];
}) {
  const { t } = useI18n();
  const c = useMenuCopy();
  const state = useNutritionRows();
  const facts = item.facts ?? [];

  function setFact(code: string, patch: Partial<ItemFact> | null) {
    const current = facts.find((f) => f.factCode === code);
    const rest = facts.filter((f) => f.factCode !== code);
    const next: ItemFact[] =
      patch === null ? rest : [...rest, { factCode: code, amount: 0, unitCode: defaultUnit(code), ...current, ...patch }];
    const field = nutritionFieldOf(code);
    const amount = patch === null ? null : (next.find((f) => f.factCode === code)?.amount ?? null);
    onPatch({ facts: next, ...(field ? { nutrition: { ...item.nutrition, [field]: amount } } : {}) });
  }

  function change(row: NutritionRow, value: string) {
    form.setText(`n:${row.key}`, value);
    // Empty rather than 0 when unset: a blank field reads as "not filled in",
    // where a 0 would claim the dish has no calories. Anything that is not a
    // number ≥ 0 is treated the same way until it is corrected.
    const parsed = value.trim() === "" ? null : parseAmount(value);
    const amount = parsed !== null && parsed >= 0 ? parsed : null;
    if (row.factCode) setFact(row.factCode, amount === null ? null : { amount });
    else onPatch({ nutrition: { ...item.nutrition, [row.key]: amount } });
  }

  if (state.loading) {
    return <p className={clsx("py-6 text-center text-[12px]", TEXT_GRAY)}>{c("loading")}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {state.error && (
        <p role="alert" className={clsx("flex items-center justify-between gap-2 rounded-[8px] px-3 py-2 text-[12px] font-medium", ERROR_STRIP)}>
          <span>{state.error}</span>
          <button type="button" className="underline" onClick={state.refresh}>
            {c("retry")}
          </button>
        </p>
      )}

      {rows.map((row) => {
        const field = `n:${row.key}`;
        const errorKey = form.error(field);
        const fact = row.factCode ? facts.find((f) => f.factCode === row.factCode) : undefined;
        const unit = fact?.unitCode ?? (row.factCode ? defaultUnit(row.factCode) : "");
        const input = (
          <input
            dir="ltr"
            inputMode="decimal"
            value={form.text(field)}
            placeholder={row.placeholder}
            aria-label={row.label}
            aria-invalid={errorKey ? true : undefined}
            onChange={(e) => change(row, e.target.value)}
            onBlur={() => form.touch(field)}
            className={clsx(FIELD_4, "text-start", errorKey && FIELD_INVALID)}
          />
        );
        return (
          <Field key={row.key} label={row.label} required={row.required} error={errorKey ? t(errorKey) : null}>
            {SHOW_FACT_UNITS && row.factCode ? (
              <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-2">
                {input}
                <input
                  dir="ltr"
                  aria-label={`${row.label} — ${c("items.unit")}`}
                  value={unit}
                  disabled={!fact}
                  onChange={(e) => row.factCode && setFact(row.factCode, { unitCode: e.target.value.trim().toLowerCase() })}
                  className={clsx(FIELD_4, fact && !UNIT.test(unit) && FIELD_INVALID)}
                />
              </div>
            ) : (
              input
            )}
          </Field>
        );
      })}
    </div>
  );
}
