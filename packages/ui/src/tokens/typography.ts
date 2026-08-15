// OCTOPUS typography system — sourced from OCTOPUS_Brand_Identity.
//
// Two typefaces, chosen per script rather than per app:
//   - Inter       -> Latin / English text. Designed for screens, tall x-height.
//   - Readex Pro  -> Arabic (+ Latin) text. Built for bilingual AR/EN UI,
//                    unlike Inter which has no Arabic glyphs at all.
//
// The active family is resolved by `dir`/`lang`, not by portal — every
// portal renders both scripts depending on the active locale.
// See packages/i18n/src/lib/fonts.ts for the resolver.

export const fontFamily = {
  latin: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  arabic: '"Readex Pro", "Inter", -apple-system, "Segoe UI", sans-serif',
} as const;

// Weights available on Inter (variable font, 100-900).
// Readex Pro ships 200-700 — clamp arabic text to that range in components.
export const fontWeight = {
  thin: 100,
  extraLight: 200,
  light: 300,
  regular: 400,
  medium: 500,
  semiBold: 600,
  bold: 700,
  extraBold: 800,
  black: 900,
} as const;

// Type scale: size/line-height in px, default weight, and intended use case.
// Matches the brand file's "Type Scale" table exactly.
export const typeScale = {
  display1: { size: 64, lineHeight: 72, weight: fontWeight.bold, useCase: "Hero headlines" },
  display2: { size: 48, lineHeight: 56, weight: fontWeight.bold, useCase: "Section headlines" },
  h1: { size: 32, lineHeight: 40, weight: fontWeight.semiBold, useCase: "Page titles" },
  h2: { size: 24, lineHeight: 32, weight: fontWeight.semiBold, useCase: "Section titles" },
  h3: { size: 20, lineHeight: 28, weight: fontWeight.medium, useCase: "Subsection titles" },
  bodyLarge: { size: 16, lineHeight: 24, weight: fontWeight.regular, useCase: "Important body text" },
  body: { size: 14, lineHeight: 20, weight: fontWeight.regular, useCase: "Default body text" },
  bodySmall: { size: 12, lineHeight: 16, weight: fontWeight.regular, useCase: "Captions, notes" },
  caption: { size: 11, lineHeight: 16, weight: fontWeight.regular, useCase: "Microcopy, labels" },
} as const;

export const typography = {
  fontFamily,
  fontWeight,
  typeScale,
} as const;

export type OctopusTypography = typeof typography;
export type TypeScaleToken = keyof typeof typeScale;
