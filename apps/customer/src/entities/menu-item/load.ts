import "server-only";
import { getMenuForTenant, getTenantBySlug, type MenuCategory, type MenuItem } from "@octopus/api-client";
import { fetchPublicMenu } from "@/shared/api/public-api";

/** The published menu for a tenant's storefront, else the built-in sample menu. */
export async function loadMenu(slug: string): Promise<{ categories: MenuCategory[]; items: MenuItem[] }> {
  const live = await fetchPublicMenu(slug);
  if (live) return live;
  const sample = getMenuForTenant(getTenantBySlug(slug).id);
  return { categories: [...sample.categories], items: [...sample.items] };
}
