import { notFound } from "next/navigation";
import { Suspense } from "react";
import { loadMenu } from "@/entities/menu-item/load";
import { TableProductView } from "@/views/table";

export default async function PickupProductPage({ params }: { params: { item: string } }) {
  const { items } = await loadMenu();
  const item = items.find((i) => i.id === params.item);
  if (!item) notFound();

  return (
    // The view reads ?line= through useSearchParams when a cart line is being edited.
    <Suspense fallback={null}>
      <TableProductView item={item} items={items} />
    </Suspense>
  );
}
