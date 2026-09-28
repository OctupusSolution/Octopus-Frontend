// The menus a preview shows. The builder reads a bound menu's draft (`previewMenuDraft`, the same
// shape as the public menu read but with image ids), turns it into the public menu document with
// delivery URLs (what the storefront canvas renders), and — for the in-app mirror — into LiveMenu
// the way the storefront's public-api.ts `menuFromDocument` does.
import type { BuilderMenuDocument, MenuPreviewResponse } from "@octopus/api-client";
import type { LiveMenu } from "./live-site";

function slugify(name: string, index: number): string {
  const ascii = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return ascii || `section-${index + 1}`;
}

/** Every media asset id a menu document references (the draft read gives ids, not URLs). */
export function menuMediaIds(doc: Pick<MenuPreviewResponse, "sections" | "items">): string[] {
  const ids = new Set<string>();
  for (const s of doc.sections) if (s.image?.assetId) ids.add(s.image.assetId);
  for (const i of Object.values(doc.items)) if (i.image?.assetId) ids.add(i.image.assetId);
  return [...ids];
}

export function builderMenuDocument(doc: MenuPreviewResponse, urlOf: (assetId: string) => string | null): BuilderMenuDocument {
  const image = (media: { assetId: string } | null) => (media ? urlOf(media.assetId) : null);
  return {
    sections: doc.sections.map((s) => ({ name: s.name, description: s.description, image: image(s.image), entries: s.entries })),
    items: Object.fromEntries(
      Object.entries(doc.items).map(([ref, i]) => [
        ref,
        {
          name: i.name,
          description: i.description,
          image: image(i.image),
          price: i.price ? { amount: i.price.amount } : null,
          isAvailable: i.isAvailable,
          modifierGroupRefs: i.modifierGroupRefs,
          tags: i.tags,
        },
      ])
    ),
    modifierGroups: Object.fromEntries(
      Object.entries(doc.modifierGroups).map(([ref, g]) => [
        ref,
        {
          name: g.promptLabel,
          selectionMode: g.selectionMode,
          isRequired: g.minSelected > 0,
          options: g.options.map((o) => ({ name: o.name, effect: { amount: o.effect.amount ? { amount: o.effect.amount.amount } : null }, isDefault: o.isDefault })),
        },
      ])
    ),
  };
}

/** The document as the storefront reads it (public-api.ts menuFromDocument); `placeholder` is its stock photograph. */
export function menuFromDocument(doc: BuilderMenuDocument, placeholder: string): LiveMenu {
  const categories: LiveMenu["categories"] = [];
  const items: LiveMenu["items"] = [];
  doc.sections.forEach((section, index) => {
    const category = { id: `cat-${index + 1}`, slug: slugify(section.name, index), name: section.name, imageUrl: section.image ?? placeholder };
    categories.push(category);
    for (const entry of section.entries) {
      if (entry.kind !== "Item") continue;
      const item = doc.items[entry.ref];
      if (!item) continue;
      items.push({
        id: `${category.id}-${entry.ref}`,
        categoryId: category.id,
        name: item.name,
        description: item.description ?? "",
        price: item.price?.amount ?? 0,
        imageUrl: item.image ?? placeholder,
      });
    }
  });
  return { categories, items };
}
