// MOCK. There is no payment backend — `simulatePayment` resolves after a beat
// so the processing and success states in the design are reachable and honest
// about being a demo, the same way the mock auth provider is.

export interface PaymentMethod {
  id: string;
  labelKey: string;
  /** Filename inside apps/assets/payment; null means render a lucide card icon. */
  logo: string | null;
}

export const PAYMENT_METHODS: readonly PaymentMethod[] = [
  { id: "card",     labelKey: "onboarding.payment.card",     logo: "VISA.svg" },
  { id: "mada",     labelKey: "onboarding.payment.mada",     logo: "mada.svg" },
  { id: "applepay", labelKey: "onboarding.payment.applePay", logo: "apple pay.svg" },
  { id: "stcpay",   labelKey: "onboarding.payment.stcPay",   logo: "stc.svg" },
];

/** Resolves after 2.2s — long enough for the processing dialog to be read. */
export function simulatePayment(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 2200));
}
