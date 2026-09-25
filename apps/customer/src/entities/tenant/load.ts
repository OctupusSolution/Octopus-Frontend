import "server-only";
import { getTenantBySlug, type Tenant } from "@octopus/api-client";
import { fetchPublicSite, tenantFromSite, type PublicSite } from "@/shared/api/public-api";

/** The business's published public site (brand and sections), or null. */
export const loadSite = (slug: string): Promise<PublicSite | null> => fetchPublicSite(slug);

/** The tenant a request is for: the business's public site when the platform
 *  has one, else the built-in sample tenant. */
export async function loadTenant(slug: string): Promise<Tenant> {
  const site = await fetchPublicSite(slug);
  return site ? tenantFromSite(slug, site) : getTenantBySlug(slug);
}
