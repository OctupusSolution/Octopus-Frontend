import { loadMenu } from "@/entities/menu-item/load";
import { TableCartView } from "@/views/table";

export default async function TableCartPage() {
  // The cart persists ids, not images — the menu comes down so each line can find its photograph.
  const { items } = await loadMenu();

  return <TableCartView items={items} />;
}
