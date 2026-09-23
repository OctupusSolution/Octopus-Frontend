// React access to the business's floor plan and its live floor. Lives in the
// page layer because it needs the active business and the signed-in user from
// the app providers; the storage and simulation it wraps are in
// entities/floor-plan.
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  ApiError,
  getFloorPlanVersion,
  listFloorPlanVersions,
  restoreVersionToDraft,
  rollbackToVersion,
  type FloorPlanVersionDocumentResponse,
  type FloorPlanVersionResponse,
} from "@octopus/api-client";
import { useAuth } from "@/app/providers/auth-provider";
import { useTenantConfig } from "@/app/providers/tenant-config-provider";
import {
  EMPTY_RECORD,
  activePlanIdOf,
  clearLiveState,
  saveBuilderStep,
  setActivePlan,
  fetchLiveStates,
  floorPlanIdOf,
  liveCounts,
  writeLiveState,
  publishDraft,
  pullRecord,
  pushDraft,
  setSyncError,
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

const key = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const NO_OVERRIDES: LiveOverrides = {};
const NO_BOOKINGS: Booking[] = [];

function useTenantId(): string {
  const { activeTenantId } = useTenantConfig();
  return activeTenantId ?? "default";
}

const pulled = new Set<string>();

function describe(err: unknown): string {
  return err instanceof ApiError ? (err.problem?.detail ?? err.problem?.errorCode ?? err.message) : err instanceof Error ? err.message : "Sync failed";
}

export function useFloorPlan() {
  const tenantId = useTenantId();
  const { user, activeBusinessId } = useAuth();
  const author = user?.name?.trim() || user?.email?.trim() || "";
  const record = useSyncExternalStore(subscribeFloorPlan, () => readFloorPlan(tenantId), () => EMPTY_RECORD);

  // The server is the truth for tables and canvas: pull it once per business.
  useEffect(() => {
    if (!activeBusinessId || pulled.has(activeBusinessId)) return;
    pulled.add(activeBusinessId);
    pullRecord(activeBusinessId, readFloorPlan(tenantId))
      .then((rec) => {
        if (rec) writeFloorPlan(tenantId, rec);
      })
      .catch((err) => {
        pulled.delete(activeBusinessId);
        setSyncError(describe(err));
      });
  }, [activeBusinessId, tenantId]);

  const saveDraft = useCallback(
    (doc: FloorPlanDoc, meta: { method: DraftMethod; step?: QuickStep; fromPublished?: boolean }): WriteOutcome => {
      const current = readFloorPlan(tenantId);
      if (activeBusinessId) {
        pushDraft(activeBusinessId, doc, meta.method).then(() => setSyncError(null), (err) => setSyncError(describe(err)));
      }
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
    [tenantId, author, activeBusinessId]
  );

  const discardDraft = useCallback(() => {
    writeFloorPlan(tenantId, { ...readFloorPlan(tenantId), draft: null });
  }, [tenantId]);

  const publish = useCallback(
    async (doc: FloorPlanDoc): Promise<WriteOutcome> => {
      if (activeBusinessId) {
        try {
          await publishDraft(activeBusinessId, doc);
          setSyncError(null);
          // The doc being published still carries this session's client-side
          // table ids (`tbl-...`); the server assigns its own spot ids on
          // push. Re-pulling swaps them in, so what lands in `published` is
          // what reservations can actually book against — booking a table
          // whose id was never a real spot id is what sent a bad `resourceId`
          // to the API before this existed.
          const fresh = await pullRecord(activeBusinessId, readFloorPlan(tenantId));
          if (fresh) return writeFloorPlan(tenantId, fresh);
        } catch (err) {
          setSyncError(describe(err));
        }
      }
      return writeFloorPlan(tenantId, { draft: null, published: { doc, publishedAt: Date.now(), publishedBy: author } });
    },
    [tenantId, author, activeBusinessId]
  );

  // Publish history (BACKEND_GAPS: listFloorPlanVersions/restoreVersionToDraft
  // were ready and unused — this is the same "read then restore-to-draft"
  // shape the menu and public-link modules already use for their own history).
  const listVersions = useCallback(async (): Promise<FloorPlanVersionResponse[]> => {
    if (!activeBusinessId) return [];
    const planId = await floorPlanIdOf(activeBusinessId);
    if (!planId) return [];
    const res = await listFloorPlanVersions(activeBusinessId, planId, 1, 50);
    return res.data;
  }, [activeBusinessId]);

  const restoreVersion = useCallback(
    async (version: number): Promise<void> => {
      if (!activeBusinessId) throw new Error("No active business");
      const planId = await floorPlanIdOf(activeBusinessId);
      if (!planId) throw new Error("No floor plan yet");
      await restoreVersionToDraft(activeBusinessId, planId, version, key());
      const fresh = await pullRecord(activeBusinessId, readFloorPlan(tenantId));
      if (fresh) writeFloorPlan(tenantId, fresh);
    },
    [activeBusinessId, tenantId]
  );

  /** One published version in full — what it looked like when it went out. */
  const getVersion = useCallback(
    async (version: number): Promise<FloorPlanVersionDocumentResponse> => {
      if (!activeBusinessId) throw new Error("No active business");
      const planId = await floorPlanIdOf(activeBusinessId);
      if (!planId) throw new Error("No floor plan yet");
      return getFloorPlanVersion(activeBusinessId, planId, version);
    },
    [activeBusinessId]
  );

  /** Puts a past version straight back live (the draft is left as it is). */
  const rollbackVersion = useCallback(
    async (version: number, notes: string): Promise<void> => {
      if (!activeBusinessId) throw new Error("No active business");
      const planId = await floorPlanIdOf(activeBusinessId);
      if (!planId) throw new Error("No floor plan yet");
      await rollbackToVersion(activeBusinessId, planId, version, { notes: notes.trim() || null }, key());
      const fresh = await pullRecord(activeBusinessId, readFloorPlan(tenantId));
      if (fresh) writeFloorPlan(tenantId, fresh);
    },
    [activeBusinessId, tenantId]
  );

  /** Re-reads the active plan from the server (after a change made elsewhere). */
  const reload = useCallback(async (): Promise<void> => {
    if (!activeBusinessId) return;
    const fresh = await pullRecord(activeBusinessId, readFloorPlan(tenantId));
    writeFloorPlan(tenantId, fresh ?? EMPTY_RECORD);
  }, [activeBusinessId, tenantId]);

  /** Makes another plan the one the builder and the live floor work on. The
   *  local copy belongs to the old plan, so it is replaced, not merged. */
  const switchPlan = useCallback(
    async (planId: string | null): Promise<void> => {
      if (!activeBusinessId) return;
      setActivePlan(activeBusinessId, planId);
      writeFloorPlan(tenantId, EMPTY_RECORD);
      const fresh = await pullRecord(activeBusinessId, EMPTY_RECORD);
      writeFloorPlan(tenantId, fresh ?? EMPTY_RECORD);
    },
    [activeBusinessId, tenantId]
  );

  const activePlanId = activeBusinessId ? activePlanIdOf(activeBusinessId) : null;

  return {
    tenantId,
    author,
    businessId: activeBusinessId,
    activePlanId,
    draft: record.draft,
    published: record.published,
    saveDraft,
    discardDraft,
    publish,
    listVersions,
    restoreVersion,
    getVersion,
    rollbackVersion,
    reload,
    switchPlan,
  };
}

const reportedSteps = new Map<string, QuickStep>();

/** Tells the server where the merchant is in the builder (Layout, Configure,
 *  Review), once per change. A failure only costs the resume point, so it is
 *  not surfaced. */
export function useBuilderStep(step: QuickStep) {
  const { activeBusinessId } = useAuth();
  useEffect(() => {
    if (!activeBusinessId || reportedSteps.get(activeBusinessId) === step) return;
    reportedSteps.set(activeBusinessId, step);
    // Not reported when there is no plan yet (or it failed): the next step change retries.
    saveBuilderStep(activeBusinessId, step).then(
      (sent) => {
        if (!sent) reportedSteps.delete(activeBusinessId);
      },
      () => reportedSteps.delete(activeBusinessId)
    );
  }, [activeBusinessId, step]);
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
  const { activeBusinessId } = useAuth();
  const overrides = useSyncExternalStore(subscribeFloorPlan, () => readLiveOverrides(tenantId), () => NO_OVERRIDES);
  const now = useNow();
  const anchor = simulationAnchor(now);

  // The live board comes from the server and is polled — the API has no push
  // channel. Without a published plan on the server it falls back to the
  // local simulation, so an offline or brand-new floor still draws.
  const [board, setBoard] = useState<Map<string, LiveTableState> | null>(null);
  const refresh = useCallback(async () => {
    if (!activeBusinessId) return;
    try {
      setBoard(await fetchLiveStates(activeBusinessId));
    } catch {
      // Keep the last board; the next poll retries.
    }
  }, [activeBusinessId]);
  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 15_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const entries = useMemo<LiveEntry[]>(
    () =>
      (doc?.tables ?? [])
        .filter((t) => t.visible)
        .map((table) => ({
          table,
          state: board?.get(table.id) ?? resolveLiveState(table, overrides, anchor),
        })),
    [doc, overrides, anchor, board]
  );
  const byId = useMemo(() => new Map(entries.map((e) => [e.table.id, e])), [entries]);
  const counts = useMemo(() => liveCounts(entries.map((e) => e.state)), [entries]);
  const walkIn = useMemo(() => walkInCapacity(entries), [entries]);

  const report = useCallback((err: unknown) => setSyncError(describe(err)), []);

  const setTableState = useCallback(
    (tableId: string, state: LiveTableState) => {
      writeLiveOverrides(tenantId, { ...readLiveOverrides(tenantId), [tableId]: state });
      if (activeBusinessId && board) {
        setBoard((b) => (b ? new Map(b).set(tableId, state) : b));
        writeLiveState(activeBusinessId, tableId, state).then(() => void refresh(), (err) => {
          report(err);
          void refresh();
        });
      }
    },
    [tenantId, activeBusinessId, board, refresh, report]
  );

  const clearTableState = useCallback(
    (tableId: string) => {
      const { [tableId]: _removed, ...rest } = readLiveOverrides(tenantId);
      writeLiveOverrides(tenantId, rest);
      if (activeBusinessId && board) {
        clearLiveState(activeBusinessId, tableId).then(() => void refresh(), (err) => {
          report(err);
          void refresh();
        });
      }
    },
    [tenantId, activeBusinessId, board, refresh, report]
  );

  return { entries, byId, counts, walkIn, now, setTableState, clearTableState };
}
