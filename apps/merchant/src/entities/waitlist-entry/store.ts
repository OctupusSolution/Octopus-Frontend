// One in-memory copy of each business's waitlist, persisted to localStorage
// and shared by the list and the Seat Guest screen. A change in another tab
// arrives through the `storage` event.
import {
  CONTACT_CHANNELS,
  WAITLIST_SOURCES,
  WAITLIST_STATUSES,
  seedEntries,
  type HistoryEvent,
  type WaitlistEntry,
} from "./model";

const PREFIX = "octopus.waitlist.";
const VERSION = 1;

const cache = new Map<string, WaitlistEntry[]>();
const listeners = new Set<() => void>();
let watching = false;

export function waitlistStorageKey(tenantId: string): string {
  return `${PREFIX}${tenantId}`;
}

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeWaitlist(listener: () => void): () => void {
  listeners.add(listener);
  if (!watching && typeof window !== "undefined") {
    watching = true;
    window.addEventListener("storage", (event) => {
      if (event.key && !event.key.startsWith(PREFIX)) return;
      cache.clear();
      emit();
    });
  }
  return () => {
    listeners.delete(listener);
  };
}

const str = (v: unknown): v is string => typeof v === "string";
const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

function parseEvent(value: unknown): HistoryEvent | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  if (!str(v.id) || !str(v.type) || !num(v.at)) return null;
  return { id: v.id, type: v.type as HistoryEvent["type"], at: v.at, detail: str(v.detail) ? v.detail : undefined };
}

function parseEntry(value: unknown): WaitlistEntry | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  if (!str(v.id) || !str(v.firstName) || !str(v.lastName) || !str(v.phone) || !num(v.partySize) || !num(v.joinedAt) || !num(v.rank)) return null;
  if (!WAITLIST_STATUSES.includes(v.status as never) || !WAITLIST_SOURCES.includes(v.source as never) || !CONTACT_CHANNELS.includes(v.channel as never)) return null;
  return {
    id: v.id,
    firstName: v.firstName,
    lastName: v.lastName,
    phone: v.phone,
    partySize: v.partySize,
    source: v.source as WaitlistEntry["source"],
    channel: v.channel as WaitlistEntry["channel"],
    areaPreference: str(v.areaPreference) ? v.areaPreference : "",
    tablePreference: str(v.tablePreference) ? v.tablePreference : "",
    note: str(v.note) ? v.note : "",
    status: v.status as WaitlistEntry["status"],
    joinedAt: v.joinedAt,
    quotedMin: num(v.quotedMin) ? v.quotedMin : 15,
    rank: v.rank,
    seatedAt: num(v.seatedAt) ? v.seatedAt : undefined,
    seatedTable: str(v.seatedTable) ? v.seatedTable : undefined,
    seatedArea: str(v.seatedArea) ? v.seatedArea : undefined,
    leftAt: num(v.leftAt) ? v.leftAt : undefined,
    history: Array.isArray(v.history) ? v.history.map(parseEvent).filter((e): e is HistoryEvent => e !== null) : [],
  };
}

/** Null when nothing usable is stored, so the caller seeds a fresh queue. */
export function parseWaitlist(raw: string | null): WaitlistEntry[] | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as { version?: unknown; entries?: unknown };
    if (data.version !== VERSION || !Array.isArray(data.entries)) return null;
    return data.entries.map(parseEntry).filter((e): e is WaitlistEntry => e !== null);
  } catch {
    return null;
  }
}

export function readWaitlist(tenantId: string): WaitlistEntry[] {
  const key = waitlistStorageKey(tenantId);
  let entries = cache.get(key);
  if (entries) return entries;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    raw = null;
  }
  entries = parseWaitlist(raw) ?? seedEntries(Date.now());
  cache.set(key, entries);
  if (raw === null) persist(key, entries);
  return entries;
}

function persist(key: string, entries: WaitlistEntry[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify({ version: VERSION, entries }));
  } catch {
    // Storage is unavailable; the in-memory copy still drives the session.
  }
}

export function writeWaitlist(tenantId: string, entries: WaitlistEntry[]): void {
  const key = waitlistStorageKey(tenantId);
  cache.set(key, entries);
  persist(key, entries);
  emit();
}
