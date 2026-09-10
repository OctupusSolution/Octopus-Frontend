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
  /** Whether the header's nav strip renders at all. Optional so a host that
   *  has no such toggle (onboarding) keeps its current header unconditionally
   *  — `undefined` behaves as `true`. The builder's "Show in Header" switch
   *  (Navigation step) is the one control that maps onto this. */
  showHeaderNav?: boolean;
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
  /** Literal, already-translated labels for those same tiles. When present the
   *  widget renders these verbatim and ignores `categories`.
   *
   *  The menu builder's sections are strings a merchant typed, not dictionary
   *  keys. Passing them through `categories` would appear to work only because
   *  `t()` falls back to returning the key it was handed — and would break the
   *  day someone named a section after a real key. Onboarding and the Public
   *  Link Builder pass nothing here and keep the key path. */
  categoryLabels?: readonly string[];
  /** Which page this preview depicts. "landing" is the storefront home the two
   *  original hosts show, and stays the default so neither is affected.
   *  "menu" is the menu page itself — a category chip strip over a grid of
   *  every item — which is what the menu builder's Theme step is designing. */
  composition?: "landing" | "menu";
  /** `storefrontAsset` filenames, parallel to `categories` — same order, same
   *  length (never empty, same rule as `categories` itself). Supplied
   *  explicitly by each adapter rather than guessed by the widget from the
   *  category key's own string (a widget keyed on one host's dictionary
   *  contents is exactly the coupling this model exists to remove — see
   *  Ruling B). The widget indexes into this modulo its length, same as
   *  `samplePrices`. */
  categoryImages: readonly string[];
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
