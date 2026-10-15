import { loadMenu } from "@/entities/menu-item/load";
import { PickupPaySummaryView } from "@/views/pickup";

export default async function PickupPayPage() {
  const { items } = await loadMenu();

  return <PickupPaySummaryView items={items} />;
}
