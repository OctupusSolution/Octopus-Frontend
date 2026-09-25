import { requireStorefront } from "@/entities/tenant/load";
import { OrderTrackingView } from "@/views/order-tracking";

export default async function OrderTrackingPage({ params }: { params: { id: string } }) {
  await requireStorefront();
  return <OrderTrackingView orderId={params.id} />;
}
