import { headers } from "next/headers";
import { TENANT_SLUG_HEADER } from "@/entities/tenant";
import { loadTenant } from "@/entities/tenant/load";
import { PickupView } from "@/views/fulfillment";

export default async function PickupPage() {
  const slug = headers().get(TENANT_SLUG_HEADER) ?? "burger-house";

  return <PickupView tenant={await loadTenant(slug)} />;
}
