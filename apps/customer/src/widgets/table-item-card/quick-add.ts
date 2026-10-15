import type { MenuItem } from "@octopus/api-client";

/** What a menu card's bag button does: add a plain item, open an item with choices to make,
 *  or nothing for an item that cannot be ordered (sold out, or not orderable from a scanned
 *  code) — the same rule the item's own screen applies to its add button. */
export function quickAddOf(item: MenuItem): "add" | "open" | "none" {
  if (item.inStock === false || item.available === false) return "none";
  return item.modifierGroups.length > 0 ? "open" : "add";
}
