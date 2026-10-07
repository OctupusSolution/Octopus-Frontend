import { loadMenu } from "@/entities/menu-item/load";
import { TablePayMethodView } from "@/views/table";

export default async function TablePayPage() {
  const { items } = await loadMenu();

  return <TablePayMethodView items={items} />;
}
