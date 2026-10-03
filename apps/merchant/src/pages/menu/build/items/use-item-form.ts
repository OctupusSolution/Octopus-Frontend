// The selected item's form state: which fields have been left, whether a save
// was attempted, and the text of the numeric fields (so "12." or "abc" can be
// shown and refused rather than silently turned into a number).
//
// The rules themselves are entities/menu/item-validation; this only decides
// *when* a message is shown — after its field is left, or after a save attempt
// — so an untouched form never opens red.
import { useCallback, useMemo, useState } from "react";
import {
  validateItemGeneral,
  validateItemModifiers,
  validateItemPricing,
  validateItemSchedule,
  validateNutrition,
  type Item,
} from "@/entities/menu";

/** One row of the Nutrition tab: the frame's four fields, or a fact the
 *  business has configured. */
export interface NutritionRow {
  key: string;
  label: string;
  placeholder?: string;
  required: boolean;
  /** Set when the row is a configured fact (sent as `facts`). */
  factCode?: string;
}

/** Where a field lives, for the red strip's "complete … in" list. */
export type ItemFormArea = "general" | "modifiers" | "pricing" | "nutrition" | "schedule";

export interface ItemForm {
  /** A numeric field's text: what was typed, else what the item holds. */
  text: (key: string) => string;
  setText: (key: string, value: string) => void;
  touch: (field: string) => void;
  /** A save attempt: every message becomes visible. */
  revealAll: () => void;
  /** The message to show for a field right now, if any (an i18n key). */
  error: (field: string) => string | undefined;
  /** Every failing field, shown or not. */
  errors: Readonly<Record<string, string>>;
  /** Areas with at least one failing field / one *visible* failing field. */
  invalidAreas: ItemFormArea[];
  shownAreas: ItemFormArea[];
}

interface State {
  itemId: string | null;
  texts: Record<string, string>;
  touched: Record<string, true>;
  attempted: boolean;
}

const fresh = (itemId: string | null): State => ({ itemId, texts: {}, touched: {}, attempted: false });

/** 19.5 rather than 19.50 — and never a float tail like 15.000000000000002. */
const plain = (value: number) => String(Number(value.toFixed(2)));

function storedText(item: Item, key: string, rows: readonly NutritionRow[]): string {
  if (key === "price") return item.pricing.price > 0 ? plain(item.pricing.price) : "";
  if (key === "vat") return plain(item.pricing.vatRate * 100);
  if (key.startsWith("n:")) {
    const row = rows.find((r) => `n:${r.key}` === key);
    if (!row) return "";
    if (row.factCode) {
      const fact = (item.facts ?? []).find((f) => f.factCode === row.factCode);
      return fact ? String(fact.amount) : "";
    }
    const value = item.nutrition[row.key as keyof Item["nutrition"]];
    return value === null || value === undefined ? "" : String(value);
  }
  return "";
}

export function areaOf(field: string): ItemFormArea {
  if (field === "price" || field === "vat") return "pricing";
  if (field.startsWith("n:")) return "nutrition";
  if (field.startsWith("g:")) return "modifiers";
  if (field.startsWith("schedule")) return "schedule";
  return "general";
}

const AREA_ORDER: ItemFormArea[] = ["general", "modifiers", "pricing", "nutrition", "schedule"];

function areas(fields: string[]): ItemFormArea[] {
  const found = new Set(fields.map(areaOf));
  return AREA_ORDER.filter((area) => found.has(area));
}

export function useItemForm(item: Item | null, rows: readonly NutritionRow[]): ItemForm {
  const itemId = item?.id ?? null;
  const [state, setState] = useState<State>(() => fresh(itemId));
  // Another item is another form: nothing typed or touched carries over.
  if (state.itemId !== itemId) setState(fresh(itemId));
  const current = state.itemId === itemId ? state : fresh(itemId);

  const text = useCallback(
    (key: string) => current.texts[key] ?? (item ? storedText(item, key, rows) : ""),
    [current.texts, item, rows]
  );

  const errors = useMemo(() => {
    const all: Record<string, string> = {};
    if (!item) return all;
    Object.assign(all, validateItemGeneral(item));
    Object.assign(all, validateItemPricing({ price: text("price"), vat: text("vat") }));
    const nutrition = validateNutrition(
      Object.fromEntries(rows.map((row) => [row.key, text(`n:${row.key}`)])),
      rows.filter((row) => row.required).map((row) => row.key)
    );
    for (const [key, message] of Object.entries(nutrition)) all[`n:${key}`] = message;
    const schedule = validateItemSchedule(item.schedule);
    if (schedule.start) all.scheduleStart = schedule.start;
    if (schedule.end) all.scheduleEnd = schedule.end;
    if (schedule.days) all.scheduleDays = schedule.days;
    for (const [groupId, groupErrors] of Object.entries(validateItemModifiers(item))) {
      for (const [field, message] of Object.entries(groupErrors)) all[`g:${groupId}:${field}`] = message;
    }
    return all;
  }, [item, rows, text]);

  const setText = useCallback(
    (key: string, value: string) =>
      setState((prev) => (prev.itemId === itemId ? { ...prev, texts: { ...prev.texts, [key]: value } } : prev)),
    [itemId]
  );
  const touch = useCallback(
    (field: string) =>
      setState((prev) =>
        prev.itemId !== itemId || prev.touched[field] ? prev : { ...prev, touched: { ...prev.touched, [field]: true } }
      ),
    [itemId]
  );
  const revealAll = useCallback(
    () => setState((prev) => (prev.itemId !== itemId || prev.attempted ? prev : { ...prev, attempted: true })),
    [itemId]
  );

  const visible = (field: string) => current.attempted || current.touched[field] === true;
  const error = (field: string) => (visible(field) ? errors[field] : undefined);

  return {
    text,
    setText,
    touch,
    revealAll,
    error,
    errors,
    invalidAreas: areas(Object.keys(errors)),
    shownAreas: areas(Object.keys(errors).filter(visible)),
  };
}
