import { headers } from "next/headers";
import { getTenantBySlug, TENANT_SLUG_HEADER } from "@/entities/tenant";
import { CartView } from "@/views/cart";

export default function CartPage() {
  const slug = headers().get(TENANT_SLUG_HEADER) ?? "burger-house";
  const tenant = getTenantBySlug(slug);

  return <CartView tenant={tenant} />;
}
