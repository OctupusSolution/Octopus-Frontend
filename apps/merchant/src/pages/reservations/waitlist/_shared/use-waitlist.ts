import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useTenantConfig } from "@/app/providers/tenant-config-provider";
import { sampleLayout, type FloorPlanDoc } from "@/entities/floor-plan";
import {
  createEntry,
  markCalled,
  markLeft,
  markNotified,
  markSeated,
  moveUp,
  readWaitlist,
  subscribeWaitlist,
  updateEntry,
  writeWaitlist,
  type GuestInput,
  type WaitlistEntry,
} from "@/entities/waitlist-entry";
import { useFloorPlan } from "@/pages/reservations/floor-plan/_shared/use-floor-plan";

const NONE: WaitlistEntry[] = [];

export function useWaitlist() {
  const { activeTenantId } = useTenantConfig();
  const tenantId = activeTenantId ?? "default";
  const entries = useSyncExternalStore(subscribeWaitlist, () => readWaitlist(tenantId), () => NONE);

  const write = useCallback((next: WaitlistEntry[]) => writeWaitlist(tenantId, next), [tenantId]);

  const patch = useCallback(
    (id: string, change: (entry: WaitlistEntry, now: number) => WaitlistEntry) => {
      const now = Date.now();
      write(readWaitlist(tenantId).map((e) => (e.id === id ? change(e, now) : e)));
    },
    [tenantId, write]
  );

  const actions = useMemo(
    () => ({
      add: (input: GuestInput): WaitlistEntry => {
        const current = readWaitlist(tenantId);
        const entry = createEntry(current, input, Date.now());
        write([...current, entry]);
        return entry;
      },
      update: (id: string, input: GuestInput) => patch(id, (e, now) => updateEntry(e, input, now)),
      notify: (id: string) => patch(id, markNotified),
      call: (id: string) => patch(id, markCalled),
      leave: (id: string) => patch(id, markLeft),
      seat: (id: string, table: string, area: string) => patch(id, (e, now) => markSeated(e, table, area, now)),
      moveUp: (id: string) => write(moveUp(readWaitlist(tenantId), id, Date.now())),
    }),
    [tenantId, write, patch]
  );

  return { entries, ...actions };
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
