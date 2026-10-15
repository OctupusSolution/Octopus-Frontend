import { Suspense } from "react";
import { PlaceOrderView } from "@/views/place";

export default function PlaceOrderPage() {
  // Reads ?ref= (useSearchParams).
  return (
    <Suspense fallback={null}>
      <PlaceOrderView />
    </Suspense>
  );
}
