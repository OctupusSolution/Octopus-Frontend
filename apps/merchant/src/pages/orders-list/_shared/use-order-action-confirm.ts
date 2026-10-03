// Shared PIN-confirm wiring for Cancel/Void/Wastage: a real order (RealOrderRef
// present) sends the PIN on as a step-up approval to the real Order module and
// only advances the flow on success; a seeded/live order keeps the original
// mock behavior — any 4 digits just advance, unchanged.
import { useState } from "react";
import type { ApprovalDto } from "@octopus/api-client";
import { useAuth } from "@/app/providers/auth-provider";
import { useI18n } from "@/app/providers/i18n-provider";
import type { OrderActionResult } from "@/entities/order";
import type { OrderRecord } from "./types";

// A handful of the messages runRealAction can resolve to are our own i18n
// keys rather than a backend-supplied ProblemDetails detail — translate
// those, and show anything else (a real backend message) verbatim.
const KNOWN_KEYS = ["orders.error.notSignedIn", "orders.error.actionFailed"];

export function useOrderActionConfirm(
  order: OrderRecord | null,
  runRealAction: (businessId: string, orderId: string, version: number, approval: ApprovalDto) => Promise<OrderActionResult>,
  onAdvance: () => void,
  onSuccess?: () => void
) {
  const { activeBusinessId, activeAccountId } = useAuth();
  const { t } = useI18n();
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const display = (message: string) => (KNOWN_KEYS.includes(message) ? t(message) : message);

  async function confirm(pin: string) {
    if (!order?.real) {
      // Mock/live order: no real endpoint to call, keep the existing
      // walk-through-the-design behavior.
      onAdvance();
      return;
    }
    if (!activeBusinessId || !activeAccountId) {
      setErrorText(display("orders.error.notSignedIn"));
      return;
    }
    setSubmitting(true);
    setErrorText(null);
    const result = await runRealAction(activeBusinessId, order.real.orderId, order.real.version, {
      approverAccountId: activeAccountId,
      pin,
    });
    setSubmitting(false);
    if (result.ok) {
      onSuccess?.();
      onAdvance();
    } else {
      setErrorText(display(result.message));
    }
  }

  return { confirm, submitting, errorText };
}
