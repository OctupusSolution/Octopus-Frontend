// Server-side reads of the platform's anonymous PublicApi.
//
// PublicApi resolves the site from the request's Host header (a subdomain of the
// platform's base domain, e.g. burger-house.octopus.app) and has no CORS, so these
// run in Next.js server code only, sending that Host explicitly.
//
// The Public Link read is two calls (backend PublicLinkPublicEndpoints.cs):
//   GET /v1/public-site?lang=              -> the published shell (theme, identity, navigation, footer, page index)
//   GET /v1/public-site/pages?path=&lang=  -> one page, or {type:"redirect"} for an old / non-canonical path
// An unknown, unpublished or inactive site answers 404 publiclink.site.not-found on both.
// A section bound to the Menu content source carries source.publicLinkKey, which opens
// GET /v1/public/site-menu/{key} (resolved by the same Host, no access code).
//
// The types below are defined locally on purpose: they mirror the backend's
// PublicReadContracts.cs and must not depend on the api-client's builder types.
import http from "node:http";
import https from "node:https";
import type { MenuCategory, MenuItem, MenuItemModifierGroup, Tenant } from "@octopus/api-client";

const BASE = new URL(process.env.PUBLIC_API_URL ?? "http://localhost:8082");
const SUFFIX = process.env.DEV_TENANT_DOMAIN_SUFFIX ?? "octopus.app";
/** The API itself says `Cache-Control: public, max-age=30` on a live answer. */
const TTL_MS = 30_000;
/** A refusal is never cached upstream (a site may be published a moment later); keep ours short. */
const MISS_TTL_MS = 5_000;

export const hostFor = (slug: string) => `${slug}.${SUFFIX}`;

// `fetch` (undici) silently drops a custom Host header, and PublicApi picks the
// site from Host, so requests are made with node:http, which sends it as given.
// A short in-memory cache stands in for fetch's data cache.
const cache = new Map<string, { at: number; ttl: number; value: unknown }>();

function request(host: string, path: string, acceptLanguage?: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const client = BASE.protocol === "https:" ? https : http;
    const headers: Record<string, string> = { Host: host, Accept: "application/json" };
    if (acceptLanguage) headers["Accept-Language"] = acceptLanguage;
    const req = client.request(
      { hostname: BASE.hostname, port: BASE.port, path, method: "GET", headers, timeout: 5000 },
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

async function get<T>(slug: string, path: string, acceptLanguage?: string): Promise<T | null> {
  const key = `${slug}|${path}|${acceptLanguage ?? ""}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < hit.ttl) return hit.value as T | null;
  let value: T | null = null;
  try {
    const res = await request(hostFor(slug), path, acceptLanguage);
    value = res.status >= 200 && res.status < 300 ? (JSON.parse(res.body) as T) : null;
  } catch {
    value = null;
  }
  cache.set(key, { at: Date.now(), ttl: value ? TTL_MS : MISS_TTL_MS, value });
  return value;
}

function query(params: Record<string, string | null | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `?${s}` : "";
}

// ---- published shell ---------------------------------------------------------------

export type Direction = "ltr" | "rtl";

export interface PublicMedia {
  url: string;
  width?: number | null;
  height?: number | null;
}

export interface PublicNavItem {
  label: string;
  iconKey: string | null;
  href: string | null;
  kind: string;
  openInNewTab: boolean;
  showInHeader: boolean;
  showInDrawer: boolean;
  children: PublicNavItem[];
}

export interface PublicFooterLink {
  label: string;
  href: string;
  kind: string;
  openInNewTab: boolean;
}

export interface PublishedShell {
  host: string;
  canonicalBaseUrl: string;
  language: string;
  direction: Direction;
  defaultLanguage: string;
  languages: { code: string; direction: Direction }[];
  theme: {
    key: string;
    colors: Record<string, string>;
    typography: Record<string, { heading: string; body: string }>;
    layout: Record<string, string>;
  };
  brand: { displayName: string; logo: PublicMedia | null; favicon: PublicMedia | null };
  seo: {
    titleTemplate: string | null;
    defaultTitle: string;
    defaultDescription: string | null;
    socialImageUrl: string | null;
    noIndex: boolean;
  };
  navigation: {
    options: { stickyHeader: boolean; showActivePageIndicator: boolean; showIcons: boolean; openLinksInSameTab: boolean };
    items: PublicNavItem[];
  };
  footer: {
    groups: { title: string; links: PublicFooterLink[] }[];
    socialLinks: { network: string; url: string }[];
    contact: { address: string | null; hours: string | null; phone: string | null };
  };
  pages: { path: string; title: string; isHome: boolean; noIndex: boolean; lastModifiedUtc: string }[];
  isPreview: boolean;
}

export const fetchShell = (slug: string, lang?: string | null, acceptLanguage?: string | null) =>
  get<PublishedShell>(slug, `/v1/public-site${query({ lang })}`, lang ? undefined : acceptLanguage ?? undefined);

// ---- one page ----------------------------------------------------------------------

export interface PublicSource {
  sourceKey: string;
  version: number | null;
  publicLinkKey: string | null;
  settings: unknown;
}

/** A resolved field value: text is a string, media `{url,…}`, link `{href,kind,label?}`, rich text a block array, list `[{id,fields}]`. */
export type SectionFields = Record<string, unknown>;

export interface PublicSection {
  sectionId: string;
  type: string;
  anchor: string | null;
  styleVariant: string | null;
  style: Record<string, unknown>;
  fields: SectionFields;
  source: PublicSource | null;
}

export interface PublicPage {
  pageId: string;
  path: string;
  isHome: boolean;
  kind: string;
  title: string;
  seo: { title: string; description: string | null; socialImageUrl: string | null; noIndex: boolean; canonicalUrl: string };
  layout: { header: unknown; hideFooter: boolean };
  source: PublicSource | null;
  sections: PublicSection[];
  lastModifiedUtc: string;
}

export type PublishedPageRead =
  | { type: "page"; language: string; page: PublicPage; redirect: null }
  | { type: "redirect"; language: string; page: null; redirect: { location: string; permanent: boolean } };

export const fetchPage = (slug: string, path: string, lang?: string | null, acceptLanguage?: string | null) =>
  get<PublishedPageRead>(
    slug,
    `/v1/public-site/pages${query({ path, lang })}`,
    lang ? undefined : acceptLanguage ?? undefined
  );

export function tenantFromShell(slug: string, shell: PublishedShell): Tenant {
  const name = shell.brand.displayName || slug;
  return {
    id: slug,
    slug,
    name,
    vertical: "restaurant",
    // The public read has no branches: the business is presented as one open branch.
    branches: [
      {
        id: `${slug}-main`,
        name,
        city: "",
        address: shell.footer.contact.address ?? "",
        displayName: name,
        district: "",
        imageUrl: "/images/storefront/hero.webp",
        isOpen: true,
      },
    ],
    deliveryZones: [],
    minDeliveryOrderSar: 0,
  };
}

// ---- published menu ----------------------------------------------------------------

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

/** The menu a published site's Menu section / page is bound to, by its publicLinkKey. */
export async function fetchSiteMenu(slug: string, publicLinkKey: string, lang?: string | null): Promise<Menu | null> {
  const doc = await get<PublicMenuDocument>(slug, `/v1/public/site-menu/${encodeURIComponent(publicLinkKey)}${query({ lang })}`);
  return doc ? menuFromDocument(doc) : null;
}

/** Fallback only: a menu access key from config, for a site that binds no menu. */
export function menuAccessKey(slug: string): string | null {
  const perTenant = process.env[`MENU_ACCESS_KEY_${slug.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`];
  return perTenant ?? process.env.DEV_MENU_ACCESS_KEY ?? null;
}

export async function fetchMenuByAccessKey(slug: string, lang?: string | null): Promise<Menu | null> {
  const key = menuAccessKey(slug);
  if (!key) return null;
  const doc = await get<PublicMenuDocument>(slug, `/v1/public/menu-codes/${encodeURIComponent(key)}${query({ lang: lang ?? "ar" })}`);
  return doc ? menuFromDocument(doc) : null;
}
