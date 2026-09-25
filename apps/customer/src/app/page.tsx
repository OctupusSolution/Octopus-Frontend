import { headers } from "next/headers";
import { loadMenu } from "@/entities/menu-item/load";
import { TENANT_SLUG_HEADER } from "@/entities/tenant";
import { loadSite, loadTenant } from "@/entities/tenant/load";
import { heroOf } from "@/shared/api/brand-theme";
import { LandingView } from "@/views/landing";

export default async function HomePage() {
  const slug = headers().get(TENANT_SLUG_HEADER) ?? "burger-house";
  const [tenant, site] = await Promise.all([loadTenant(slug), loadSite(slug)]);
  const { categories, items } = await loadMenu(slug);

  return <LandingView tenant={tenant} categories={categories} items={items} hero={heroOf(site)} />;
}
