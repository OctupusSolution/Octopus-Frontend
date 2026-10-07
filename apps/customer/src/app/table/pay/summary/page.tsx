import { loadMenu } from "@/entities/menu-item/load";
import { TablePaySummaryView } from "@/views/table";

export default async function TablePaySummaryPage() {
  const { items } = await loadMenu();

  return <TablePaySummaryView items={items} />;
}
