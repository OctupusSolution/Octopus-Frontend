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
  /** Heading i18n key per section id. Explicit rather than positional: the two
   *  hosts derive `sections` and `navItems` from different lists, so nothing
   *  guarantees the same id sits at the same index in both. */
  sectionLabelKeys: Readonly<Record<string, string>>;
  navItems: readonly PreviewNavItem[];
  /** Header-nav-only entries with no equivalent page of their own — content
   *  the footer's Explore column (which lists `navItems` unfiltered, as a
   *  sitemap) must not also pick up. `leading` renders before `navItems`
   *  (onboarding's Home, standing in for its hidden `hero` entry), `trailing`
   *  after (onboarding's About/Contact). Optional: a host whose `navItems`
   *  already contains everything the header should show (the builder, whose
   *  pages include real Home/About/Contact entries) omits it entirely. */
  navFurniture?: {
    leading?: readonly PreviewNavItem[];
    trailing?: readonly PreviewNavItem[];
  };
  /** Which nav entry is drawn as the current page — matched by label key, not by
   *  position, so it survives a merchant reordering their navigation. Undefined
   *  means no entry is marked active. */
  activeNavLabelKey?: string;
  /** i18n keys for the category mosaic tiles. */
  categories: readonly string[];
  /** Already translated. Empty string renders nothing. */
  cityLabel: string;
  /** Already summarised, e.g. "Daily 11:00 AM – 12:00 AM". Empty string
   *  renders nothing. */
  hoursSummary: string;
  /** One formatted price per product card, in card order. The widget indexes
   *  into this modulo its length, so a host may supply fewer than it draws. */
  samplePrices: readonly string[];
  /** The struck-through "was" price for each card, same order and length. */
  sampleWasPrices: readonly string[];
  hero: PreviewHero;
  device: PreviewDevice;
}
