import { headers } from "next/headers";
import { getTenantBySlug, TENANT_SLUG_HEADER } from "@/entities/tenant";
import { PickupView } from "@/views/fulfillment";

export default function PickupPage() {
  const slug = headers().get(TENANT_SLUG_HEADER) ?? "burger-house";

  return <PickupView tenant={getTenantBySlug(slug)} />;
}
