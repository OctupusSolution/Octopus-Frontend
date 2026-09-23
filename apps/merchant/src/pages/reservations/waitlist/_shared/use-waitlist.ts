import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useAuth } from "@/app/providers/auth-provider";
import { sampleLayout, type FloorPlanDoc } from "@/entities/floor-plan";
import { type GuestInput, type WaitlistEntry, type WaitlistStats } from "@/entities/waitlist-entry";
import { useFloorPlan } from "@/pages/reservations/floor-plan/_shared/use-floor-plan";
import {
  addEntry,
  describeWaitlistError,
  editEntry,
  loadDayStats,
  loadEntries,
  moveEntryUp,
  notifyEntry,
  reinstateEntry,
  removeEntry,
  revertReadyEntry,
  seatEntry,
} from "./waitlist-api";

// The waitlist, held above any one page (the Seat Guest screen is its own
// route). Entries come from the WaitingList API; every write is one call and
// the server's answer replaces the entry. The queue is polled while a page is
// open because the API has no push channel.
type LoadState = "idle" | "loading" | "ready" | "error";
interface Snapshot {
  entries: WaitlistEntry[];
  state: LoadState;
  error: string | null;
  businessId: string | null;
}

let snap: Snapshot = { entries: [], state: "idle", error: null, businessId: null };
const listeners = new Set<() => void>();
function patch(next: Partial<Snapshot>) {
  snap = { ...snap, ...next };
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};
const getSnapshot = () => snap;

async function load(businessId: string, quiet = false) {
  if (!quiet) patch({ businessId, state: "loading", error: null, entries: snap.businessId === businessId ? snap.entries : [] });
  try {
    patch({ entries: await loadEntries(businessId), state: "ready", error: null });
  } catch (err) {
    if (!quiet) patch({ state: "error", error: describeWaitlistError(err) });
  }
}

const replace = (entry: WaitlistEntry) =>
  patch({ entries: snap.entries.map((e) => (e.id === entry.id ? entry : e)) });

/** The signed-in account's id: the `sub` claim of the access token. */
function accountIdOf(token: string | undefined): string {
  try {
    const payload = JSON.parse(atob((token ?? "").split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return String(payload.sub ?? "");
  } catch {
    return "";
  }
}

export function useWaitlist() {
  const { activeBusinessId, user } = useAuth();
  const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (!activeBusinessId) return;
    if (snap.businessId !== activeBusinessId) void load(activeBusinessId);
    const id = window.setInterval(() => void load(activeBusinessId, true), 20_000);
    return () => window.clearInterval(id);
  }, [activeBusinessId]);

  const need = useCallback(() => {
    if (!activeBusinessId) throw new Error("No active business");
    return activeBusinessId;
  }, [activeBusinessId]);

  const actions = useMemo(
    () => ({
      add: async (input: GuestInput) => {
        const entry = await addEntry(need(), input);
        patch({ entries: [...snap.entries, entry] });
        return entry;
      },
      update: async (id: string, input: GuestInput) => replace(await editEntry(need(), id, input)),
      notify: async (id: string) => replace(await notifyEntry(need(), id)),
      // The API has no "called" state; calling is just the phone dialer.
      call: (_id: string) => undefined,
      leave: async (id: string, pin: string) =>
        replace(await removeEntry(need(), id, { approverAccountId: accountIdOf(user?.accessToken), pin })),
      /** `resourceId` is the table's id on the floor plan. */
      seat: async (id: string, _table: string, _area: string, resourceId?: string | null) =>
        replace(await seatEntry(need(), id, resourceId ?? null)),
      moveUp: async (id: string) => replace(await moveEntryUp(need(), snap.entries, id)),
      revertReady: async (id: string) => replace(await revertReadyEntry(need(), id)),
      reinstate: async (id: string) => replace(await reinstateEntry(need(), id)),
    }),
    [need, user?.accessToken]
  );

  const reload = useCallback(() => {
    if (activeBusinessId) void load(activeBusinessId);
  }, [activeBusinessId]);

  return { entries: current.entries, state: current.state, error: current.error, reload, ...actions };
}

/** The server's day counters (GET /summary), refetched whenever the queue
 *  changes. `null` until it answers or when it fails — callers then fall back
 *  to counters computed from the loaded entries. */
export function useWaitlistDayStats(entries: readonly WaitlistEntry[]): WaitlistStats | null {
  const { activeBusinessId } = useAuth();
  const [stats, setStats] = useState<WaitlistStats | null>(null);

  useEffect(() => {
    if (!activeBusinessId) {
      setStats(null);
      return;
    }
    let cancelled = false;
    loadDayStats(activeBusinessId)
      .then((next) => {
        if (!cancelled) setStats(next);
      })
      .catch(() => {
        if (!cancelled) setStats(null);
      });
    return () => {
      cancelled = true;
    };
  }, [activeBusinessId, entries]);

  return stats;
}

/** The floor guests are seated on: the published plan, or the sample
 *  restaurant until the merchant publishes one. */
export function useSeatingFloor(): { doc: FloorPlanDoc; isSample: boolean } {
  const { published } = useFloorPlan();
  const sample = useMemo(() => sampleLayout(), []);
  return published ? { doc: published.doc, isSample: false } : { doc: sample, isSample: true };
}

/** Area names guests can prefer: the floor's zones. */
export function useAreas(): string[] {
  const { doc } = useSeatingFloor();
  return useMemo(() => doc.zones.map((z) => z.name), [doc]);
}
