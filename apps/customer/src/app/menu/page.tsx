import type { Metadata } from "next";
import { headers } from "next/headers";
import { getTenantBySlug, TENANT_SLUG_HEADER } from "@/entities/tenant";
import { getMenuForTenant } from "@/entities/menu-item";
import { MenuView } from "@/views/menu";

export function generateMetadata(): Metadata {
  const slug = headers().get(TENANT_SLUG_HEADER) ?? "burger-house";
  const tenant = getTenantBySlug(slug);
  return { title: `القائمة — ${tenant.name}` };
}

export default function MenuPage() {
  const slug = headers().get(TENANT_SLUG_HEADER) ?? "burger-house";
  const tenant = getTenantBySlug(slug);
  const { categories, items } = getMenuForTenant(tenant.id);

  return <MenuView tenant={tenant} categories={categories} items={items} />;
}
