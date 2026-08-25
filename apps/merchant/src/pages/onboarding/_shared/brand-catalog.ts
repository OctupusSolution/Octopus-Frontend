// Reference data for step 4. Presentational only — none of this reaches
// TenantConfig, and none of it is billed.
import type { Weekday } from "./draft";

export interface Option { id: string; labelKey: string }

export const CITIES: readonly Option[] = [
  { id: "riyadh", labelKey: "onboarding.city.riyadh" },
  { id: "jeddah", labelKey: "onboarding.city.jeddah" },
  { id: "dammam", labelKey: "onboarding.city.dammam" },
  { id: "mecca", labelKey: "onboarding.city.mecca" },
  { id: "medina", labelKey: "onboarding.city.medina" },
  { id: "khobar", labelKey: "onboarding.city.khobar" },
  { id: "abha", labelKey: "onboarding.city.abha" },
  { id: "tabuk", labelKey: "onboarding.city.tabuk" },
];

export const CURRENCIES: readonly Option[] = [
  { id: "SAR", labelKey: "onboarding.currency.sar" },
  { id: "AED", labelKey: "onboarding.currency.aed" },
  { id: "KWD", labelKey: "onboarding.currency.kwd" },
  { id: "USD", labelKey: "onboarding.currency.usd" },
];

export const BRANCH_TYPES: readonly Option[] = [
  { id: "single", labelKey: "onboarding.branchType.single" },
  { id: "multi", labelKey: "onboarding.branchType.multi" },
  { id: "franchise", labelKey: "onboarding.branchType.franchise" },
];

export const AUDIENCES: readonly Option[] = [
  { id: "families", labelKey: "onboarding.audience.families" },
  { id: "students", labelKey: "onboarding.audience.students" },
  { id: "groups", labelKey: "onboarding.audience.groups" },
  { id: "budget", labelKey: "onboarding.audience.budget" },
  { id: "premium", labelKey: "onboarding.audience.premium" },
  { id: "quick", labelKey: "onboarding.audience.quick" },
];

export const WEEKDAYS: readonly Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/** A suggested primary/secondary pair plus the tints shown under it. */
export interface Palette {
  id: string;
  primary: string;
  secondary: string;
  tints: readonly string[];
}

export const PALETTES: readonly Palette[] = [
  { id: "crimson", primary: "#7A1420", secondary: "#1D1D1D", tints: ["#7A1420", "#C05A63", "#E9A7AC", "#F6DCDE"] },
  { id: "ocean",   primary: "#0B4C8C", secondary: "#1D1D1D", tints: ["#0B4C8C", "#3F7FBF", "#8FBCE2", "#D6E7F5"] },
  { id: "amber",   primary: "#B37A0B", secondary: "#1D1D1D", tints: ["#B37A0B", "#D8A63F", "#EBCB86", "#F7E9C6"] },
  { id: "graphite",primary: "#1D1D1D", secondary: "#4A4A4A", tints: ["#1D1D1D", "#4A4A4A", "#8A8A8A", "#C9C9C9"] },
];

export interface ThemeTemplate {
  id: string;
  nameKey: string;
  descKey: string;
  /** Types this template suits, shown as chips on the card. */
  bestForKeys: readonly string[];
}

export const THEME_TEMPLATES: readonly ThemeTemplate[] = [
  { id: "elegant", nameKey: "onboarding.theme.elegant.name", descKey: "onboarding.theme.elegant.desc",
    bestForKeys: ["onboarding.theme.tag.fineDining", "onboarding.theme.tag.luxury"] },
  { id: "modern",  nameKey: "onboarding.theme.modern.name",  descKey: "onboarding.theme.modern.desc",
    bestForKeys: ["onboarding.theme.tag.quickService", "onboarding.theme.tag.cafe"] },
  { id: "warm",    nameKey: "onboarding.theme.warm.name",    descKey: "onboarding.theme.warm.desc",
    bestForKeys: ["onboarding.theme.tag.family", "onboarding.theme.tag.traditional"] },
];
