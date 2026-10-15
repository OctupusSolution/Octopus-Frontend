import { loadMenu } from "@/entities/menu-item/load";
import { TableSplitItemsView } from "@/views/table";

export default async function TableSplitItemsPage() {
  // The cart persists ids, not images — the menu comes down so each line can find its photograph.
  const { items } = await loadMenu();

  return <TableSplitItemsView items={items} />;
}
