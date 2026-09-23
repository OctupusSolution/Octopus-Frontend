// Live orders for the merchant console — the KDS and the orders list — read
// from the real Order module on AdminApi (US-018), not the old mock-api on
// localhost:4000 (orders-client.ts stays for the customer app only).
//
// There is no realtime push for orders (no SignalR/webhook on the module), so
// this polls GET /orders. The list row (OrderSummaryResponse) has no lines,
// and the KDS needs them, so each row is hydrated with GET /orders/{id} —
// but only when its `version` moved since the last poll, so a quiet kitchen
// costs one list call per tick.
//
// `shared` must not import from app/entities, so the business id comes in as
// an argument rather than from the auth provider.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  acceptOrder,
  advanceLineStatus,
  ApiError,
  bulkAdvanceLineStatus,
  getOrder,
  listOrders,
  type OrderAdminStatus,
  type OrderLineTargetStatus,
  type OrderResponse,
} from "@octopus/api-client";

const DEFAULT_INTERVAL_MS = 10000;
const PAGE_SIZE = 100;

export interface UseLiveOrdersOptions {
  /** Server-side status filter; omitted ⇒ today's orders plus every open one. */
  statuses?: readonly OrderAdminStatus[];
  intervalMs?: number;
}

export interface UseLiveOrdersResult {
  orders: readonly OrderResponse[];
  /** True until the first poll settles. */
  loading: boolean;
  /** The last poll's failure, human-readable; null when it succeeded. */
  error: string | null;
  /** 403/404 — the business has no `order:core` entitlement or permission. */
  unavailable: boolean;
  refresh: () => void;
  /** Accepts a New order. Resolves to an error message, or null on success. */
  accept: (order: OrderResponse) => Promise<string | null>;
  /** Moves one line forward. */
  advanceLine: (order: OrderResponse, lineId: string, status: OrderLineTargetStatus) => Promise<string | null>;
  /** Moves every line that legally can to `status` (the ticket "bump"). */
  advanceOrder: (order: OrderResponse, status: OrderLineTargetStatus) => Promise<string | null>;
}

function messageOf(err: unknown): string {
  if (err instanceof ApiError) return err.problem?.detail ?? err.problem?.title ?? err.problem?.errorCode ?? err.message;
  return err instanceof Error ? err.message : "Request failed";
}

export function useLiveOrders(businessId: string | null, options: UseLiveOrdersOptions = {}): UseLiveOrdersResult {
  const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
  // A stable key so a caller passing a fresh array literal each render does
  // not restart the poll.
  const statusKey = (options.statuses ?? []).join(",");
  const [orders, setOrders] = useState<readonly OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const cache = useRef(new Map<string, OrderResponse>());
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    if (!businessId) {
      setOrders([]);
      setLoading(false);
      return;
    }
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const statuses = statusKey ? (statusKey.split(",") as OrderAdminStatus[]) : undefined;
      const page = await listOrders(businessId, { statuses, pageSize: PAGE_SIZE });
      const next = await Promise.all(
        page.data.map(async (row) => {
          const cached = cache.current.get(row.id);
          if (cached && cached.version === row.version) return cached;
          try {
            const full = await getOrder(businessId, row.id);
            cache.current.set(row.id, full);
            return full;
          } catch {
            return cached ?? null;
          }
        })
      );
      const present = next.filter((order): order is OrderResponse => order !== null);
      const ids = new Set(present.map((order) => order.id));
      for (const id of [...cache.current.keys()]) if (!ids.has(id)) cache.current.delete(id);
      setOrders(present);
      setError(null);
      setUnavailable(false);
    } catch (err) {
      const blocked = err instanceof ApiError && (err.status === 403 || err.status === 404);
      setUnavailable(blocked);
      setError(messageOf(err));
      if (blocked) setOrders([]);
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [businessId, statusKey]);

  useEffect(() => {
    cache.current.clear();
    setLoading(true);
    void load();
    const interval = window.setInterval(() => void load(), intervalMs);
    return () => window.clearInterval(interval);
  }, [load, intervalMs]);

  // Every write returns the order as it now stands — put it straight into
  // the list so the ticket moves at once, then let the poll reconcile.
  const applyWrite = useCallback(
    async (write: () => Promise<OrderResponse>): Promise<string | null> => {
      try {
        const updated = await write();
        cache.current.set(updated.id, updated);
        setOrders((prev) => prev.map((order) => (order.id === updated.id ? updated : order)));
        void load();
        return null;
      } catch (err) {
        void load();
        return messageOf(err);
      }
    },
    [load]
  );

  const accept = useCallback(
    (order: OrderResponse) =>
      businessId
        ? applyWrite(() => acceptOrder(businessId, order.id, { expectedVersion: order.version }))
        : Promise.resolve("Not signed in"),
    [applyWrite, businessId]
  );

  const advanceLine = useCallback(
    (order: OrderResponse, lineId: string, status: OrderLineTargetStatus) =>
      businessId
        ? applyWrite(() => advanceLineStatus(businessId, order.id, lineId, { status, expectedVersion: order.version }))
        : Promise.resolve("Not signed in"),
    [applyWrite, businessId]
  );

  const advanceOrder = useCallback(
    (order: OrderResponse, status: OrderLineTargetStatus) =>
      businessId
        ? applyWrite(() => bulkAdvanceLineStatus(businessId, order.id, { status, expectedVersion: order.version }))
        : Promise.resolve("Not signed in"),
    [applyWrite, businessId]
  );

  const refresh = useCallback(() => void load(), [load]);

  return { orders, loading, error, unavailable, refresh, accept, advanceLine, advanceOrder };
}
