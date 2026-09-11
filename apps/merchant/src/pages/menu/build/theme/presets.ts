// The six presets the Theme frame names, each with its own palette.
//
// These used to borrow SITE_THEMES' ids and colour their tiles by `styleId`,
// which only has three values — so three tiles looked identical and every
// label sat one id off from the look it described. A preset here is what the
// merchant is actually choosing: four brand colours plus which of the three
// looks `styleTokens` renders (corner radius, heading weight).

export interface MenuPreset {
  id: string;
  labelKey: string;
  styleId: "elegant" | "modern" | "warm";
  colors: { primary: string; light: string; accent: string; dark: string };
}

export const MENU_PRESETS: readonly MenuPreset[] = [
  {
    id: "ocean",
    labelKey: "menuTheme.preset.ocean",
    styleId: "modern",
    // Same four as the site draft's defaults — the frame's swatches.
    colors: { primary: "#08589D", light: "#EEF4FF", accent: "#5B9BD5", dark: "#0B2545" },
  },
  {
    id: "elegant",
    labelKey: "menuTheme.preset.elegant",
    styleId: "elegant",
    colors: { primary: "#8B6B3D", light: "#FAF6EF", accent: "#C9A66B", dark: "#2B2118" },
  },
  {
    id: "minimal",
    labelKey: "menuTheme.preset.minimal",
    styleId: "modern",
    colors: { primary: "#1F2937", light: "#F9FAFB", accent: "#9CA3AF", dark: "#030712" },
  },
  {
    id: "warm",
    labelKey: "menuTheme.preset.warm",
    styleId: "warm",
    colors: { primary: "#C2410C", light: "#FFF7ED", accent: "#FDBA74", dark: "#431407" },
  },
  {
    id: "dark",
    labelKey: "menuTheme.preset.dark",
    styleId: "elegant",
    colors: { primary: "#D4AF37", light: "#2A2A2E", accent: "#8C7A3E", dark: "#0B0B0D" },
  },
  {
    id: "natural",
    labelKey: "menuTheme.preset.natural",
    styleId: "warm",
    colors: { primary: "#3F7D3A", light: "#F1F7EE", accent: "#9CC58F", dark: "#1E3A1B" },
  },
];

// Menus saved before this catalogue carry SITE_THEMES ids. Resolving them to
// the nearest preset keeps their tile selected instead of showing nothing.
const LEGACY: Readonly<Record<string, string>> = {
  modernGrid: "ocean",
  minimalMono: "minimal",
  cafeWarm: "warm",
  luxeNoir: "dark",
  casualBright: "natural",
};

export function presetFor(id: string | null | undefined): MenuPreset | null {
  if (!id) return null;
  const resolved = LEGACY[id] ?? id;
  return MENU_PRESETS.find((p) => p.id === resolved) ?? null;
}
