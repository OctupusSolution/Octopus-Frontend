import { headers } from "next/headers";
import { loadMenu } from "@/entities/menu-item/load";
import { TENANT_SLUG_HEADER } from "@/entities/tenant";
import { loadTenant } from "@/entities/tenant/load";
import { DineInView } from "@/views/fulfillment";

export default async function DineInPage() {
  const slug = headers().get(TENANT_SLUG_HEADER) ?? "burger-house";
  const tenant = await loadTenant(slug);
  const { categories, items } = await loadMenu(slug);

  return <DineInView categories={categories} items={items} />;
}
