// The Theme step's rules: the four brand colours are typed as hex, and the
// hero copy has to fit the storefront's hero. Pure, so the step only decides
// when a message is shown.
import type { MenuBrand } from "./menu";

export type ThemeColorField = keyof MenuBrand["colors"];
export type ThemeField = ThemeColorField | "heroText" | "heroSubtext";

/** i18n keys of the messages to show, per field. */
export type ThemeErrors = Partial<Record<ThemeField, string>>;

export const HERO_TEXT_MAX = 60;
export const HERO_SUBTEXT_MAX = 120;

const HEX = /^#[0-9a-fA-F]{6}$/;
const COLOR_FIELDS: ThemeColorField[] = ["primary", "light", "accent", "dark"];

export function isHexColor(value: string): boolean {
  return HEX.test(value.trim());
}

/** What the merchant typed, as the value to store — "#RRGGBB" with the hash,
 *  uppercase — or null while it is not a full colour yet. Accepts a missing
 *  hash, so a value pasted from a design tool works. */
export function normalizeHexColor(value: string): string | null {
  const trimmed = value.trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  return HEX.test(withHash) ? withHash.toUpperCase() : null;
}

export interface ThemeFormInput {
  colors: Record<ThemeColorField, string>;
  heroText: string;
  heroSubtext: string;
}

export function validateTheme(input: ThemeFormInput): ThemeErrors {
  const errors: ThemeErrors = {};
  for (const field of COLOR_FIELDS) {
    if (!isHexColor(input.colors[field])) errors[field] = "menuTheme.validation.hexInvalid";
  }
  if (input.heroText.trim().length > HERO_TEXT_MAX) errors.heroText = "menuTheme.validation.heroTextTooLong";
  if (input.heroSubtext.trim().length > HERO_SUBTEXT_MAX) errors.heroSubtext = "menuTheme.validation.heroSubtextTooLong";
  return errors;
}
