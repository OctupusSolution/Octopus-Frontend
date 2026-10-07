import { loadTenant } from "@/entities/tenant/load";
import { PickupBookingView } from "@/views/pickup";

export default async function PickupBookingPage() {
  const tenant = await loadTenant();

  return <PickupBookingView branches={tenant.branches} />;
}
