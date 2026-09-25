import "server-only";
import { cache } from "react";
import { getMenuForTenant, getTenantBySlug, type MenuCategory, type MenuItem } from "@octopus/api-client";
import { requireStorefront, tryLoadPage } from "@/entities/tenant/load";
import { fetchMenuByAccessKey, fetchSiteMenu, type PublicPage, type PublicSource } from "@/shared/api/public-api";

type Menu = { categories: MenuCategory[]; items: MenuItem[] };

const EMPTY: Menu = { categories: [], items: [] };
/** How many published pages to open while looking for the one the menu is bound to. */
const MAX_PAGES_SCANNED = 12;

const menuSource = (page: PublicPage | null): PublicSource | null => {
  if (!page) return null;
  if (page.source?.sourceKey === "menu" && page.source.publicLinkKey) return page.source;
  return page.sections.find((s) => s.source?.sourceKey === "menu" && s.source.publicLinkKey)?.source ?? null;
};

/** The publicLinkKey of the menu the published site binds: the home page first,
 *  then the other pages of the site's page index. */
export const findMenuKey = cache(async (): Promise<string | null> => {
  const { shell } = await requireStorefront();
  if (!shell) return null;
  const home = shell.pages.find((p) => p.isHome)?.path ?? "/";
  const found = menuSource(await tryLoadPage(home));
  if (found) return found.publicLinkKey;
  for (const entry of shell.pages.filter((p) => !p.isHome).slice(0, MAX_PAGES_SCANNED)) {
    const source = menuSource(await tryLoadPage(entry.path));
    if (source) return source.publicLinkKey;
  }
  return null;
});

/** The menu a Menu section / page is bound to, by its key. */
export const loadMenuByKey = cache(async (publicLinkKey: string): Promise<Menu> => {
  const { slug, language } = await requireStorefront();
  return (await fetchSiteMenu(slug, publicLinkKey, language)) ?? EMPTY;
});

/**
 * The storefront's menu:
 *  - sample storefront (plain localhost): the built-in sample menu;
 *  - a published site: the menu its pages bind (source.publicLinkKey), else the
 *    MENU_ACCESS_KEY_<SLUG> / DEV_MENU_ACCESS_KEY fallback, else an empty menu.
 * A real site never shows sample food.
 */
export const loadMenu = cache(async (_slug?: string): Promise<Menu> => {
  const { sample, slug, language } = await requireStorefront();
  if (sample) {
    const data = getMenuForTenant(getTenantBySlug(slug).id);
    return { categories: [...data.categories], items: [...data.items] };
  }
  const key = await findMenuKey();
  if (key) {
    const menu = await fetchSiteMenu(slug, key, language);
    if (menu) return menu;
  }
  return (await fetchMenuByAccessKey(slug, language)) ?? EMPTY;
});
