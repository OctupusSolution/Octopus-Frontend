import { loadMenu } from "@/entities/menu-item/load";
import { TableHomeView } from "@/views/table";

export default async function TableHomePage() {
  const { categories, items } = await loadMenu();

  return <TableHomeView categories={categories} items={items} />;
}
