import { loadMenu } from "@/entities/menu-item/load";
import { TableHomeView } from "@/views/table";

export default async function PickupHomePage() {
  const { categories, items } = await loadMenu();

  return <TableHomeView categories={categories} items={items} />;
}
