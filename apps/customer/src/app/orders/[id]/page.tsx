import { OrderTrackingView } from "@/views/order-tracking";

export default function OrderTrackingPage({ params }: { params: { id: string } }) {
  return <OrderTrackingView orderId={params.id} />;
}
