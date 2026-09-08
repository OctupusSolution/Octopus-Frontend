// Step 1 of the builder: which storefront themes a merchant can pick, and the
// filter chips above the grid. `styleTokens` (shared/lib/brand-tokens) only
// distinguishes three concrete looks — "elegant", "warm", and a "modern"
// default — so every theme card's `styleId` resolves to one of those three;
// the six cards differ in copy, thumbnail and filter tags, not in CSS tokens.

export interface SiteTheme {
  id: string;
  nameKey: string;
  descKey: string;
  /** One of the three looks `styleTokens` actually renders differently. */
  styleId: "elegant" | "modern" | "warm";
  /** Filter chip ids this theme shows up under (besides "all"). */
  filters: readonly string[];
  /** The frames badge exactly one card "Recommended". */
  recommended?: boolean;
}

export const THEME_FILTERS: readonly { id: string; labelKey: string }[] = [
  { id: "all", labelKey: "publicLink.themeFilter.all" },
  { id: "elegant", labelKey: "publicLink.themeFilter.elegant" },
  { id: "modern", labelKey: "publicLink.themeFilter.modern" },
  { id: "minimal", labelKey: "publicLink.themeFilter.minimal" },
  { id: "cafe", labelKey: "publicLink.themeFilter.cafe" },
  { id: "casual", labelKey: "publicLink.themeFilter.casual" },
  { id: "luxury", labelKey: "publicLink.themeFilter.luxury" },
];

export const SITE_THEMES: readonly SiteTheme[] = [
  {
    id: "elegant",
    nameKey: "publicLink.theme.elegant.name",
    descKey: "publicLink.theme.elegant.desc",
    styleId: "elegant",
    filters: ["elegant", "luxury"],
    recommended: true,
  },
  {
    id: "modernGrid",
    nameKey: "publicLink.theme.modernGrid.name",
    descKey: "publicLink.theme.modernGrid.desc",
    styleId: "modern",
    filters: ["modern"],
  },
  {
    id: "minimalMono",
    nameKey: "publicLink.theme.minimalMono.name",
    descKey: "publicLink.theme.minimalMono.desc",
    styleId: "modern",
    filters: ["modern", "minimal"],
  },
  {
    id: "cafeWarm",
    nameKey: "publicLink.theme.cafeWarm.name",
    descKey: "publicLink.theme.cafeWarm.desc",
    styleId: "warm",
    filters: ["cafe"],
  },
  {
    id: "casualBright",
    nameKey: "publicLink.theme.casualBright.name",
    descKey: "publicLink.theme.casualBright.desc",
    styleId: "warm",
    filters: ["casual"],
  },
  {
    id: "luxeNoir",
    nameKey: "publicLink.theme.luxeNoir.name",
    descKey: "publicLink.theme.luxeNoir.desc",
    styleId: "elegant",
    filters: ["luxury", "elegant"],
  },
];
