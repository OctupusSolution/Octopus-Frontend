// The only thing the preview knows about. Deliberately not a draft: two very
// different drafts feed this widget, and resolving city names, opening hours
// and prices in each host's adapter is what keeps their types out of here.
export type PreviewDevice = "desktop" | "tablet" | "mobile";

export interface PreviewNavItem {
  /** Already-translated-or-translatable i18n key for the item's label. */
  labelKey: string;
  /** Whether this section belongs in the top nav. "Home" stands in for a
   *  hero section, so onboarding's adapter marks that one `false`; the
   *  footer's Explore column lists every section regardless. */
  visible: boolean;
}

export interface PreviewHero {
  headline?: string;
  sub?: string;
  primaryCta?: string;
  secondaryCta?: string;
  imageUrl?: string;
}

export interface StorefrontPreviewModel {
  businessName: string;
  logoDataUrl: string | null;
  /** Already rendered, e.g. "ocean-table.octopus.app". */
  url: string;
  primary: string;
  secondary: string;
  /** A FONTS id from shared/lib/brand-tokens. */
  font: string;
  /** A THEME_TEMPLATES id, or null for the default treatment. */
  themeTemplate: string | null;
  /** Section ids in display order. Hidden sections are absent, not flagged. */
  sections: readonly string[];
  navItems: readonly PreviewNavItem[];
  /** i18n keys for the category mosaic tiles. */
  categories: readonly string[];
  /** Already translated. Empty string renders nothing. */
  cityLabel: string;
  /** Already summarised, e.g. "Daily 11:00 AM – 12:00 AM". Empty string
   *  renders nothing. */
  hoursSummary: string;
  /** Already formatted sample price, e.g. "SAR 153.00". */
  samplePrice: string;
  /** Already formatted struck-through price. */
  sampleWasPrice: string;
  hero: PreviewHero;
  device: PreviewDevice;
}
