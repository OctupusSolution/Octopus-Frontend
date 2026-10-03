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

// Moved to shared/lib/brand-tokens.ts so the storefront-preview widget can
// reach them without importing from pages/. Re-exported here because sixteen
// files already import them from this module.
export * from "@/shared/lib/brand-tokens";
