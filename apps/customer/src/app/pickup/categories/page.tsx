import { loadMenu } from "@/entities/menu-item/load";
import { PickupCategoriesView } from "@/views/pickup";

export default async function PickupCategoriesPage() {
  const { categories } = await loadMenu();

  return <PickupCategoriesView categories={categories} />;
}
