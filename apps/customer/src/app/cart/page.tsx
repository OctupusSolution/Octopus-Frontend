import { headers } from "next/headers";
import { getMenuForTenant } from "@/entities/menu-item";
import { getTenantBySlug, TENANT_SLUG_HEADER } from "@/entities/tenant";
import { CartView } from "@/views/cart";

export default function CartPage() {
  const slug = headers().get(TENANT_SLUG_HEADER) ?? "burger-house";
  const tenant = getTenantBySlug(slug);
  // The cart persists ids, not images or categories — the menu comes down so
  // each line can find its photograph and its product page.
  const { categories, items } = getMenuForTenant(tenant.id);

  return <CartView tenant={tenant} categories={categories} items={items} />;
}
