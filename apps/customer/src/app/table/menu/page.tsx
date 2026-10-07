import { Suspense } from "react";
import { getMenuGroups } from "@octopus/api-client";
import { loadMenu } from "@/entities/menu-item/load";
import { TableMenuView } from "@/views/table";

export default async function TableMenuPage() {
  const { categories, items } = await loadMenu();

  return (
    // The listing keeps its category and filters in the URL (useSearchParams).
    <Suspense fallback={null}>
      <TableMenuView categories={categories} items={items} groups={getMenuGroups()} />
    </Suspense>
  );
}
