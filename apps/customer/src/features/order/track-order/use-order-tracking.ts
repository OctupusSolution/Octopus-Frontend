"use client";

import { useEffect, useState } from "react";
import { fetchOrder, type Order } from "@/entities/order";

const POLL_INTERVAL_MS = 5000;

export interface UseOrderTrackingResult {
  order: Order | null;
  loading: boolean;
  error: string | null;
}

// Polling stands in for realtime. When packages/realtime (the planned typed
// SignalR wrapper) lands, this hook is the only place that needs to change.
export function useOrderTracking(orderId: string): UseOrderTrackingResult {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const result = await fetchOrder(orderId);
        if (cancelled) return;
        setOrder(result);
        setError(null);
      } catch {
        if (cancelled) return;
        setError("تعذر الاتصال بخدمة الطلبات");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [orderId]);

  return { order, loading, error };
}
