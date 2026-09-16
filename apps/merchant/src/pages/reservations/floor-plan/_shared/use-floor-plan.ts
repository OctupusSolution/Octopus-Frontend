// React access to the business's floor plan and its live floor. Lives in the
// page layer because it needs the active business and the signed-in user from
// the app providers; the storage and simulation it wraps are in
// entities/floor-plan.
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useAuth } from "@/app/providers/auth-provider";
import { useTenantConfig } from "@/app/providers/tenant-config-provider";
import {
  EMPTY_RECORD,
  liveCounts,
  readBookings,
  readFloorPlan,
  readLiveOverrides,
  writeBookings,
  resolveLiveState,
  simulationAnchor,
  subscribeFloorPlan,
  walkInCapacity,
  writeFloorPlan,
  writeLiveOverrides,
  type Booking,
  type DraftMethod,
  type FloorPlanDoc,
  type FloorTable,
  type LiveOverrides,
  type LiveTableState,
  type QuickStep,
  type WriteOutcome,
} from "@/entities/floor-plan";

const NO_OVERRIDES: LiveOverrides = {};
const NO_BOOKINGS: Booking[] = [];

function useTenantId(): string {
  const { activeTenantId } = useTenantConfig();
  return activeTenantId ?? "default";
}

export function useFloorPlan() {
  const tenantId = useTenantId();
  const { user } = useAuth();
  const author = user?.name?.trim() || user?.email?.trim() || "";
  const record = useSyncExternalStore(subscribeFloorPlan, () => readFloorPlan(tenantId), () => EMPTY_RECORD);

  const saveDraft = useCallback(
    (doc: FloorPlanDoc, meta: { method: DraftMethod; step?: QuickStep; fromPublished?: boolean }): WriteOutcome => {
      const current = readFloorPlan(tenantId);
      return writeFloorPlan(tenantId, {
        ...current,
        draft: {
          doc,
          method: meta.method,
          step: meta.step ?? current.draft?.step ?? 1,
          savedAt: Date.now(),
          savedBy: author,
          fromPublished: meta.fromPublished ?? current.draft?.fromPublished ?? false,
        },
      });
    },
    [tenantId, author]
  );

  const discardDraft = useCallback(() => {
    writeFloorPlan(tenantId, { ...readFloorPlan(tenantId), draft: null });
  }, [tenantId]);

  const publish = useCallback(
    (doc: FloorPlanDoc): WriteOutcome =>
      writeFloorPlan(tenantId, { draft: null, published: { doc, publishedAt: Date.now(), publishedBy: author } }),
    [tenantId, author]
  );

  return { tenantId, author, draft: record.draft, published: record.published, saveDraft, discardDraft, publish };
}

/** Reservations this floor has taken, shared across every screen. */
export function useBookings() {
  const tenantId = useTenantId();
  const bookings = useSyncExternalStore(subscribeFloorPlan, () => readBookings(tenantId), () => NO_BOOKINGS);

  const addBooking = useCallback(
    (booking: Booking) => writeBookings(tenantId, [...readBookings(tenantId), booking]),
    [tenantId]
  );
  const removeBooking = useCallback(
    (id: string) => writeBookings(tenantId, readBookings(tenantId).filter((booking) => booking.id !== id)),
    [tenantId]
  );

  return { bookings, addBooking, removeBooking };
}

export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

export interface LiveEntry {
  table: FloorTable;
  state: LiveTableState;
}

export function useLiveTables(doc: FloorPlanDoc | null) {
  const tenantId = useTenantId();
  const overrides = useSyncExternalStore(subscribeFloorPlan, () => readLiveOverrides(tenantId), () => NO_OVERRIDES);
  const now = useNow();
  const anchor = simulationAnchor(now);

  const entries = useMemo<LiveEntry[]>(
    () => (doc?.tables ?? []).filter((t) => t.visible).map((table) => ({ table, state: resolveLiveState(table, overrides, anchor) })),
    [doc, overrides, anchor]
  );
  const byId = useMemo(() => new Map(entries.map((e) => [e.table.id, e])), [entries]);
  const counts = useMemo(() => liveCounts(entries.map((e) => e.state)), [entries]);
  const walkIn = useMemo(() => walkInCapacity(entries), [entries]);

  const setTableState = useCallback(
    (tableId: string, state: LiveTableState) => writeLiveOverrides(tenantId, { ...readLiveOverrides(tenantId), [tableId]: state }),
    [tenantId]
  );

  const clearTableState = useCallback(
    (tableId: string) => {
      const { [tableId]: _removed, ...rest } = readLiveOverrides(tenantId);
      writeLiveOverrides(tenantId, rest);
    },
    [tenantId]
  );

  return { entries, byId, counts, walkIn, now, setTableState, clearTableState };
}
