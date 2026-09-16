// The one in-memory copy of each business's floor plan, shared by every
// screen that reads it. The hub, the builder and the live floor subscribe to
// the same cache, so publishing in the builder is already true on the live
// floor the moment the merchant navigates there — and a change made in
// another tab arrives through the `storage` event.
import {
  EMPTY_RECORD,
  bookingsStorageKey,
  floorPlanStorageKey,
  liveStateStorageKey,
  parseBookings,
  parseLiveOverrides,
  parseRecord,
  serializeRecord,
  type FloorPlanRecord,
} from "./storage";
import type { LiveOverrides } from "./live-status";
import type { Booking } from "./booking";

const records = new Map<string, FloorPlanRecord>();
const overrides = new Map<string, LiveOverrides>();
const bookings = new Map<string, Booking[]>();
const listeners = new Set<() => void>();
let watchingStorage = false;

const EMPTY_OVERRIDES: LiveOverrides = {};

function emit() {
  for (const listener of listeners) listener();
}

function watchStorage() {
  if (watchingStorage || typeof window === "undefined") return;
  watchingStorage = true;
  window.addEventListener("storage", (event) => {
    if (event.key && !event.key.startsWith("octopus.floorPlan.")) return;
    records.clear();
    overrides.clear();
    bookings.clear();
    emit();
  });
}

export function subscribeFloorPlan(listener: () => void): () => void {
  listeners.add(listener);
  watchStorage();
  return () => {
    listeners.delete(listener);
  };
}

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function readFloorPlan(tenantId: string): FloorPlanRecord {
  const key = floorPlanStorageKey(tenantId);
  let record = records.get(key);
  if (!record) {
    record = typeof window === "undefined" ? EMPTY_RECORD : parseRecord(readStorage(key));
    records.set(key, record);
  }
  return record;
}

/** `saved`: persisted. `savedWithoutBackground`: the uploaded background
 *  pushed the plan over the browser's storage quota, so it was kept only for
 *  this session. `memoryOnly`: storage is unavailable altogether. */
export type WriteOutcome = "saved" | "savedWithoutBackground" | "memoryOnly";

export function writeFloorPlan(tenantId: string, record: FloorPlanRecord): WriteOutcome {
  const key = floorPlanStorageKey(tenantId);
  records.set(key, record);
  let outcome: WriteOutcome = "saved";
  try {
    window.localStorage.setItem(key, serializeRecord(record));
  } catch {
    outcome = "memoryOnly";
    const withoutBackground: FloorPlanRecord = {
      draft: record.draft && { ...record.draft, doc: { ...record.draft.doc, background: null } },
      published: record.published && { ...record.published, doc: { ...record.published.doc, background: null } },
    };
    try {
      window.localStorage.setItem(key, serializeRecord(withoutBackground));
      outcome = "savedWithoutBackground";
    } catch {
      // Storage is off entirely; the in-memory copy still drives the session.
    }
  }
  emit();
  return outcome;
}

export function readLiveOverrides(tenantId: string): LiveOverrides {
  if (typeof window === "undefined") return EMPTY_OVERRIDES;
  const key = liveStateStorageKey(tenantId);
  let value = overrides.get(key);
  if (!value) {
    value = parseLiveOverrides(readStorage(key));
    overrides.set(key, value);
  }
  return value;
}

const NO_BOOKINGS: Booking[] = [];

export function readBookings(tenantId: string): Booking[] {
  if (typeof window === "undefined") return NO_BOOKINGS;
  const key = bookingsStorageKey(tenantId);
  let value = bookings.get(key);
  if (!value) {
    value = parseBookings(readStorage(key));
    bookings.set(key, value);
  }
  return value;
}

export function writeBookings(tenantId: string, value: Booking[]): void {
  const key = bookingsStorageKey(tenantId);
  bookings.set(key, value);
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The booking still holds for this session.
  }
  emit();
}

export function writeLiveOverrides(tenantId: string, value: LiveOverrides): void {
  const key = liveStateStorageKey(tenantId);
  overrides.set(key, value);
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Live changes still apply for this session.
  }
  emit();
}
