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
// Draft preview (ADR-080): while the visitor holds the preview cookie, the shell and page
// reads go to GET /v1/public-site/preview[/pages] with the secret in X-Preview-Token, and
// no preview answer is ever cached here (shared/lib/preview.ts, planApiRequest).
//
// The public read types are shared with the builder's live preview (@octopus/api-client contracts/public-read.ts).
// 
import http from "node:http";
import https from "node:https";
import { cookies } from "next/headers";
import { PREVIEW_COOKIE_NAME, planApiRequest } from "@/shared/lib/preview";
import type { Tenant } from "@octopus/api-client";

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

/** The preview secret of the request being rendered, if the visitor holds one. */
function currentPreviewToken(): string | null {
  try {
    return cookies().get(PREVIEW_COOKIE_NAME)?.value || null;
  } catch {
    return null; // outside a request (build, tests)
  }
}

/** Whether this request renders a draft preview (the visitor holds a preview cookie). */
export const isPreviewRequest = () => currentPreviewToken() !== null;

function request(
  host: string,
  path: string,
  acceptLanguage?: string,
  extraHeaders: Record<string, string> = {}
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const client = BASE.protocol === "https:" ? https : http;
    const headers: Record<string, string> = { ...extraHeaders, Host: host, Accept: "application/json" };
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
  const plan = planApiRequest(path, currentPreviewToken());
  const key = `${slug}|${path}|${acceptLanguage ?? ""}`;
  if (plan.cacheable) {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < hit.ttl) return hit.value as T | null;
  }
  let value: T | null = null;
  try {
    const res = await request(hostFor(slug), plan.path, acceptLanguage, plan.headers);
    value = res.status >= 200 && res.status < 300 ? (JSON.parse(res.body) as T) : null;
  } catch {
    value = null;
  }
  // A preview answer is no-store: it never enters the cache published visitors read from.
  if (plan.cacheable) cache.set(key, { at: Date.now(), ttl: value ? TTL_MS : MISS_TTL_MS, value });
  return value;
}

function query(params: Record<string, string | null | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `?${s}` : "";
}

// ---- published shell ---------------------------------------------------------------

// The public read shapes live in @octopus/api-client (contracts/public-read.ts): the builder's live
// preview produces the same shapes from the draft and hands them to the canvas route.
import type {
  PublicSiteDirection,
  PublicSiteFooterLink,
  PublicSiteMedia,
  PublicSiteNavItem,
  PublicSitePage,
  PublicSiteSection,
  PublicSiteShell,
  PublicSiteSource,
} from "@octopus/api-client";
export type Direction = PublicSiteDirection;
export type PublicMedia = PublicSiteMedia;
export type PublicNavItem = PublicSiteNavItem;
export type PublicFooterLink = PublicSiteFooterLink;
export type PublishedShell = PublicSiteShell;
export type PublicSource = PublicSiteSource;
export type PublicSection = PublicSiteSection;
export type PublicPage = PublicSitePage;

import { menuFromDocument, type Menu, type PublicMenuDocument } from "./menu-document";
export { imageUrl, menuFromDocument, type Menu } from "./menu-document";

/** A resolved field value: text is a string, media `{url,…}`, link `{href,kind,label?}`, rich text a block array, list `[{id,fields}]`. */
export type SectionFields = Record<string, unknown>;

export const fetchShell = (slug: string, lang?: string | null, acceptLanguage?: string | null) =>
  get<PublishedShell>(slug, `/v1/public-site${query({ lang })}`, lang ? undefined : acceptLanguage ?? undefined);

// ---- one page ----------------------------------------------------------------------

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
