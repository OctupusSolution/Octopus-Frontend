// The Items step's rules: the item form (General, Pricing, Nutrition, the
// schedule card) and the Modifiers tab's group and option forms. Pure, so the
// screens only decide *when* to show a message (after blur, or after a save
// attempt), never *whether*. Every message is an i18n key.
import type { Item, ItemSchedule, ModifierGroup, ModifierOption } from "./menu";

export const ITEM_NAME_MAX = 80;
export const ITEM_SHORT_NAME_MAX = 30;
export const ITEM_SKU_MAX = 40;
export const MODIFIER_NAME_MAX = 60;
export const MODIFIER_TEXT_MAX = 120;

/** Letters, digits and the separators a stock code uses; no spaces. */
const SKU = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;
/** A plain decimal: "12", "12.5", ".5". No sign, no exponent. */
const DECIMAL = /^(\d+\.?\d*|\.\d+)$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** The number a field's text stands for, or null when it is not one. A leading
 *  minus is read (so "-5" can be told apart from "abc" and refused as
 *  negative); anything else that is not a plain decimal is null. */
export function parseAmount(text: string): number | null {
  const trimmed = text.trim();
  const negative = trimmed.startsWith("-");
  const body = negative ? trimmed.slice(1) : trimmed;
  if (!DECIMAL.test(body)) return null;
  const value = Number(body);
  if (!Number.isFinite(value)) return null;
  return negative ? -value : value;
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

// ---- item: General -----------------------------------------------------------

export type ItemGeneralField = "name" | "shortName" | "image" | "sku";
export type ItemGeneralErrors = Partial<Record<ItemGeneralField, string>>;

export function validateItemGeneral(item: Pick<Item, "name" | "shortName" | "image" | "sku">): ItemGeneralErrors {
  const errors: ItemGeneralErrors = {};

  const name = item.name.trim();
  if (name === "") errors.name = "menuWiz.item.v.nameRequired";
  else if (name.length > ITEM_NAME_MAX) errors.name = "menuWiz.item.v.nameTooLong";

  const shortName = item.shortName.trim();
  if (shortName === "") errors.shortName = "menuWiz.item.v.shortNameRequired";
  else if (shortName.length > ITEM_SHORT_NAME_MAX) errors.shortName = "menuWiz.item.v.shortNameTooLong";

  if (!item.image) errors.image = "menuWiz.item.v.imageRequired";

  // Optional, but a code that is given has to be one a POS can key in.
  const sku = item.sku.trim();
  if (sku !== "") {
    if (sku.length > ITEM_SKU_MAX) errors.sku = "menuWiz.item.v.skuTooLong";
    else if (!SKU.test(sku)) errors.sku = "menuWiz.item.v.skuFormat";
  }
  return errors;
}

// ---- item: Pricing -----------------------------------------------------------

export type ItemPricingErrors = Partial<Record<"price" | "vat", string>>;

/** `price` and `vat` are the fields' text; VAT is a percentage (0–100). */
export function validateItemPricing(input: { price: string; vat: string }): ItemPricingErrors {
  const errors: ItemPricingErrors = {};

  if (input.price.trim() === "") errors.price = "menuWiz.item.v.priceRequired";
  else {
    const price = parseAmount(input.price);
    if (price === null) errors.price = "menuWiz.item.v.priceNumber";
    else if (price <= 0) errors.price = "menuWiz.item.v.pricePositive";
  }

  if (input.vat.trim() === "") errors.vat = "menuWiz.item.v.vatRequired";
  else {
    const vat = parseAmount(input.vat);
    if (vat === null) errors.vat = "menuWiz.item.v.vatNumber";
    else if (vat < 0 || vat > 100) errors.vat = "menuWiz.item.v.vatRange";
  }
  return errors;
}

// ---- item: Nutrition ---------------------------------------------------------

/**
 * `texts` is each nutrition field's text by its key (calories, protein, … or a
 * configured fact code); `required` lists the keys that may not be blank.
 * A blank optional field is fine; anything typed must be a number ≥ 0.
 */
export function validateNutrition(
  texts: Readonly<Record<string, string>>,
  required: readonly string[] = []
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const key of new Set([...Object.keys(texts), ...required])) {
    const text = (texts[key] ?? "").trim();
    if (text === "") {
      if (required.includes(key)) errors[key] = "menuWiz.item.v.nutritionRequired";
      continue;
    }
    const value = parseAmount(text);
    if (value === null) errors[key] = "menuWiz.item.v.nutritionNumber";
    else if (value < 0) errors[key] = "menuWiz.item.v.nutritionNegative";
  }
  return errors;
}

// ---- item: Schedule ----------------------------------------------------------

export type ItemScheduleErrors = Partial<Record<"start" | "end" | "days", string>>;

/** Only Custom Hours can be wrong: it needs a window that ends after it starts
 *  (same day — nothing downstream reads an earlier end as "past midnight") and
 *  at least one day to apply it to. */
export function validateItemSchedule(schedule: ItemSchedule): ItemScheduleErrors {
  if (schedule.mode !== "custom") return {};
  const errors: ItemScheduleErrors = {};
  const startOk = TIME.test(schedule.start);
  const endOk = TIME.test(schedule.end);
  if (!startOk) errors.start = "menuWiz.item.v.timeRequired";
  if (!endOk) errors.end = "menuWiz.item.v.timeRequired";
  // "HH:MM" is zero-padded, so the strings order the same way the times do.
  else if (startOk && schedule.end <= schedule.start) errors.end = "menuWiz.item.v.endAfterStart";
  if (schedule.days.length === 0) errors.days = "menuWiz.item.v.daysRequired";
  return errors;
}

// ---- modifiers: the Add Modifier Group dialog ---------------------------------

export type ModifierGroupFormErrors = Partial<Record<"name", string>>;

/** `otherNames` are the item's other groups, so a group keeps its own name. */
export function validateModifierGroupForm(
  input: { name: string },
  otherNames: readonly string[] = []
): ModifierGroupFormErrors {
  const errors: ModifierGroupFormErrors = {};
  const name = input.name.trim();
  if (name === "") errors.name = "menuWiz.mod.v.nameRequired";
  else if (name.length > MODIFIER_NAME_MAX) errors.name = "menuWiz.mod.v.nameTooLong";
  else if (otherNames.some((other) => same(other, name))) errors.name = "menuWiz.mod.v.nameTaken";
  return errors;
}

// ---- modifiers: the Edit Group panel ------------------------------------------

export type ModifierGroupField = "name" | "customerLabel" | "helpText" | "min" | "max";
export type ModifierGroupErrors = Partial<Record<ModifierGroupField, string>>;

export function validateModifierGroup(
  group: Pick<ModifierGroup, "name" | "customerLabel" | "helpText" | "min" | "max" | "required" | "options">,
  otherNames: readonly string[] = []
): ModifierGroupErrors {
  const errors: ModifierGroupErrors = { ...validateModifierGroupForm(group, otherNames) };

  if (group.customerLabel.trim() === "") errors.customerLabel = "menuWiz.mod.v.customerLabelRequired";
  else if (group.customerLabel.trim().length > MODIFIER_TEXT_MAX) errors.customerLabel = "menuWiz.mod.v.textTooLong";

  if (group.helpText.trim() === "") errors.helpText = "menuWiz.mod.v.helpTextRequired";
  else if (group.helpText.trim().length > MODIFIER_TEXT_MAX) errors.helpText = "menuWiz.mod.v.textTooLong";

  const count = group.options.length;
  if (!Number.isInteger(group.min) || group.min < 0) errors.min = "menuWiz.mod.v.minInvalid";
  else if (group.required && group.min < 1) errors.min = "menuWiz.mod.v.minRequired";
  else if (group.min > group.max) errors.min = "menuWiz.mod.v.minAboveMax";

  if (!Number.isInteger(group.max) || group.max < 1) errors.max = "menuWiz.mod.v.maxInvalid";
  // Asking for three choices from two options is a group nobody can order.
  else if (count > 0 && group.max > count) errors.max = "menuWiz.mod.v.maxAboveOptions";

  return errors;
}

// ---- modifiers: the Add / Edit Modifier option dialog --------------------------

export type ModifierOptionField = "name" | "priceType" | "price";
export type ModifierOptionErrors = Partial<Record<ModifierOptionField, string>>;

/** `price` is the field's text; `otherNames` are the group's other options. */
export function validateModifierOptionForm(
  input: { name: string; priceType: ModifierOption["priceType"] | ""; price: string },
  otherNames: readonly string[] = []
): ModifierOptionErrors {
  const errors: ModifierOptionErrors = {};

  const name = input.name.trim();
  if (name === "") errors.name = "menuWiz.mod.v.optionNameRequired";
  else if (name.length > MODIFIER_NAME_MAX) errors.name = "menuWiz.mod.v.nameTooLong";
  else if (otherNames.some((other) => same(other, name))) errors.name = "menuWiz.mod.v.optionNameTaken";

  if (input.priceType === "") errors.priceType = "menuWiz.mod.v.priceTypeRequired";

  // "No change" carries no price, so there is nothing to check for it.
  if (input.priceType !== "no-change") {
    if (input.price.trim() === "") errors.price = "menuWiz.mod.v.priceRequired";
    else {
      const price = parseAmount(input.price);
      if (price === null) errors.price = "menuWiz.mod.v.priceNumber";
      else if (price < 0) errors.price = "menuWiz.mod.v.priceNegative";
    }
  }
  return errors;
}

/** Every group of an item, checked against its siblings' names. */
export function validateItemModifiers(item: Pick<Item, "modifierGroups">): Record<string, ModifierGroupErrors> {
  const result: Record<string, ModifierGroupErrors> = {};
  for (const group of item.modifierGroups) {
    const others = item.modifierGroups.filter((g) => g.id !== group.id).map((g) => g.name);
    const errors = validateModifierGroup(group, others);
    if (Object.keys(errors).length > 0) result[group.id] = errors;
  }
  return result;
}
