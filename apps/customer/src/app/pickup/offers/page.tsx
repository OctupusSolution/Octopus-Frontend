import { Suspense } from "react";
import { loadMenu } from "@/entities/menu-item/load";
import { PickupListingView } from "@/views/pickup";

export default async function PickupOffersPage() {
  const { items } = await loadMenu();

  return (
    // The shelf keeps its filters in the URL (useSearchParams).
    <Suspense fallback={null}>
      <PickupListingView kind="offers" items={items} />
    </Suspense>
  );
}
