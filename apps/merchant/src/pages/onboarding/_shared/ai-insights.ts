// What the aside panels say. Derived from the draft so the panel reflects the
// merchant's actual answers; a hardcoded list would be a screenshot pretending
// to be a recommendation.
import {
  addOnModules, availabilityFor, baseModuleIds, getModule,
  type ModuleId, type TypeCode, type VerticalId,
} from "@/shared/catalog";

export interface InsightRow {
  id: ModuleId;
  /** lucide-react icon name, resolved by CatalogIcon in the UI layer. */
  icon: string;
  nameKey: string;
  descKey: string;
}

/**
 * The modules we would switch on for this vertical/type before the merchant
 * touches anything — base modules plus everything the type profile marks
 * `core` or `recommended`.
 */
export function insightsFor(vertical: VerticalId | null, type: TypeCode | null): InsightRow[] {
  if (!vertical) return [];
  const ids: ModuleId[] = [...baseModuleIds];
  if (type) {
    for (const module of addOnModules) {
      const availability = availabilityFor(type, module.id);
      if (availability === "core" || availability === "recommended") ids.push(module.id);
    }
  }
  const seen = new Set<ModuleId>();
  return ids.flatMap((id) => {
    if (seen.has(id)) return [];
    seen.add(id);
    const module = getModule(id);
    return module ? [{ id, icon: module.icon, nameKey: module.nameKey, descKey: module.descKey }] : [];
  });
}

/** Three tone words for the Brand Tone chips, keyed off the service model. */
export function brandToneFor(type: TypeCode | null): string[] {
  switch (type) {
    case "T1": case "T11": return ["onboarding.tone.refined", "onboarding.tone.premium", "onboarding.tone.calm"];
    case "T3": case "T7":  return ["onboarding.tone.bold", "onboarding.tone.fast", "onboarding.tone.playful"];
    case "T4": case "T5":  return ["onboarding.tone.warm", "onboarding.tone.artisan", "onboarding.tone.cosy"];
    default:               return ["onboarding.tone.modern", "onboarding.tone.premium", "onboarding.tone.welcoming"];
  }
}

/** Menu section names to seed the storefront preview with. Five of them: the
 *  storefront's category mosaic is a five-tile block with one running tall
 *  through both rows, and a four-item list left a hole in the corner. */
export function serviceCategoriesFor(type: TypeCode | null): string[] {
  switch (type) {
    case "T5": return ["onboarding.category.pastries", "onboarding.category.cakes", "onboarding.category.drinks", "onboarding.category.desserts", "onboarding.category.breakfast"];
    case "T4": return ["onboarding.category.coffee", "onboarding.category.drinks", "onboarding.category.pastries", "onboarding.category.breakfast", "onboarding.category.cakes"];
    default:   return ["onboarding.category.signature", "onboarding.category.appetizers", "onboarding.category.drinks", "onboarding.category.desserts", "onboarding.category.breakfast"];
  }
}
