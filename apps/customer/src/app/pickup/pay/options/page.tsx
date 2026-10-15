import { loadMenu } from "@/entities/menu-item/load";
import { loadTenant } from "@/entities/tenant/load";
import { PickupPayOptionsView } from "@/views/pickup";

export default async function PickupPayOptionsPage() {
  const [{ items }, tenant] = await Promise.all([loadMenu(), loadTenant()]);

  return <PickupPayOptionsView items={items} branches={tenant.branches} />;
}
