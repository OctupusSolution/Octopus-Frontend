import { headers } from "next/headers";
import { getTenantBySlug, TENANT_SLUG_HEADER } from "@/entities/tenant";
import { CheckoutView } from "@/views/checkout";

export default function CheckoutPage() {
  const slug = headers().get(TENANT_SLUG_HEADER) ?? "burger-house";

  return <CheckoutView tenant={getTenantBySlug(slug)} />;
}
