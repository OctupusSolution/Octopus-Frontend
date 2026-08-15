// Supported locales. Extend here if OCTOPUS adds a third market language —
// every other file in this package (fonts.ts, dictionaries) keys off this.
export const locales = ["en", "ar"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ar"; // Saudi market default
