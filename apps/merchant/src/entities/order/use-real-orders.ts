// The active business's real orders (US-018): today's plus every one still
// open, polled from AdminApi through shared/api/live-orders.ts.
import { useLiveOrders, type UseLiveOrdersResult } from "@/shared/api/live-orders";
import { useAuth } from "@/app/providers/auth-provider";

const POLL_INTERVAL_MS = 15000;

export type UseRealOrdersResult = UseLiveOrdersResult;

export function useRealOrders(): UseRealOrdersResult {
  const { activeBusinessId } = useAuth();
  return useLiveOrders(activeBusinessId, { intervalMs: POLL_INTERVAL_MS });
}
