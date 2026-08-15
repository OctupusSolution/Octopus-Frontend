"use client";

import { Card, CardBody } from "@ui/primitives";
import { useOrderTracking } from "@/features/order/track-order";
import { getBranchName } from "@/entities/tenant";
import { computeLineTotalSar, formatSar } from "@/shared/lib/pricing";
import { OrderTracker } from "@/widgets/order-tracker";

export interface OrderTrackingViewProps {
  orderId: string;
}

export function OrderTrackingView({ orderId }: OrderTrackingViewProps) {
  const { order, loading, error } = useOrderTracking(orderId);

  if (loading) return <StatusMessage text="جاري تحميل طلبك…" />;
  if (error) return <StatusMessage text="تعذر الاتصال بخدمة الطلبات" />;
  if (!order) return <StatusMessage text="لم يتم العثور على الطلب" />;

  let recapLine = "—";
  if (order.channel === "delivery") recapLine = `التوصيل إلى: ${order.deliveryAddress ?? "—"}`;
  else if (order.channel === "takeaway") recapLine = `الاستلام من: ${getBranchName(order.branchId)}`;
  else if (order.channel === "dine_in") recapLine = `الطاولة: ${order.tableNumber ?? "—"}`;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6 sm:px-[26px]">
      <div className="flex flex-col gap-1">
        <h1 className="text-[21px] font-bold text-[var(--octo-text-primary)]">طلب رقم {order.id}</h1>
        <p className="text-[12.5px] text-[var(--octo-text-secondary)]">
          شكراً لك {order.customerName}، سنتواصل معك على {order.customerPhone}
        </p>
        <p className="text-[12.5px] text-[var(--octo-text-secondary)]">{recapLine}</p>
      </div>

      <Card>
        <CardBody className="p-4">
          <OrderTracker order={order} />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex flex-col gap-3 p-4">
          {order.lines.map((line) => (
            <div key={line.lineId} className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <p className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">
                  {line.name} × {line.quantity}
                </p>
                {line.modifiers.length > 0 && (
                  <p className="text-[11px] text-[var(--octo-text-muted)]">
                    {line.modifiers.map((modifier) => modifier.label).join("، ")}
                  </p>
                )}
                {line.notes && <p className="text-[11px] italic text-[var(--octo-text-muted)]">{line.notes}</p>}
              </div>
              <span className="shrink-0 text-[12.5px] font-semibold text-[var(--octo-text-primary)]">
                {formatSar(computeLineTotalSar(line))}
              </span>
            </div>
          ))}

          <div className="flex flex-col gap-2 border-t border-[var(--octo-divider)] pt-3">
            <div className="flex items-center justify-between text-[12.5px] text-[var(--octo-text-secondary)]">
              <span>المجموع الفرعي</span>
              <span>{formatSar(order.subtotalSar)}</span>
            </div>
            {order.discountSar > 0 && (
              <div className="flex items-center justify-between text-[12.5px] font-medium text-[#22C55E]">
                <span>الخصم</span>
                <span>-{formatSar(order.discountSar)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-[15px] font-bold text-[var(--octo-text-primary)]">
              <span>الإجمالي</span>
              <span>{formatSar(order.totalSar)}</span>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function StatusMessage({ text }: { text: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-2 px-4 py-16 text-center">
      <p className="text-[12.5px] text-[var(--octo-text-secondary)]">{text}</p>
    </div>
  );
}
