// OCTOPUS brand color system — sourced from OCTOPUS_Brand_Identity.
// Every consumer (Tailwind preset, CSS variables, components) reads from here.
// Do not hardcode hex values anywhere else in the codebase.

export const primary = {
  oceanBlue: "#0D6EFD",
  octopusViolet: "#6C4DFF",
  deepNavy: "#081026",
} as const;

export const secondary = {
  teal: "#008849",
  coral: "#FF6B6B",
  amber: "#FFB020",
  mint: "#6EDBA3",
  skyBlue: "#4DB8FF",
  lilac: "#C9B6FF",
} as const;

// Gray scale — named by weight, light to dark.
export const neutral = {
  white: "#FFFFFF",
  gray50: "#FBFAFC",
  gray100: "#F1F5F9",
  gray200: "#E2E8F0",
  gray300: "#CBD5E1",
  gray500: "#64748B",
  gray700: "#334155",
  gray900: "#0F172A",
} as const;

export const semantic = {
  success: "#22C55E",
  // Source token was labeled "3B82F6" (name == hex) in the brand file —
  // functions as the info/informational color. Renamed here for usability.
  info: "#3B82F6",
  warning: "#F59E0B",
  error: "#EF4444",
  accent: "#885CF6", // "Accents/Special"
  altSuccess: "#14B8A6",
} as const;

export const background = {
  solidWhite: "#FFFFFF",
  lightGray: "#F7F8FA",
  softBlue: "#F0F4FF",
  softViolet: "#F5F0FF",
  darkSurface: "#081026",
} as const;

// Gradient stops — apply as `linear-gradient(135deg, ${from}, ${to})`
// unless the brand file specifies a different angle.
export const gradients = {
  oceanBlueViolet: { from: primary.oceanBlue, to: primary.octopusViolet },
  violetPink: { from: primary.octopusViolet, to: secondary.coral },
  purpleViolet: { from: semantic.accent, to: primary.octopusViolet },
  blueCyan: { from: primary.oceanBlue, to: secondary.skyBlue },
} as const;

export const colors = {
  primary,
  secondary,
  neutral,
  semantic,
  background,
  gradients,
} as const;

export type OctopusColors = typeof colors;
