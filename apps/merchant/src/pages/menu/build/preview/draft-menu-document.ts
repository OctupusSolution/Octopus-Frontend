// The builder's in-memory menu -> the public menu document the storefront renders (the backend's PublicMenuProjection,
// ported), so the live preview shows unsaved edits the way a customer will see them once published. Rules follow the
// backend: only visible sections, in order; entries addressed by refs assigned in order of first appearance (i{n}, m{n},
// o{n}); money in major units; availability "Available" (a preview answers "what would this look like"). An item with no
// name yet is mid-typing and is left out. Media carries the local URL (data: or delivery URL); blob: URLs are dropped —
// the canvas is another origin and cannot read them.
import type { PublicMenuDocument, PublicMenuItem, PublicMenuMedia, PublicMenuModifierGroup, PublicMenuMoney, PublicMenuOffer, PublicMenuSection } from "@octopus/api-client";
import type { Item, Menu, ModifierGroup, Offer } from "@/entities/menu";

const NAV = { "top-bar": "TopBar", "side-drawer": "SideDrawer", "bottom-bar": "BottomBar", "pill-scroll": "PillScroll" } as const;
const CATEGORY = { "icon-text": "IconAndText", "text-only": "TextOnly", "icons-only": "IconOnly", "image-text": "ImageAndText" } as const;
const CARD = { classic: "Classic", "clean-minimal": "CleanMinimal", "image-top": "ImageTop", "image-left": "ImageLeft" } as const;
const DETAILS = { "same-page": "SamePage", overlay: "Overlay", "new-page": "NewPage" } as const;
const DISPLAY = { list: "List", carousel: "Carousel", grid: "Grid" } as const;
const EFFECT = { "no-change": "NoChange", "add-amount": "AddAmount", fixed: "FixedPrice" } as const;

/** The menu's own brand (Task 9 adds it to MenuTheme); read structurally so this file does not depend on that task's order. */
interface BrandLike {
  colors: { primary: string; light: string; accent: string; dark: string };
  logoUrl: string | null;
  heroUrl: string | null;
  heroText: string;
  heroSubtext: string;
}

export interface DraftMenuOptions {
  /** ISO 4217 code from catalog settings; null when unknown. */
  currency: string | null;
  language: string;
  /** A tag code -> its display text (a customer sees the label, as the public read does). */
  tagLabel?: (tag: string) => string;
}

function minorUnits(code: string): number {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency: code }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    return 2;
  }
}

const media = (url: string | null | undefined, kind = "Image"): PublicMenuMedia | null =>
  url && !url.startsWith("blob:") ? { assetId: "local", kind, url } : null;

export function draftMenuDocument(menu: Menu, options: DraftMenuOptions): { document: PublicMenuDocument; sectionIds: string[] } {
  const currencyCode = options.currency ?? "";
  const money = (amount: number): PublicMenuMoney => ({ amount, currency: currencyCode });
  const allItems = new Map<string, Item>();
  for (const s of menu.sections) if (s.kind === "items") for (const e of s.entries as Item[]) allItems.set(e.id, e);

  const items: Record<string, PublicMenuItem> = {};
  const itemRefs = new Map<string, string>();
  const groups: Record<string, PublicMenuModifierGroup> = {};
  const groupRefs = new Map<string, string>();
  const offers: Record<string, PublicMenuOffer> = {};
  const offerRefs = new Map<string, string>();

  const groupRef = (group: ModifierGroup): string => {
    const known = groupRefs.get(group.id);
    if (known) return known;
    const ref = `m${groupRefs.size + 1}`;
    groupRefs.set(group.id, ref);
    groups[ref] = {
      promptLabel: group.customerLabel || group.name,
      helpText: group.helpText || null,
      selectionMode: group.type === "single" ? "Single" : "Multiple",
      minSelected: group.min,
      maxSelected: group.max,
      options: group.options.map((o) => ({
        name: o.name,
        effect: { kind: EFFECT[o.priceType], amount: o.priceType === "no-change" ? null : money(o.price) },
        isDefault: o.isDefault,
        isAvailable: o.available,
      })),
    };
    return ref;
  };

  const itemRef = (item: Item): string | null => {
    if (item.name.trim() === "") return null;
    const known = itemRefs.get(item.id);
    if (known) return known;
    const ref = `i${itemRefs.size + 1}`;
    itemRefs.set(item.id, ref);
    items[ref] = {
      name: item.name,
      description: item.description || null,
      image: media(item.image),
      video: media(item.video, "Video"),
      tags: item.tags.map((tag) => options.tagLabel?.(tag) ?? tag),
      price: money(item.pricing.price),
      facts: (item.facts ?? []).map((f) => ({ factCode: f.factCode, amount: f.amount, unitCode: f.unitCode })),
      advisories: { labels: item.allergies.allergens, additionalInfo: item.allergies.note || null },
      isAvailable: item.status !== "unavailable" && item.availability.available,
      modifierGroupRefs: item.modifierGroups.map(groupRef),
    };
    return ref;
  };

  const offerRef = (offer: Offer): string | null => {
    if (offer.name.trim() === "") return null;
    const known = offerRefs.get(offer.id);
    if (known) return known;
    const ref = `o${offerRefs.size + 1}`;
    offerRefs.set(offer.id, ref);
    const components = offer.entries.flatMap((e) => {
      const component = allItems.get(e.itemId);
      const cRef = component ? itemRef(component) : null;
      return cRef ? [{ itemRef: cRef, quantity: e.qty, unit: component!.pricing.price, available: items[cRef].isAvailable }] : [];
    });
    const reference = components.reduce((sum, c) => sum + c.unit * c.quantity, 0);
    const price = offer.pricing.offerPrice;
    const saving = Math.max(0, reference - price);
    offers[ref] = {
      name: offer.name,
      image: media(offer.image),
      badge: offer.badge || null,
      showSavingBadge: offer.showSavingBadge,
      components: components.map(({ itemRef: r, quantity }) => ({ itemRef: r, quantity })),
      pricingRule: { kind: offer.pricing.role === "fixed" ? "Fixed" : offer.pricing.role === "dynamic" ? "Dynamic" : offer.pricing.discount?.type === "amount" ? "DiscountAmount" : "DiscountPercent", fixedPrice: offer.pricing.role === "fixed" ? money(price) : null, discountPercent: offer.pricing.discount?.type === "percent" ? offer.pricing.discount.value : null, discountAmount: offer.pricing.discount?.type === "amount" ? money(offer.pricing.discount.value) : null, dynamicBasePrice: offer.pricing.role === "dynamic" ? money(price) : null },
      price: { referenceTotal: money(reference), price: money(price), saving: money(saving), savingPercent: reference > 0 ? Math.round((saving / reference) * 10000) / 100 : 0 },
      isAvailable: offer.status === "active" && components.every((c) => c.available) && components.length === offer.entries.length,
    };
    return ref;
  };

  const sectionIds: string[] = [];
  const sections: PublicMenuSection[] = [];
  for (const section of menu.sections) {
    if (section.visibility !== "visible") continue;
    const entries = section.entries.flatMap((entry) => {
      if (section.kind === "offers") {
        const ref = offerRef(entry as Offer);
        return ref ? [{ ref, kind: "Offer" }] : [];
      }
      const ref = itemRef(entry as Item);
      return ref ? [{ ref, kind: "Item" }] : [];
    });
    sectionIds.push(section.id);
    sections.push({ name: section.name, description: section.description || null, image: media(section.image), displayStyle: DISPLAY[section.displayStyle], color: section.color, entries });
  }

  const brand = (menu.theme as { brand?: BrandLike | null }).brand ?? null;
  const theme = menu.theme;
  const document: PublicMenuDocument = {
    availability: "Available",
    nextAvailableAtUtc: null,
    servedAsFallback: false,
    locationLabel: null,
    language: options.language,
    availableLanguages: [options.language],
    menu: {
      name: menu.name,
      theme: {
        presetCode: theme.serverPresetCode ?? theme.presetId ?? null,
        logo: media(brand?.logoUrl),
        hero: media(brand?.heroUrl),
        heroText: brand?.heroText || null,
        heroSubtext: brand?.heroSubtext || null,
        titleFontCode: theme.titleFontCode ?? null,
        bodyFontCode: theme.bodyFontCode ?? null,
        primaryColor: brand?.colors.primary ?? null,
        lightColor: brand?.colors.light ?? null,
        accentColor: brand?.colors.accent ?? null,
        darkColor: brand?.colors.dark ?? null,
        navigationStyle: NAV[theme.navStyle],
        sectionNavStyle: CATEGORY[theme.categoryStyle],
        cardStyle: CARD[theme.cardStyle],
        itemDetailsBehavior: DETAILS[theme.itemDetails],
        stickyPrimaryAction: theme.stickyAddToCart,
        showItemTags: theme.showItemTags,
      },
    },
    sections,
    items,
    modifierGroups: groups,
    offers,
    currency: options.currency ? { code: options.currency, minorUnits: minorUnits(options.currency) } : null,
    tax: { configured: false, pricesIncludeTax: null },
  };
  return { document, sectionIds };
}
