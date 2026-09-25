// Server-side reads of the platform's anonymous PublicApi.
//
// PublicApi resolves the tenant from the request's Host header (a subdomain of
// the platform's base domain, e.g. burger-house.octopus.app) and has no CORS, so
// these run in Next.js server code only, sending that Host explicitly. Anything
// the API cannot answer (unknown site, API down) comes back as `null`, and the
// callers fall back to the built-in sample tenant so the storefront still
// renders while a business is being set up.
import http from "node:http";
import https from "node:https";
import type { MenuCategory, MenuItem, MenuItemModifierGroup, Tenant } from "@octopus/api-client";

const BASE = new URL(process.env.PUBLIC_API_URL ?? "http://localhost:8082");
const SUFFIX = process.env.DEV_TENANT_DOMAIN_SUFFIX ?? "octopus.app";
const TTL_MS = 30_000;

export const hostFor = (slug: string) => `${slug}.${SUFFIX}`;

// `fetch` (undici) silently drops a custom Host header, and PublicApi picks the
// tenant from Host, so requests are made with node:http, which sends it as given.
// A short in-memory cache stands in for fetch's data cache.
const cache = new Map<string, { at: number; value: unknown }>();

function request(host: string, path: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const client = BASE.protocol === "https:" ? https : http;
    const req = client.request(
      { hostname: BASE.hostname, port: BASE.port, path, method: "GET", headers: { Host: host, Accept: "application/json" }, timeout: 5000 },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString("utf8") }));
      }
    );
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    req.end();
  });
}

async function get<T>(slug: string, path: string): Promise<T | null> {
  const key = `${slug}|${path}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value as T | null;
  let value: T | null = null;
  try {
    const res = await request(hostFor(slug), path);
    value = res.status >= 200 && res.status < 300 ? (JSON.parse(res.body) as T) : null;
  } catch {
    value = null;
  }
  cache.set(key, { at: Date.now(), value });
  return value;
}

// ---- public site (brand + sections) ------------------------------------------

export interface PublicSite {
  slug: string;
  publicHostname: string;
  brand: {
    displayName: string | null;
    colors: Record<string, string>;
    typography: { titleEnglish: string | null; bodyEnglish: string | null; titleArabic: string | null; bodyArabic: string | null };
    logo: { url: string | null } | null;
    heroBackground: { url: string | null } | null;
  };
  sections: { sectionId: string; type: string; content: Record<string, unknown> | null; binding: { sourceKey: string; contentKey: string } | null }[];
}

export const fetchPublicSite = (slug: string) => get<PublicSite>(slug, "/v1/public-site");

export function tenantFromSite(slug: string, site: PublicSite): Tenant {
  const name = site.brand.displayName ?? slug;
  return {
    id: site.slug,
    slug: site.slug,
    name,
    vertical: "restaurant",
    // The API has no branches yet: the business is presented as one open branch.
    branches: [
      {
        id: `${site.slug}-main`,
        name,
        city: "",
        address: "",
        displayName: name,
        district: "",
        imageUrl: site.brand.heroBackground?.url ?? "/images/storefront/hero.webp",
        isOpen: true,
      },
    ],
    deliveryZones: [],
    minDeliveryOrderSar: 0,
  };
}

// ---- published menu (opened by an access code) ---------------------------------

interface PublicMenuDocument {
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
function imageUrl(image: unknown): string {
  if (typeof image === "string") return image;
  if (image && typeof image === "object" && "url" in image && typeof (image as { url: unknown }).url === "string") {
    return (image as { url: string }).url;
  }
  return PLACEHOLDER;
}

function slugify(name: string, index: number): string {
  const ascii = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return ascii || `section-${index + 1}`;
}

export interface Menu {
  categories: MenuCategory[];
  items: MenuItem[];
}

export function menuFromDocument(doc: PublicMenuDocument): Menu {
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
        id: `${category.id}:${entry.ref}`,
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

/** The access key of the menu a tenant's storefront shows. Public site content
 *  does not carry one yet (see docs/BACKEND_GAPS.md), so it comes from config. */
export function menuAccessKey(slug: string): string | null {
  const perTenant = process.env[`MENU_ACCESS_KEY_${slug.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`];
  return perTenant ?? process.env.DEV_MENU_ACCESS_KEY ?? null;
}

export async function fetchPublicMenu(slug: string): Promise<Menu | null> {
  const key = menuAccessKey(slug);
  if (!key) return null;
  const doc = await get<PublicMenuDocument>(slug, `/v1/public/menu-codes/${encodeURIComponent(key)}?lang=ar`);
  return doc ? menuFromDocument(doc) : null;
}
