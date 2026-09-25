import { headers } from "next/headers";
import { TENANT_SLUG_HEADER } from "@/entities/tenant";
import { loadTenant } from "@/entities/tenant/load";
import { CheckoutView } from "@/views/checkout";

export default async function CheckoutPage() {
  const slug = headers().get(TENANT_SLUG_HEADER) ?? "burger-house";

  return <CheckoutView tenant={await loadTenant(slug)} />;
}
