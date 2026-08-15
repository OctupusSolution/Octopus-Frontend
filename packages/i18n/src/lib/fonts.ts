// Resolves which brand typeface a locale should render in.
// Inter has no Arabic glyphs, so Arabic locales must resolve to Readex Pro —
// this is the single place that decision is made; components and the
// Tailwind preset should never hardcode a font choice per-locale themselves.

import type { Locale } from "../locales/types";

export type FontFamily = "latin" | "arabic";

const RTL_LOCALES: readonly Locale[] = ["ar"];

export function getDirection(locale: Locale): "ltr" | "rtl" {
  return RTL_LOCALES.includes(locale) ? "rtl" : "ltr";
}

export function getFontFamily(locale: Locale): FontFamily {
  return RTL_LOCALES.includes(locale) ? "arabic" : "latin";
}

// Applied once, at the document/app root — sets `dir` + `lang`, which in
// turn drives `--font-family-active` in packages/ui/src/tokens/tokens.css.
export function applyDocumentLocale(locale: Locale, root: HTMLElement = document.documentElement): void {
  root.setAttribute("lang", locale);
  root.setAttribute("dir", getDirection(locale));
}
