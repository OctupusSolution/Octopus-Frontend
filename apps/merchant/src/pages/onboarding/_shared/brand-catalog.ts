// Reference data for step 4. Presentational only — none of this reaches
// TenantConfig, and none of it is billed.
import type { DayHours, Weekday } from "./draft";

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

/** Every half hour of the day, as the "HH:MM" strings `DayHours` already
 *  stores. Half-hour steps are the grid opening hours are actually set on — a
 *  finer one would double the length of a list nobody scrolls for 09:07. */
const HALF_HOURS: readonly string[] = Array.from({ length: 48 }, (_, i) => {
  const hour = String(Math.floor(i / 2)).padStart(2, "0");
  return `${hour}:${i % 2 ? "30" : "00"}`;
});

export interface TimeOption {
  /** "09:00" — 24-hour, and what gets stored. */
  value: string;
  /** "09:00 AM" / "09:00 ص" — and what gets shown. */
  label: string;
}

/** A stored time as the locale writes it. Latin digits even in Arabic, the same
 *  rule the money and count formatters follow, so one row never mixes numeral
 *  systems. A value that is not a time comes back unchanged rather than as
 *  "Invalid Date". */
export function formatTime(value: string, locale: string): string {
  const [hour, minute] = value.split(":").map(Number);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return value;
  // Any date will do — only the clock part of it is ever read back out.
  return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    numberingSystem: "latn",
  }).format(new Date(2000, 0, 1, hour, minute));
}

// Seven days times two fields times 48 options is a lot of Intl work to redo on
// every keystroke elsewhere in the form. The list depends on nothing but the
// locale, so it is built once per locale and kept.
const TIME_OPTIONS_BY_LOCALE = new Map<string, readonly TimeOption[]>();

/** The one-line answer to "when is this open?". Step 4's folded Operating
 *  Hours row and the footer of step 8's page preview both show it, so they
 *  cannot disagree — and neither can drift from `formatTime` above.
 *
 *  Takes `t` rather than reaching for a hook: this file is plain reference
 *  data, and the two callers are components that already have one. */
export function summarizeHours(
  hours: Record<Weekday, DayHours>,
  t: (key: string) => string,
  locale: string
): string {
  const openDays = WEEKDAYS.filter((day) => hours[day].open);
  if (openDays.length === 0) return t("onboarding.details.hoursAllClosed");

  const first = hours[openDays[0]];
  const uniform = openDays.every((day) => hours[day].from === first.from && hours[day].to === first.to);
  const window = uniform
    ? `${formatTime(first.from, locale)} — ${formatTime(first.to, locale)}`
    : t("onboarding.details.hoursVaries");

  // Naming the days is only worth the room when it is not simply "every day".
  return openDays.length === WEEKDAYS.length
    ? window
    : `${openDays.map((day) => t(`onboarding.day.${day}`)).join(t("common.separator"))} · ${window}`;
}

export function timeOptions(locale: string): readonly TimeOption[] {
  const cached = TIME_OPTIONS_BY_LOCALE.get(locale);
  if (cached) return cached;
  const built = HALF_HOURS.map((value) => ({ value, label: formatTime(value, locale) }));
  TIME_OPTIONS_BY_LOCALE.set(locale, built);
  return built;
}

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

/** Black or white, whichever stays readable on `hex`. Merchants can pick any
 *  brand colour, including a very light one. */
export function readableOn(hex: string): string {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex ?? "");
  if (!match) return "#1D1D1D";

  const int = parseInt(match[1], 16);
  const channel = (shift: number) => {
    const c = ((int >> shift) & 0xff) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const luminance = 0.2126 * channel(16) + 0.7152 * channel(8) + 0.0722 * channel(0);

  return luminance > 0.5 ? "#1D1D1D" : "#FFFFFF";
}

/** A typeface the merchant can put on their public page.
 *
 *  `stack` is a whole CSS stack rather than one family on purpose: nothing in
 *  this app loads a webfont (packages/ui/src/tokens/tokens.css names "Inter"
 *  and "Readex Pro" inside fallback lists, but there is no @font-face rule and
 *  no <link> in index.html), so a choice only changes anything if it resolves
 *  to something the machine already has. Every option below does.
 *
 *  `arabic` records whether the leading family carries Arabic glyphs. An
 *  Arabic page set in a Latin-only face falls back glyph by glyph and looks
 *  broken, which is the same reason packages/i18n/src/lib/fonts.ts swaps the
 *  app's own face per locale — `fontStack` applies that rule here. */
export interface FontChoice {
  id: string;
  /** The family name, shown as-is: a typeface is not translated. */
  label: string;
  stack: string;
  arabic: boolean;
}

export const FONTS: readonly FontChoice[] = [
  { id: "inter",   label: "Inter",      stack: "var(--font-latin)",                     arabic: false },
  { id: "readex",  label: "Readex Pro", stack: "var(--font-arabic)",                    arabic: true  },
  { id: "georgia", label: "Georgia",    stack: "Georgia, 'Times New Roman', serif",     arabic: false },
  { id: "tahoma",  label: "Tahoma",     stack: "Tahoma, Geneva, Verdana, sans-serif",   arabic: true  },
];

/** The stack to render the public page in. Falls back to the app's Arabic face
 *  when the merchant picked a Latin-only one and the page is being previewed in
 *  Arabic — showing them tofu boxes would be a worse answer than honouring the
 *  choice literally. */
export function fontStack(id: string, locale: string): string {
  const font = FONTS.find((f) => f.id === id) ?? FONTS[0];
  return locale === "ar" && !font.arabic ? "var(--font-arabic)" : font.stack;
}

/** What the "Style" control on step 8 actually changes on the public page.
 *
 *  The ids are THEME_TEMPLATES', not a second list: step 8's Style select edits
 *  `brand.themeTemplate`, the same field step 4's template cards set, so the
 *  two screens cannot disagree about which style is active. `modern` is the
 *  fallback for a merchant who never opened the template cards, which is what
 *  the design shows selected by default. */
export interface StyleTokens {
  /** Corner radius for cards and images inside the preview, as a CSS length. */
  radius: string;
  /** Section-heading treatment. */
  headingWeight: number;
  headingTracking: string;
  headingTransform: "none" | "uppercase";
  /** How far the hero image is dimmed behind the business name. */
  heroScrim: string;
}

export function styleTokens(id: string | null): StyleTokens {
  switch (id) {
    case "elegant":
      return { radius: "2px", headingWeight: 500, headingTracking: "0.12em", headingTransform: "uppercase", heroScrim: "rgba(0,0,0,0.55)" };
    case "warm":
      return { radius: "16px", headingWeight: 700, headingTracking: "0", headingTransform: "none", heroScrim: "rgba(0,0,0,0.35)" };
    default:
      return { radius: "10px", headingWeight: 700, headingTracking: "-0.01em", headingTransform: "none", heroScrim: "rgba(0,0,0,0.45)" };
  }
}
