import { Suspense } from "react";
import { PlaceProductView } from "@/views/place";

export default function PlaceProductPage({ params }: { params: { item: string } }) {
  return (
    <Suspense fallback={null}>
      <PlaceProductView itemId={decodeURIComponent(params.item)} />
    </Suspense>
  );
}
