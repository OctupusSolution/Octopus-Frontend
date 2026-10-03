"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@ui/primitives";
import { createOrder, useOrderingSession } from "@/entities/order";
import type { GuestInfo } from "@/entities/customer";
import { toOrderChannel } from "@/shared/lib/fulfillment";
import { formatSar } from "@/shared/lib/pricing";

export interface PlaceOrderButtonProps {
  guest: GuestInfo;
  canSubmit: boolean;
  subtotalSar: number;
  discountSar: number;
  totalSar: number;
}

export function PlaceOrderButton({ guest, canSubmit, subtotalSar, discountSar, totalSar }: PlaceOrderButtonProps) {
  const router = useRouter();
  const { state, clearCart } = useOrderingSession();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePlaceOrder() {
    if (!state.tenantId || !state.channel) return;

    setSubmitting(true);
    setError(null);

    try {
      const order = await createOrder({
        tenantId: state.tenantId,
        branchId: state.branchId,
        channel: toOrderChannel(state.channel),
        customerName: guest.name,
        customerPhone: guest.phone,
        deliveryAddress: state.deliveryAddress,
        tableNumber: state.tableNumber,
        lines: state.lines,
        subtotalSar,
        discountSar,
        totalSar,
      });
      clearCart();
      router.push(`/orders/${order.id}`);
    } catch {
      setError("تعذر إتمام الطلب، يرجى المحاولة مرة أخرى");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-[11.5px] font-medium text-[#EF4444]">{error}</p>}
      <Button onClick={handlePlaceOrder} disabled={!canSubmit || submitting} className="w-full justify-center">
        {submitting ? "جاري إتمام الطلب…" : `تأكيد الطلب · ${formatSar(totalSar)}`}
      </Button>
    </div>
  );
}
