"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, CardBody, Segmented } from "@ui/primitives";
import { useOrderingSession } from "@/entities/order";
import { getBranchName } from "@/entities/tenant";
import type { GuestInfo } from "@/entities/customer";
import { computeCartSubtotalSar, computePromoDiscountSar, formatSar } from "@/shared/lib/pricing";
import { Breadcrumb } from "@/shared/ui";
import { GuestCheckoutForm, isValidGuestName, isValidGuestPhone } from "@/features/session/guest-checkout";
import { SelectFulfillment } from "@/features/session/select-fulfillment";
import { PlaceOrderButton } from "@/features/order/place-order";
import type { Tenant } from "@/entities/tenant";

// Payment capture is local-only for this MVP — no gateway call happens here.
// The eventual backend step charges through Moyasar/Tap using this choice.
const PAYMENT_METHODS = [
  { id: "card", label: "مدى / بطاقة / Apple Pay" },
  { id: "cash", label: "الدفع عند الاستلام" },
] as const;
type PaymentMethodId = (typeof PAYMENT_METHODS)[number]["id"];

export interface CheckoutViewProps {
  tenant: Tenant;
}

export function CheckoutView({ tenant }: CheckoutViewProps) {
  const { state } = useOrderingSession();
  const [guest, setGuest] = useState<GuestInfo>({ name: "", phone: "" });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId>("card");
  const [changingChannel, setChangingChannel] = useState(false);

  if (state.lines.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-16 text-center">
        <p className="text-[12.5px] text-[var(--octo-text-secondary)]">السلة فارغة.</p>
        <Link href="/menu" className="text-[12.5px] font-medium text-[#0D6EFD] hover:underline">
          تصفح القائمة
        </Link>
      </div>
    );
  }

  const subtotalSar = computeCartSubtotalSar(state.lines);
  const discountSar = state.promoCode ? computePromoDiscountSar(subtotalSar, state.promoCode) : 0;
  const totalSar = subtotalSar - discountSar;
  // Browsing no longer asks for a channel up front, so the customer can reach
  // this page without one. The order cannot be placed until it is chosen here.
  const needsChannel = state.channel === null;
  const canSubmit = !needsChannel && isValidGuestName(guest.name) && isValidGuestPhone(guest.phone);

  const availablePaymentMethods =
    state.channel === "dine_in" ? PAYMENT_METHODS.filter((method) => method.id !== "cash") : PAYMENT_METHODS;

  let recapLine = "—";
  if (state.channel === "delivery") recapLine = `التوصيل إلى: ${state.deliveryAddress ?? "—"}`;
  else if (state.channel === "takeaway") recapLine = `الاستلام من: ${getBranchName(state.branchId)}`;
  else if (state.channel === "dine_in") recapLine = `الطاولة: ${state.tableNumber ?? "—"}`;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6 sm:px-[26px]">
      <Breadcrumb items={[{ label: "الرئيسية", href: "/" }, { label: "السلة", href: "/cart" }, { label: "الدفع" }]} />
      <h1 className="text-[21px] font-bold text-[var(--octo-text-primary)]">إتمام الطلب</h1>

      <GuestCheckoutForm value={guest} onChange={setGuest} />

      <Card>
        <CardBody className="p-4">
          {needsChannel || changingChannel ? (
            <div className="flex flex-col gap-3">
              <p className="text-[11.5px] font-semibold text-[var(--octo-text-primary)]">
                طريقة الاستلام
              </p>
              <SelectFulfillment
                tenant={tenant}
                submitLabel="تأكيد طريقة الاستلام"
                onConfirmed={() => setChangingChannel(false)}
              />
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="text-[12.5px] text-[var(--octo-text-secondary)]">{recapLine}</p>
              <button
                type="button"
                onClick={() => setChangingChannel(true)}
                className="shrink-0 text-[11.5px] font-medium text-[#0D6EFD] hover:underline"
              >
                تغيير
              </button>
            </div>
          )}
        </CardBody>
      </Card>

      <div className="flex flex-col gap-2">
        <p className="text-[11.5px] font-semibold text-[var(--octo-text-primary)]">طريقة الدفع</p>
        <Segmented
          options={availablePaymentMethods.map((method) => ({ id: method.id, label: method.label }))}
          value={paymentMethod}
          onChange={(id) => setPaymentMethod(id as PaymentMethodId)}
        />
      </div>

      <Card>
        <CardBody className="flex flex-col gap-2 p-4">
          <div className="flex items-center justify-between text-[12.5px] text-[var(--octo-text-secondary)]">
            <span>المجموع الفرعي</span>
            <span>{formatSar(subtotalSar)}</span>
          </div>
          {discountSar > 0 && (
            <div className="flex items-center justify-between text-[12.5px] font-medium text-[#22C55E]">
              <span>الخصم</span>
              <span>-{formatSar(discountSar)}</span>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-[var(--octo-divider)] pt-2 text-[15px] font-bold text-[var(--octo-text-primary)]">
            <span>الإجمالي</span>
            <span>{formatSar(totalSar)}</span>
          </div>
        </CardBody>
      </Card>

      <PlaceOrderButton
        guest={guest}
        canSubmit={canSubmit}
        subtotalSar={subtotalSar}
        discountSar={discountSar}
        totalSar={totalSar}
      />
    </div>
  );
}
