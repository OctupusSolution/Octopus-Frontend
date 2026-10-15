import { Suspense } from "react";
import { PlaceMenuView } from "@/views/place";

export default function PlaceMenuPage() {
  // The listing keeps its category and filters in the URL (useSearchParams).
  return (
    <Suspense fallback={null}>
      <PlaceMenuView />
    </Suspense>
  );
}
