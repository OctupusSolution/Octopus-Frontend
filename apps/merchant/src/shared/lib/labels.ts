import { en } from "@i18n/index";

// Invert the English dictionary so any English string coming from mock data,
// the route registry, or a hardcoded label can be resolved to its translation
// key and passed through t(). Both locales share identical key sets and the
// few duplicated English values (e.g. "Connected", "Active") translate to the
// same target text, so last-wins collisions are harmless.
const KEY_BY_EN_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(en).map(([key, value]) => [value, key])
) as Record<string, string>;

// Resolve an English label to a dictionary key, falling back to the raw label.
// The caller still passes the result through t().
export function labelKey(label: string): string {
  return KEY_BY_EN_LABEL[label] ?? label;
}
