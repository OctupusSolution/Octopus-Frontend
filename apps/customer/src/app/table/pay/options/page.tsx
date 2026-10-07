import { loadMenu } from "@/entities/menu-item/load";
import { TablePayOptionsView } from "@/views/table";

export default async function TablePayOptionsPage() {
  const { items } = await loadMenu();

  return <TablePayOptionsView items={items} />;
}
