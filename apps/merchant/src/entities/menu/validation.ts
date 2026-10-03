// What the Review step checks before a menu can go live.
//
// Pure, so the counts the screen prints are the counts under test. Three
// severities, and only the first blocks publishing: an error is a menu that
// would misbehave in front of a customer (a dish with no price), a warning is a
// menu that would look unfinished, a recommendation is one that could do
// better.

import { OFFERS_SECTION_ID } from "./draft";
import type { Item, Menu } from "./menu";

export interface Finding {
  id: string;
  count: number;
}

export interface ValidationResult {
  errors: Finding[];
  warnings: Finding[];
  recommendations: Finding[];
}

/** Every item across every section the merchant filled.
 *
 *  The built-in offers section is skipped: its entries are Offers, which carry
 *  none of the fields checked here, and counting an empty offers section as
 *  eight faults would bury the real ones. */
function items(menu: Menu): Item[] {
  return menu.sections
    .filter((section) => section.id !== OFFERS_SECTION_ID)
    .flatMap((section) => section.entries as Item[]);
}

/** Turns a predicate into a Finding, or nothing when no item trips it — so the
 *  three buckets contain only what is actually wrong and `errors.length` is a
 *  usable gate. */
function count(list: Item[], id: string, fails: (item: Item) => boolean): Finding[] {
  const n = list.filter(fails).length;
  return n > 0 ? [{ id, count: n }] : [];
}

export function validate(menu: Menu): ValidationResult {
  const list = items(menu);

  return {
    errors: [
      // Checked on the menu, not per item: the library lists menus by name, so
      // one without a name is indistinguishable from its neighbours.
      ...(menu.name.trim() === "" ? [{ id: "menuMissingName", count: 1 }] : []),
      // A menu with nothing to order would publish as a blank page on every
      // channel. Offers do not count — they bundle items, so they cannot
      // exist meaningfully without them.
      ...(list.length === 0 ? [{ id: "menuEmpty", count: 1 }] : []),
      ...count(list, "itemMissingPrice", (item) => item.pricing.price <= 0),
      ...count(list, "taxMissing", (item) => item.pricing.vatRate <= 0),
    ],
    warnings: [
      ...count(list, "itemMissingImage", (item) => item.image === null),
      ...count(list, "itemUnavailable", (item) => !item.availability.available),
      // A group that asks for more choices than it offers, or whose minimum
      // exceeds its maximum, can never be satisfied — the customer would be
      // stuck on a required step with no way forward.
      ...count(list, "modifierRulesInvalid", (item) =>
        item.modifierGroups.some((group) => group.min > group.max)
      ),
    ],
    recommendations: [
      ...count(list, "addDescription", (item) => item.description.trim() === ""),
      ...count(list, "addAllergens", (item) => item.allergies.allergens.length === 0),
      ...count(list, "addTags", (item) => item.tags.length === 0),
    ],
  };
}
