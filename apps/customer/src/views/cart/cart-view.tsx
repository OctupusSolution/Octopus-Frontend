"use client";

import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@ui/primitives";
import { useOrderingSession } from "@/entities/order";
import { getBranchName, type Tenant } from "@/entities/tenant";
import { computeCartSubtotalSar, computePromoDiscountSar, formatSar } from "@/shared/lib/pricing";
import { Breadcrumb } from "@/shared/ui";
import { ApplyPromo } from "@/features/cart/apply-promo";
import { CartSummary } from "@/widgets/cart-summary";

export interface CartViewProps {
  tenant: Tenant;
}

export function CartView({ tenant }: CartViewProps) {
  const { state, updateQuantity, removeLine } = useOrderingSession();

  const subtotalSar = computeCartSubtotalSar(state.lines);
  const discountSar = state.promoCode ? computePromoDiscountSar(subtotalSar, state.promoCode) : 0;
  const totalSar = subtotalSar - discountSar;
  const itemCount = state.lines.reduce((sum, line) => sum + line.quantity, 0);

  let contextLine: string | null = null;
  if (state.channel === "delivery") contextLine = `التوصيل إلى: ${state.deliveryAddress ?? "—"}`;
  else if (state.channel === "dine_in") contextLine = `الطاولة: ${state.tableNumber ?? "—"}`;
  else if (state.channel === "takeaway") contextLine = `الاستلام من: ${getBranchName(state.branchId)}`;

  const belowMinimum = state.channel === "delivery" && subtotalSar < tenant.minDeliveryOrderSar;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6 sm:px-[26px]">
      <Breadcrumb items={[{ label: "الرئيسية", href: "/" }, { label: "السلة" }]} />
      <h1 className="text-[21px] font-bold text-[var(--octo-text-primary)]">سلة الطلبات ({itemCount})</h1>
      {contextLine && <p className="text-[12.5px] text-[var(--octo-text-secondary)]">{contextLine}</p>}

      {state.lines.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag size={18} />}
          title="السلة فارغة"
          action={
            <Link
              href="/menu"
              className="inline-flex items-center justify-center rounded-[9px] bg-[#0D6EFD] px-3 py-[7px] text-[12px] font-medium text-white transition-opacity hover:opacity-90"
            >
              تصفح القائمة
            </Link>
          }
        />
      ) : (
        <>
          <CartSummary
            lines={state.lines}
            subtotalSar={subtotalSar}
            discountSar={discountSar}
            totalSar={totalSar}
            onQuantityChange={updateQuantity}
            onRemove={removeLine}
          />

          <ApplyPromo />

          {belowMinimum ? (
            <p className="text-[11.5px] font-medium text-[#F59E0B]">
              الحد الأدنى للطلب للتوصيل هو {formatSar(tenant.minDeliveryOrderSar)}
            </p>
          ) : (
            <Link
              href="/checkout"
              className="flex items-center justify-center rounded-[9px] bg-[#0D6EFD] px-3 py-[9px] text-[12.5px] font-medium text-white transition-opacity hover:opacity-90"
            >
              متابعة إلى الدفع
            </Link>
          )}
        </>
      )}
    </div>
  );
}
