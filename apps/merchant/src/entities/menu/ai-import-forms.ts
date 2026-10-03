// The rules behind the AI import's forms: the item editor, "Bulk Edit Prices"
// and "Find & Replace".
//
// Kept beside ai-import.ts and just as pure, so a screen only decides WHEN an
// error is shown (after a blur or a save attempt) and never WHAT counts as one.
// Every function returns codes, not sentences — the screens translate them.

import { flatItems, type DetectedItem, type DetectionResult } from "./ai-import";

/* --------------------------------------------------------------------- price */

export type PriceError = "required" | "not-a-number" | "not-positive";

/** Reads what a merchant typed into a price box. A price must be a plain
 *  decimal number above zero; anything else is an error and no value. */
export function parsePrice(text: string): { value: number | null; error: PriceError | null } {
  const trimmed = text.trim();
  if (trimmed === "") return { value: null, error: "required" };
  if (!/^\d*\.?\d*$/.test(trimmed) || !/\d/.test(trimmed)) return { value: null, error: "not-a-number" };
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return { value: null, error: "not-a-number" };
  if (value <= 0) return { value: null, error: "not-positive" };
  return { value, error: null };
}

/* ---------------------------------------------------------------- item editor */

export type ItemField = "image" | "name" | "price" | "description" | "section";
export type ItemFieldError = "required" | PriceError;
export type ItemFormErrors = Record<ItemField, ItemFieldError | null>;

export interface ItemFormValues {
  name: string;
  /** The price box's text, not a number, so "abc" can be told from empty. */
  priceText: string;
  description: string;
  image: string | null;
  /** Omit on a screen whose editor has no Section field. */
  sectionId?: string | null;
}

/** Every field the frames mark with a red star. */
export function validateItemForm(values: ItemFormValues): ItemFormErrors {
  return {
    image: null,
    name: values.name.trim() === "" ? "required" : null,
    price: parsePrice(values.priceText).error,
    description: values.description.trim() === "" ? "required" : null,
    section: values.sectionId === undefined || values.sectionId ? null : "required",
  };
}

export function hasErrors(errors: object): boolean {
  return Object.values(errors).some((error) => error !== null && error !== undefined);
}

/** The price box's text for a stored price. */
export function priceText(price: number | null): string {
  return price === null ? "" : String(price);
}

/* ---------------------------------------------------------- bulk edit prices */

export type BulkError = "required" | "not-a-number" | "one-required" | "non-positive-result";

export interface BulkPriceValues {
  itemIds: readonly string[];
  percentText: string;
  fixedText: string;
}

export interface BulkPriceErrors {
  items: BulkError | null;
  percent: BulkError | null;
  fixed: BulkError | null;
}

/** A signed decimal ("10", "-7.5", "+3"). `null` for empty, `NaN` for
 *  anything that is not a number. */
export function parseSigned(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(trimmed)) return NaN;
  return Number(trimmed);
}

/** Percentage first, then the fixed amount, rounded to halalas. */
export function bulkAdjustedPrice(price: number, percent: number, fixed: number): number {
  return Math.round((price * (1 + percent / 100) + fixed) * 100) / 100;
}

function pricesOf(result: DetectionResult, itemIds: readonly string[]): number[] {
  const wanted = new Set(itemIds);
  return flatItems(result)
    .filter((item) => wanted.has(item.id) && item.price !== null)
    .map((item) => item.price as number);
}

export function validateBulkPrices(result: DetectionResult, values: BulkPriceValues): BulkPriceErrors {
  const percent = parseSigned(values.percentText);
  const fixed = parseSigned(values.fixedText);
  const errors: BulkPriceErrors = {
    items: values.itemIds.length === 0 ? "required" : null,
    percent: percent !== null && Number.isNaN(percent) ? "not-a-number" : null,
    fixed: fixed !== null && Number.isNaN(fixed) ? "not-a-number" : null,
  };
  if (percent === null && fixed === null) {
    errors.percent = "one-required";
    errors.fixed = "one-required";
    return errors;
  }
  if (errors.percent || errors.fixed) return errors;

  // A change that would leave any chosen item free, or below zero, is refused
  // outright rather than clamped — clamping would quietly price a dish at 0.
  const prices = pricesOf(result, values.itemIds);
  const p = percent ?? 0;
  const f = fixed ?? 0;
  if (prices.some((price) => bulkAdjustedPrice(price, p, 0) <= 0)) errors.percent = "non-positive-result";
  else if (prices.some((price) => bulkAdjustedPrice(price, p, f) <= 0)) errors.fixed = "non-positive-result";
  return errors;
}

/** Applies to the chosen items only. An unreadable price stays unreadable. */
export function applyBulkPrices(
  result: DetectionResult,
  itemIds: readonly string[],
  { percent, fixed }: { percent: number; fixed: number }
): DetectionResult {
  const wanted = new Set(itemIds);
  return {
    ...result,
    sections: result.sections.map((section) =>
      section.items.some((item) => wanted.has(item.id))
        ? {
            ...section,
            items: section.items.map((item) =>
              wanted.has(item.id) && item.price !== null
                ? { ...item, price: bulkAdjustedPrice(item.price, percent, fixed) }
                : item
            ),
          }
        : section
    ),
  };
}

/* ------------------------------------------------------------ find & replace */

export type FindScope = "all" | "names" | "descriptions";

export interface FindOptions {
  scope: FindScope;
  matchCase: boolean;
}

export interface FindMatch {
  item: DetectedItem;
  sectionId: string;
  sectionName: string;
  inName: boolean;
  inDescription: boolean;
}

/** "Find" must hold something to look for before Search runs. */
export function validateFind(find: string): "required" | null {
  return find.trim() === "" ? "required" : null;
}

function pattern(find: string, matchCase: boolean): RegExp {
  return new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), matchCase ? "g" : "gi");
}

/** One row per item that holds the text, in menu order. */
export function findMatches(result: DetectionResult, find: string, options: FindOptions): FindMatch[] {
  if (find === "") return [];
  const matches: FindMatch[] = [];
  for (const section of result.sections) {
    for (const item of section.items) {
      const inName = options.scope !== "descriptions" && pattern(find, options.matchCase).test(item.name);
      const inDescription = options.scope !== "names" && pattern(find, options.matchCase).test(item.description);
      if (inName || inDescription) {
        matches.push({ item, sectionId: section.id, sectionName: section.name, inName, inDescription });
      }
    }
  }
  return matches;
}

/** Splits a text around what was found, so a row can tint the hits. */
export function splitHighlights(text: string, find: string, matchCase: boolean): { text: string; match: boolean }[] {
  if (find === "") return [{ text, match: false }];
  const parts: { text: string; match: boolean }[] = [];
  const re = pattern(find, matchCase);
  let last = 0;
  for (let hit = re.exec(text); hit !== null; hit = re.exec(text)) {
    if (hit.index > last) parts.push({ text: text.slice(last, hit.index), match: false });
    parts.push({ text: hit[0], match: true });
    last = hit.index + hit[0].length;
  }
  if (last < text.length || parts.length === 0) parts.push({ text: text.slice(last), match: false });
  return parts;
}

/** Replaces inside the chosen items only, honouring the same scope and case
 *  rule the search used. `count` is how many fields changed. */
export function replaceInItems(
  result: DetectionResult,
  itemIds: readonly string[],
  find: string,
  replace: string,
  options: FindOptions
): { result: DetectionResult; count: number } {
  if (find === "" || itemIds.length === 0) return { result, count: 0 };
  const wanted = new Set(itemIds);
  let count = 0;
  const swap = (text: string) => {
    const next = text.replace(pattern(find, options.matchCase), () => replace);
    if (next !== text) count += 1;
    return next;
  };
  const sections = result.sections.map((section) => ({
    ...section,
    items: section.items.map((item) =>
      wanted.has(item.id)
        ? {
            ...item,
            name: options.scope === "descriptions" ? item.name : swap(item.name),
            description: options.scope === "names" ? item.description : swap(item.description),
          }
        : item
    ),
  }));
  return { result: count === 0 ? result : { ...result, sections }, count };
}
