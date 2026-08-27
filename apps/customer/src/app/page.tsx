import { headers } from "next/headers";
import { getMenuForTenant } from "@/entities/menu-item";
import { getTenantBySlug, TENANT_SLUG_HEADER } from "@/entities/tenant";
import { LandingView } from "@/views/landing";

export default function HomePage() {
  const slug = headers().get(TENANT_SLUG_HEADER) ?? "burger-house";
  const tenant = getTenantBySlug(slug);
  const { categories, items } = getMenuForTenant(tenant.id);

  return <LandingView tenant={tenant} categories={categories} items={items} />;
}
