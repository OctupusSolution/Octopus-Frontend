import { headers } from "next/headers";
import { loadMenu } from "@/entities/menu-item/load";
import { TENANT_SLUG_HEADER } from "@/entities/tenant";
import { loadTenant } from "@/entities/tenant/load";
import { CartView } from "@/views/cart";

export default async function CartPage() {
  const slug = headers().get(TENANT_SLUG_HEADER) ?? "burger-house";
  const tenant = await loadTenant(slug);
  // The cart persists ids, not images or categories — the menu comes down so
  // each line can find its photograph and its product page.
  const { categories, items } = await loadMenu(slug);

  return <CartView tenant={tenant} categories={categories} items={items} />;
}
