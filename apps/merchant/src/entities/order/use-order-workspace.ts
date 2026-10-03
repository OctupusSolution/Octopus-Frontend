// Everything one real order's detail screen needs, and the one way to write
// to it: `run` hands the write the order's CURRENT version (every mutator
// needs expectedVersion), puts the order the write returns straight into
// state, then re-reads the side lists (payments/refunds/wastage/activity)
// the write may have changed. Reusable by the POS terminal as-is.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getOrder,
  getOrderActivity,
  listOrderPayments,
  listOrderRefunds,
  listWastage,
  type OrderActivityEntryResponse,
  type OrderResponse,
  type PaymentResponse,
  type RefundResponse,
  type WastageResponse,
} from "@octopus/api-client";
import { useAuth } from "@/app/providers/auth-provider";
import { isApprovalNeeded, isStaleVersion, orderErrorMessage } from "./order-model";

export interface OrderWriteContext {
  businessId: string;
  orderId: string;
  version: number;
  /** The signed-in account — the approver on a step-up PIN. */
  accountId: string | null;
  order: OrderResponse;
}

export interface OrderActionError {
  message: string;
  /** 422 order.approval.needed — re-submit with a manager PIN. */
  approvalNeeded: boolean;
}

export interface OrderWorkspace {
  order: OrderResponse | null;
  /** The signed-in account — the approverAccountId of a step-up PIN. */
  accountId: string | null;
  payments: readonly PaymentResponse[];
  refunds: readonly RefundResponse[];
  wastage: readonly WastageResponse[];
  activity: readonly OrderActivityEntryResponse[];
  loading: boolean;
  loadError: string | null;
  /** Label of the write in flight, or null. */
  busy: string | null;
  actionError: OrderActionError | null;
  clearError: () => void;
  reload: () => void;
  /** Runs one write. Resolves true on success. */
  run: (label: string, write: (ctx: OrderWriteContext) => Promise<unknown>) => Promise<boolean>;
}

function orderFrom(result: unknown): OrderResponse | null {
  if (typeof result !== "object" || result === null) return null;
  if ("lines" in result && "version" in result && "totals" in result) return result as OrderResponse;
  if ("order" in result) return orderFrom((result as { order: unknown }).order);
  return null;
}

export function useOrderWorkspace(orderId: string | null, onChanged?: (order: OrderResponse) => void): OrderWorkspace {
  const { activeBusinessId, activeAccountId } = useAuth();
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [payments, setPayments] = useState<readonly PaymentResponse[]>([]);
  const [refunds, setRefunds] = useState<readonly RefundResponse[]>([]);
  const [wastage, setWastage] = useState<readonly WastageResponse[]>([]);
  const [activity, setActivity] = useState<readonly OrderActivityEntryResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<OrderActionError | null>(null);
  const orderRef = useRef<OrderResponse | null>(null);
  const onChangedRef = useRef(onChanged);
  onChangedRef.current = onChanged;

  const loadSideLists = useCallback(async (businessId: string, id: string) => {
    // Each list fails soft on its own (e.g. a missing permission on one), so
    // one refusal never blanks the whole screen.
    const [p, r, w, a] = await Promise.all([
      listOrderPayments(businessId, id).catch(() => null),
      listOrderRefunds(businessId, id).catch(() => null),
      listWastage(businessId, id).catch(() => null),
      getOrderActivity(businessId, id, { pageSize: 50 }).catch(() => null),
    ]);
    if (p) setPayments(p);
    if (r) setRefunds(r);
    if (w) setWastage(w);
    if (a) setActivity(a.data);
  }, []);

  const reload = useCallback(() => {
    if (!activeBusinessId || !orderId) return;
    setLoading(true);
    setLoadError(null);
    getOrder(activeBusinessId, orderId)
      .then((fresh) => {
        orderRef.current = fresh;
        setOrder(fresh);
        return loadSideLists(activeBusinessId, orderId);
      })
      .catch((err: unknown) => setLoadError(orderErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [activeBusinessId, orderId, loadSideLists]);

  useEffect(() => {
    orderRef.current = null;
    setOrder(null);
    setPayments([]);
    setRefunds([]);
    setWastage([]);
    setActivity([]);
    setActionError(null);
    reload();
  }, [reload]);

  const run = useCallback(
    async (label: string, write: (ctx: OrderWriteContext) => Promise<unknown>): Promise<boolean> => {
      const current = orderRef.current;
      if (!activeBusinessId || !orderId || !current) return false;
      setBusy(label);
      setActionError(null);
      try {
        const result = await write({
          businessId: activeBusinessId,
          orderId,
          version: current.version,
          accountId: activeAccountId,
          order: current,
        });
        // Refund/receipt writes return something other than the order — re-read it.
        const next = orderFrom(result) ?? (await getOrder(activeBusinessId, orderId));
        orderRef.current = next;
        setOrder(next);
        onChangedRef.current?.(next);
        await loadSideLists(activeBusinessId, orderId);
        return true;
      } catch (err) {
        setActionError({ message: orderErrorMessage(err), approvalNeeded: isApprovalNeeded(err) });
        if (isStaleVersion(err)) reload();
        return false;
      } finally {
        setBusy(null);
      }
    },
    [activeBusinessId, activeAccountId, orderId, loadSideLists, reload]
  );

  return {
    order,
    accountId: activeAccountId,
    payments,
    refunds,
    wastage,
    activity,
    loading,
    loadError,
    busy,
    actionError,
    clearError: () => setActionError(null),
    reload,
    run,
  };
}
