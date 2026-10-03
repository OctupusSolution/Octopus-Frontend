// The anonymous public menu read (backend Menu module `PublicMenuResponse`, camelCase JSON), served by
//   GET /v1/public/menu-codes/{key}   (a scanned QR code)
//   GET /v1/public/site-menu/{key}    (a Public Link site's bound menu)
//   GET /menus/{menuId}/preview       (the builder's draft, admin)
// The storefront renders it; the menu builder produces the same shape from its unsaved draft for the live preview.
// Carries no internal ids: entries are addressed by response-local refs (i1, m1, o1).

export interface PublicMenuMoney {
  /** Major units, at the currency's precision. */
  amount: number;
  currency: string;
}

export interface PublicMenuMedia {
  assetId: string;
  /** "Image" | "Video". */
  kind: string;
  /** Where a browser fetches it; null when the server could not resolve it. */
  url?: string | null;
}

export interface PublicMenuItem {
  name: string;
  description: string | null;
  image: PublicMenuMedia | null;
  video: PublicMenuMedia | null;
  tags: string[];
  price: PublicMenuMoney | null;
  facts: { factCode: string; amount: number; unitCode: string }[];
  advisories: { labels: string[]; additionalInfo: string | null };
  isAvailable: boolean;
  modifierGroupRefs: string[];
}

export interface PublicMenuModifierOption {
  name: string;
  /** kind: "NoChange" | "AddAmount" | "FixedPrice". */
  effect: { kind: string; amount: PublicMenuMoney | null };
  isDefault: boolean;
  isAvailable: boolean;
}

export interface PublicMenuModifierGroup {
  promptLabel: string;
  helpText: string | null;
  /** "Single" | "Multiple". */
  selectionMode: string;
  minSelected: number;
  maxSelected: number | null;
  options: PublicMenuModifierOption[];
}

export interface PublicMenuOffer {
  name: string;
  image: PublicMenuMedia | null;
  badge: string | null;
  showSavingBadge: boolean;
  components: { itemRef: string; quantity: number }[];
  /** kind: "Fixed" | "DiscountPercent" | "DiscountAmount" | "Dynamic". */
  pricingRule: {
    kind: string;
    fixedPrice: PublicMenuMoney | null;
    discountPercent: number | null;
    discountAmount: PublicMenuMoney | null;
    dynamicBasePrice: PublicMenuMoney | null;
  };
  price: { referenceTotal: PublicMenuMoney; price: PublicMenuMoney; saving: PublicMenuMoney; savingPercent: number };
  isAvailable: boolean;
}

/** kind: "Item" | "Offer"; ref keys into `items` or `offers`. */
export interface PublicMenuEntry {
  ref: string;
  kind: string;
}

export interface PublicMenuSection {
  name: string;
  description: string | null;
  image: PublicMenuMedia | null;
  /** "List" | "Carousel" | "Grid". */
  displayStyle: string;
  color: string | null;
  entries: PublicMenuEntry[];
}

export interface PublicMenuTheme {
  presetCode: string | null;
  logo: PublicMenuMedia | null;
  hero: PublicMenuMedia | null;
  heroText: string | null;
  heroSubtext: string | null;
  titleFontCode: string | null;
  bodyFontCode: string | null;
  primaryColor: string | null;
  lightColor: string | null;
  accentColor: string | null;
  darkColor: string | null;
  /** "TopBar" | "SideDrawer" | "BottomBar" | "PillScroll". */
  navigationStyle: string;
  /** "IconAndText" | "TextOnly" | "IconOnly" | "ImageAndText". */
  sectionNavStyle: string;
  /** "Classic" | "CleanMinimal" | "ImageTop" | "ImageLeft". */
  cardStyle: string;
  /** "SamePage" | "Overlay" | "NewPage". */
  itemDetailsBehavior: string;
  stickyPrimaryAction: boolean;
  showItemTags: boolean;
}

export interface PublicMenuCurrency {
  code: string;
  minorUnits: number;
}

export interface PublicMenuDocument {
  /** "Available" | "PreOrder" | "NotAvailableNow". */
  availability: string;
  nextAvailableAtUtc: string | null;
  servedAsFallback: boolean;
  locationLabel: string | null;
  language: string;
  availableLanguages: string[];
  menu: { name: string; theme: PublicMenuTheme };
  sections: PublicMenuSection[];
  items: Record<string, PublicMenuItem>;
  modifierGroups: Record<string, PublicMenuModifierGroup>;
  offers: Record<string, PublicMenuOffer>;
  currency: PublicMenuCurrency | null;
  tax: { configured: boolean; pricesIncludeTax: boolean | null };
}
