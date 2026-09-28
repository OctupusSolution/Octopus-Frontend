// The published menu document -> the storefront's menu shape. Client-safe (no node:http, no
// next/headers), so the builder canvas can render a menu the builder hands it.
import type { MenuCategory, MenuItem, MenuItemModifierGroup } from "@octopus/api-client";

export interface PublicMenuDocument {
  menu: { name: string };
  sections: { name: string; description: string | null; image: unknown; entries: { ref: string; kind: string }[] }[];
  items: Record<
    string,
    {
      name: string;
      description: string | null;
      image: unknown;
      price: { amount: number } | null;
      isAvailable: boolean;
      modifierGroupRefs: string[];
      advisories?: { labels?: string[] };
      tags?: string[];
    }
  >;
  modifierGroups: Record<string, { name: string; selectionMode: string; isRequired?: boolean; showAsRadio?: boolean; options: { id?: string; name: string; effect?: { amount?: { amount: number } | null }; isDefault?: boolean }[] }>;
}

const PLACEHOLDER = "/images/storefront/all.png";

/** The API gives an image as a URL string or an object carrying one. */
export function imageUrl(image: unknown, fallback: string = PLACEHOLDER): string {
  if (typeof image === "string" && image) return image;
  if (image && typeof image === "object" && "url" in image && typeof (image as { url: unknown }).url === "string") {
    return (image as { url: string }).url;
  }
  return fallback;
}

function slugify(name: string, index: number): string {
  const ascii = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return ascii || `section-${index + 1}`;
}

export interface Menu {
  categories: MenuCategory[];
  items: MenuItem[];
}

export function menuFromDocument(doc: Pick<PublicMenuDocument, "sections" | "items" | "modifierGroups">): Menu {
  const categories: MenuCategory[] = [];
  const items: MenuItem[] = [];
  doc.sections.forEach((section, index) => {
    const category: MenuCategory = {
      id: `cat-${index + 1}`,
      slug: slugify(section.name, index),
      name: section.name,
      imageUrl: imageUrl(section.image),
    };
    categories.push(category);
    for (const entry of section.entries) {
      if (entry.kind !== "Item") continue;
      const item = doc.items[entry.ref];
      if (!item) continue;
      const groups: MenuItemModifierGroup[] = item.modifierGroupRefs.flatMap((ref) => {
        const g = doc.modifierGroups[ref];
        if (!g) return [];
        return [
          {
            id: ref,
            label: g.name,
            required: Boolean(g.isRequired),
            multiple: g.selectionMode.toLowerCase() !== "single",
            display: g.options.length <= 4 ? ("pills" as const) : ("accordion" as const),
            options: g.options.map((o, i) => ({
              id: o.id ?? `${ref}-${i}`,
              label: o.name,
              priceDeltaSar: o.effect?.amount?.amount ?? 0,
            })),
          },
        ];
      });
      items.push({
        id: `${category.id}-${entry.ref}`, // URL-safe: it is a route segment
        categoryId: category.id,
        name: item.name,
        description: item.description ?? "",
        priceSar: item.price?.amount ?? 0,
        imageUrl: imageUrl(item.image),
        available: item.isAvailable,
        availableFor: ["delivery", "takeaway", "dine_in"],
        modifierGroups: groups,
        inStock: item.isAvailable,
      });
    }
  });
  return { categories, items };
}
