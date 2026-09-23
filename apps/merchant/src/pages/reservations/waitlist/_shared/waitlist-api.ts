// Bridge between the WaitingList API and the waitlist's `WaitlistEntry` view
// model. The list screens were built on a flat entry with epoch timestamps and
// a five-state status; the API is nested, in UTC, and has six states, so every
// server row is converted here and the screen's events become API calls.
import {
  ApiError,
  addWaitingEntry,
  completeWaitingEntry,
  getWaitingEntry,
  getWaitingSummary,
  listWaitingEntries,
  listWaitingEntryActivity,
  markWaitingEntryReady,
  moveWaitingEntry,
  reinstateWaitingEntry,
  removeWaitingEntry,
  revertWaitingEntryReady,
  startWaitingService,
  updateWaitingEntry,
  type WaitingActivityResponse,
  type WaitingEntryResponse,
  type WaitingEntryStatus,
} from "@octopus/api-client";
import { floorPlanIdOf } from "@/entities/floor-plan";
import {
  activeQueue,
  fullName,
  type GuestInput,
  type WaitlistEntry,
  type WaitlistSource,
  type WaitlistStats,
  type WaitlistStatus,
} from "@/entities/waitlist-entry";

const key = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export function describeWaitlistError(err: unknown): string {
  if (err instanceof ApiError) return err.problem?.detail ?? err.problem?.errorCode ?? err.message;
  return err instanceof Error ? err.message : "Request failed";
}

const STATUS_FROM_API: Record<string, WaitlistStatus> = {
  Waiting: "waiting",
  Ready: "notified",
  InService: "seated",
  Completed: "seated",
  Removed: "left",
  NoShow: "left",
};

// The API's seeded sources are onsite / phone / website / social-media.
const SOURCE_FROM_API: Record<string, WaitlistSource> = {
  onsite: "walkIn",
  phone: "phone",
  website: "website",
  "social-media": "instagram",
};
const SOURCE_TO_API: Record<WaitlistSource, string> = {
  walkIn: "onsite",
  phone: "phone",
  website: "website",
  whatsapp: "social-media",
  instagram: "social-media",
};

const ms = (iso: string | null | undefined) => (iso ? Date.parse(iso) : undefined);

function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/);
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}

/** Versions, remembered per entry: every mutation needs the last one read. */
const versions = new Map<string, number>();
const resourceOf = new Map<string, string>();
const versionOf = (id: string) => versions.get(id) ?? 0;
/** The API's own status per entry: the view model folds Removed and NoShow
 *  into "left", but only a no-show can be reinstated. */
const apiStatuses = new Map<string, WaitingEntryStatus>();
export const apiStatusOf = (id: string): WaitingEntryStatus | undefined => apiStatuses.get(id);

export function toEntry(res: WaitingEntryResponse): WaitlistEntry {
  versions.set(res.id, res.version);
  apiStatuses.set(res.id, res.status);
  const status = STATUS_FROM_API[res.status] ?? "waiting";
  const { firstName, lastName } = splitName(res.customer.name);
  const joinedAt = ms(res.joinedAtUtc) ?? Date.now();
  const left = res.removal ? ms(res.removal.removedAtUtc) : ms(res.completedAtUtc);
  return {
    id: res.id,
    firstName,
    lastName,
    phone: res.customer.phone,
    partySize: res.attendeeCount,
    source: SOURCE_FROM_API[res.sourceCode] ?? "walkIn",
    // The API keeps no contact channel; WhatsApp is the app's default.
    channel: "whatsapp",
    areaPreference: res.preference.groupName ?? "",
    tablePreference: "",
    note: res.note ?? "",
    status,
    joinedAt,
    quotedMin: res.estimate?.maxMinutes ?? 15,
    // Non-live entries have no position; they sort after the queue.
    rank: res.position ?? Number.MAX_SAFE_INTEGER / 2 + joinedAt / 1e9,
    seatedAt: ms(res.serviceStartedAtUtc),
    seatedTable: res.resource?.displayName ?? res.resource?.code ?? undefined,
    seatedArea: undefined,
    leftAt: status === "left" ? left : undefined,
    history: [],
  };
}

export async function loadEntries(businessId: string): Promise<WaitlistEntry[]> {
  const out: WaitlistEntry[] = [];
  for (let page = 1; ; page += 1) {
    const list = await listWaitingEntries(businessId, { includeEstimates: true, page, pageSize: 100 });
    // The list rows carry no note or resource, so each entry is read in full.
    const full = await Promise.all(list.data.map((s) => getWaitingEntry(businessId, s.id, true)));
    out.push(...full.map(toEntry));
    if (list.data.length < 100) return out;
  }
}

export async function addEntry(businessId: string, input: GuestInput): Promise<WaitlistEntry> {
  const res = await addWaitingEntry(
    businessId,
    {
      sourceCode: SOURCE_TO_API[input.source],
      customerName: `${input.firstName} ${input.lastName}`.trim(),
      customerPhone: input.phone,
      attendeeCount: input.partySize,
      note: input.note || null,
    },
    key()
  );
  return toEntry(res);
}

export async function editEntry(businessId: string, id: string, input: GuestInput): Promise<WaitlistEntry> {
  const res = await updateWaitingEntry(businessId, id, {
    attendeeCount: input.partySize,
    groupId: null,
    note: input.note || null,
    customerName: `${input.firstName} ${input.lastName}`.trim(),
    customerPhone: input.phone,
    customerEmail: null,
    customerExternalRef: null,
    expectedVersion: versionOf(id),
  });
  return toEntry(res);
}

export async function notifyEntry(businessId: string, id: string): Promise<WaitlistEntry> {
  return toEntry(await markWaitingEntryReady(businessId, id, { expectedVersion: versionOf(id) }));
}

/** Undoes a mistaken "ready": back to waiting, same position. No approval needed. */
export async function revertReadyEntry(businessId: string, id: string): Promise<WaitlistEntry> {
  return toEntry(await revertWaitingEntryReady(businessId, id, { expectedVersion: versionOf(id) }));
}

/** Brings a no-show back into the queue. No approval needed. */
export async function reinstateEntry(businessId: string, id: string): Promise<WaitlistEntry> {
  return toEntry(await reinstateWaitingEntry(businessId, id, { expectedVersion: versionOf(id) }));
}

/** The day's counters from the server (date omitted = the business's today). */
export async function loadDayStats(businessId: string): Promise<WaitlistStats> {
  const res = await getWaitingSummary(businessId);
  return {
    waitingNow: res.waitingNow,
    seatedToday: res.inServiceToday,
    leftToday: res.leftToday,
    avgWaitMin: Math.round(res.averageWaitMinutes ?? 0),
  };
}

/** Seats the party on a table (`resourceId` is the table's id on the floor plan). */
export async function seatEntry(businessId: string, id: string, resourceId: string | null): Promise<WaitlistEntry> {
  // A table is named by its floor plan (container) and its own id.
  const containerId = resourceId ? await floorPlanIdOf(businessId) : null;
  const res = await startWaitingService(businessId, id, { containerId, resourceId, expectedVersion: versionOf(id) });
  if (resourceId) resourceOf.set(id, resourceId);
  return toEntry(res);
}

export async function finishEntry(businessId: string, id: string): Promise<WaitlistEntry> {
  return toEntry(await completeWaitingEntry(businessId, id, { expectedVersion: versionOf(id) }));
}

/** One place up: in front of the party that is currently just ahead. */
export async function moveEntryUp(businessId: string, entries: readonly WaitlistEntry[], id: string): Promise<WaitlistEntry> {
  const queue = activeQueue(entries);
  const index = queue.findIndex((e) => e.id === id);
  if (index <= 0) throw new Error("Already first in the queue.");
  return toEntry(
    await moveWaitingEntry(businessId, id, { beforeEntryId: queue[index - 1].id, expectedVersion: versionOf(id) })
  );
}

/** Taking a party off the list needs a manager's approval PIN. */
export async function removeEntry(
  businessId: string,
  id: string,
  approval: { approverAccountId: string; pin: string; reasonCode?: string }
): Promise<WaitlistEntry> {
  return toEntry(
    await removeWaitingEntry(businessId, id, {
      reasonCode: approval.reasonCode ?? "left",
      approverAccountId: approval.approverAccountId,
      approvalPin: approval.pin,
      expectedVersion: versionOf(id),
    })
  );
}

/** The real event log for one entry (BACKEND_GAPS 5.5): the list/detail reads
 *  carry none of this, so `toEntry` always leaves `history` empty and the
 *  history dialog fetches it on demand instead. */
export async function loadActivity(businessId: string, id: string): Promise<WaitingActivityResponse[]> {
  const res = await listWaitingEntryActivity(businessId, id, { page: 1, pageSize: 100 });
  return res.data;
}

export { fullName };
