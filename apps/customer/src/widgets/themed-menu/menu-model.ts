// The public menu document -> what ThemedMenu draws: sections in order (ref s{index}), each entry resolved against the
// document's items/offers with its price already formatted. An entry whose ref is missing is skipped (a degraded document
// renders what it can).
import type { PublicMenuDocument } from "@octopus/api-client";
import { displayStyleOf, formatMoney, mediaUrl, type DisplayStyle } from "./menu-theme";

export type EntryView =
  | { kind: "item"; ref: string; name: string; description: string; imageUrl: string | null; price: string; available: boolean; tags: string[] }
  | { kind: "offer"; ref: string; name: string; imageUrl: string | null; price: string; was: string | null; badge: string | null; saving: string | null; available: boolean };

export interface SectionView {
  ref: string;
  name: string;
  description: string;
  imageUrl: string | null;
  displayStyle: DisplayStyle;
  color: string | null;
  entries: EntryView[];
}

export interface MenuView {
  name: string;
  logoUrl: string | null;
  heroUrl: string | null;
  heroText: string | null;
  heroSubtext: string | null;
  availability: string;
  nextAvailableAtUtc: string | null;
  sections: SectionView[];
}

export function menuView(doc: PublicMenuDocument, currencyLabel: (code: string) => string): MenuView {
  const money = (m: Parameters<typeof formatMoney>[0]) => formatMoney(m, doc.currency, currencyLabel);
  const sections = doc.sections.map((section, index): SectionView => ({
    ref: `s${index}`,
    name: section.name,
    description: section.description ?? "",
    imageUrl: mediaUrl(section.image, null),
    displayStyle: displayStyleOf(section.displayStyle),
    color: section.color,
    entries: section.entries.flatMap((entry): EntryView[] => {
      if (entry.kind === "Offer") {
        const offer = doc.offers[entry.ref];
        if (!offer) return [];
        const saves = offer.price.saving.amount > 0;
        return [
          {
            kind: "offer",
            ref: entry.ref,
            name: offer.name,
            imageUrl: mediaUrl(offer.image, null),
            price: money(offer.price.price),
            was: saves ? money(offer.price.referenceTotal) : null,
            badge: offer.badge,
            saving: offer.showSavingBadge && saves ? `${Math.round(offer.price.savingPercent)}%` : null,
            available: offer.isAvailable,
          },
        ];
      }
      const item = doc.items[entry.ref];
      if (!item) return [];
      return [
        {
          kind: "item",
          ref: entry.ref,
          name: item.name,
          description: item.description ?? "",
          imageUrl: mediaUrl(item.image, null),
          price: money(item.price),
          available: item.isAvailable,
          tags: item.tags,
        },
      ];
    }),
  }));
  return {
    name: doc.menu.name,
    logoUrl: mediaUrl(doc.menu.theme.logo, null),
    heroUrl: mediaUrl(doc.menu.theme.hero, null),
    heroText: doc.menu.theme.heroText,
    heroSubtext: doc.menu.theme.heroSubtext,
    availability: doc.availability,
    nextAvailableAtUtc: doc.nextAvailableAtUtc,
    sections,
  };
}
