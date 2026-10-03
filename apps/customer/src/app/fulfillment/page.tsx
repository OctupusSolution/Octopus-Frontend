import { headers } from "next/headers";
import { loadMenu } from "@/entities/menu-item/load";
import { TENANT_SLUG_HEADER } from "@/entities/tenant";
import { loadTenant } from "@/entities/tenant/load";
import { FulfillmentView } from "@/views/fulfillment";

export default async function FulfillmentPage() {
  const slug = headers().get(TENANT_SLUG_HEADER) ?? "burger-house";
  const tenant = await loadTenant(slug);
  // The recap card needs each line's photograph and its product page, neither
  // of which the persisted cart carries.
  const { categories, items } = await loadMenu(slug);

  return <FulfillmentView tenant={tenant} categories={categories} items={items} />;
}
