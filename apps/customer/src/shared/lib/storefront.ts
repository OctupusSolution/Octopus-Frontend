import type { AllergenId, DietaryId, MenuGroupId, MenuItem, OrderLine } from "@octopus/api-client";

const GROUP_IDS: readonly MenuGroupId[] = [
  "all", "chicken", "meat", "burger", "pizza", "sides", "appetizers", "salads",
];
const DIETARY_IDS: readonly DietaryId[] = [
  "vegetarian", "vegan", "gluten_free", "spicy", "healthy",
];
const ALLERGEN_IDS: readonly AllergenId[] = [
  "gluten", "dairy", "eggs", "nuts", "soy", "seafood",
];

/** Derived, never stored — a stored percentage can drift out of step with the
 *  two prices it claims to describe. */
export function discountPercent(item: MenuItem): number | null {
  const was = item.compareAtPriceSar;
  if (was === undefined || was <= item.priceSar) return null;
  return Math.round((1 - item.priceSar / was) * 100);
}

export interface MenuFilters {
  group: MenuGroupId | null;
  bestSellersOnly: boolean;
  availableOnly: boolean;
  minPriceSar: number | null;
  maxPriceSar: number | null;
  dietary: DietaryId[];
  excludeAllergens: AllergenId[];
}

function readList<T extends string>(params: URLSearchParams, key: string, allowed: readonly T[]): T[] {
  const raw = params.get(key);
  if (!raw) return [];
  return raw.split(",").filter((v): v is T => (allowed as readonly string[]).includes(v));
}

export function parseFilters(params: URLSearchParams): MenuFilters {
  const rawGroup = params.get("group");
  // "all" is the default chip, not a group items belong to.
  const group =
    rawGroup && rawGroup !== "all" && (GROUP_IDS as readonly string[]).includes(rawGroup)
      ? (rawGroup as MenuGroupId)
      : null;

  let minPriceSar: number | null = null;
  let maxPriceSar: number | null = null;
  const price = params.get("price");
  if (price) {
    const [lo, hi] = price.split("-").map((n) => Number.parseFloat(n));
    // A malformed or open-ended range must not silently empty the whole grid.
    if (Number.isFinite(lo)) minPriceSar = lo;
    if (Number.isFinite(hi)) maxPriceSar = hi;
  }

  return {
    group,
    bestSellersOnly: params.get("best") === "1",
    availableOnly: params.get("available") === "1",
    minPriceSar,
    maxPriceSar,
    dietary: readList(params, "diet", DIETARY_IDS),
    excludeAllergens: readList(params, "allergen", ALLERGEN_IDS),
  };
}

export function filterItems(items: MenuItem[], filters: MenuFilters): MenuItem[] {
  return items.filter((item) => {
    if (filters.group && item.group !== filters.group) return false;
    if (filters.bestSellersOnly && !item.badges?.includes("best_seller")) return false;
    // An item predating the field is in stock; absence is not a stock-out.
    if (filters.availableOnly && item.inStock === false) return false;
    if (filters.minPriceSar !== null && item.priceSar < filters.minPriceSar) return false;
    if (filters.maxPriceSar !== null && item.priceSar > filters.maxPriceSar) return false;
    if (filters.dietary.length > 0 && !filters.dietary.every((d) => item.dietary?.includes(d))) return false;
    if (filters.excludeAllergens.some((a) => item.allergens?.includes(a))) return false;
    return true;
  });
}

export function bestSellers(items: MenuItem[], limit = 4): MenuItem[] {
  return items.filter((i) => i.badges?.includes("best_seller")).slice(0, limit);
}

export function offers(items: MenuItem[], limit = 4): MenuItem[] {
  return items.filter((i) => i.badges?.includes("offer")).slice(0, limit);
}

/** Same group first, then the same category, so the row always fills. An item
 *  with no group relates by category alone rather than matching every other
 *  ungrouped item on the menu. */
export function relatedItems(items: MenuItem[], to: MenuItem, limit = 4): MenuItem[] {
  const others = items.filter((i) => i.id !== to.id);
  const sameGroup = to.group === undefined ? [] : others.filter((i) => i.group === to.group);
  const sameCategory = others.filter(
    (i) => i.categoryId === to.categoryId && !sameGroup.includes(i),
  );
  return [...sameGroup, ...sameCategory].slice(0, limit);
}

export interface LinePricing {
  baseSar: number;
  addonsSar: number;
  totalSar: number;
}

/** The cart shows the base price and the paid additions on separate rows, so
 *  the two are kept apart rather than folded into a single total. */
export function computeLinePricing(line: OrderLine): LinePricing {
  const baseSar = line.unitPriceSar * line.quantity;
  const addonsSar =
    line.modifiers.reduce((sum, modifier) => sum + modifier.priceDeltaSar, 0) * line.quantity;
  return { baseSar, addonsSar, totalSar: baseSar + addonsSar };
}

export function computeCartPricing(lines: readonly OrderLine[]): LinePricing {
  return lines.reduce<LinePricing>(
    (running, line) => {
      const priced = computeLinePricing(line);
      return {
        baseSar: running.baseSar + priced.baseSar,
        addonsSar: running.addonsSar + priced.addonsSar,
        totalSar: running.totalSar + priced.totalSar,
      };
    },
    { baseSar: 0, addonsSar: 0, totalSar: 0 },
  );
}
