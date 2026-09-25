import "server-only";
import { cookies, headers } from "next/headers";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { cache } from "react";
import { getTenantBySlug, type Tenant } from "@octopus/api-client";
import { defaultLocale, getDirection, locales, type Locale } from "@i18n/index";
import {
  fetchPage,
  fetchShell,
  tenantFromShell,
  type Direction,
  type PublicPage,
  type PublishedShell,
} from "@/shared/api/public-api";
import { LOCALE_COOKIE_NAME } from "@/shared/lib/locale-cookie-name";
import { SAMPLE_STOREFRONT_HEADER, SAMPLE_TENANT_SLUG, TENANT_SLUG_HEADER } from "./index";

export interface Storefront {
  slug: string;
  /** Plain localhost with no subdomain: the built-in sample tenant, no API. */
  sample: boolean;
  /** The published shell; null for the sample storefront or a site that is not served. */
  shell: PublishedShell | null;
  /** The language the site answered in (one it has enabled), else the UI locale. */
  language: string;
  direction: Direction;
  /** The storefront's own UI strings: the site's language when the app has it. */
  locale: Locale;
}

const isLocale = (v: string | null | undefined): v is Locale => (locales as readonly string[]).includes(v ?? "");

/** Everything a request renders from, fetched once per request. */
export const getStorefront = cache(async (): Promise<Storefront> => {
  const h = headers();
  const sample = h.get(SAMPLE_STOREFRONT_HEADER) === "1";
  const slug = h.get(TENANT_SLUG_HEADER) ?? SAMPLE_TENANT_SLUG;
  const cookie = cookies().get(LOCALE_COOKIE_NAME)?.value ?? null;

  if (sample) {
    const locale = isLocale(cookie) ? cookie : defaultLocale;
    return { slug, sample, shell: null, language: locale, direction: getDirection(locale), locale };
  }

  // The visitor's chosen language (cookie) wins; else the API negotiates from
  // Accept-Language and falls back to the site's default. It always answers in a
  // language the site has enabled.
  const shell = await fetchShell(slug, cookie, h.get("accept-language"));
  const language = shell?.language ?? (isLocale(cookie) ? cookie : defaultLocale);
  const locale: Locale = isLocale(language) ? language : defaultLocale;
  const direction: Direction = shell?.direction ?? getDirection(locale);
  return { slug, sample, shell, language, direction, locale };
});

/** The storefront for a page that needs a served site: a real subdomain whose
 *  site does not exist or is not published is a 404, never sample data. */
export async function requireStorefront(): Promise<Storefront> {
  const storefront = await getStorefront();
  if (!storefront.sample && !storefront.shell) notFound();
  return storefront;
}

/** The business's published shell, or null (sample storefront). */
export async function loadSite(): Promise<PublishedShell | null> {
  return (await requireStorefront()).shell;
}

/** The tenant a request is for. The slug argument is kept for call-site compatibility;
 *  the tenant is always the one the request's host resolved to. */
export async function loadTenant(_slug?: string): Promise<Tenant> {
  const { sample, slug, shell } = await requireStorefront();
  return sample || !shell ? getTenantBySlug(slug) : tenantFromShell(slug, shell);
}

/** UI locale for server components (replaces reading the cookie directly, so a
 *  page's strings always match the language the site is rendered in). */
export async function loadLocale(): Promise<Locale> {
  return (await requireStorefront()).locale;
}

/** One published page by path. Issues the real redirect the API asks for, and
 *  404s a page that is not served. */
export const loadPage = cache(async (path: string): Promise<PublicPage> => {
  const { slug, shell, language } = await requireStorefront();
  if (!shell) notFound();
  const read = await fetchPage(slug, path, language);
  if (!read) notFound();
  if (read.type === "redirect" && read.redirect) {
    if (read.redirect.permanent) permanentRedirect(read.redirect.location);
    redirect(read.redirect.location);
  }
  if (!read.page) notFound();
  return read.page;
});

/** The published pages the storefront may open, without a 404 when one is missing. */
export const tryLoadPage = cache(async (path: string): Promise<PublicPage | null> => {
  const { slug, shell, language } = await getStorefront();
  if (!shell) return null;
  const read = await fetchPage(slug, path, language);
  return read?.type === "page" ? read.page : null;
});
