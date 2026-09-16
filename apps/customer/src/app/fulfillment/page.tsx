import { headers } from "next/headers";
import { getMenuForTenant } from "@/entities/menu-item";
import { getTenantBySlug, TENANT_SLUG_HEADER } from "@/entities/tenant";
import { FulfillmentView } from "@/views/fulfillment";

export default function FulfillmentPage() {
  const slug = headers().get(TENANT_SLUG_HEADER) ?? "burger-house";
  const tenant = getTenantBySlug(slug);
  // The recap card needs each line's photograph and its product page, neither
  // of which the persisted cart carries.
  const { categories, items } = getMenuForTenant(tenant.id);

  return <FulfillmentView tenant={tenant} categories={categories} items={items} />;
}
