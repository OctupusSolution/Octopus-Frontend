// What the AI import produces, and every transform the three import screens
// apply to it before it becomes a Menu.
//
// Deliberately NOT a Menu. A detection carries things a menu has no place for —
// a confidence per item, the issues the reader flagged, dietary tags, whether
// the merchant has confirmed it — and it can hold states a menu must not (a
// price that could not be read is `null`, not 0). Keeping it separate means the
// review screens can be honest about uncertainty, and `toMenu` is the single
// place where that uncertainty is resolved into something publishable.
//
// Same posture as draft.ts: pure functions, fresh objects, ids and clocks
// injected so tests assert exact values.

import { addItem, addSection, blankItem, blankMenu, blankSection } from "./draft";
import type { Menu } from "./menu";

export type Band = "high" | "medium" | "low";
export type IssueKind = "price-unclear" | "description-short" | "allergen-missing";

export const ISSUE_KINDS: readonly IssueKind[] = [
  "price-unclear",
  "description-short",
  "allergen-missing",
];

/** Ids, in the builder's own vocabulary (see build/items/tab-allergies.tsx), so
 *  they survive `toMenu` without translation. */
export const ALLERGENS = [
  "gluten", "dairy", "eggs", "fish", "shellfish", "nuts", "soy", "sesame",
] as const;

export const DIETARY = [
  "vegetarian", "vegan", "gluten-free", "high-protein", "spicy", "halal",
] as const;

export interface DetectedItem {
  id: string;
  name: string;
  description: string;
  /** `null` when the reader could not make out a price — never guessed. */
  price: number | null;
  /** 0–100, as the reader reported it. Never rewritten by edits. */
  confidence: number;
  allergens: string[];
  /** Import-only metadata: Item has no field for it, so it does not survive
   *  `toMenu`. Shown here because the reader finds it and merchants expect to
   *  see what was found. */
  dietary: string[];
  image: string | null;
  /** What the reader flagged at detection time. Whether each is still open is
   *  derived by `openIssues`, so fixing the field clears the flag. */
  issues: IssueKind[];
  /** The merchant confirmed this item — it no longer needs review whatever its
   *  confidence. */
  reviewed: boolean;
}

export interface DetectedSection {
  id: string;
  name: string;
  items: DetectedItem[];
}

export interface DetectionResult {
  restaurant: { name: string; tagline: string };
  fileName: string;
  pages: number;
  sections: DetectedSection[];
}

/* ------------------------------------------------------------------ reading */

/** The thresholds every legend on the three screens states: ≥90, 70–89, <70. */
export function bandFor(confidence: number): Band {
  if (confidence >= 90) return "high";
  if (confidence >= 70) return "medium";
  return "low";
}

/** Short enough that a customer learns nothing from it. */
export const MIN_DESCRIPTION = 12;

export function openIssues(item: DetectedItem): IssueKind[] {
  if (item.reviewed) return [];
  return item.issues.filter((kind) => {
    if (kind === "price-unclear") return item.price === null;
    if (kind === "description-short") return item.description.trim().length < MIN_DESCRIPTION;
    return item.allergens.length === 0;
  });
}

export function needsReview(item: DetectedItem): boolean {
  return !item.reviewed && item.confidence < 90;
}

export function flatItems(result: DetectionResult): DetectedItem[] {
  return result.sections.flatMap((s) => s.items);
}

export interface DetectionSummary {
  sections: number;
  items: number;
  high: number;
  needReview: number;
  /** Whole percentages of `items`; 0 when there are none. */
  highPct: number;
  reviewPct: number;
  issues: Record<IssueKind, number>;
}

/** Every count any screen shows comes from here, so an edit anywhere moves all
 *  of them together. */
export function summarize(result: DetectionResult): DetectionSummary {
  return summarizeItems(result.sections.length, flatItems(result));
}

export function summarizeItems(sections: number, items: DetectedItem[]): DetectionSummary {
  const issues: Record<IssueKind, number> = {
    "price-unclear": 0,
    "description-short": 0,
    "allergen-missing": 0,
  };
  let high = 0;
  let needReview = 0;
  for (const item of items) {
    if (item.confidence >= 90) high += 1;
    if (needsReview(item)) needReview += 1;
    for (const kind of openIssues(item)) issues[kind] += 1;
  }
  const pct = (n: number) => (items.length === 0 ? 0 : Math.round((n / items.length) * 100));
  return {
    sections,
    items: items.length,
    high,
    needReview,
    highPct: pct(high),
    reviewPct: pct(needReview),
    issues,
  };
}

export function findItem(
  result: DetectionResult,
  itemId: string
): { section: DetectedSection; item: DetectedItem; index: number } | null {
  for (const section of result.sections) {
    const index = section.items.findIndex((i) => i.id === itemId);
    if (index !== -1) return { section, item: section.items[index], index };
  }
  return null;
}

/** The first item that still has this issue open — what a "Needs Your
 *  Attention" row takes the merchant to. */
export function firstWithIssue(result: DetectionResult, kind: IssueKind): DetectedItem | null {
  return flatItems(result).find((i) => openIssues(i).includes(kind)) ?? null;
}

/** The item before/after this one across the whole menu, for the editor's
 *  prev/next arrows. `null` at either end. */
export function siblingItem(
  result: DetectionResult,
  itemId: string,
  step: 1 | -1
): DetectedItem | null {
  const all = flatItems(result);
  const at = all.findIndex((i) => i.id === itemId);
  if (at === -1) return null;
  return all[at + step] ?? null;
}

/** Splits sections into `count` groups of similar item counts without
 *  reordering them — the paper preview's columns and pages both read top to
 *  bottom, so order is the one thing the split must keep. */
export function splitBalanced<T extends { items: unknown[] }>(sections: T[], count: number): T[][] {
  const groups: T[][] = Array.from({ length: Math.max(1, count) }, () => []);
  const weight = (s: T) => s.items.length + 2; // a heading costs about two rows
  const total = sections.reduce((n, s) => n + weight(s), 0);
  const target = total / groups.length;
  let g = 0;
  let filled = 0;
  for (const section of sections) {
    const w = weight(section);
    // Move on when this section would overshoot by more than half of itself,
    // unless this is the last group or the current one is still empty.
    if (g < groups.length - 1 && groups[g].length > 0 && filled + w / 2 > target * (g + 1)) g += 1;
    groups[g].push(section);
    filled += w;
  }
  return groups;
}

/* --------------------------------------------------------------- transforms */

function mapSections(
  result: DetectionResult,
  fn: (section: DetectedSection) => DetectedSection
): DetectionResult {
  return { ...result, sections: result.sections.map(fn) };
}

export function blankDetectedItem(id: string, name: string): DetectedItem {
  return {
    id,
    name,
    description: "",
    price: null,
    // Typed by the merchant, so there is nothing to doubt.
    confidence: 100,
    allergens: [],
    dietary: [],
    image: null,
    issues: [],
    reviewed: true,
  };
}

export function updateDetectedItem(
  result: DetectionResult,
  itemId: string,
  patch: Partial<Omit<DetectedItem, "id">>
): DetectionResult {
  return mapSections(result, (s) =>
    s.items.some((i) => i.id === itemId)
      ? { ...s, items: s.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) }
      : s
  );
}

export function removeDetectedItem(result: DetectionResult, itemId: string): DetectionResult {
  return mapSections(result, (s) =>
    s.items.some((i) => i.id === itemId) ? { ...s, items: s.items.filter((i) => i.id !== itemId) } : s
  );
}

export function duplicateDetectedItem(
  result: DetectionResult,
  itemId: string,
  newId: string
): DetectionResult {
  return mapSections(result, (s) => {
    const at = s.items.findIndex((i) => i.id === itemId);
    if (at === -1) return s;
    const items = [...s.items];
    items.splice(at + 1, 0, { ...s.items[at], id: newId });
    return { ...s, items };
  });
}

export function addDetectedItem(
  result: DetectionResult,
  sectionId: string,
  item: DetectedItem
): DetectionResult {
  return mapSections(result, (s) => (s.id === sectionId ? { ...s, items: [...s.items, item] } : s));
}

/** Moves an item to the end of another section. A no-op for the section it is
 *  already in, so the editor's Section select can call it on every change. */
export function moveItemToSection(
  result: DetectionResult,
  itemId: string,
  sectionId: string
): DetectionResult {
  const found = findItem(result, itemId);
  if (!found || found.section.id === sectionId) return result;
  if (!result.sections.some((s) => s.id === sectionId)) return result;
  return addDetectedItem(removeDetectedItem(result, itemId), sectionId, found.item);
}

function move<T>(list: T[], from: number, to: number): T[] {
  const last = list.length - 1;
  if (from < 0 || to < 0 || from > last || to > last || from === to) return list;
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function reorderItems(
  result: DetectionResult,
  sectionId: string,
  from: number,
  to: number
): DetectionResult {
  const section = result.sections.find((s) => s.id === sectionId);
  if (!section) return result;
  const items = move(section.items, from, to);
  // A refused move hands back the same result, so callers can skip a write.
  if (items === section.items) return result;
  return mapSections(result, (s) => (s.id === sectionId ? { ...s, items } : s));
}

export function addDetectedSection(
  result: DetectionResult,
  id: string,
  name: string
): DetectionResult {
  return { ...result, sections: [...result.sections, { id, name, items: [] }] };
}

export function renameDetectedSection(
  result: DetectionResult,
  sectionId: string,
  name: string
): DetectionResult {
  return mapSections(result, (s) => (s.id === sectionId ? { ...s, name } : s));
}

export function removeDetectedSection(result: DetectionResult, sectionId: string): DetectionResult {
  return { ...result, sections: result.sections.filter((s) => s.id !== sectionId) };
}

export function reorderSections(result: DetectionResult, from: number, to: number): DetectionResult {
  const sections = move(result.sections, from, to);
  return sections === result.sections ? result : { ...result, sections };
}

export type PriceAdjustment = { mode: "percent" | "fixed"; amount: number };

/** Applies to one section. An unreadable price stays unreadable — adjusting a
 *  number nobody knows would invent one. Never goes below zero; rounds to
 *  halalas. */
export function adjustPrices(
  result: DetectionResult,
  sectionId: string,
  { mode, amount }: PriceAdjustment
): DetectionResult {
  const round = (n: number) => Math.max(0, Math.round(n * 100) / 100);
  return mapSections(result, (s) =>
    s.id !== sectionId
      ? s
      : {
          ...s,
          items: s.items.map((i) =>
            i.price === null
              ? i
              : { ...i, price: round(mode === "percent" ? i.price * (1 + amount / 100) : i.price + amount) }
          ),
        }
  );
}

/** Case-insensitive, over names and descriptions. Returns how many fields
 *  changed so the modal can say so. */
export function findAndReplace(
  result: DetectionResult,
  find: string,
  replace: string
): { result: DetectionResult; count: number } {
  if (!find) return { result, count: 0 };
  const pattern = new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  let count = 0;
  const swap = (text: string) => {
    const next = text.replace(pattern, () => replace);
    if (next !== text) count += 1;
    return next;
  };
  const next = mapSections(result, (s) => ({
    ...s,
    items: s.items.map((i) => ({ ...i, name: swap(i.name), description: swap(i.description) })),
  }));
  return { result: count === 0 ? result : next, count };
}

/** One CSV line into fields, honouring double-quoted fields with commas and
 *  doubled quotes inside them. */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else current += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      fields.push(current);
      current = "";
    } else current += ch;
  }
  fields.push(current);
  return fields.map((f) => f.trim());
}

/** `name,description,price` per line. A header row is skipped, blank names are
 *  skipped, and a price that is not a number becomes `null` — the same state a
 *  detection uses for "could not read it". */
export function parseItemsCsv(text: string, newId: (index: number) => string): DetectedItem[] {
  const items: DetectedItem[] = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  lines.forEach((line, index) => {
    const [name = "", description = "", priceRaw = ""] = splitCsvLine(line);
    if (index === 0 && name.toLowerCase() === "name") return;
    if (!name) return;
    // Strip currency words first ("SAR 32"), then refuse anything with no digit
    // left — Number("") is 0, which would quietly price a dish for free.
    const digits = priceRaw.replace(/[^\d.-]/g, "");
    const price = /\d/.test(digits) ? Number(digits) : NaN;
    items.push({
      ...blankDetectedItem(newId(items.length), name),
      description,
      price: Number.isNaN(price) ? null : price,
    });
  });
  return items;
}

/* --------------------------------------------------------------- conversion */

/** "menu_breakfast_Lunch_dinner.pdf" → "Breakfast Lunch Dinner Menu". The word
 *  "menu" is dropped wherever it appears and put back once at the end, so a
 *  file already called "Dinner Menu.png" does not become "Dinner Menu Menu". */
export function menuNameFromFile(fileName: string): string {
  const words = fileName
    .replace(/\.[^.]+$/, "")
    .split(/[\s_\-.]+/)
    .filter((w) => w && w.toLowerCase() !== "menu" && !/^\d+$/.test(w));
  if (words.length === 0) return "Imported Menu";
  const title = words.map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(" ");
  return `${title} Menu`;
}

/** The only exit from the import: a Menu the library and the builder already
 *  understand. An unreadable price becomes 0 with the item left as a draft, so
 *  nothing that was never priced can be published by accident. */
export function toMenu(
  result: DetectionResult,
  {
    id,
    branchId,
    now,
    newId,
    name,
  }: { id: string; branchId: string; now: string; newId: () => string; name: string }
): Menu {
  let menu: Menu = { ...blankMenu(id, branchId, now), name };
  for (const section of result.sections) {
    const sectionId = newId();
    menu = addSection(menu, blankSection(sectionId, "items", section.name, null));
    for (const detected of section.items) {
      const base = blankItem(newId(), detected.name);
      menu = addItem(menu, sectionId, {
        ...base,
        description: detected.description,
        image: detected.image,
        status: detected.price === null ? "draft" : "active",
        pricing: { ...base.pricing, price: detected.price ?? 0 },
        allergies: { ...base.allergies, allergens: [...detected.allergens] },
      });
    }
  }
  return menu;
}
